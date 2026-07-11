import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import {
  findVote,
  insertWebVote,
  recalculateRecipeRating,
  validVoterId,
  voterKey,
  VOTER_COOKIE,
  WEB_VOTE_SOURCE,
} from '@/lib/ratings';
import { recipeUrl } from '@/lib/url';

export const runtime = 'nodejs';

class AlreadyVotedError extends Error {}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

function parseRating(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const rating = Number((value as { rating?: unknown }).rating);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }
  if (!rateLimit(`recipe-rating:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let rating: number | null = null;
  try {
    rating = parseRating(await req.json());
  } catch {
    rating = null;
  }
  if (rating === null) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true, locale: true, slug: true, rating: true, ratingCount: true },
  });
  if (!recipe) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const storedVoterId = req.cookies.get(VOTER_COOKIE)?.value;
  const rawVoterId = validVoterId(storedVoterId) ? storedVoterId : randomUUID();
  const hashedVoterKey = voterKey(rawVoterId);

  try {
    const aggregate = await prisma.$transaction(async (tx) => {
      const inserted = await insertWebVote(tx, recipe.id, rating, hashedVoterKey);
      if (!inserted) throw new AlreadyVotedError();
      return recalculateRecipeRating(tx, recipe.id);
    });

    revalidatePath(`/${recipe.locale}`);
    revalidatePath(recipeUrl(recipe.locale, recipe.id));
    revalidatePath(`/${recipe.locale}/recipes/${recipe.slug}`);

    const response = NextResponse.json({
      ok: true,
      rating: aggregate.rating,
      ratingCount: aggregate.ratingCount,
      userRating: rating,
    });
    response.cookies.set(VOTER_COOKIE, rawVoterId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10,
    });
    return response;
  } catch (error) {
    if (error instanceof AlreadyVotedError) {
      const existingVote = await findVote(prisma, recipe.id, WEB_VOTE_SOURCE, hashedVoterKey);
      const latestRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
        select: { rating: true, ratingCount: true },
      });
      return NextResponse.json({
        error: 'already_voted',
        rating: latestRecipe?.rating ?? recipe.rating,
        ratingCount: latestRecipe?.ratingCount ?? recipe.ratingCount,
        userRating: existingVote?.value ?? null,
      }, { status: 409 });
    }
    console.error('[recipe-rating] failed', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
