'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/config';
import { t } from '@/i18n/locales';

interface Props {
  locale: string;
  platform: 'ios' | 'android' | 'other';
}

export function StoreInstallBanner({ locale, platform }: Props) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (platform === 'other') return;
    const key = `dishkin-install-hidden-${platform}`;
    setHidden(window.localStorage.getItem(key) === '1');
  }, [platform]);

  if (platform === 'other' || hidden) return null;
  const url = platform === 'ios' ? APP_STORE_URL : GOOGLE_PLAY_URL;
  const dismiss = () => {
    window.localStorage.setItem(`dishkin-install-hidden-${platform}`, '1');
    setHidden(true);
  };

  return (
    <div className="border-b border-orange-100 bg-white/90 backdrop-blur-xl">
      <div className="container flex items-center gap-3 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)]">
          <Sparkles size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight">{t(locale, 'installTitle')}</p>
          <p className="truncate text-sm text-[var(--muted)]">{t(locale, 'installBody')}</p>
        </div>
        <a className="btn-primary px-4 py-2 text-sm" href={url} rel="noopener noreferrer">{t(locale, 'installButton')}</a>
        <button className="rounded-full p-2 text-[var(--muted)]" onClick={dismiss} aria-label="Close"><X size={18} /></button>
      </div>
    </div>
  );
}
