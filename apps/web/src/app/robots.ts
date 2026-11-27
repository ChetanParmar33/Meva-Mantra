import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? 'http://localhost:3100';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/account', '/wishlist'] }, sitemap: `${site}/sitemap.xml` };
}
