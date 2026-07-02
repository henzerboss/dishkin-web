import { Search } from 'lucide-react';
import { t } from '@/i18n/locales';

interface Props {
  locale: string;
  q: string;
  sort: string;
  action?: string;
  hidden?: Record<string, string | undefined>;
}

export function SearchFilters({ locale, q, sort, action, hidden = {} }: Props) {
  return (
    <section className="glass mt-8 rounded-[32px] p-4 sm:p-5">
      <form action={action ?? `/${locale}`} className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
          <input name="q" defaultValue={q} placeholder={t(locale, 'searchPlaceholder')} className="input ps-12" />
        </label>
        {Object.entries(hidden).map(([key, value]) => value ? <input key={key} type="hidden" name={key} value={value} /> : null)}
        <select name="sort" defaultValue={sort} className="input min-w-40">
          <option value="recent">{t(locale, 'recent')}</option>
          <option value="top">{t(locale, 'topRated')}</option>
        </select>
        <button className="btn-primary" type="submit">{t(locale, 'search')}</button>
      </form>
    </section>
  );
}
