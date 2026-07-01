import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/config';
import { t } from '@/i18n/locales';

export function Footer({ locale }: { locale: string }) {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-white/60 py-10">
      <div className="container flex flex-col justify-between gap-4 text-sm text-[var(--muted)] sm:flex-row">
        <p>© {new Date().getFullYear()} Dishkin. {t(locale, 'siteDescription')}</p>
        <div className="flex gap-4">
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
          <Link href="/admin">{t(locale, 'admin')}</Link>
        </div>
      </div>
    </footer>
  );
}
