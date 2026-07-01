import type { Recipe } from '@prisma/client';

export interface RecipeIngredient {
  name: string;
  amount?: string;
  status?: 'have' | 'missing' | 'uncertain';
  have?: boolean;
}

export interface RecipeStep {
  order?: number;
  text: string;
  timerSeconds?: number | null;
  timer_seconds?: number | null;
}

export interface Nutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function recipeIngredients(recipe: Recipe): RecipeIngredient[] {
  return safeJson<RecipeIngredient[]>(recipe.ingredientsJson, []);
}

export function recipeSteps(recipe: Recipe): RecipeStep[] {
  return safeJson<RecipeStep[]>(recipe.stepsJson, []);
}

export function recipeNutrition(recipe: Recipe): Nutrition | null {
  return safeJson<Nutrition | null>(recipe.nutritionJson, null);
}

export function recipeCategories(recipe: Recipe & { categories?: { name: string }[] }): string[] {
  if (recipe.categories?.length) return recipe.categories.map((c) => c.name);
  return [];
}

export function slugify(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || 'recipe';
}

export function buildSearchText(parts: Array<string | null | undefined | string[]>): string {
  return parts
    .flatMap((p) => (Array.isArray(p) ? p : [p]))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function difficultyKey(input: string): 'easy' | 'medium' | 'hard' {
  if (input === 'easy' || input === 'hard') return input;
  return 'medium';
}
