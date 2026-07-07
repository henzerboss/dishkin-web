import Image from 'next/image';
import Link from 'next/link';
import { Languages, Tags } from 'lucide-react';
import { LANGUAGES, t } from '@/i18n/locales';

interface Props {
  locale: string;
}

export function Header({ locale }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-2 py-2 sm:flex-nowrap sm:gap-4">
        <Link href={`/${locale}`} className="flex min-w-0 items-center gap-2 font-black tracking-tight sm:gap-3">
          <Image src="/brand/icon-64.webp" width={38} height={38} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-xl sm:h-[38px] sm:w-[38px]" priority />
          <span className="truncate text-lg sm:text-base">Dishkin</span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none" aria-label="Site navigation">
          <Link href={`/${locale}/categories`} className="btn-soft min-h-10 px-3 text-sm" aria-label={t(locale, 'categories')}>
            <Tags size={16} /> <span className="hidden sm:inline">{t(locale, 'categories')}</span>
          </Link>
          <details className="relative">
            <summary className="btn-soft min-h-10 list-none px-3 text-sm" aria-label={t(locale, 'language')}>
              <Languages size={16} /> <span className="hidden sm:inline">{t(locale, 'language')}</span>
            </summary>
            <div className="absolute end-0 mt-2 grid max-h-[70vh] w-64 grid-cols-1 overflow-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-2xl">
              {LANGUAGES.map((l) => (
                <Link key={l.code} href={`/${l.code}`} className="rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface)]">
                  <span className="me-2">{l.flag}</span>{l.native}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
