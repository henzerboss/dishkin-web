export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dishkin.com').replace(/\/$/, '');
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/id6784972752';
export const GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? 'https://play.google.com/store/apps/details?id=store.evsi.recipesgenerator';
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@evsi.store';
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';
export const MAX_IMAGE_BYTES = 2_500_000;
