import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft, ChefHat, Clock, Gauge, Sparkles, Star, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { SITE_URL } from '@/lib/config';
import { interpolate, isSupportedLocale, t } from '@/i18n/locales';
import { difficultyKey, recipeIngredients, recipeSteps } from '@/lib/recipe';
import { categoryUrl, recipeUrl } from '@/lib/url';
import { findSimilarRecipes } from '@/lib/similar-recipes';
import { absoluteSiteUrl, buildRecipeJsonLd } from '@/lib/structured-data';
import { AppStoreButtons } from '@/components/AppStoreButtons';
import { RecipeRating } from '@/components/RecipeRating';
import { findWebVote, formatRating, VOTER_COOKIE } from '@/lib/ratings';
import { RecipeShare } from '@/components/RecipeShare';
import { LazySimilarRecipes } from '@/components/LazySimilarRecipes';
import { toRecipeCardData } from '@/lib/recipe-card';

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
      siteName: 'Dishkin',
      images: recipe.photoUrl ? [recipe.photoUrl] : ['/brand/icon.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.title,
      description,
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
  const diff = difficultyKey(recipe.difficulty);
  const authenticity = interpolate(t(locale, 'authenticity'), { percent: recipe.authenticityPercent });
  const cookieStore = await cookies();
  const [jsonLd, similarRecipes, currentVote] = await Promise.all([
    Promise.resolve(buildRecipeJsonLd(recipe, locale)),
    findSimilarRecipes(recipe, 9),
    findWebVote(recipe.id, cookieStore.get(VOTER_COOKIE)?.value),
  ]);

  const initialSimilarRecipes = similarRecipes.slice(0, 8).map(toRecipeCardData);
  const hasMoreSimilarRecipes = similarRecipes.length > initialSimilarRecipes.length;
  const shareUrl = `${SITE_URL}${recipeUrl(locale, recipe.id)}`;
  const shareImageUrl = absoluteSiteUrl(recipe.photoUrl);

  return (
    <div className="container pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${locale}`} className="btn-soft mb-6"><ArrowLeft size={16} /> {t(locale, 'back')}</Link>
      <article className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-start">
        <div className="card overflow-hidden lg:sticky lg:top-24">
          <div className="relative h-[260px] bg-gradient-to-br from-orange-100 to-emerald-50 sm:h-[340px]">
            {recipe.photoUrl ? (
              <Image src={recipe.photoUrl} alt={recipe.title} fill priority sizes="(max-width: 980px) 100vw, 44vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--primary)]"><ChefHat size={72} /></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Clock size={17} /><b className="mt-2 block">{recipe.timeMinutes} {t(locale, 'min')}</b><span className="text-[var(--muted)]">{t(locale, 'time')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Gauge size={17} /><b className="mt-2 block">{t(locale, diff)}</b><span className="text-[var(--muted)]">{t(locale, 'difficulty')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Users size={17} /><b className="mt-2 block">{recipe.servings}</b><span className="text-[var(--muted)]">{t(locale, 'servings')}</span></div>
            <div className="rounded-2xl bg-[var(--surface)] p-3"><Star size={17} fill="currentColor" /><b className="mt-2 block">{recipe.rating ? `${formatRating(recipe.rating, locale)}/5` : '—'}</b><span className="text-[var(--muted)]">{t(locale, 'rating')}</span></div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {recipe.categories.map((c) => <Link key={c.id} href={categoryUrl(locale, c.name)} className="badge">{c.name}</Link>)}
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{recipe.title}</h1>
          <p className="mt-4 text-[var(--muted)]">{recipe.type === 'verified' ? t(locale, 'traditional') : authenticity}{recipe.cuisine ? ` · ${recipe.cuisine}` : ''}</p>
          {recipe.description ? <p className="mt-6 text-lg leading-8 text-[var(--muted)]">{recipe.description}</p> : null}

          <aside className="mt-7 rounded-[24px] border border-orange-200 bg-gradient-to-br from-orange-50 to-emerald-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-sm"><Sparkles size={20} /></span>
              <div>
                <h2 className="text-lg font-black">{t(locale, 'recipeAppPromoTitle')}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t(locale, 'recipeAppPromoBody')}</p>
              </div>
            </div>
            <div className="mt-4"><AppStoreButtons locale={locale} compact /></div>
          </aside>

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

          <RecipeRating
            recipeId={recipe.id}
            locale={locale}
            initialRating={recipe.rating}
            initialRatingCount={recipe.ratingCount}
            initialUserRating={currentVote?.value ?? null}
            title={t(locale, 'rateRecipeTitle')}
            body={t(locale, 'rateRecipeBody')}
            thanks={t(locale, 'ratingThanks')}
            already={t(locale, 'ratingAlreadySubmitted')}
            errorText={t(locale, 'ratingSubmitError')}
            summaryTemplate={t(locale, 'ratingSummary')}
            noVotes={t(locale, 'ratingNoVotes')}
            ariaTemplate={t(locale, 'ratingAria')}
          />

          <RecipeShare
            title={recipe.title}
            url={shareUrl}
            imageUrl={shareImageUrl}
            heading={t(locale, 'shareRecipe')}
            copyLabel={t(locale, 'copyLink')}
            copiedLabel={t(locale, 'linkCopied')}
          />

        </div>
      </article>

      {initialSimilarRecipes.length ? (
        <section className="mt-12 sm:mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{t(locale, 'similarRecipes')}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t(locale, 'similarRecipesSubtitle')}</p>
            </div>
          </div>
          <LazySimilarRecipes
            recipeId={recipe.id}
            locale={locale}
            initialItems={initialSimilarRecipes}
            initialHasMore={hasMoreSimilarRecipes}
            retryLabel={t(locale, 'retry')}
          />
        </section>
      ) : null}
    </div>
  );
}
