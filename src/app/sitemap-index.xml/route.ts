import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { buildSitemapIndex, sitemapResponse, SITEMAP_PAGE_SIZE } from '@/lib/sitemap-xml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CountRow = { count: bigint | number };

function pageCount(total: number): number {
  return Math.ceil(total / SITEMAP_PAGE_SIZE);
}

export async function GET() {
  const [recipeCount, categoryCountRows, newestRecipe] = await Promise.all([
    prisma.recipe.count(),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS count
      FROM (
        SELECT "locale", "name"
        FROM "RecipeCategory"
        GROUP BY "locale", "name"
      )
    `,
    prisma.recipe.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
  ]);

  const categoryCount = Number(categoryCountRows[0]?.count ?? 0);
  const lastmod = newestRecipe?.updatedAt ?? new Date();
  const sitemaps: Array<{ loc: string; lastmod?: Date }> = [
    { loc: `${SITE_URL}/sitemaps/static.xml`, lastmod },
  ];

  for (let page = 0; page < pageCount(categoryCount); page += 1) {
    sitemaps.push({ loc: `${SITE_URL}/sitemaps/categories-${page}.xml`, lastmod });
  }

  for (let page = 0; page < pageCount(recipeCount); page += 1) {
    sitemaps.push({ loc: `${SITE_URL}/sitemaps/recipes-${page}.xml`, lastmod });
  }

  return sitemapResponse(buildSitemapIndex(sitemaps));
}
