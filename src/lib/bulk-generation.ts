import { randomUUID } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { buildSearchText, slugify } from '@/lib/recipe';
import { deletePublicFile, saveRecipeImage } from '@/lib/uploads';
import { recipeUrl } from '@/lib/url';

const AI_BASE_URL = (process.env.DISHKIN_AI_BASE_URL ?? 'https://evsi.store').replace(/\/$/, '');
const AI_CLIENT_TOKEN = process.env.DISHKIN_AI_CLIENT_TOKEN ?? process.env.COOKLY_CLIENT_TOKEN ?? '';
const GENERATE_TIMEOUT_MS = 180_000;
const IMAGE_TIMEOUT_MS = 70_000;

const generatedRecipeSchema = z.object({
  title: z.string().trim().min(1).max(180),
  authenticity_percent: z.coerce.number().int().min(0).max(100).catch(0),
  cuisine: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(1200).optional().nullable(),
  image_prompt_en: z.string().trim().max(1800).optional().nullable(),
  time_minutes: z.coerce.number().int().min(0).max(1440).catch(0),
  difficulty: z.enum(['easy', 'medium', 'hard']).catch('medium'),
  servings: z.coerce.number().int().min(1).max(100).catch(4),
  ingredients: z.array(z.object({
    name: z.string().trim().min(1).max(160),
    amount: z.union([z.string(), z.number()]).optional().nullable(),
    have: z.boolean().catch(false),
  }).passthrough()).max(80).catch([]),
  steps: z.array(z.object({
    text: z.string().trim().min(1).max(1800),
    timer_seconds: z.coerce.number().int().min(0).nullable().optional(),
  }).passthrough()).max(80).catch([]),
  nutrition: z.object({
    calories: z.coerce.number().min(0).optional(),
    protein: z.coerce.number().min(0).optional(),
    carbs: z.coerce.number().min(0).optional(),
    fat: z.coerce.number().min(0).optional(),
  }).optional().nullable(),
  categories: z.array(z.string().trim().min(1).max(80)).max(12).catch([]),
}).passthrough();

const generationResponseSchema = z.object({
  recipes: z.array(generatedRecipeSchema).min(3),
});

const imageResponseSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']).catch('image/png'),
});

type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

type ExternalResponse = {
  ok: boolean;
  status: number;
  text: string;
  json: unknown;
};

export class BulkGenerationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly detail?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = 'BulkGenerationError';
  }
}

export interface BulkGeneratedRecipeResult {
  id: string;
  title: string;
  url: string;
  imageGenerated: boolean;
}

export interface BulkGenerationResult {
  recipes: BulkGeneratedRecipeResult[];
  warnings: string[];
}

function classifyByAuthenticity(percent: number): 'verified' | 'adapted' | 'generated' {
  if (percent >= 90) return 'verified';
  if (percent >= 50) return 'adapted';
  return 'generated';
}

function cleanRequestId(requestId: string): string {
  return requestId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 90);
}

function recipeId(requestId: string, index: number): string {
  return `bulk-${cleanRequestId(requestId)}-${index + 1}`;
}

async function postExternal(pathname: string, body: unknown, timeoutMs: number): Promise<ExternalResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AI_CLIENT_TOKEN) headers['X-Client-Token'] = AI_CLIENT_TOKEN;

    const response = await fetch(`${AI_BASE_URL}${pathname}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text().catch(() => '');
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, text, json };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BulkGenerationError('ai_unavailable', 502, detail);
  } finally {
    clearTimeout(timeout);
  }
}

function upstreamError(response: ExternalResponse, prefix: string): never {
  const detail = response.text.slice(0, 1000);
  if (response.status === 401 || response.status === 403) {
    throw new BulkGenerationError('ai_unauthorized', 502, detail);
  }
  if (response.status === 429) {
    // evsi.store currently uses an hourly in-memory limit. The client retries automatically.
    throw new BulkGenerationError('ai_rate_limited', 429, detail, 300);
  }
  throw new BulkGenerationError(`${prefix}_failed`, 502, detail);
}

async function generateThreeRecipes(dishName: string, locale: string): Promise<GeneratedRecipe[]> {
  const response = await postExternal('/api/cookly/generate', {
    mode: 'generate',
    locale,
    method: 'text',
    ingredients: [],
    requestedCategories: [],
    knownCategories: [],
    dishName,
    willBuyMissing: true,
    skippedIngredients: true,
    profile: {
      appliances: [],
      cuisines: [],
      likes: [],
      dislikes: [],
      allergies: [],
      servings: 4,
    },
  }, GENERATE_TIMEOUT_MS);

  if (!response.ok) upstreamError(response, 'recipe_generation');

  const parsed = generationResponseSchema.safeParse(response.json);
  if (!parsed.success) {
    throw new BulkGenerationError('invalid_ai_response', 502, parsed.error.message);
  }
  return parsed.data.recipes.slice(0, 3);
}

async function generateImage(recipe: GeneratedRecipe): Promise<{
  base64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
} | null> {
  const prompt = recipe.image_prompt_en?.trim();
  if (!prompt) return null;

  const response = await postExternal('/api/cookly/generate-image', { imagePrompt: prompt }, IMAGE_TIMEOUT_MS);
  if (!response.ok) return null;

  const parsed = imageResponseSchema.safeParse(response.json);
  if (!parsed.success) return null;
  return { base64: parsed.data.imageBase64, mimeType: parsed.data.mimeType };
}

async function uniqueSlug(title: string, id: string): Promise<string> {
  const suffix = id.slice(-12).replace(/[^a-zA-Z0-9]/g, '') || randomUUID().slice(0, 8);
  const base = `${slugify(title)}-${suffix}`;
  const existing = await prisma.recipe.findUnique({ where: { slug: base }, select: { id: true } });
  if (!existing || existing.id === id) return base;
  return `${base}-${Date.now().toString(36)}`;
}

export async function generateAndSaveDish(
  dishName: string,
  locale: string,
  requestId: string,
): Promise<BulkGenerationResult> {
  const generated = await generateThreeRecipes(dishName, locale);
  const ids = generated.map((_, index) => recipeId(requestId, index));

  // App behavior: image generation is best effort. A failed image does not discard the recipe.
  const imageResults = await Promise.all(generated.map((recipe) => generateImage(recipe).catch(() => null)));
  const warnings: string[] = [];
  const newPhotoPaths: Array<string | null> = [];

  for (let index = 0; index < generated.length; index += 1) {
    const image = imageResults[index];
    if (!image) {
      newPhotoPaths.push(null);
      warnings.push(`image_failed:${index + 1}`);
      continue;
    }
    try {
      newPhotoPaths.push(await saveRecipeImage(ids[index], image.base64, image.mimeType));
    } catch {
      newPhotoPaths.push(null);
      warnings.push(`image_save_failed:${index + 1}`);
    }
  }

  const existingRows = await prisma.recipe.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, photoUrl: true },
  });
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const slugs = await Promise.all(generated.map(async (recipe, index) => {
    const existing = existingById.get(ids[index]);
    return existing?.slug ?? uniqueSlug(recipe.title, ids[index]);
  }));
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < generated.length; index += 1) {
        const incoming = generated[index];
        const id = ids[index];
        const existing = existingById.get(id);
        const categories = Array.from(new Set(
          incoming.categories.map((category) => category.trim()).filter(Boolean),
        )).slice(0, 12);
        const ingredients = incoming.ingredients.map((ingredient) => ({
          name: ingredient.name,
          amount: ingredient.amount === null || ingredient.amount === undefined ? undefined : String(ingredient.amount),
          status: ingredient.have ? 'have' : 'missing',
        }));
        const steps = incoming.steps.map((step, stepIndex) => ({
          order: stepIndex + 1,
          text: step.text,
          timerSeconds: step.timer_seconds ?? null,
        }));
        const photoUrl = newPhotoPaths[index] ?? existing?.photoUrl ?? null;
        const searchText = buildSearchText([
          incoming.title,
          incoming.description,
          incoming.cuisine,
          categories,
          ingredients.map((ingredient) => ingredient.name),
        ]);

        await tx.recipe.upsert({
          where: { id },
          create: {
            id,
            slug: slugs[index],
            locale,
            title: incoming.title,
            searchText,
            type: classifyByAuthenticity(incoming.authenticity_percent),
            authenticityPercent: incoming.authenticity_percent,
            cuisine: incoming.cuisine || null,
            description: incoming.description || null,
            timeMinutes: incoming.time_minutes,
            difficulty: incoming.difficulty,
            servings: incoming.servings,
            ingredientsJson: JSON.stringify(ingredients),
            stepsJson: JSON.stringify(steps),
            nutritionJson: incoming.nutrition ? JSON.stringify(incoming.nutrition) : null,
            rating: null,
            ratingCount: 0,
            photoUrl,
            appCreatedAt: now,
          },
          update: {
            locale,
            title: incoming.title,
            searchText,
            type: classifyByAuthenticity(incoming.authenticity_percent),
            authenticityPercent: incoming.authenticity_percent,
            cuisine: incoming.cuisine || null,
            description: incoming.description || null,
            timeMinutes: incoming.time_minutes,
            difficulty: incoming.difficulty,
            servings: incoming.servings,
            ingredientsJson: JSON.stringify(ingredients),
            stepsJson: JSON.stringify(steps),
            nutritionJson: incoming.nutrition ? JSON.stringify(incoming.nutrition) : null,
            photoUrl,
            appCreatedAt: now,
          },
        });
        await tx.recipeCategory.deleteMany({ where: { recipeId: id } });
        if (categories.length) {
          await tx.recipeCategory.createMany({
            data: categories.map((name) => ({ recipeId: id, locale, name })),
          });
        }
      }
    });
  } catch (error) {
    await Promise.all(newPhotoPaths.filter((path): path is string => Boolean(path)).map(deletePublicFile));
    throw error;
  }

  // Remove replaced photos only after the DB transaction has committed.
  await Promise.all(ids.map(async (id, index) => {
    const oldPhoto = existingById.get(id)?.photoUrl;
    const newPhoto = newPhotoPaths[index];
    if (oldPhoto && newPhoto && oldPhoto !== newPhoto) await deletePublicFile(oldPhoto);
  }));

  return {
    recipes: generated.map((recipe, index) => ({
      id: ids[index],
      title: recipe.title,
      url: recipeUrl(locale, ids[index]),
      imageGenerated: Boolean(newPhotoPaths[index] ?? existingById.get(ids[index])?.photoUrl),
    })),
    warnings,
  };
}
