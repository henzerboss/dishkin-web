import { NextResponse, type NextRequest } from 'next/server';

// Passes the first path segment to the root layout so it can set <html lang="…">.
export function middleware(request: NextRequest) {
  const segment = request.nextUrl.pathname.split('/')[1] ?? '';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', segment);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/|api/|uploads/|brand/|favicon\\.ico|robots\\.txt|sitemap\\.xml|sitemap-index\\.xml|sitemaps/|manifest\\.webmanifest|llms\\.txt).*)',
  ],
};
