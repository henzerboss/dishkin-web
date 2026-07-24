import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_SIMILAR_RECIPES, findSimilarRecipes } from '@/lib/similar-recipes';
import { toRecipeCardData } from '@/lib/recipe-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 24;

function clientIp(req: NextRequest): string {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function safeInteger(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`similar-recipes:${clientIp(req)}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const offset = safeInteger(url.searchParams.get('offset'), 0, 0, MAX_SIMILAR_RECIPES);
  const limit = safeInteger(url.searchParams.get('limit'), 16, 1, MAX_BATCH_SIZE);

  if (offset >= MAX_SIMILAR_RECIPES) {
    return NextResponse.json({ ok: true, items: [], nextOffset: null, hasMore: false });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!recipe) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const requested = Math.min(MAX_SIMILAR_RECIPES, offset + limit + 1);
    const ranked = await findSimilarRecipes(recipe, requested);
    const page = ranked.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const hasMore = ranked.length > nextOffset && nextOffset < MAX_SIMILAR_RECIPES;

    return NextResponse.json(
      {
        ok: true,
        items: page.map(toRecipeCardData),
        nextOffset: hasMore ? nextOffset : null,
        hasMore,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=180, stale-while-revalidate=900',
        },
      },
    );
  } catch (error) {
    console.error('[similar-recipes] failed', error);
    return NextResponse.json({ error: 'similar_recipes_failed' }, { status: 500 });
  }
}
