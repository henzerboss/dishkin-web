import prisma from '@/lib/prisma';
import { deletePublicFile } from '@/lib/uploads';

export const WRONG_LANGUAGE_LOCALES = ['bg', 'hr', 'vi', 'ms'] as const;
export const WRONG_LANGUAGE_CONFIRMATION = 'DELETE bg hr vi ms';
export const WRONG_LANGUAGE_CUTOFF_ENV = 'DISHKIN_BAD_LOCALE_CLEANUP_BEFORE';

export type WrongLanguageLocale = (typeof WRONG_LANGUAGE_LOCALES)[number];

export interface WrongLocaleCleanupStat {
  locale: WrongLanguageLocale;
  recipes: number;
  categoryLinks: number;
  votes: number;
  photos: number;
}

export interface WrongLocaleCleanupResult {
  deletedRecipes: number;
  deletedCategoryLinks: number;
  deletedVotes: number;
  deletedPhotos: number;
}

export function getWrongLocaleCleanupCutoff(): Date | null {
  const raw = process.env[WRONG_LANGUAGE_CUTOFF_ENV]?.trim();
  if (!raw) return null;
  const cutoff = new Date(raw);
  return Number.isNaN(cutoff.getTime()) ? null : cutoff;
}

function recipeWhere(locale: WrongLanguageLocale, cutoff: Date) {
  return {
    locale,
    createdAt: { lte: cutoff },
  };
}

export async function getWrongLocaleCleanupStats(cutoff: Date): Promise<WrongLocaleCleanupStat[]> {
  return Promise.all(WRONG_LANGUAGE_LOCALES.map(async (locale) => {
    const rows = await prisma.recipe.findMany({
      where: recipeWhere(locale, cutoff),
      select: {
        photoUrl: true,
        _count: { select: { categories: true, votes: true } },
      },
    });

    return {
      locale,
      recipes: rows.length,
      categoryLinks: rows.reduce((sum, row) => sum + row._count.categories, 0),
      votes: rows.reduce((sum, row) => sum + row._count.votes, 0),
      photos: rows.reduce((sum, row) => sum + (row.photoUrl ? 1 : 0), 0),
    };
  }));
}

async function deletePhotosInBatches(photoUrls: string[]): Promise<number> {
  const uniqueUrls = [...new Set(photoUrls.filter(Boolean))];
  const batchSize = 25;
  for (let index = 0; index < uniqueUrls.length; index += batchSize) {
    await Promise.all(uniqueUrls.slice(index, index + batchSize).map((url) => deletePublicFile(url)));
  }
  return uniqueUrls.length;
}

export async function cleanupWrongLocaleRecipes(cutoff: Date): Promise<WrongLocaleCleanupResult> {
  const where = {
    locale: { in: [...WRONG_LANGUAGE_LOCALES] },
    createdAt: { lte: cutoff },
  };

  const recipes = await prisma.recipe.findMany({
    where,
    select: {
      photoUrl: true,
      _count: { select: { categories: true, votes: true } },
    },
  });
  const categoryLinks = recipes.reduce((sum, recipe) => sum + recipe._count.categories, 0);
  const votes = recipes.reduce((sum, recipe) => sum + recipe._count.votes, 0);

  // RecipeCategory and RecipeVote both use ON DELETE CASCADE. The locale and cutoff
  // filters apply to Recipe, so identically named English categories are separate rows
  // and cannot be touched by this operation.
  const deleted = await prisma.recipe.deleteMany({ where });
  const deletedPhotos = await deletePhotosInBatches(
    recipes.map((recipe) => recipe.photoUrl).filter((url): url is string => Boolean(url)),
  );

  return {
    deletedRecipes: deleted.count,
    deletedCategoryLinks: categoryLinks,
    deletedVotes: votes,
    deletedPhotos,
  };
}
