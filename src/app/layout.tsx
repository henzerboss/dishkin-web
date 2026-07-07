import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { headers } from 'next/headers';
import './globals.css';
import { GA_ID, SITE_URL } from '@/lib/config';
import { DEFAULT_LOCALE, isRtl, isSupportedLocale } from '@/i18n/locales';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AI Recipe Generator App | Dishkin',
  description: 'Create recipes from what is in your fridge, keep your cookbook and make shopping lists.',
  icons: [{ rel: 'icon', url: '/brand/icon-192.png' }],
};

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-dishkin-pathname') ?? '';
  const maybeLocale = pathname.split('/').filter(Boolean)[0] ?? DEFAULT_LOCALE;
  const locale = isSupportedLocale(maybeLocale) ? maybeLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
