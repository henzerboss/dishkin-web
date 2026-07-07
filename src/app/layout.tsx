import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { GA_ID, SITE_URL } from '@/lib/config';
import { DEFAULT_LOCALE, isRtl, isSupportedLocale } from '@/i18n/locales';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'AI Recipe Generator App | Dishkin',
  description: 'Create recipes from what is in your fridge, keep your cookbook and make shopping lists.',
  icons: {
    icon: [{ url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const segment = requestHeaders.get('x-locale') ?? '';
  const locale = isSupportedLocale(segment) ? segment : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
        {GA_ID ? <Analytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
