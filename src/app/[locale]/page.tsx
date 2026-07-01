import type { Metadata } from 'next';
import Image from 'next/image';
import { ChefHat, Sparkles } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { RecipeCard } from '@/components/RecipeCard';
import { SearchFilters } from '@/components/SearchFilters';
import { isSupportedLocale, t } from '@/i18n/locales';

export const revalidate = 300;
const PAGE_SIZE = 24;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = `${t(locale, 'homeTitle')} | Dishkin`;
  const description = t(locale, 'siteDescription');
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}` },
    openGraph: { title, description, url: `${SITE_URL}/${locale}`, siteName: 'Dishkin', images: ['/brand/icon.png'] },
  };
}

export default async function HomePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const sp = await searchParams;
  const q = String(sp.q ?? '').trim();
  const category = String(sp.category ?? '').trim();
  const sort = String(sp.sort ?? 'recent') === 'top' ? 'top' : 'recent';

  const where = {
    locale,
    ...(q ? { OR: [
      { title: { contains: q } },
      { searchText: { contains: q.toLowerCase() } },
      { cuisine: { contains: q } },
      { description: { contains: q } },
    ] } : {}),
    ...(category ? { categories: { some: { name: category } } } : {}),
  };

  const [recipes, categoryRows, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: { categories: true },
      orderBy: sort === 'top' ? [{ rating: 'desc' }, { updatedAt: 'desc' }] : [{ updatedAt: 'desc' }],
      take: PAGE_SIZE,
    }),
    prisma.recipeCategory.groupBy({ by: ['name'], where: { locale }, _count: { name: true }, orderBy: { _count: { name: 'desc' } }, take: 24 }),
    prisma.recipe.count({ where }),
  ]);

  const categories = categoryRows.map((c) => ({ name: c.name, count: c._count.name }));

  return (
    <div className="container pt-10 sm:pt-14">
      <section className="grid gap-8 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
        <div>
          <span className="badge"><Sparkles size={15} /> Dishkin AI</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">{t(locale, 'homeTitle')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">{t(locale, 'homeSubtitle')}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold text-[var(--muted)]">
            <span className="btn-soft">{total} {t(locale, 'allRecipes').toLowerCase()}</span>
            <span className="btn-soft">{t(locale, 'categories')}: {categories.length}</span>
          </div>
        </div>
        <div className="glass relative overflow-hidden rounded-[38px] p-6">
          <div className="absolute -end-12 -top-10 h-44 w-44 rounded-full bg-orange-200/50 blur-2xl" />
          <Image src="/brand/splash-icon.png" width={360} height={360} alt="Dishkin" className="relative mx-auto drop-shadow-2xl" priority />
        </div>
      </section>

      <SearchFilters locale={locale} q={q} category={category} sort={sort} categories={categories} />

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{t(locale, 'allRecipes')}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{total} results</p>
          </div>
        </div>
        {recipes.length ? (
          <div className="recipe-grid">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} locale={locale} />)}
          </div>
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
