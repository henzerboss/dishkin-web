import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChefHat, Clock, Gauge, Star, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { interpolate, isSupportedLocale, t } from '@/i18n/locales';
import { difficultyKey, recipeIngredients, recipeNutrition, recipeSteps } from '@/lib/recipe';
import { categoryUrl, recipeUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function decodeHandle(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function findRecipe(locale: string, handle: string) {
  const decoded = decodeHandle(handle);
  return prisma.recipe.findFirst({
    where: {
      locale,
      OR: [{ id: decoded }, { slug: decoded }, { slug: handle }],
    },
    include: { categories: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const recipe = await findRecipe(locale, slug);
  if (!recipe) return {};
  const description = recipe.description || `${recipe.title} — ${t(locale, 'siteDescription')}`;
  const url = `${SITE_URL}${recipeUrl(locale, recipe.id)}`;
  return {
    title: `${recipe.title} | Dishkin`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: recipe.title,
      description,
      url,
      type: 'article',
      images: recipe.photoUrl ? [recipe.photoUrl] : ['/brand/icon.png'],
    },
  };
}

export default async function RecipePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const recipe = await findRecipe(locale, slug);
  if (!recipe) notFound();

  const ingredients = recipeIngredients(recipe);
  const steps = recipeSteps(recipe);
  const nutrition = recipeNutrition(recipe);
  const diff = difficultyKey(recipe.difficulty);
  const authenticity = interpolate(t(locale, 'authenticity'), { percent: recipe.authenticityPercent });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description ?? undefined,
    image: recipe.photoUrl ? `${SITE_URL}${recipe.photoUrl}` : undefined,
    recipeCuisine: recipe.cuisine ?? undefined,
    recipeYield: String(recipe.servings),
    totalTime: `PT${Math.max(1, recipe.timeMinutes)}M`,
    recipeIngredient: ingredients.map((i) => `${i.amount ? `${i.amount} ` : ''}${i.name}`),
    recipeInstructions: steps.map((s, idx) => ({ '@type': 'HowToStep', position: idx + 1, text: s.text })),
    aggregateRating: recipe.rating ? { '@type': 'AggregateRating', ratingValue: recipe.rating, ratingCount: recipe.ratingCount || 1 } : undefined,
    nutrition: nutrition ? { '@type': 'NutritionInformation', calories: nutrition.calories ? `${nutrition.calories} calories` : undefined, proteinContent: nutrition.protein ? `${nutrition.protein} g` : undefined, carbohydrateContent: nutrition.carbs ? `${nutrition.carbs} g` : undefined, fatContent: nutrition.fat ? `${nutrition.fat} g` : undefined } : undefined,
  };

  return (
    <div className="container pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${locale}`} className="btn-soft mb-6"><ArrowLeft size={16} /> {t(locale, 'back')}</Link>
      <article className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
        <div className="card sticky top-24 overflow-hidden">
          <div className="relative h-[340px] bg-gradient-to-br from-orange-100 to-emerald-50">
            {recipe.photoUrl ? (
              <Image src={recipe.photoUrl} alt={recipe.title} fill priority sizes="(max-width: 980px) 100vw, 44vw" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--primary)]"><ChefHat size={72} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Clock size={17} /><b className="mt-2 block">{recipe.timeMinutes} {t(locale, 'min')}</b><span className="text-[var(--muted)]">{t(locale, 'time')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Gauge size={17} /><b className="mt-2 block">{t(locale, diff)}</b><span className="text-[var(--muted)]">{t(locale, 'difficulty')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Users size={17} /><b className="mt-2 block">{recipe.servings}</b><span className="text-[var(--muted)]">{t(locale, 'servings')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Star size={17} fill="currentColor" /><b className="mt-2 block">{recipe.rating ? `${recipe.rating}/5` : '—'}</b><span className="text-[var(--muted)]">{t(locale, 'rating')}</span></div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {recipe.categories.map((c) => <Link key={c.id} href={categoryUrl(locale, c.name)} className="badge">{c.name}</Link>)}
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{recipe.title}</h1>
          <p className="mt-4 text-[var(--muted)]">{recipe.type === 'verified' ? t(locale, 'traditional') : authenticity}{recipe.cuisine ? ` · ${recipe.cuisine}` : ''}</p>
          {recipe.description ? <p className="mt-6 text-lg leading-8 text-[var(--muted)]">{recipe.description}</p> : null}

          <section className="card mt-8 p-6">
            <h2 className="text-2xl font-black">{t(locale, 'ingredients')}</h2>
            <ul className="mt-5 grid gap-3">
              {ingredients.map((i, idx) => (
                <li key={`${i.name}-${idx}`} className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                  <span className="font-bold">{i.name}</span>
                  {i.amount ? <span className="text-end text-[var(--muted)]">{i.amount}</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="card mt-6 p-6">
            <h2 className="text-2xl font-black">{t(locale, 'steps')}</h2>
            <ol className="mt-5 grid gap-4">
              {steps.map((s, idx) => (
                <li key={`${s.text}-${idx}`} className="grid grid-cols-[42px_1fr] gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] font-black text-white">{idx + 1}</span>
                  <p className="pt-2 leading-7 text-[var(--muted)]">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
    </div>
  );
}
