import type { Recipe } from '@prisma/client';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { isSupportedLocale } from '@/i18n/locales';
import { recipeCategories, recipeIngredients, recipeNutrition, recipeSteps } from '@/lib/recipe';
import { recipeUrl } from '@/lib/url';

export type PublicRecipeSort = 'relevance' | 'rating';

interface RecipeWithCategories extends Recipe {
  categories: { name: string }[];
}

interface IdRow {
  id: string;
}

const LOCALE_CACHE_TTL_MS = 60_000;
const localeAvailability = new Map<string, { value: boolean; expiresAt: number }>();

export function normalizeRequestedLocale(input: string | null | undefined): string {
  const base = String(input ?? 'en').trim().toLowerCase().split(/[-_]/)[0] || 'en';
  return isSupportedLocale(base) ? base : 'en';
}

async function localeHasRecipes(locale: string): Promise<boolean> {
  const cached = localeAvailability.get(locale);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const row = await prisma.recipe.findFirst({ where: { locale }, select: { id: true } });
  const value = Boolean(row);
  localeAvailability.set(locale, { value, expiresAt: Date.now() + LOCALE_CACHE_TTL_MS });
  return value;
}

export async function resolveCatalogLocale(requestedLocale: string): Promise<{ locale: string; fallbackUsed: boolean }> {
  const normalized = normalizeRequestedLocale(requestedLocale);
  if (normalized === 'en') return { locale: 'en', fallbackUsed: false };
  const available = await localeHasRecipes(normalized);
  return available ? { locale: normalized, fallbackUsed: false } : { locale: 'en', fallbackUsed: true };
}

export function publicApiHeaders(cache = false): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dishkin-Voter',
    ...(cache ? { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' } : { 'Cache-Control': 'no-store' }),
  };
}

export function absolutePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { offset?: unknown };
    const offset = Number(parsed.offset);
    return Number.isInteger(offset) && offset >= 0 && offset <= 10_000 ? offset : 0;
  } catch {
    return 0;
  }
}

function normalizedQuery(q: string | null | undefined): string {
  return String(q ?? '').trim().slice(0, 100).toLowerCase();
}

async function orderedRecipeIds(params: {
  locale: string;
  q: string;
  sort: PublicRecipeSort;
  limit: number;
  offset: number;
}): Promise<string[]> {
  const { locale, q, sort, limit, offset } = params;
  const values: unknown[] = [locale];
  let where = 'WHERE "locale" = ?';

  if (q) {
    const contains = `%${q}%`;
    where += ' AND ("searchText" LIKE ? OR lower("title") LIKE ? OR lower(COALESCE("cuisine", \'\')) LIKE ? OR lower(COALESCE("description", \'\')) LIKE ?)';
    values.push(contains, contains, contains, contains);
  }

  let orderBy: string;
  if (sort === 'rating') {
    orderBy = 'ORDER BY ("rating" IS NULL) ASC, "rating" DESC, "ratingCount" DESC, "updatedAt" DESC, "id" DESC';
  } else if (q) {
    orderBy = `ORDER BY
      CASE
        WHEN lower("title") = ? THEN 0
        WHEN lower("title") LIKE ? THEN 1
        WHEN lower("title") LIKE ? THEN 2
        WHEN lower(COALESCE("cuisine", '')) = ? THEN 3
        ELSE 4
      END ASC,
      ("rating" IS NULL) ASC, "rating" DESC, "ratingCount" DESC, "updatedAt" DESC, "id" DESC`;
    values.push(q, `${q}%`, `%${q}%`, q);
  } else {
    orderBy = 'ORDER BY "updatedAt" DESC, "id" DESC';
  }

  values.push(limit, offset);
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `SELECT "id" FROM "Recipe" ${where} ${orderBy} LIMIT ? OFFSET ?`,
    ...values,
  );
  return rows.map((row) => row.id);
}

export async function listPublicRecipes(params: {
  requestedLocale: string;
  q?: string | null;
  sort: PublicRecipeSort;
  limit: number;
  offset: number;
}) {
  const { locale, fallbackUsed } = await resolveCatalogLocale(params.requestedLocale);
  const q = normalizedQuery(params.q);
  const ids = await orderedRecipeIds({
    locale,
    q,
    sort: params.sort,
    limit: params.limit + 1,
    offset: params.offset,
  });
  const hasMore = ids.length > params.limit;
  const pageIds = ids.slice(0, params.limit);

  if (!pageIds.length) {
    return { items: [], locale, fallbackUsed, nextCursor: null };
  }

  const rows = await prisma.recipe.findMany({
    where: { id: { in: pageIds } },
    include: { categories: { select: { name: true } } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is RecipeWithCategories => Boolean(row))
    .map(publicRecipeSummary);

  return {
    items,
    locale,
    fallbackUsed,
    nextCursor: hasMore ? encodeCursor(params.offset + params.limit) : null,
  };
}

export function publicRecipeSummary(recipe: RecipeWithCategories) {
  const ingredients = recipeIngredients(recipe);
  return {
    id: recipe.id,
    slug: recipe.slug,
    locale: recipe.locale,
    title: recipe.title,
    type: recipe.type,
    authenticityPercent: recipe.authenticityPercent,
    cuisine: recipe.cuisine,
    description: recipe.description,
    timeMinutes: recipe.timeMinutes,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    categories: recipeCategories(recipe),
    ingredientCount: ingredients.length,
    photoUrl: absolutePublicUrl(recipe.photoUrl),
    rating: recipe.rating,
    ratingCount: recipe.ratingCount,
    updatedAt: recipe.updatedAt.getTime(),
    siteUrl: `${SITE_URL}${recipeUrl(recipe.locale, recipe.id)}`,
  };
}

export function publicRecipeDetail(recipe: RecipeWithCategories) {
  return {
    ...publicRecipeSummary(recipe),
    ingredients: recipeIngredients(recipe).map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
      status: ingredient.status ?? (ingredient.have ? 'have' : 'missing'),
    })),
    steps: recipeSteps(recipe).map((step, index) => ({
      order: step.order ?? index + 1,
      text: step.text,
      timerSeconds: step.timerSeconds ?? step.timer_seconds ?? undefined,
    })),
    nutrition: recipeNutrition(recipe),
    createdAt: (recipe.appCreatedAt ?? recipe.createdAt).getTime(),
  };
}
