// Server-side data access (Server Components). Catalogue/content is cached for a few minutes.
import { cacheLife, cacheTag } from 'next/cache';
import type { ArtColors } from './art';

export const API = process.env.API_URL ?? 'http://localhost:4100/api';

export type Variant = { id: string; title: string; pricePaise: number; mrpPaise: number | null; swatch: string | null; inStock: boolean };
export type ProductCard = {
  id: string; slug: string; title: string; type: string; short: string; optionName: string; createdAt: string;
  art: ArtColors | null; ratingAvg: number; ratingCount: number;
  collections: { slug: string; title: string; kind: string }[];
  image: string | null; priceFromPaise: number; mrpPaise: number | null; hasPriceRange: boolean; inStock: boolean;
  variants: Variant[];
};
export type Review = { id: string; name: string; city: string | null; rating: number; text: string; isVerified: boolean; createdAt: string };
export type ProductDetail = ProductCard & {
  description: string; ingredients: string[]; highlights: string[]; contains: string[];
  shelfLife: string | null; limitedNote: string | null; seoTitle: string | null; seoDescription: string | null;
  images: { url: string; alt: string }[]; reviews: Review[]; related: ProductCard[];
};
export type Collection = { slug: string; title: string; description: string | null; blurb: string | null; kind: 'CATEGORY' | 'COLLECTION'; _count: { products: number } };
export type Settings = {
  brand: { name: string; tagline: string; phone: string; whatsapp: string; email: string; address: string; hours: string };
  prepaidDiscountPct: number; freeShippingAbovePaise: number; shippingFeePaise: number; giftWrapPaise: number;
};
export type Faq = { id: string; category: string; question: string; answer: string };
export type PostMeta = { slug: string; title: string; excerpt: string; tag: string; coverSlug: string | null; readMins: number; publishedAt: string };
export type Post = PostMeta & { body: string };
export type Policy = { slug: string; title: string; sections: { heading: string; body: string }[]; updatedAt: string };
/** Extra per-product fields the SVG artwork needs (cards don't carry them). */

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(API + path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getSettings() { 'use cache'; cacheLife('minutes'); cacheTag('settings'); return (await get<Settings>('/settings'))!; }
export async function getCollections() { 'use cache'; cacheLife('minutes'); cacheTag('catalog'); return (await get<Collection[]>('/collections'))!; }
export async function getAllProducts() { 'use cache'; cacheLife('minutes'); cacheTag('catalog'); return (await get<{ items: ProductCard[] }>('/products?pageSize=60'))!.items; }
export async function getProduct(slug: string) { 'use cache'; cacheLife('minutes'); cacheTag('catalog'); return get<ProductDetail>(`/products/${encodeURIComponent(slug)}`); }
export async function searchProducts(query: string) {
  'use cache'; cacheLife('minutes'); cacheTag('catalog');
  return (await get<{ items: ProductCard[]; total: number; page: number; pageSize: number }>(`/products?${query}`))!;
}
export async function getFaqs() { 'use cache'; cacheLife('minutes'); return (await get<Faq[]>('/faqs'))!; }
export async function getPosts() { 'use cache'; cacheLife('minutes'); return (await get<PostMeta[]>('/posts'))!; }
export async function getPost(slug: string) { 'use cache'; cacheLife('minutes'); return get<Post>(`/posts/${encodeURIComponent(slug)}`); }
export async function getPolicies() { 'use cache'; cacheLife('minutes'); return (await get<{ slug: string; title: string }[]>('/policies'))!; }
export async function getPolicy(slug: string) { 'use cache'; cacheLife('minutes'); return get<Policy>(`/policies/${encodeURIComponent(slug)}`); }

