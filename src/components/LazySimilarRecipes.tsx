'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RecipeCard } from '@/components/RecipeCard';
import type { RecipeCardData } from '@/lib/recipe-card';

const BATCH_SIZE = 16;
const MAX_ITEMS = 128;

interface SimilarResponse {
  ok: boolean;
  items: RecipeCardData[];
  nextOffset: number | null;
  hasMore: boolean;
}

interface Props {
  recipeId: string;
  locale: string;
  initialItems: RecipeCardData[];
  initialHasMore: boolean;
  retryLabel: string;
}

export function LazySimilarRecipes({ recipeId, locale, initialItems, initialHasMore, retryLabel }: Props) {
  const [items, setItems] = useState(initialItems.slice(0, MAX_ITEMS));
  const [nextOffset, setNextOffset] = useState(initialItems.length);
  const [hasMore, setHasMore] = useState(initialHasMore && initialItems.length < MAX_ITEMS);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current || nextOffset >= MAX_ITEMS) return;
    loadingRef.current = true;
    setLoading(true);
    setFailed(false);

    try {
      const limit = Math.min(BATCH_SIZE, MAX_ITEMS - nextOffset);
      const response = await fetch(
        `/api/v1/recipes/${encodeURIComponent(recipeId)}/similar?offset=${nextOffset}&limit=${limit}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error(`similar_recipes_${response.status}`);
      const payload = await response.json() as SimilarResponse;
      if (!payload.ok) throw new Error('similar_recipes_invalid_response');

      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        const additions = payload.items.filter((item) => !seen.has(item.id));
        return [...current, ...additions].slice(0, MAX_ITEMS);
      });

      const resolvedOffset = payload.nextOffset ?? nextOffset + payload.items.length;
      setNextOffset(Math.min(MAX_ITEMS, resolvedOffset));
      setHasMore(payload.hasMore && payload.items.length > 0 && resolvedOffset < MAX_ITEMS);
    } catch (error) {
      console.error('[similar-recipes] lazy load failed', error);
      setFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, nextOffset, recipeId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '700px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="recipe-grid recipe-grid-four">
        {items.map((item) => <RecipeCard key={item.id} recipe={item} locale={locale} />)}
      </div>

      {loading ? (
        <div className="recipe-grid recipe-grid-four mt-5" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="card h-[390px] animate-pulse bg-white/60" />
          ))}
        </div>
      ) : null}

      {failed ? (
        <div className="mt-6 flex justify-center">
          <button type="button" className="btn-soft" onClick={() => void loadMore()} aria-label={retryLabel}>
            <RefreshCw size={17} /> {retryLabel}
          </button>
        </div>
      ) : null}

      {hasMore ? <div ref={sentinelRef} className="h-2" aria-hidden="true" /> : null}
    </>
  );
}
