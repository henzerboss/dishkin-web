import type { Recipe, RecipeCategory } from '@prisma/client';
import { SITE_URL } from '@/lib/config';
import { recipeCategories, recipeIngredients, recipeNutrition, recipeSteps } from '@/lib/recipe';
import { recipeUrl } from '@/lib/url';

type RecipeWithCategories = Recipe & { categories?: RecipeCategory[] };

function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')) as T;
}

export function absoluteSiteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function durationMinutes(minutes: number | null | undefined): string | undefined {
  const value = Math.max(0, Number(minutes ?? 0));
  return value > 0 ? `PT${Math.round(value)}M` : undefined;
}

export function buildRecipeJsonLd(recipe: RecipeWithCategories, locale: string) {
  const ingredients = recipeIngredients(recipe);
  const steps = recipeSteps(recipe);
  const nutrition = recipeNutrition(recipe);
  const categories = recipeCategories(recipe);
  const image = absoluteSiteUrl(recipe.photoUrl);
  const url = `${SITE_URL}${recipeUrl(locale, recipe.id)}`;

  return cleanObject({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${url}#recipe`,
    mainEntityOfPage: url,
    url,
    name: recipe.title,
    description: recipe.description || undefined,
    image: image ? [image] : undefined,
    author: { '@type': 'Organization', name: 'Dishkin' },
    publisher: {
      '@type': 'Organization',
      name: 'Dishkin',
      logo: cleanObject({ '@type': 'ImageObject', url: absoluteSiteUrl('/brand/icon.png') }),
    },
    inLanguage: locale,
    datePublished: (recipe.appCreatedAt ?? recipe.createdAt).toISOString(),
    dateModified: recipe.updatedAt.toISOString(),
    recipeCuisine: recipe.cuisine || undefined,
    recipeCategory: categories.length ? categories.join(', ') : undefined,
    keywords: [...categories, ...ingredients.slice(0, 8).map((i) => i.name)].filter(Boolean).join(', ') || undefined,
    recipeYield: recipe.servings ? String(recipe.servings) : undefined,
    totalTime: durationMinutes(recipe.timeMinutes),
    cookTime: durationMinutes(recipe.timeMinutes),
    recipeIngredient: ingredients.map((i) => `${i.amount ? `${i.amount} ` : ''}${i.name}`),
    recipeInstructions: steps.map((s, idx) => cleanObject({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.text.slice(0, 80),
      text: s.text,
    })),
    aggregateRating: recipe.rating
      ? { '@type': 'AggregateRating', ratingValue: recipe.rating, ratingCount: recipe.ratingCount || 1 }
      : undefined,
    nutrition: nutrition
      ? cleanObject({
          '@type': 'NutritionInformation',
          calories: nutrition.calories ? `${nutrition.calories} calories` : undefined,
          proteinContent: nutrition.protein ? `${nutrition.protein} g` : undefined,
          carbohydrateContent: nutrition.carbs ? `${nutrition.carbs} g` : undefined,
          fatContent: nutrition.fat ? `${nutrition.fat} g` : undefined,
        })
      : undefined,
    isAccessibleForFree: true,
  });
}

export function buildRecipeItemListJsonLd(locale: string, recipes: RecipeWithCategories[], page = 1, pageSize = 20) {
  if (!recipes.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: recipes.map((recipe, idx) => cleanObject({
      '@type': 'ListItem',
      position: (page - 1) * pageSize + idx + 1,
      url: `${SITE_URL}${recipeUrl(locale, recipe.id)}`,
      item: cleanObject({
        '@type': 'Recipe',
        name: recipe.title,
        url: `${SITE_URL}${recipeUrl(locale, recipe.id)}`,
        image: absoluteSiteUrl(recipe.photoUrl),
        description: recipe.description || undefined,
      }),
    })),
  };
}
