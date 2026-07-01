import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { SUPPORTED_LOCALES } from '@/i18n/locales';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const localeUrls = SUPPORTED_LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: locale === 'en' ? 1 : 0.8,
  }));
  const recipes = await prisma.recipe.findMany({ select: { locale: true, slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 50000 });
  return [
    ...localeUrls,
    ...recipes.map((r) => ({
      url: `${SITE_URL}/${r.locale}/recipes/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
