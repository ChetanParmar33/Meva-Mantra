import type { NextConfig } from 'next';

// Where the NestJS API runs (server side). The browser never calls it directly: /api and /uploads
// on this site are proxied to it, so the store works from localhost, a phone on the same Wi-Fi, or a real domain.
const API_ORIGIN = (process.env.API_URL ?? 'http://localhost:4100/api').replace(/\/api\/?$/, '');

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: { position: 'bottom-left' },
  // Dev only: let phones/tablets on the local network open the dev server (e.g. http://192.168.1.31:3100).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
