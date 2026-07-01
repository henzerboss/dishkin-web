export function recipeUrl(locale: string, recipeId: string): string {
  return `/${locale}/recipes/${encodeURIComponent(recipeId)}`;
}

export function categoryUrl(locale: string, categoryName: string): string {
  return `/${locale}/categories/${encodeURIComponent(categoryName)}`;
}

export function pageUrl(pathname: string, page: number, params: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set('page', String(page));
  const qs = query.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

export function safePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw || '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
