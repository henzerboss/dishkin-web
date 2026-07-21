'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { deletePublicFile } from '@/lib/uploads';
import { buildSearchText, type Nutrition, type RecipeIngredient, type RecipeStep } from '@/lib/recipe';
import { categoryUrl, recipeUrl } from '@/lib/url';
import { isSupportedLocale } from '@/i18n/locales';
import {
  cleanupWrongLocaleRecipes,
  getWrongLocaleCleanupCutoff,
  WRONG_LANGUAGE_CONFIRMATION,
  WRONG_LANGUAGE_LOCALES,
} from '@/lib/wrong-locale-cleanup';

function text(formData: FormData, name: string, maxLength: number): string {
  return String(formData.get(name) ?? '').trim().slice(0, maxLength);
}

function integer(formData: FormData, name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(String(formData.get(name) ?? ''), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function optionalNumber(formData: FormData, name: string): number | undefined {
  const raw = String(formData.get(name) ?? '').trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function formStrings(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => String(value ?? '').trim());
}

export async function updateRecipeAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const id = text(formData, 'id', 120);
  if (!id) redirect('/admin');

  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!existing) redirect('/admin');

  const locale = text(formData, 'locale', 8).toLowerCase();
  const title = text(formData, 'title', 180);
  if (!isSupportedLocale(locale) || !title) {
    redirect(`/admin/recipes/${encodeURIComponent(id)}/edit`);
  }

  const requestedType = text(formData, 'type', 20);
  const type = requestedType === 'verified' || requestedType === 'adapted' ? requestedType : 'generated';
  const requestedDifficulty = text(formData, 'difficulty', 20);
  const difficulty = requestedDifficulty === 'easy' || requestedDifficulty === 'hard' ? requestedDifficulty : 'medium';
  const cuisine = text(formData, 'cuisine', 100) || null;
  const description = text(formData, 'description', 1200) || null;
  const authenticityPercent = integer(formData, 'authenticityPercent', 0, 0, 100);
  const timeMinutes = integer(formData, 'timeMinutes', 0, 0, 1440);
  const servings = integer(formData, 'servings', 2, 1, 100);

  const categories = Array.from(new Set(
    formStrings(formData, 'category')
      .map((category) => category.slice(0, 80))
      .filter(Boolean),
  )).slice(0, 24);

  const ingredientNames = formStrings(formData, 'ingredientName');
  const ingredientAmounts = formStrings(formData, 'ingredientAmount');
  const ingredientStatuses = formStrings(formData, 'ingredientStatus');
  const ingredients: RecipeIngredient[] = ingredientNames
    .map((name, index) => {
      const status = ingredientStatuses[index];
      return {
        name: name.slice(0, 160),
        amount: ingredientAmounts[index]?.slice(0, 120) || undefined,
        status: status === 'missing' || status === 'uncertain' ? status : 'have',
      } satisfies RecipeIngredient;
    })
    .filter((ingredient) => ingredient.name)
    .slice(0, 80);

  const stepTexts = formStrings(formData, 'stepText');
  const stepTimers = formStrings(formData, 'stepTimerSeconds');
  const steps: RecipeStep[] = stepTexts
    .map((stepText, index) => {
      const timerValue = Number.parseInt(stepTimers[index] ?? '', 10);
      return {
        order: index + 1,
        text: stepText.slice(0, 1800),
        timerSeconds: Number.isFinite(timerValue) && timerValue > 0 ? timerValue : null,
      } satisfies RecipeStep;
    })
    .filter((step) => step.text)
    .slice(0, 80);

  if (!ingredients.length || !steps.length) {
    redirect(`/admin/recipes/${encodeURIComponent(id)}/edit`);
  }

  const nutritionEntries: Array<[keyof Nutrition, number | undefined]> = [
    ['calories', optionalNumber(formData, 'nutritionCalories')],
    ['protein', optionalNumber(formData, 'nutritionProtein')],
    ['carbs', optionalNumber(formData, 'nutritionCarbs')],
    ['fat', optionalNumber(formData, 'nutritionFat')],
  ];
  const nutrition = Object.fromEntries(nutritionEntries.filter(([, value]) => value !== undefined)) as Nutrition;
  const nutritionJson = Object.keys(nutrition).length ? JSON.stringify(nutrition) : null;

  const searchText = buildSearchText([
    title,
    description,
    cuisine,
    categories,
    ingredients.map((ingredient) => ingredient.name),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id },
      data: {
        locale,
        title,
        searchText,
        type,
        authenticityPercent,
        cuisine,
        description,
        timeMinutes,
        difficulty,
        servings,
        ingredientsJson: JSON.stringify(ingredients),
        stepsJson: JSON.stringify(steps),
        nutritionJson,
      },
    });

    await tx.recipeCategory.deleteMany({ where: { recipeId: id } });
    if (categories.length) {
      await tx.recipeCategory.createMany({
        data: categories.map((name) => ({ recipeId: id, locale, name })),
      });
    }
  });

  revalidatePath(`/${existing.locale}`);
  revalidatePath(`/${locale}`);
  revalidatePath(`/${existing.locale}/categories`);
  revalidatePath(`/${locale}/categories`);
  revalidatePath(`/${existing.locale}/recipes/${existing.slug}`);
  revalidatePath(`/${locale}/recipes/${existing.slug}`);
  revalidatePath(recipeUrl(existing.locale, id));
  revalidatePath(recipeUrl(locale, id));
  for (const category of existing.categories) revalidatePath(categoryUrl(existing.locale, category.name));
  for (const category of categories) revalidatePath(categoryUrl(locale, category));
  revalidatePath('/admin');
  revalidatePath(`/admin/recipes/${encodeURIComponent(id)}/edit`);

  redirect('/admin?updated=1');
}

export async function deleteRecipeAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { photoUrl: true, locale: true, slug: true } });
  if (!recipe) return;

  await prisma.recipe.delete({ where: { id } });
  await deletePublicFile(recipe.photoUrl);
  revalidatePath(`/${recipe.locale}`);
  revalidatePath(`/${recipe.locale}/recipes/${recipe.slug}`);
  revalidatePath(recipeUrl(recipe.locale, id));
  revalidatePath('/admin');
}


export async function cleanupWrongLocaleRecipesAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect('/admin/login');

  const confirmation = String(formData.get('confirmation') ?? '');
  if (confirmation !== WRONG_LANGUAGE_CONFIRMATION) {
    redirect('/admin/cleanup-locales?error=confirmation');
  }

  const cutoff = getWrongLocaleCleanupCutoff();
  if (!cutoff) {
    redirect('/admin/cleanup-locales?error=cutoff');
  }

  const result = await cleanupWrongLocaleRecipes(cutoff);

  for (const locale of WRONG_LANGUAGE_LOCALES) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/categories`);
  }
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin');
  revalidatePath('/admin/cleanup-locales');

  const params = new URLSearchParams({
    cleaned: '1',
    recipes: String(result.deletedRecipes),
    categories: String(result.deletedCategoryLinks),
    votes: String(result.deletedVotes),
    photos: String(result.deletedPhotos),
  });
  redirect(`/admin/cleanup-locales?${params.toString()}`);
}
