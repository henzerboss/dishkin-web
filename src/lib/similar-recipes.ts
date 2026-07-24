import type { Prisma, Recipe, RecipeCategory } from '@prisma/client';
import prisma from '@/lib/prisma';
import { recipeCategories, recipeIngredients } from '@/lib/recipe';

export const MAX_SIMILAR_RECIPES = 128;

type RecipeWithCategories = Recipe & { categories: RecipeCategory[] };

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function findSimilarRecipes(recipe: RecipeWithCategories, limit = 8): Promise<RecipeWithCategories[]> {
  const boundedLimit = Math.min(MAX_SIMILAR_RECIPES, Math.max(1, limit));
  const categoryNames = unique(recipeCategories(recipe));
  const sourceIngredients = unique(recipeIngredients(recipe).map((ingredient) => norm(ingredient.name))).slice(0, 16);
  const cuisine = recipe.cuisine?.trim();
  const or: Prisma.RecipeWhereInput[] = [
    ...(categoryNames.length ? [{ categories: { some: { name: { in: categoryNames } } } }] : []),
    ...(cuisine ? [{ cuisine }] : []),
    { type: recipe.type },
  ];

  // Keep the original relevance model, but inspect a larger bounded pool so that
  // infinite loading remains useful without ever scanning the entire catalogue.
  const candidateTake = 192;
  const candidates = await prisma.recipe.findMany({
    where: {
      locale: recipe.locale,
      id: { not: recipe.id },
      OR: or,
    },
    include: { categories: true },
    orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
    take: candidateTake,
  });

  const scored = candidates
    .map((candidate) => {
      const candidateCategories = recipeCategories(candidate);
      const categoryOverlap = candidateCategories.filter((name) => categoryNames.includes(name)).length;
      const ingredientOverlap = recipeIngredients(candidate)
        .map((ingredient) => norm(ingredient.name))
        .filter((name) => sourceIngredients.includes(name)).length;
      const cuisineBonus = cuisine && norm(candidate.cuisine) === norm(cuisine) ? 5 : 0;
      const typeBonus = candidate.type === recipe.type ? 1 : 0;
      const ratingBonus = candidate.rating ? candidate.rating / 10 : 0;
      const popularityBonus = Math.min(candidate.ratingCount, 100) / 500;
      const score = categoryOverlap * 8 + ingredientOverlap * 2 + cuisineBonus + typeBonus + ratingBonus + popularityBonus;
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score
      || (b.candidate.ratingCount ?? 0) - (a.candidate.ratingCount ?? 0)
      || b.candidate.updatedAt.getTime() - a.candidate.updatedAt.getTime()
      || b.candidate.id.localeCompare(a.candidate.id));

  let result = scored.slice(0, boundedLimit).map((item) => item.candidate);

  if (result.length < boundedLimit) {
    const existingIds = new Set([recipe.id, ...result.map((item) => item.id)]);
    const fallback = await prisma.recipe.findMany({
      where: { locale: recipe.locale, id: { notIn: Array.from(existingIds) } },
      include: { categories: true },
      orderBy: [{ rating: 'desc' }, { ratingCount: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      take: boundedLimit - result.length,
    });
    result = [...result, ...fallback];
  }

  return result.slice(0, boundedLimit);
}
