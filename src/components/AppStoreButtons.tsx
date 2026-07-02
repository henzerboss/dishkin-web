import { Apple, Play } from 'lucide-react';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/config';
import { t } from '@/i18n/locales';

interface Props {
  locale: string;
  compact?: boolean;
}

export function AppStoreButtons({ locale, compact = false }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <a className={`store-button ${compact ? 'store-button-compact' : ''}`} href={APP_STORE_URL} rel="noopener noreferrer">
        <Apple size={22} />
        <span>
          <small>{t(locale, 'downloadOn')}</small>
          <b>{t(locale, 'appStore')}</b>
        </span>
      </a>
      <a className={`store-button ${compact ? 'store-button-compact' : ''}`} href={GOOGLE_PLAY_URL} rel="noopener noreferrer">
        <Play size={22} />
        <span>
          <small>{t(locale, 'getItOn')}</small>
          <b>{t(locale, 'googlePlay')}</b>
        </span>
      </a>
    </div>
  );
}
