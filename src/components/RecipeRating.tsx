'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';

interface Props {
  recipeId: string;
  locale: string;
  initialRating: number | null;
  initialRatingCount: number;
  initialUserRating: number | null;
  title: string;
  body: string;
  thanks: string;
  already: string;
  errorText: string;
  summaryTemplate: string;
  noVotes: string;
  ariaTemplate: string;
}

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    template,
  );
}

function format(value: number | null, locale: string) {
  if (value === null) return '—';
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  } catch {
    return value.toFixed(1).replace(/\.0$/, '');
  }
}

export function RecipeRating({
  recipeId,
  locale,
  initialRating,
  initialRatingCount,
  initialUserRating,
  title,
  body,
  thanks,
  already,
  errorText,
  summaryTemplate,
  noVotes,
  ariaTemplate,
}: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(initialUserRating);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'already' | 'error'>(initialUserRating ? 'already' : 'idle');

  const selected = hovered || userRating || 0;
  const locked = status === 'saving' || userRating !== null;
  const summary = ratingCount > 0 && rating !== null
    ? interpolate(summaryTemplate, { rating: format(rating, locale), count: ratingCount })
    : noVotes;

  async function submit(value: number) {
    if (locked) return;
    setStatus('saving');
    setUserRating(value);
    try {
      const response = await fetch(`/api/v1/recipes/${encodeURIComponent(recipeId)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setRating(typeof data.rating === 'number' ? data.rating : rating);
        setRatingCount(typeof data.ratingCount === 'number' ? data.ratingCount : ratingCount + 1);
        setUserRating(typeof data.userRating === 'number' ? data.userRating : value);
        setStatus('saved');
        router.refresh();
        return;
      }
      if (response.status === 409 && data.error === 'already_voted') {
        setRating(typeof data.rating === 'number' ? data.rating : rating);
        setRatingCount(typeof data.ratingCount === 'number' ? data.ratingCount : ratingCount);
        setUserRating(typeof data.userRating === 'number' ? data.userRating : value);
        setStatus('already');
        return;
      }
      setUserRating(null);
      setStatus('error');
    } catch {
      setUserRating(null);
      setStatus('error');
    }
  }

  return (
    <section className="card mt-7 p-5 sm:p-6" aria-labelledby={`rating-title-${recipeId}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id={`rating-title-${recipeId}`} className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</p>
          <p className="mt-2 text-sm font-bold text-[var(--muted)]">{summary}</p>
        </div>
        <div className="shrink-0">
          <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="rounded-xl p-1.5 text-amber-500 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:hover:scale-100"
                disabled={locked}
                aria-label={interpolate(ariaTemplate, { stars: value })}
                aria-pressed={userRating === value}
                onMouseEnter={() => !locked && setHovered(value)}
                onFocus={() => !locked && setHovered(value)}
                onBlur={() => setHovered(0)}
                onClick={() => void submit(value)}
              >
                <Star size={32} fill={value <= selected ? 'currentColor' : 'none'} strokeWidth={2.2} />
              </button>
            ))}
          </div>
          <p className={`mt-2 min-h-5 text-center text-sm font-bold ${status === 'error' ? 'text-red-600' : 'text-[var(--accent)]'}`} aria-live="polite">
            {status === 'saving' ? '…' : status === 'saved' ? thanks : status === 'already' ? already : status === 'error' ? errorText : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
