import { headers } from 'next/headers';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/config';
import { t } from '@/i18n/locales';
import { StoreInstallBannerClient } from '@/components/StoreInstallBannerClient';

type Platform = 'ios' | 'android' | 'other';

interface Props {
  locale: string;
}

function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export async function StoreInstallBanner({ locale }: Props) {
  const userAgent = (await headers()).get('user-agent') ?? '';
  const platform = detectPlatform(userAgent);

  if (platform === 'other') return null;

  const url = platform === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL;
  const button = platform === 'ios' ? t(locale, 'openAppStore') : t(locale, 'openGooglePlay');

  return (
    <StoreInstallBannerClient
      platform={platform}
      title={t(locale, 'installTitle')}
      body={t(locale, 'installBody')}
      button={button}
      closeLabel={t(locale, 'close')}
      url={url}
    />
  );
}
