import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { saveRecipeImage, deletePublicFile } from '@/lib/uploads';
import { buildSearchText, slugify } from '@/lib/recipe';
import { recipeUrl } from '@/lib/url';
import { isSupportedLocale } from '@/i18n/locales';
import { recalculateRecipeRating, setAppVote } from '@/lib/ratings';

export const runtime = 'nodejs';

const ingredientSchema = z.object({
  name: z.string().min(1).max(160),
  amount: z.string().max(120).optional().nullable(),
  status: z.string().optional(),
  have: z.boolean().optional(),
});

const stepSchema = z.object({
  order: z.number().int().positive().optional(),
  text: z.string().min(1).max(1800),
  timerSeconds: z.number().int().nullable().optional(),
  timer_seconds: z.number().int().nullable().optional(),
});

const recipeSchema = z.object({
  id: z.string().min(3).max(120),
  title: z.string().min(1).max(180),
  type: z.enum(['verified', 'adapted', 'generated']).catch('generated'),
  authenticityPercent: z.number().int().min(0).max(100).catch(0),
  cuisine: z.string().max(100).optional().nullable(),
  description: z.string().max(1200).optional().nullable(),
  timeMinutes: z.number().int().min(0).max(1440).catch(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium'),
  servings: z.number().int().min(1).max(100).catch(2),
  ingredients: z.array(ingredientSchema).max(80).catch([]),
  steps: z.array(stepSchema).max(80).catch([]),
  nutrition: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional().nullable(),
  categories: z.array(z.string().min(1).max(80)).max(12).catch([]),
  createdAt: z.number().optional().nullable(),
});

const payloadSchema = z.object({
  locale: z.string().min(2).max(8),
  recipe: recipeSchema,
  rating: z.number().int().min(0).max(5).optional().nullable(),
  photoBase64: z.string().max(4_000_000).optional().nullable(),
  photoMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional().nullable(),
});

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

async function uniqueSlug(title: string, id: string) {
  const base = `${slugify(title)}-${id.slice(-7).replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).slice(2, 8)}`;
  const existing = await prisma.recipe.findUnique({ where: { slug: base }, select: { id: true } });
  if (!existing || existing.id === id) return base;
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.DISHKIN_SYNC_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'sync_not_configured' }, { status: 500 });
  }
  if (req.headers.get('x-dishkin-sync-token') !== expectedToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(await req.json());
  } catch (error) {
    return NextResponse.json({ error: 'bad_request', detail: String(error) }, { status: 400 });
  }

  const locale = payload.locale.toLowerCase();
  if (!isSupportedLocale(locale)) {
    return NextResponse.json({ error: 'unsupported_locale' }, { status: 400 });
  }

  const incoming = payload.recipe;
  const categories = [...new Set(incoming.categories.map((c) => c.trim()).filter(Boolean))].slice(0, 12);
  const existing = await prisma.recipe.findUnique({ where: { id: incoming.id }, select: { slug: true, photoUrl: true } });

  let photoUrl = existing?.photoUrl ?? null;
  if (payload.photoBase64) {
    const nextPhoto = await saveRecipeImage(incoming.id, payload.photoBase64, payload.photoMimeType ?? 'image/jpeg');
    await deletePublicFile(existing?.photoUrl);
    photoUrl = nextPhoto;
  }

  const slug = existing?.slug ?? await uniqueSlug(incoming.title, incoming.id);
  const appCreatedAt = incoming.createdAt ? new Date(incoming.createdAt) : undefined;
  const searchText = buildSearchText([
    incoming.title,
    incoming.description,
    incoming.cuisine,
    categories,
    incoming.ingredients.map((i) => i.name),
  ]);

  const recipe = await prisma.$transaction(async (tx) => {
    const saved = await tx.recipe.upsert({
      where: { id: incoming.id },
      create: {
        id: incoming.id,
        slug,
        locale,
        title: incoming.title,
        searchText,
        type: incoming.type,
        authenticityPercent: incoming.authenticityPercent,
        cuisine: incoming.cuisine || null,
        description: incoming.description || null,
        timeMinutes: incoming.timeMinutes,
        difficulty: incoming.difficulty,
        servings: incoming.servings,
        ingredientsJson: JSON.stringify(incoming.ingredients),
        stepsJson: JSON.stringify(incoming.steps),
        nutritionJson: incoming.nutrition ? JSON.stringify(incoming.nutrition) : null,
        rating: null,
        ratingCount: 0,
        photoUrl,
        appCreatedAt,
      },
      update: {
        locale,
        title: incoming.title,
        searchText,
        type: incoming.type,
        authenticityPercent: incoming.authenticityPercent,
        cuisine: incoming.cuisine || null,
        description: incoming.description || null,
        timeMinutes: incoming.timeMinutes,
        difficulty: incoming.difficulty,
        servings: incoming.servings,
        ingredientsJson: JSON.stringify(incoming.ingredients),
        stepsJson: JSON.stringify(incoming.steps),
        nutritionJson: incoming.nutrition ? JSON.stringify(incoming.nutrition) : null,
        ...(photoUrl ? { photoUrl } : {}),
        ...(appCreatedAt ? { appCreatedAt } : {}),
      },
    });
    await tx.recipeCategory.deleteMany({ where: { recipeId: incoming.id } });
    if (categories.length) {
      await tx.recipeCategory.createMany({
        data: categories.map((name) => ({ recipeId: incoming.id, locale, name })),
      });
    }

    if (payload.rating !== undefined && payload.rating !== null) {
      await setAppVote(tx, incoming.id, payload.rating);
    }

    const aggregate = await recalculateRecipeRating(tx, incoming.id);
    return { ...saved, ...aggregate };
  });

  revalidatePath(`/${locale}`);
  revalidatePath(recipeUrl(locale, recipe.id));
  revalidatePath(`/${locale}/recipes/${recipe.slug}`);
  return NextResponse.json({ ok: true, slug: recipe.slug, url: recipeUrl(locale, recipe.id) });
}
