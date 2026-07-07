'use client';

import { useEffect, useState } from 'react';

type Platform = 'ios' | 'android';

interface StoreInstallBannerClientProps {
  platform: Platform;
  title: string;
  body: string;
  button: string;
  closeLabel: string;
  url: string;
}

export function StoreInstallBannerClient({ platform, title, body, button, closeLabel, url }: StoreInstallBannerClientProps) {
  const storageKey = `dishkin-store-banner-hidden-${platform}`;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(window.localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (hidden) return null;

  const dismiss = () => {
    window.localStorage.setItem(storageKey, '1');
    setHidden(true);
  };

  return (
    <aside className="install-banner border-b border-orange-100 bg-white/95 backdrop-blur-xl" aria-label={title}>
      <div className="container flex items-center gap-2 py-3 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)] sm:h-11 sm:w-11" aria-hidden="true">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
            <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight">{title}</p>
          <p className="truncate text-sm text-[var(--muted)]">{body}</p>
        </div>

        <a className="btn-primary shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm" href={url} target="_blank" rel="noopener noreferrer" aria-label={button}>
          {button}
        </a>

        <button className="rounded-full p-2 text-[var(--muted)]" type="button" onClick={dismiss} aria-label={closeLabel}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
