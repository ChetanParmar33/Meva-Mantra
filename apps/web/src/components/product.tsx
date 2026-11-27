'use client';
import Link from 'next/link';
import type { ProductCard as Card } from '@/lib/api';
import type { ArtProduct } from '@/lib/art';
import { pctOff, rupees } from '@/lib/format';
import { Icon, Stars } from './icons';
import { useStore } from './store';

/** Uploaded photo if there is one, otherwise the generated SVG artwork. */
// The artwork is served as cacheable SVG files from /art/... (see app/art/[...path]/route.ts) instead of
// being inlined into the HTML, which kept pages heavy. Uploaded photos still take precedence.
export function ProductArt({ product, view: i = 0, variant = 0, image, alt, eager }: { product: ArtProduct; view?: number; variant?: number; image?: string | null; alt?: string; eager?: boolean }) {
  if (image && i === 0) return <img src={image} alt={alt ?? product.title} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
  return <img className="art-img" src={`/art/p/${encodeURIComponent(product.slug)}/${i}-${variant}.svg`} alt={alt ?? product.title} width={600} height={600} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
export function HeroArt({ k }: { k: number }) {
  return <img className="art-img art-img--auto" src={`/art/hero/${k}.svg`} alt="Meva Mantra jars, Khajur Pak and gift boxes" width={700} height={560} loading={k === 0 ? 'eager' : 'lazy'} decoding="async" />;
}
export function BannerArt({ slug }: { slug: string }) {
  return <img className="art-img" src={`/art/banner/${encodeURIComponent(slug)}.svg`} alt="" width={800} height={450} loading="lazy" decoding="async" />;
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
