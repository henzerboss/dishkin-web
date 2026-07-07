import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChefHat } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { RecipeCard } from '@/components/RecipeCard';
import { SearchFilters } from '@/components/SearchFilters';
import { Pagination } from '@/components/Pagination';
import { categoryEmoji } from '@/lib/categories';
import { categoryUrl, safePage } from '@/lib/url';
import { interpolate, isSupportedLocale, t } from '@/i18n/locales';
import { buildRecipeItemListJsonLd } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const PAGE_SIZE = 20;

function decodeCategory(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  const name = decodeCategory(category);
  const title = `${interpolate(t(locale, 'categoryPageTitle'), { category: name })} | Dishkin`;
  const description = interpolate(t(locale, 'categoryPageSubtitle'), { category: name });
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${categoryUrl(locale, name)}` },
    openGraph: { title, description, url: `${SITE_URL}${categoryUrl(locale, name)}`, siteName: 'Dishkin', images: ['/brand/icon-512.png'] },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ locale: string; category: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, category } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const name = decodeCategory(category);
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const sort = String(sp.sort ?? 'recent') === 'top' ? 'top' : 'recent';
  const page = safePage(sp.page);

  const where = {
    locale,
    categories: { some: { name } },
    ...(q ? { OR: [
      { title: { contains: q } },
      { searchText: { contains: q.toLowerCase() } },
      { cuisine: { contains: q } },
      { description: { contains: q } },
    ] } : {}),
  };

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: { categories: true },
      orderBy: sort === 'top' ? [{ rating: 'desc' }, { updatedAt: 'desc' }] : [{ updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recipe.count({ where }),
  ]);

  if (!total && page === 1 && !q) {
    const exists = await prisma.recipeCategory.findFirst({ where: { locale, name }, select: { id: true } });
    if (!exists) notFound();
  }

  const itemListJsonLd = buildRecipeItemListJsonLd(locale, recipes, page, PAGE_SIZE);

  return (
    <div className="container pt-8 sm:pt-12">
      {itemListJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} /> : null}
      <Link href={`/${locale}/categories`} className="btn-soft mb-6"><ArrowLeft size={16} /> {t(locale, 'categories')}</Link>
      <section className="max-w-3xl">
        <span className="badge"><span aria-hidden>{categoryEmoji(name)}</span> {t(locale, 'recipesInCategory')}</span>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{name}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{interpolate(t(locale, 'categoryPageSubtitle'), { category: name })}</p>
      </section>

      <SearchFilters locale={locale} q={q} sort={sort} action={categoryUrl(locale, name)} />

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{interpolate(t(locale, 'categoryPageTitle'), { category: name })}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{total} {t(locale, 'results')}</p>
          </div>
        </div>
        {recipes.length ? (
          <>
            <div className="recipe-grid">
              {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} locale={locale} />)}
            </div>
            <Pagination locale={locale} page={page} pageSize={PAGE_SIZE} total={total} basePath={categoryUrl(locale, name)} params={{ q, sort }} />
          </>
        ) : (
          <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
            <ChefHat size={48} className="text-[var(--primary)]" />
            <h3 className="mt-4 text-xl font-black">{t(locale, 'emptyTitle')}</h3>
            <p className="mt-2 max-w-md text-[var(--muted)]">{t(locale, 'emptyBody')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
