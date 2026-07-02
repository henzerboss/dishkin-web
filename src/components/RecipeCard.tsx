import Image from 'next/image';
import Link from 'next/link';
import { ChefHat, Clock, Star } from 'lucide-react';
import type { Recipe, RecipeCategory } from '@prisma/client';
import { t, interpolate } from '@/i18n/locales';
import { recipeIngredients } from '@/lib/recipe';
import { categoryUrl, recipeUrl } from '@/lib/url';

interface Props {
  recipe: Recipe & { categories: RecipeCategory[] };
  locale: string;
}

export function RecipeCard({ recipe, locale }: Props) {
  const ingredients = recipeIngredients(recipe).slice(0, 4);
  const authenticity = interpolate(t(locale, 'authenticity'), { percent: recipe.authenticityPercent });

  return (
    <article className="card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-2xl">
      <Link href={recipeUrl(locale, recipe.id)} className="block">
        <div className="relative h-52 bg-gradient-to-br from-orange-100 to-emerald-50">
          {recipe.photoUrl ? (
            <Image src={recipe.photoUrl} alt={recipe.title} fill sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--primary)]"><ChefHat size={54} /></div>
          )}
          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black shadow-sm">
            {recipe.type === 'verified' ? t(locale, 'traditional') : authenticity}
          </div>
        </div>
      </Link>
      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {recipe.categories.slice(0, 3).map((c) => <Link key={c.id} href={categoryUrl(locale, c.name)} className="badge py-1 text-xs">{c.name}</Link>)}
        </div>
        <Link href={recipeUrl(locale, recipe.id)}>
          <h2 className="line-clamp-2 text-xl font-black tracking-tight">{recipe.title}</h2>
        </Link>
        {recipe.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{recipe.description}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-1"><Clock size={15} /> {recipe.timeMinutes} {t(locale, 'min')}</span>
          {recipe.rating ? <span className="inline-flex items-center gap-1"><Star size={15} fill="currentColor" /> {recipe.rating}/5</span> : null}
        </div>
        {ingredients.length ? (
          <p className="mt-4 line-clamp-1 text-sm text-[var(--muted)]">{ingredients.map((i) => i.name).join(' · ')}</p>
        ) : null}
      </div>
    </article>
  );
}
