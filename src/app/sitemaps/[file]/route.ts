import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { categoryUrl, recipeUrl } from '@/lib/url';
import { buildUrlSet, sitemapResponse, SITEMAP_PAGE_SIZE } from '@/lib/sitemap-xml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FILE_PATTERN = /^(recipes|categories)-(\d+)\.xml$/;

function notFoundXml() {
  return new NextResponse('Sitemap not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function parsePage(raw: string): number | null {
  const page = Number.parseInt(raw, 10);
  return Number.isSafeInteger(page) && page >= 0 ? page : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const now = new Date();

  if (file === 'static.xml') {
    const entries = SUPPORTED_LOCALES.flatMap((locale) => [
      {
        loc: `${SITE_URL}/${locale}`,
        lastmod: now,
        changefreq: 'daily' as const,
        priority: locale === 'en' ? 1 : 0.8,
      },
      {
        loc: `${SITE_URL}/${locale}/categories`,
        lastmod: now,
        changefreq: 'daily' as const,
        priority: 0.7,
      },
    ]);
    return sitemapResponse(buildUrlSet(entries));
  }

  const match = FILE_PATTERN.exec(file);
  if (!match) return notFoundXml();

  const [, type, rawPage] = match;
  const page = parsePage(rawPage);
  if (page === null) return notFoundXml();
  const skip = page * SITEMAP_PAGE_SIZE;

  if (type === 'recipes') {
    const recipes = await prisma.recipe.findMany({
      select: { id: true, locale: true, updatedAt: true },
      orderBy: { id: 'asc' },
      skip,
      take: SITEMAP_PAGE_SIZE,
    });
    if (!recipes.length && page > 0) return notFoundXml();

    return sitemapResponse(buildUrlSet(recipes.map((recipe) => ({
      loc: `${SITE_URL}${recipeUrl(recipe.locale, recipe.id)}`,
      lastmod: recipe.updatedAt,
      changefreq: 'weekly' as const,
      priority: 0.7,
    }))));
  }

  const categories = await prisma.recipeCategory.groupBy({
    by: ['locale', 'name'],
    orderBy: [{ locale: 'asc' }, { name: 'asc' }],
    skip,
    take: SITEMAP_PAGE_SIZE,
  });
  if (!categories.length && page > 0) return notFoundXml();

  return sitemapResponse(buildUrlSet(categories.map((category) => ({
    loc: `${SITE_URL}${categoryUrl(category.locale, category.name)}`,
    lastmod: now,
    changefreq: 'daily' as const,
    priority: 0.6,
  }))));
}
