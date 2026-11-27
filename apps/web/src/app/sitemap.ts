import type { MetadataRoute } from 'next';
import { getAllProducts, getCollections, getPolicies, getPosts } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL ?? 'http://localhost:3100';
  const [products, collections, posts, policies] = await Promise.all([getAllProducts(), getCollections(), getPosts(), getPolicies()]);
  return [
    ...['', '/shop', '/about', '/contact', '/faq', '/blog', '/track-order'].map(p => ({ url: site + p, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...collections.map(c => ({ url: `${site}/shop?c=${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...products.map(p => ({ url: `${site}/products/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...posts.map(p => ({ url: `${site}/blog/${p.slug}`, lastModified: p.publishedAt, priority: 0.5 })),
    ...policies.map(p => ({ url: `${site}/policies/${p.slug}`, priority: 0.3 })),
  ];
}
