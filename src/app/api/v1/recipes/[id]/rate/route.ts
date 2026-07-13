import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import {
  findVote,
  insertWebVote,
  recalculateRecipeRating,
  setAppVoterVote,
  validVoterId,
  voterKey,
  VOTER_COOKIE,
  WEB_VOTE_SOURCE,
} from '@/lib/ratings';
import { publicApiHeaders } from '@/lib/public-recipes';
import { recipeUrl } from '@/lib/url';

export const runtime = 'nodejs';

class AlreadyVotedError extends Error {}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function normalizedHostname(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const candidate = value.includes('://') ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function sameOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite === 'same-origin') return true;
  if (fetchSite === 'cross-site') return false;

  const origin = normalizedHostname(req.headers.get('origin'));
  if (!origin) return true;

  const allowedHosts = [
    req.headers.get('x-forwarded-host'),
    req.headers.get('host'),
    process.env.NEXT_PUBLIC_SITE_URL,
    req.url,
  ]
    .map(normalizedHostname)
    .filter((host): host is string => Boolean(host));

  return allowedHosts.includes(origin);
}

interface ParsedRating {
  rating: number;
  source: 'web' | 'app';
  voterId?: string;
}

function parseRating(value: unknown): ParsedRating | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as { rating?: unknown; source?: unknown; voterId?: unknown };
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;

  if (body.source === 'app') {
    const voterId = typeof body.voterId === 'string' ? body.voterId : undefined;
    if (!validVoterId(voterId)) return null;
    return { rating, source: 'app', voterId };
  }
  return { rating, source: 'web' };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: publicApiHeaders() });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let parsed: ParsedRating | null = null;
  try {
    parsed = parseRating(await req.json());
  } catch {
    parsed = null;
  }
  if (!parsed) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: publicApiHeaders() });
  }

  const ip = clientIp(req);
  if (parsed.source === 'web') {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
    }
    if (!rateLimit(`recipe-rating:web:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  } else {
    const hashed = voterKey(parsed.voterId!);
    if (
      !rateLimit(`recipe-rating:app-ip:${ip}`, 120, 60 * 60 * 1000) ||
      !rateLimit(`recipe-rating:app-voter:${hashed}`, 30, 60 * 60 * 1000)
    ) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: publicApiHeaders() });
    }
  }

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true, locale: true, slug: true, rating: true, ratingCount: true },
  });
  if (!recipe) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: parsed.source === 'app' ? publicApiHeaders() : undefined });
  }

  if (parsed.source === 'app') {
    const hashedVoterKey = voterKey(parsed.voterId!);
    try {
      const aggregate = await prisma.$transaction(async (tx) => {
        await setAppVoterVote(tx, recipe.id, parsed!.rating, hashedVoterKey);
        return recalculateRecipeRating(tx, recipe.id);
      });
      revalidatePath(`/${recipe.locale}`);
      revalidatePath(recipeUrl(recipe.locale, recipe.id));
      revalidatePath(`/${recipe.locale}/recipes/${recipe.slug}`);
      return NextResponse.json({
        ok: true,
        rating: aggregate.rating,
        ratingCount: aggregate.ratingCount,
        userRating: parsed.rating,
      }, { headers: publicApiHeaders() });
    } catch (error) {
      console.error('[recipe-rating:app] failed', error);
      return NextResponse.json({ error: 'save_failed' }, { status: 500, headers: publicApiHeaders() });
    }
  }

  const storedVoterId = req.cookies.get(VOTER_COOKIE)?.value;
  const rawVoterId = validVoterId(storedVoterId) ? storedVoterId : randomUUID();
  const hashedVoterKey = voterKey(rawVoterId);

  try {
    const aggregate = await prisma.$transaction(async (tx) => {
      const inserted = await insertWebVote(tx, recipe.id, parsed!.rating, hashedVoterKey);
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
      userRating: parsed.rating,
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
    console.error('[recipe-rating:web] failed', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
