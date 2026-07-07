import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Tags } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { categoryEmoji } from '@/lib/categories';
import { categoryUrl } from '@/lib/url';
import { isSupportedLocale, t } from '@/i18n/locales';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = `${t(locale, 'categoriesTitle')} | Dishkin`;
  const description = t(locale, 'categoriesSubtitle');
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}/categories` },
    openGraph: { title, description, url: `${SITE_URL}/${locale}/categories`, siteName: 'Dishkin', images: ['/brand/icon-512.png'] },
  };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const categories = await prisma.recipeCategory.groupBy({
    by: ['name'],
    where: { locale },
    _count: { name: true },
    orderBy: [{ _count: { name: 'desc' } }, { name: 'asc' }],
  });

  return (
    <div className="container pt-10 sm:pt-14">
      <section className="max-w-3xl">
        <span className="badge"><Tags size={15} /> {t(locale, 'categories')}</span>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{t(locale, 'categoriesTitle')}</h1>
        <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{t(locale, 'categoriesSubtitle')}</p>
      </section>

      {categories.length ? (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.name} href={categoryUrl(locale, c.name)} className="card flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:shadow-2xl">
              <span className="text-4xl" aria-hidden>{categoryEmoji(c.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-black">{c.name}</span>
                <span className="text-sm text-[var(--muted)]">{c._count.name} {t(locale, 'recipesCount')}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <div className="card mt-10 px-6 py-16 text-center text-[var(--muted)]">{t(locale, 'emptyBody')}</div>
      )}
    </div>
  );
}
