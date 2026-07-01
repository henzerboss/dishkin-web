import Link from 'next/link';
import { Search } from 'lucide-react';
import { t } from '@/i18n/locales';

interface Props {
  locale: string;
  q: string;
  category: string;
  sort: string;
  categories: { name: string; count: number }[];
}

function href(locale: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const qs = query.toString();
  return `/${locale}${qs ? `?${qs}` : ''}`;
}

export function SearchFilters({ locale, q, category, sort, categories }: Props) {
  return (
    <section className="glass mt-8 rounded-[32px] p-4 sm:p-5">
      <form action={`/${locale}`} className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
          <input name="q" defaultValue={q} placeholder={t(locale, 'searchPlaceholder')} className="input ps-11" />
        </label>
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <select name="sort" defaultValue={sort} className="input min-w-40">
          <option value="recent">{t(locale, 'recent')}</option>
          <option value="top">{t(locale, 'topRated')}</option>
        </select>
        <button className="btn-primary" type="submit">{t(locale, 'search')}</button>
      </form>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link className={`btn-soft shrink-0 text-sm ${!category ? 'ring-2 ring-orange-200' : ''}`} href={href(locale, { q, sort })}>{t(locale, 'all')}</Link>
        {categories.map((c) => (
          <Link key={c.name} className={`btn-soft shrink-0 text-sm ${category === c.name ? 'ring-2 ring-orange-200' : ''}`} href={href(locale, { q, sort, category: c.name })}>
            {c.name}<span className="text-[var(--muted)]">{c.count}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
