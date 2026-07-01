import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { t } from '@/i18n/locales';

interface Props {
  locale: string;
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}

function buildHref(basePath: string, page: number, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set('page', String(page));
  const qs = query.toString();
  return `${basePath}${qs ? `?${qs}` : ''}`;
}

export function Pagination({ locale, page, pageSize, total, basePath, params = {} }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label={t(locale, 'pagination')}>
      <Link
        aria-disabled={page <= 1}
        className={`btn-soft text-sm ${page <= 1 ? 'pointer-events-none opacity-45' : ''}`}
        href={buildHref(basePath, Math.max(1, page - 1), params)}
      >
        <ChevronLeft size={16} /> {t(locale, 'previousPage')}
      </Link>
      {start > 1 ? <Link className="btn-soft h-11 w-11 px-0 text-sm" href={buildHref(basePath, 1, params)}>1</Link> : null}
      {start > 2 ? <span className="px-2 text-[var(--muted)]">…</span> : null}
      {pages.map((p) => (
        <Link key={p} className={`btn-soft h-11 w-11 px-0 text-sm ${p === page ? 'ring-2 ring-orange-200' : ''}`} href={buildHref(basePath, p, params)}>
          {p}
        </Link>
      ))}
      {end < totalPages - 1 ? <span className="px-2 text-[var(--muted)]">…</span> : null}
      {end < totalPages ? <Link className="btn-soft h-11 w-11 px-0 text-sm" href={buildHref(basePath, totalPages, params)}>{totalPages}</Link> : null}
      <Link
        aria-disabled={page >= totalPages}
        className={`btn-soft text-sm ${page >= totalPages ? 'pointer-events-none opacity-45' : ''}`}
        href={buildHref(basePath, Math.min(totalPages, page + 1), params)}
      >
        {t(locale, 'nextPage')} <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
