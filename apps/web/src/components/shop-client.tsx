'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Collection, ProductCard } from '@/lib/api';
import { Icon } from './icons';
import { ProductGrid } from './product';
import { Art } from './bits';
import { useStore } from './store';

type Params = { c: string; q: string; sort: string; availability: string; minPrice: string; maxPrice: string; page: string };
const SORTS: [string, string][] = [['featured', 'Featured'], ['relevance', 'Most relevant'], ['best', 'Best selling'], ['az', 'Alphabetically, A–Z'], ['za', 'Alphabetically, Z–A'], ['low', 'Price, low to high'], ['high', 'Price, high to low'], ['new', 'Date, new to old'], ['old', 'Date, old to new'], ['rating', 'Top rated']];
const ART: Record<string, string> = { all: 'seven-in-one-combo', bestseller: 'mix-dryfruit', new: 'protein-beans-mix', gifting: 'khajur-pak-gifting-box-3', rakhi: 'rakhi-gift-genuine-leather-purse-khajur-pak-400-g-mix-dryfruit-150g', diwali: 'diwali-gift-hamper', mixes: 'mix-dryfruit', roasted: 'masala-dryfruit-mix', khajur: 'dryfruit-khajur-pak', seeds: 'classic-granola', combos: 'seven-in-one-combo' };

export function ShopClient({ params, collections, data }: { params: Params; collections: Collection[]; data: { items: ProductCard[]; total: number; page: number; pageSize: number } }) {
  const router = useRouter();
  const path = usePathname();
  const { panel, open, close } = useStore();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [min, setMin] = useState(params.minPrice);
  const [max, setMax] = useState(params.maxPrice);
  const coll = collections.find(c => c.slug === params.c);
  const title = params.q ? `Search: “${params.q}”` : coll?.title ?? 'All Products';
  const desc = params.q ? 'Products matching your search.' : coll?.description ?? 'Every jar, box and hamper we make, in one place.';

  const href = (patch: Partial<Params>, keepPage = false) => {
    const next = { ...params, ...patch, ...(keepPage ? {} : { page: patch.page ?? '' }) };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === 'c' && v === 'all')) u.set(k, v);
    return `${path}${u.size ? '?' + u : ''}`;
  };
  const go = (patch: Partial<Params>) => router.push(href(patch), { scroll: false });
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const sorts = SORTS.filter(([v]) => v !== 'relevance' || params.q);
  const chips: [string, Partial<Params>][] = [
    ...(params.availability ? [[params.availability === 'in' ? 'In stock' : 'Out of stock', { availability: '' }] as [string, Partial<Params>]] : []),
    ...(params.minPrice ? [[`Min ₹${params.minPrice}`, { minPrice: '' }] as [string, Partial<Params>]] : []),
    ...(params.maxPrice ? [[`Max ₹${params.maxPrice}`, { maxPrice: '' }] as [string, Partial<Params>]] : []),
  ];

  return (
    <>
      <section className="page-hero"><div className="container">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="right" size="sm" /><Link href="/shop">Shop</Link><Icon name="right" size="sm" /><span>{params.q ? 'Search' : coll?.title ?? 'All Products'}</span></nav>
        <h1>{title}</h1><p>{desc}</p>
        <div className="coll-chips">
          <Link className={`chip ${params.c === 'all' && !params.q ? 'is-active' : ''}`} href="/shop">All Products</Link>
          {collections.map(c => <Link key={c.slug} className={`chip ${c.slug === params.c && !params.q ? 'is-active' : ''}`} href={`/shop?c=${c.slug}`}>{c.title}</Link>)}
        </div>
      </div><div className="page-hero__art"><Art slug={[ART[params.c], ...data.items.map(p => p.slug)]} /></div></section>

      <section className="section" style={{ paddingTop: 40 }}><div className="container shop">
        <aside className={`filters ${panel === 'filters' ? 'is-open' : ''}`} aria-label="Filters">
          <div className="drawer__head filter-head" style={{ padding: '12px 0', border: 0 }}><h3>Filters</h3><button className="icon-btn" onClick={close} aria-label="Close filters"><Icon name="x" /></button></div>
          <div className="fgroup"><h4>Category</h4><div className="fpanel-links">
            <Link className={params.c === 'all' ? 'is-active' : ''} href={href({ c: 'all' })} onClick={close}>All products</Link>
            {collections.map(c => <Link key={c.slug} className={params.c === c.slug ? 'is-active' : ''} href={href({ c: c.slug })} onClick={close}>{c.title} <span className="muted">({c._count.products})</span></Link>)}
          </div></div>
          <div className="fgroup"><h4>Availability</h4>
            {[['', 'All'], ['in', 'In stock'], ['out', 'Out of stock']].map(([v, t]) => (
              <label key={v} className="check"><span><input type="radio" name="avail" checked={params.availability === v} onChange={() => go({ availability: v })} /> {t}</span></label>
            ))}
          </div>
          <form className="fgroup" onSubmit={e => { e.preventDefault(); go({ minPrice: min, maxPrice: max }); close(); }}>
            <h4>Price (₹)</h4>
            <div className="price-range"><input type="number" min={0} placeholder="Min" aria-label="Minimum price" value={min} onChange={e => setMin(e.target.value)} /><span className="muted">–</span><input type="number" min={0} placeholder="Max" aria-label="Maximum price" value={max} onChange={e => setMax(e.target.value)} /></div>
            <div className="tabs" style={{ marginTop: 10 }}>
              {[['0', '500'], ['500', '1000'], ['1000', '2500'], ['2500', '']].map(([a, z]) => <button type="button" key={a} className="chip" style={{ padding: '5px 10px', fontSize: '.78rem' }} onClick={() => { setMin(a); setMax(z); go({ minPrice: a, maxPrice: z }); }}>{z ? `₹${a}–${z}` : `₹${a}+`}</button>)}
            </div>
            <button className="btn btn--outline btn--sm" style={{ marginTop: 12 }}>Apply price</button>
          </form>
          <button className="btn btn--primary btn--block filter-apply" onClick={close}>Show {data.total} results</button>
        </aside>

        <div>
          <div className="toolbar">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn--outline btn--sm filter-toggle" onClick={() => open('filters')}><Icon name="filter" size="sm" /> Filters</button>
              <b>{data.total} product{data.total === 1 ? '' : 's'}</b>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="view-toggle" role="group" aria-label="View">
                <button className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><Icon name="grid" size="sm" /></button>
                <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'}><Icon name="list" size="sm" /></button>
              </div>
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <select id="sort" value={params.sort || (params.q ? 'relevance' : 'featured')} onChange={e => go({ sort: e.target.value })}>{sorts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            </div>
          </div>
          {chips.length > 0 && <div className="active-filters">{chips.map(([t, patch]) => <Link key={t} className="chip" href={href(patch)}>{t} <Icon name="x" size="sm" /></Link>)}<Link className="chip" href={href({ availability: '', minPrice: '', maxPrice: '' })}>Clear all</Link></div>}
          {data.items.length ? <ProductGrid items={data.items} className={`grid grid--3${view === 'list' ? ' is-list' : ''}`} /> : (
            <div className="empty"><div className="empty__icon"><Icon name="search" size="lg" /></div><h3>No products match</h3><p className="muted">Try removing a filter or searching something else.</p><Link className="btn btn--primary" href="/shop">See all products</Link></div>
          )}
          {pages > 1 && <nav className="pager" aria-label="Pages">{Array.from({ length: pages }, (_, i) => <Link key={i} href={href({ page: String(i + 1) }, true)} className={`chip ${i + 1 === data.page ? 'is-active' : ''}`} aria-current={i + 1 === data.page ? 'page' : undefined} style={{ width: 44, height: 44, justifyContent: 'center', padding: 0 }}>{i + 1}</Link>)}</nav>}
        </div>
      </div></section>
    </>
  );
}
