'use client';
import { HeroArt, ProductArt } from './product';
import { useStore } from './store';

/** Artwork for a product looked up by slug (server pages only know slugs).
 *  Pass several slugs in order of preference: the first live one wins, else the first live product,
 *  so hiding a product (coming soon) never leaves an empty box. */
export function Art({ slug, view = 0, hero }: { slug?: string | (string | undefined)[]; view?: number; hero?: number }) {
  const { bySlug, artOf, products } = useStore();
  if (hero != null) return <HeroArt k={hero} />;
  const p = slug ? [slug].flat().map(s => s && bySlug(s)).find(Boolean) || products[0] : undefined;
  return p ? <ProductArt product={artOf(p)} view={view} image={view === 0 ? p.image : null} /> : null;
}

export function AddButton({ variantId, className, children }: { variantId: string; className?: string; children: React.ReactNode }) {
  const { add } = useStore();
  return <button className={className} onClick={() => add(variantId)}>{children}</button>;
}
