'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/config';
import { t } from '@/i18n/locales';

type Platform = 'ios' | 'android' | 'other';

interface Props {
  locale: string;
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';

  return 'other';
}

export function StoreInstallBanner({ locale }: Props) {
  const [platform, setPlatform] = useState<Platform>('other');
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    if (detectedPlatform === 'other') return;

    const key = `dishkin-store-banner-hidden-${detectedPlatform}`;
    setHidden(window.localStorage.getItem(key) === '1');
  }, []);

  if (platform === 'other' || hidden) return null;

  const url = platform === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL;
  const button = platform === 'ios' ? t(locale, 'openAppStore') : t(locale, 'openGooglePlay');

  const dismiss = () => {
    window.localStorage.setItem(`dishkin-store-banner-hidden-${platform}`, '1');
    setHidden(true);
  };

  return (
    <div className="border-b border-orange-100 bg-white/95 backdrop-blur-xl">
      <div className="container flex items-center gap-2 py-3 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)] sm:h-11 sm:w-11">
          <Sparkles size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight">{t(locale, 'installTitle')}</p>
          <p className="truncate text-sm text-[var(--muted)]">{t(locale, 'installBody')}</p>
        </div>

        <a className="btn-primary shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm" href={url} target="_blank" rel="noopener noreferrer">
          {button}
        </a>

        <button className="rounded-full p-2 text-[var(--muted)]" onClick={dismiss} aria-label={t(locale, 'close')}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
