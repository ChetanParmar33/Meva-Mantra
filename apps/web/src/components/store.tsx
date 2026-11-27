'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Collection, ProductCard, Settings } from '@/lib/api';
import type { ArtProduct } from '@/lib/art';
import { api, type Quote } from '@/lib/client';
import { Icon } from './icons';

export type CartItem = { variantId: string; qty: number };
export type Panel = 'cart' | 'search' | 'menu' | 'filters' | null;
type Toast = { id: number; msg: string; icon: string };

type Store = {
  settings: Settings; collections: Collection[]; products: ProductCard[];
  bySlug: (slug: string) => ProductCard | undefined;
  artOf: (p: ProductCard | { slug: string; title: string; type: string; art: ProductCard['art']; variants?: ProductCard['variants'] }) => ArtProduct;
  ready: boolean;
  cart: CartItem[]; count: number;
  add: (variantId: string, qty?: number, opts?: { open?: boolean }) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clearCart: () => void;
  wishlist: string[]; toggleWish: (slug: string) => void;
  coupon: string; setCoupon: (c: string) => void;
  giftWrap: boolean; setGiftWrap: (b: boolean) => void;
  giftMsg: string; setGiftMsg: (s: string) => void;
  quote: Quote | null; quoteError: string;
  panel: Panel; open: (p: Panel) => void; close: () => void;
  toast: (msg: string, icon?: string) => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
};

function useStored<T>(key: string, initial: T, ready: boolean) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setV(JSON.parse(raw)); } catch { /* ignore corrupt storage */ } }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ready]);
  return [v, setV] as const;
}

export function StoreProvider({ settings, collections, products, children }: { settings: Settings; collections: Collection[]; products: ProductCard[]; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [cart, setCart] = useStored<CartItem[]>('mm_cart', [], ready);
  const [wishlist, setWishlist] = useStored<string[]>('mm_wish', [], ready);
  const [coupon, setCoupon] = useStored<string>('mm_coupon', '', ready);
  const [giftWrap, setGiftWrap] = useStored<boolean>('mm_gift', false, ready);
  const [giftMsg, setGiftMsg] = useStored<string>('mm_giftmsg', '', ready);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);

  const bySlug = useCallback((slug: string) => products.find(p => p.slug === slug), [products]);
  const artOf = useCallback<Store['artOf']>((p) => {
    const full = products.find(x => x.slug === p.slug);
    return { slug: p.slug, title: p.title, type: p.type, art: p.art, variants: p.variants ?? full?.variants ?? [] };
  }, [products]);

  const toast = useCallback((msg: string, icon = 'check') => {
    const id = ++tid.current;
    setToasts(t => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const variantInfo = useCallback((variantId: string) => {
    for (const p of products) { const v = p.variants.find(x => x.id === variantId); if (v) return { p, v }; }
  }, [products]);

  const add = useCallback<Store['add']>((variantId, qty = 1, opts = {}) => {
    setCart(c => {
      const ex = c.find(i => i.variantId === variantId);
      return ex ? c.map(i => (i.variantId === variantId ? { ...i, qty: Math.min(20, i.qty + qty) } : i)) : [...c, { variantId, qty: Math.min(20, qty) }];
    });
    const info = variantInfo(variantId);
    toast(info ? `Added ${info.p.title} (${info.v.title})` : 'Added to cart', 'bag');
    if (opts.open !== false) setPanel('cart');
  }, [setCart, toast, variantInfo]);
  const setQty = useCallback((variantId: string, qty: number) => setCart(c => (qty <= 0 ? c.filter(i => i.variantId !== variantId) : c.map(i => (i.variantId === variantId ? { ...i, qty: Math.min(20, qty) } : i)))), [setCart]);
  const remove = useCallback((variantId: string) => { setCart(c => c.filter(i => i.variantId !== variantId)); toast('Removed from cart', 'trash'); }, [setCart, toast]);
  const clearCart = useCallback(() => { setCart([]); setCoupon(''); setGiftWrap(false); setGiftMsg(''); }, [setCart, setCoupon, setGiftWrap, setGiftMsg]);
  const toggleWish = useCallback((slug: string) => {
    const on = !wishlist.includes(slug);
    setWishlist(w => (on ? [...w.filter(x => x !== slug), slug] : w.filter(x => x !== slug)));
    toast(on ? 'Added to wishlist' : 'Removed from wishlist', 'heart');
  }, [wishlist, setWishlist, toast]);

  // Server is the source of truth for every price.
  useEffect(() => {
    if (!ready) return;
    if (!cart.length) { setQuote(null); return; }
    let live = true;
    api<Quote>('/cart/quote', { json: { items: cart, couponCode: coupon || undefined, giftWrap } })
      .then(q => { if (live) { setQuote(q); setQuoteError(''); } })
      .catch(e => { if (live) setQuoteError(e.message); });
    return () => { live = false; };
  }, [cart, coupon, giftWrap, ready]);

  // Drop cart lines the API no longer knows about (e.g. deleted sizes).
  useEffect(() => {
    if (!quote) return;
    const known = new Set(quote.lines.map(l => l.variantId));
    if (cart.some(i => !known.has(i.variantId))) setCart(c => c.filter(i => known.has(i.variantId)));
  }, [quote]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = panel && panel !== 'filters' ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [panel]);

  const value = useMemo<Store>(() => ({
    settings, collections, products, bySlug, artOf, ready,
    cart, count: cart.reduce((a, i) => a + i.qty, 0), add, setQty, remove, clearCart,
    wishlist, toggleWish, coupon, setCoupon, giftWrap, setGiftWrap, giftMsg, setGiftMsg,
    quote, quoteError, panel, open: setPanel, close: () => setPanel(null), toast,
  }), [settings, collections, products, bySlug, artOf, ready, cart, add, setQty, remove, clearCart, wishlist, toggleWish, coupon, setCoupon, giftWrap, setGiftWrap, giftMsg, setGiftMsg, quote, quoteError, panel, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => <div key={t.id} className="toast"><Icon name={t.icon} /><span>{t.msg}</span></div>)}
      </div>
    </Ctx.Provider>
  );
}
