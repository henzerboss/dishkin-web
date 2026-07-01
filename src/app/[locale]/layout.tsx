import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StoreInstallBanner } from '@/components/StoreInstallBanner';
import { isRtl, isSupportedLocale } from '@/i18n/locales';

export function generateStaticParams() {
  return [];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return (
    <div dir={isRtl(locale) ? 'rtl' : 'ltr'}>
      <StoreInstallBanner locale={locale} />
      <Header locale={locale} />
      <main>{children}</main>
      <Footer locale={locale} />
    </div>
  );
}
