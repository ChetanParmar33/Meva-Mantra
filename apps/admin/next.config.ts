import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev-only badge: keep it away from the sidebar's logout button (bottom-left).
  devIndicators: { position: 'bottom-right' },
  cacheComponents: true,
  partialPrefetching: true,
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
