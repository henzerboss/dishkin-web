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
      { src: '/brand/icon.png', sizes: '1024x1024', type: 'image/png' },
    ],
  };
}
