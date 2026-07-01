import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { categoryUrl, recipeUrl } from '@/lib/url';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const localeUrls = SUPPORTED_LOCALES.flatMap((locale) => [
    {
      url: `${SITE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: locale === 'en' ? 1 : 0.8,
    },
    {
      url: `${SITE_URL}/${locale}/categories`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    },
  ]);

  const [recipes, categories] = await Promise.all([
    prisma.recipe.findMany({ select: { id: true, locale: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 50000 }),
    prisma.recipeCategory.groupBy({ by: ['locale', 'name'], _count: { name: true }, orderBy: { _count: { name: 'desc' } }, take: 50000 }),
  ]);

  return [
    ...localeUrls,
    ...categories.map((c) => ({
      url: `${SITE_URL}${categoryUrl(c.locale, c.name)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.65,
    })),
    ...recipes.map((r) => ({
      url: `${SITE_URL}${recipeUrl(r.locale, r.id)}`,
      lastModified: r.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
