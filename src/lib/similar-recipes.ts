import type { Prisma, Recipe, RecipeCategory } from '@prisma/client';
import prisma from '@/lib/prisma';
import { recipeCategories, recipeIngredients } from '@/lib/recipe';

type RecipeWithCategories = Recipe & { categories: RecipeCategory[] };

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function findSimilarRecipes(recipe: RecipeWithCategories, limit = 3): Promise<RecipeWithCategories[]> {
  const categoryNames = unique(recipeCategories(recipe));
  const sourceIngredients = unique(recipeIngredients(recipe).map((i) => norm(i.name))).slice(0, 12);
  const cuisine = recipe.cuisine?.trim();
  const or: Prisma.RecipeWhereInput[] = [
    ...(categoryNames.length ? [{ categories: { some: { name: { in: categoryNames } } } }] : []),
    ...(cuisine ? [{ cuisine }] : []),
    { type: recipe.type },
  ];

  const candidates = await prisma.recipe.findMany({
    where: {
      locale: recipe.locale,
      id: { not: recipe.id },
      OR: or,
    },
    include: { categories: true },
    orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }],
    take: 36,
  });

  const scored = candidates
    .map((candidate) => {
      const candidateCategories = recipeCategories(candidate);
      const categoryOverlap = candidateCategories.filter((name) => categoryNames.includes(name)).length;
      const ingredientOverlap = recipeIngredients(candidate)
        .map((i) => norm(i.name))
        .filter((name) => sourceIngredients.includes(name)).length;
      const cuisineBonus = cuisine && norm(candidate.cuisine) === norm(cuisine) ? 5 : 0;
      const typeBonus = candidate.type === recipe.type ? 1 : 0;
      const ratingBonus = candidate.rating ? candidate.rating / 10 : 0;
      const score = categoryOverlap * 8 + ingredientOverlap * 2 + cuisineBonus + typeBonus + ratingBonus;
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.updatedAt.getTime() - a.candidate.updatedAt.getTime());

  let result = scored.slice(0, limit).map((item) => item.candidate);

  if (result.length < limit) {
    const existingIds = new Set([recipe.id, ...result.map((r) => r.id)]);
    const fallback = await prisma.recipe.findMany({
      where: { locale: recipe.locale, id: { notIn: Array.from(existingIds) } },
      include: { categories: true },
      orderBy: [{ rating: 'desc' }, { updatedAt: 'desc' }],
      take: limit - result.length,
    });
    result = [...result, ...fallback];
  }

  return result.slice(0, limit);
}
