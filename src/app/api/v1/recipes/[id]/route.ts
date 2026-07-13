import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { publicApiHeaders, publicRecipeDetail } from '@/lib/public-recipes';

export const runtime = 'nodejs';

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: publicApiHeaders() });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = publicApiHeaders(true);
  if (!rateLimit(`recipe-detail:${clientIp(req)}`, 900, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: publicApiHeaders() });
  }

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { categories: { select: { name: true } } },
  });
  if (!recipe) return NextResponse.json({ error: 'not_found' }, { status: 404, headers: publicApiHeaders() });
  return NextResponse.json({ ok: true, recipe: publicRecipeDetail(recipe) }, { headers });
}
