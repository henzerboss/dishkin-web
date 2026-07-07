import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ChefHat, Sparkles, Tags } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { RecipeCard } from '@/components/RecipeCard';
import { SearchFilters } from '@/components/SearchFilters';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { Pagination } from '@/components/Pagination';
import { categoryEmoji } from '@/lib/categories';
import { categoryUrl } from '@/lib/url';
import { isSupportedLocale, t } from '@/i18n/locales';
import { safePage } from '@/lib/url';
import { buildRecipeItemListJsonLd } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = `${t(locale, 'homeTitle')} | Dishkin`;
  const description = t(locale, 'homeSubtitle');
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}` },
    openGraph: { title, description, url: `${SITE_URL}/${locale}`, siteName: 'Dishkin', images: ['/brand/icon-512.png'] },
  };
}

export default async function HomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const sort = String(sp.sort ?? 'recent') === 'top' ? 'top' : 'recent';
  const page = safePage(sp.page);

  const where = {
    locale,
    ...(q ? { OR: [
      { title: { contains: q } },
      { searchText: { contains: q.toLowerCase() } },
      { cuisine: { contains: q } },
      { description: { contains: q } },
    ] } : {}),
  };

  const [recipes, categoryRows, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: { categories: true },
      orderBy: sort === 'top' ? [{ rating: 'desc' }, { updatedAt: 'desc' }] : [{ updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recipeCategory.groupBy({ by: ['name'], where: { locale }, _count: { name: true }, orderBy: { _count: { name: 'desc' } }, take: 24 }),
    prisma.recipe.count({ where }),
  ]);

  const categories = categoryRows.map((c) => ({ name: c.name, count: c._count.name, emoji: categoryEmoji(c.name) }));
  const itemListJsonLd = buildRecipeItemListJsonLd(locale, recipes, page, PAGE_SIZE);

  return (
    <div className="container pt-10 sm:pt-14">
      {itemListJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} /> : null}
      <section className="grid gap-8 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
        <div>
          <span className="badge"><Sparkles size={15} /> Dishkin AI</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">{t(locale, 'homeTitle')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">{t(locale, 'homeSubtitle')}</p>
          <div className="mt-7"><AppStoreButtons locale={locale} /></div>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-[var(--muted)]">
            <span className="btn-soft">{total} {t(locale, 'recipesCount')}</span>
            <Link className="btn-soft" href={`/${locale}/categories`}><Tags size={16} /> {t(locale, 'categories')}: {categories.length}</Link>
          </div>
        </div>
        <div className="relative flex justify-center lg:justify-end">
          <Image src="/brand/icon-512.webp" width={512} height={512} alt="" aria-hidden="true" sizes="(max-width: 640px) 260px, 360px" className="relative h-auto w-full max-w-[360px] rounded-[38px] drop-shadow-2xl" priority />
        </div>
      </section>

      <SearchFilters locale={locale} q={q} sort={sort} />

      {categories.length ? (
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{t(locale, 'categoriesTitle')}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t(locale, 'categoriesSubtitle')}</p>
            </div>
            <Link href={`/${locale}/categories`} className="btn-soft">{t(locale, 'viewAllCategories')}</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.name} href={categoryUrl(locale, c.name)} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-2xl">
                <span className="text-3xl" aria-hidden>{c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{c.name}</span>
                  <span className="text-sm text-[var(--muted)]">{c.count} {t(locale, 'recipesCount')}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{t(locale, 'allRecipes')}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{total} {t(locale, 'results')}</p>
          </div>
        </div>
        {recipes.length ? (
          <>
            <div className="recipe-grid">
              {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} locale={locale} />)}
            </div>
            <Pagination locale={locale} page={page} pageSize={PAGE_SIZE} total={total} basePath={`/${locale}`} params={{ q, sort }} />
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
