import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dishkin Recipes',
    short_name: 'Dishkin',
    description: 'AI recipes from Dishkin users.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFAF4',
    theme_color: '#FF6B35',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
