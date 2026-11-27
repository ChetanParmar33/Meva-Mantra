import type { Metadata } from 'next';
import { Suspense } from 'react';
import Loading from '../loading';
import { ShopClient } from '@/components/shop-client';
import { getCollections, searchProducts } from '@/lib/api';

export const metadata: Metadata = { title: 'Shop dry fruits, Khajur Pak & gift boxes', description: 'Browse every Meva Mantra jar, combo, gift box and hamper. Filter by category, price and availability.' };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default function ShopPage({ searchParams }: PageProps<'/shop'>) {
  return <Suspense fallback={<Loading />}><Shop searchParams={searchParams} /></Suspense>;
}

async function Shop({ searchParams }: Pick<PageProps<'/shop'>, 'searchParams'>) {
  const sp = await searchParams;
  const params = { c: one(sp.c) || 'all', q: one(sp.q), sort: one(sp.sort), availability: one(sp.availability), minPrice: one(sp.minPrice), maxPrice: one(sp.maxPrice), page: one(sp.page) };
  const qs = new URLSearchParams({ pageSize: '12' });
  if (params.c !== 'all') qs.set('collection', params.c);
  for (const k of ['q', 'sort', 'availability', 'minPrice', 'maxPrice', 'page'] as const) if (params[k]) qs.set(k, params[k]);
  const [collections, data] = await Promise.all([getCollections(), searchProducts(qs.toString()).catch(() => ({ items: [], total: 0, page: 1, pageSize: 12 }))]);
  return <ShopClient params={params} collections={collections} data={data} />;
}
