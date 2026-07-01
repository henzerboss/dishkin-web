import Image from 'next/image';
import Link from 'next/link';
import { Languages, Shield } from 'lucide-react';
import { LANGUAGES, t } from '@/i18n/locales';

interface Props {
  locale: string;
}

export function Header({ locale }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="flex items-center gap-3 font-black tracking-tight">
          <Image src="/brand/icon.png" width={38} height={38} alt="Dishkin" className="rounded-xl" priority />
          <span>Dishkin</span>
        </Link>
        <nav className="flex items-center gap-2">
          <details className="relative">
            <summary className="btn-soft list-none text-sm">
              <Languages size={16} /> {t(locale, 'language')}
            </summary>
            <div className="absolute end-0 mt-2 grid max-h-[70vh] w-64 grid-cols-1 overflow-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-2xl">
              {LANGUAGES.map((l) => (
                <Link key={l.code} href={`/${l.code}`} className="rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface)]">
                  <span className="me-2">{l.flag}</span>{l.native}
                </Link>
              ))}
            </div>
          </details>
          <Link href="/admin" className="btn-soft hidden text-sm sm:inline-flex"><Shield size={16} /> {t(locale, 'admin')}</Link>
        </nav>
      </div>
    </header>
  );
}
