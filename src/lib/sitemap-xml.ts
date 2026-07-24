import { NextResponse } from 'next/server';

export const SITEMAP_PAGE_SIZE = 45_000;

interface SitemapUrlEntry {
  loc: string;
  lastmod?: Date | string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function buildSitemapIndex(urls: Array<{ loc: string; lastmod?: Date | string }>): string {
  const body = urls.map(({ loc, lastmod }) => [
    '  <sitemap>',
    `    <loc>${escapeXml(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${formatDate(lastmod)}</lastmod>`] : []),
    '  </sitemap>',
  ].join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

export function buildUrlSet(entries: SitemapUrlEntry[]): string {
  const body = entries.map(({ loc, lastmod, changefreq, priority }) => [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${formatDate(lastmod)}</lastmod>`] : []),
    ...(changefreq ? [`    <changefreq>${changefreq}</changefreq>`] : []),
    ...(typeof priority === 'number' ? [`    <priority>${priority.toFixed(1)}</priority>`] : []),
    '  </url>',
  ].join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function sitemapResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
