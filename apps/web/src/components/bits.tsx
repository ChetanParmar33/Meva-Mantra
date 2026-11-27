'use client';
import { HeroArt, ProductArt } from './product';
import { useStore } from './store';

/** Artwork for a product looked up by slug (server pages only know slugs). */
export function Art({ slug, view = 0, hero }: { slug?: string; view?: number; hero?: number }) {
  const { bySlug, artOf } = useStore();
  if (hero != null) return <HeroArt k={hero} />;
  const p = slug ? bySlug(slug) : undefined;
  return p ? <ProductArt product={artOf(p)} view={view} image={view === 0 ? p.image : null} /> : null;
}

export function AddButton({ variantId, className, children }: { variantId: string; className?: string; children: React.ReactNode }) {
  const { add } = useStore();
  return <button className={className} onClick={() => add(variantId)}>{children}</button>;
}
