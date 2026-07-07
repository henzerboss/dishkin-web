import 'dotenv/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Recipe photos are optimized on the fly (WebP + correct sizes).
    // Pre-sized brand assets opt out via the `unoptimized` prop on <Image>.
    localPatterns: [
      { pathname: '/uploads/recipes/**' },
      { pathname: '/brand/**' },
    ],
    minimumCacheTTL: 2678400, // 31 days
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    inlineCss: true,
  },
  async headers() {
    return [
      {
        source: '/brand/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/uploads/recipes/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
