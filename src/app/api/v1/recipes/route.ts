import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import {
  decodeCursor,
  listPublicRecipes,
  normalizeRequestedLocale,
  publicApiHeaders,
  type PublicRecipeSort,
} from '@/lib/public-recipes';

export const runtime = 'nodejs';

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: publicApiHeaders() });
}

export async function GET(req: NextRequest) {
  const headers = publicApiHeaders(true);
  if (!rateLimit(`recipe-catalog:${clientIp(req)}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: publicApiHeaders() });
  }

  const url = new URL(req.url);
  const requestedLocale = normalizeRequestedLocale(url.searchParams.get('locale'));
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const sort: PublicRecipeSort = url.searchParams.get('sort') === 'rating' ? 'rating' : 'relevance';
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(30, Math.max(5, rawLimit)) : 20;
  const offset = decodeCursor(url.searchParams.get('cursor'));

  try {
    const result = await listPublicRecipes({ requestedLocale, q, sort, limit, offset });
    return NextResponse.json({
      ok: true,
      requestedLocale,
      locale: result.locale,
      fallbackUsed: result.fallbackUsed,
      items: result.items,
      nextCursor: result.nextCursor,
    }, { headers });
  } catch (error) {
    console.error('[recipe-catalog] failed', error);
    return NextResponse.json({ error: 'catalog_failed' }, { status: 500, headers: publicApiHeaders() });
  }
}
