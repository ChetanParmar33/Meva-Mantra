import { NextResponse, type NextRequest } from 'next/server';

// Real HTTP 404 for unknown product / blog / policy slugs. With Cache Components the page
// shell streams first (status 200), so the check has to happen here, before rendering.
const API = process.env.API_URL ?? 'http://localhost:4100/api';
const TTL_MS = 60_000;
let cache: { at: number; slugs: Record<string, Set<string>> } | null = null;

async function knownSlugs() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.slugs;
  try {
    const json = async <T,>(path: string): Promise<T> => {
      const r = await fetch(API + path, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json() as Promise<T>;
    };
    const products: string[] = [];
    for (let page = 1; ; page++) {
      const res = await json<{ items: { slug: string }[]; total: number }>(`/products?pageSize=60&page=${page}`);
      products.push(...res.items.map(i => i.slug));
      if (products.length >= res.total || !res.items.length) break;
    }
    const [posts, policies] = await Promise.all([json<{ slug: string }[]>('/posts'), json<{ slug: string }[]>('/policies')]);
    cache = { at: Date.now(), slugs: { products: new Set(products), blog: new Set(posts.map(p => p.slug)), policies: new Set(policies.map(p => p.slug)) } };
    return cache.slugs;
  } catch {
    return cache?.slugs ?? null; // API unreachable: fail open and let the page decide
  }
}

export async function proxy(req: NextRequest) {
  const [, section, slug] = req.nextUrl.pathname.split('/');
  const slugs = await knownSlugs();
  if (!slugs || !slug || slugs[section]?.has(decodeURIComponent(slug))) return;
  return NextResponse.rewrite(new URL('/__not-found', req.url), { status: 404 });
}

export const config = { matcher: ['/products/:slug', '/blog/:slug', '/policies/:slug'] };
