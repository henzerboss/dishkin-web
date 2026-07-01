import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StoreInstallBanner } from '@/components/StoreInstallBanner';
import { isRtl, isSupportedLocale } from '@/i18n/locales';

export function generateStaticParams() {
  return [];
}

function detectPlatform(userAgent: string): 'ios' | 'android' | 'other' {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const h = await headers();
  const platform = detectPlatform(h.get('user-agent') ?? '');

  return (
    <div dir={isRtl(locale) ? 'rtl' : 'ltr'}>
      <StoreInstallBanner locale={locale} platform={platform} />
      <Header locale={locale} />
      <main>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
