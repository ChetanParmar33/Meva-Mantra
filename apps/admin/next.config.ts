import type { NextConfig } from "next";

const API_ORIGIN = (process.env.API_URL ?? "http://localhost:4100/api").replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  // Dev-only badge: keep it away from the sidebar's logout button (bottom-left).
  devIndicators: { position: 'bottom-right' },
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  // Browser calls /api and /uploads on this host; they are proxied to the API (first-party cookies, no CORS).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
