'use client';
import Link from 'next/link';
import { useId } from 'react';
import type { ProductCard as Card } from '@/lib/api';
import { hero, view, banner, type ArtProduct } from '@/lib/art';
import { pctOff, rupees } from '@/lib/format';
import { Icon, Stars } from './icons';
import { useStore } from './store';

/** Uploaded photo if there is one, otherwise the generated SVG artwork. */
export function ProductArt({ product, view: i = 0, variant = 0, image, alt }: { product: ArtProduct; view?: number; variant?: number; image?: string | null; alt?: string }) {
  const id = useId();
  if (image && i === 0) return <img src={image} alt={alt ?? product.title} loading="lazy" />;
  return <div className="art" dangerouslySetInnerHTML={{ __html: view(product, i, variant, 'p' + id) }} />;
}
export function HeroArt({ k }: { k: number }) {
  const id = useId();
  const { bySlug, artOf } = useStore();
  return <div className="art" dangerouslySetInnerHTML={{ __html: hero(k, (slug) => { const p = bySlug(slug); return p && artOf(p); }, 'h' + id) }} />;
}
export function BannerArt({ slug }: { slug: string }) {
  const id = useId();
  const { bySlug, artOf } = useStore();
  const p = bySlug(slug);
  return p ? <div className="art" dangerouslySetInnerHTML={{ __html: banner(artOf(p), 'b' + id) }} /> : null;
}
export function CardArt({ p }: { p: Card }) {
  const { artOf } = useStore();
  return <ProductArt product={artOf(p)} image={p.image} />;
}

export function Price({ now, mrp, from }: { now: number; mrp?: number | null; from?: boolean }) {
  const off = pctOff(now, mrp);
  return (
    <span className="price">
      {from && <small className="muted">From</small>}
      <span className="price__now">{rupees(now)}</span>
      {off > 0 && <><span className="price__was">{rupees(mrp!)}</span><span className="price__off">{off}% off</span></>}
    </span>
  );
}

export const catOf = (p: Card) => p.collections.find(c => c.kind === 'CATEGORY') ?? p.collections[0];
export const firstAvail = (p: { variants: { inStock: boolean }[] }) => Math.max(0, p.variants.findIndex(v => v.inStock));

export function ProductCard({ p }: { p: Card }) {
  const { add, wishlist, toggleWish, toast } = useStore();
  const fa = firstAvail(p);
  const cheapest = p.variants.find(v => v.pricePaise === p.priceFromPaise);
  const off = pctOff(p.priceFromPaise, p.mrpPaise);
  const tags = p.collections.map(c => c.slug);
  const wished = wishlist.includes(p.slug);
  return (
    <article className={`pcard ${p.inStock ? '' : 'is-soldout'}`}>
      <div className="pcard__badges">
        {!p.inStock ? <span className="badge badge--grey">Sold out</span> : <>
          {tags.includes('bestseller') && <span className="badge badge--gold">★ Bestseller</span>}
          {tags.includes('new') && <span className="badge badge--soft">New</span>}
          {off >= 8 && <span className="badge badge--green">{off}% off</span>}
        </>}
      </div>
      <button className={`pcard__wish ${wished ? 'is-on' : ''}`} onClick={() => toggleWish(p.slug)} aria-label={`${wished ? 'Remove' : 'Add'} ${p.title} ${wished ? 'from' : 'to'} wishlist`} aria-pressed={wished}><Icon name="heart" size="sm" /></button>
      <Link href={`/products/${p.slug}`} className="pcard__media" aria-label={p.title}><CardArt p={p} /></Link>
      {p.inStock && (
        <div className="pcard__quick">
          {p.variants.length > 1 ? (
            <div style={{ display: 'flex', gap: 6 }}>
              {p.variants.map((v, i) => (
                <button key={v.id} className={`btn btn--sm ${i === fa ? 'btn--primary' : 'btn--outline'}`} style={{ flex: 1, background: i === fa ? undefined : '#fff' }} disabled={!v.inStock} onClick={() => add(v.id)}>+ {v.title.replace(' (300 g each)', '')}</button>
              ))}
            </div>
          ) : <button className="btn btn--primary btn--sm btn--block" onClick={() => add(p.variants[0].id)}><Icon name="bag" size="sm" /> Quick add</button>}
        </div>
      )}
      <div className="pcard__body">
        <span className="pcard__cat">{catOf(p)?.title}</span>
        <Link href={`/products/${p.slug}`} className="pcard__title">{p.title}</Link>
        {p.ratingCount > 0 && <Stars rating={p.ratingAvg} count={p.ratingCount} />}
        {p.variants.length > 1 && <div className="pcard__sizes">{p.variants.map(v => <span key={v.id}>{v.title}</span>)}</div>}
        <div className="pcard__foot">
          <Price now={p.priceFromPaise} mrp={cheapest?.mrpPaise ?? p.mrpPaise} from={p.hasPriceRange} />
          {p.inStock
            ? <button className="add-btn" onClick={() => add(p.variants[fa].id)} aria-label={`Add ${p.title} to cart`}><Icon name="plus" /></button>
            : <button className="btn btn--outline btn--sm" onClick={() => toast('We’ll let you know when it’s back in stock', 'clock')}>Notify me</button>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, className = 'grid' }: { items: Card[]; className?: string }) {
  return <div className={className}>{items.map(p => <ProductCard key={p.id} p={p} />)}</div>;
}
