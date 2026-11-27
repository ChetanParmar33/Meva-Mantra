'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ProductCard as Card } from '@/lib/api';
import { emblem } from '@/lib/art';
import { api } from '@/lib/client';
import { rupees } from '@/lib/format';
import { Icon, WhatsAppGlyph } from './icons';
import { CardArt, ProductArt, firstAvail, catOf } from './product';
import { useStore } from './store';
import { NewsletterForm } from './ui';

export const waLink = (num: string, text?: string) => `https://wa.me/${num}${text ? '?text=' + encodeURIComponent(text) : ''}`;

function Logo({ size = 46, light = false }: { size?: number; light?: boolean }) {
  const { settings } = useStore();
  return (
    <Link className="logo" href="/" aria-label={`${settings.brand.name} home`}>
      <span dangerouslySetInnerHTML={{ __html: light ? emblem(size, '#E6C766', '#2A6049') : emblem(size) }} />
      <span className="logo__text"><span className="logo__name">{settings.brand.name}</span><span className="logo__tag">{settings.brand.tagline}</span></span>
    </Link>
  );
}

function Announcement() {
  const { settings } = useStore();
  const msgs = [
    <>Flat <b>{settings.prepaidDiscountPct}% extra off</b> on all prepaid orders</>,
    <><b>Free shipping</b> on orders above {rupees(settings.freeShippingAbovePaise)}</>,
    <>Use code <b>MANTRA10</b> for 10% off your first order</>,
    <>Freshly made in small batches · <b>No preservatives</b></>,
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % msgs.length), 4000); return () => clearInterval(t); }, [msgs.length]);
  return (
    <div className="announce" role="region" aria-label="Offers">
      <div className="announce__track">
        {msgs.map((m, k) => <div key={k} className={`announce__msg ${k === i ? 'is-active' : ''}`} aria-hidden={k !== i}><Icon name="sparkle" size="sm" /><span>{m}</span></div>)}
      </div>
    </div>
  );
}

export function Header() {
  const { collections, products, count, wishlist, ready, open } = useStore();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(scrollY > 10); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  const cats = collections.filter(c => c.kind === 'CATEGORY');
  const featured = products.find(p => p.slug === 'dryfruit-khajur-pak') ?? products[0];
  const best = products.filter(p => p.collections.some(c => c.slug === 'bestseller')).slice(0, 5);
  const nav: [string, string][] = [['Home', '/'], ['Shop', '/shop'], ['Gifting', '/shop?c=gifting'], ['Combos', '/shop?c=combos'], ['Our Story', '/about'], ['Contact', '/contact']];
  const active = (href: string) => (href === '/' ? path === '/' : !href.includes('?') && path.startsWith(href));
  return (
    <>
      <Announcement />
      <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container header__inner">
          <button className="icon-btn burger" onClick={() => open('menu')} aria-label="Open menu"><Icon name="menu" /></button>
          <Logo />
          <nav className="nav" aria-label="Main">
            {nav.map(([t, h]) => t === 'Shop' ? (
              <div key={t} className="nav__item nav__item--mega">
                <Link className={`nav__link ${active(h) ? 'is-active' : ''}`} href={h}>{t} <Icon name="down" size="sm" /></Link>
                <div className="mega"><div className="container mega__inner">
                  <div><h4>Shop by category</h4><ul>{cats.map(c => <li key={c.slug}><Link href={`/shop?c=${c.slug}`}>{c.title}</Link></li>)}</ul></div>
                  <div><h4>Collections</h4><ul>{collections.filter(c => c.kind === 'COLLECTION').map(c => <li key={c.slug}><Link href={`/shop?c=${c.slug}`}>{c.title}</Link></li>)}<li><Link href="/shop">All Products</Link></li></ul></div>
                  <div><h4>Customer favourites</h4><ul>{best.map(p => <li key={p.slug}><Link href={`/products/${p.slug}`}>{p.title}</Link></li>)}</ul></div>
                  {featured && <Link className="mega__feature" href={`/products/${featured.slug}`}>
                    <div className="media"><CardArt p={featured} /></div>
                    <div><span className="badge badge--gold">Signature</span><h3 style={{ margin: '8px 0 4px' }}>Ghar jaisa Khajur Pak</h3><p className="muted" style={{ margin: '0 0 8px', fontSize: '.9rem' }}>No refined sugar. Dates &amp; honey only.</p><span className="link">Shop now <Icon name="arrow" size="sm" /></span></div>
                  </Link>}
                </div></div>
              </div>
            ) : <Link key={t} className={`nav__link ${active(h) ? 'is-active' : ''}`} href={h}>{t}</Link>)}
          </nav>
          <div className="header__icons">
            <button className="icon-btn" onClick={() => open('search')} aria-label="Search"><Icon name="search" /></button>
            <Link className="icon-btn hide-sm" href="/wishlist" aria-label="Wishlist"><Icon name="heart" />{ready && wishlist.length > 0 && <span className="count">{wishlist.length}</span>}</Link>
            <Link className="icon-btn hide-sm" href="/account" aria-label="Account"><Icon name="user" /></Link>
            <button className="icon-btn" onClick={() => open('cart')} aria-label={`Cart${count ? `, ${count} items` : ''}`}><Icon name="bag" />{ready && count > 0 && <span className="count">{count}</span>}</button>
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const { settings, collections } = useStore();
  const b = settings.brand;
  return (
    <footer className="footer"><div className="container">
      <div className="footer__top">
        <div className="footer__brand">
          <Logo light />
          <p className="footer__about">Small-batch dry fruit mixes, Khajur Pak and roasted snacks, made with real ingredients and zero preservatives.</p>
          <div className="socials">
            <a href="#" aria-label="Instagram"><Icon name="instagram" size="sm" /></a><a href="#" aria-label="Facebook"><Icon name="facebook" size="sm" /></a>
            <a href="#" aria-label="YouTube"><Icon name="youtube" size="sm" /></a><a href={waLink(b.whatsapp)} aria-label="WhatsApp"><Icon name="phone" size="sm" /></a>
          </div>
          <a className="amazon-pill" href="#"><Icon name="bag" size="sm" /> Also available on Amazon</a>
        </div>
        <div><h4>Shop</h4><ul>{collections.filter(c => c.kind === 'CATEGORY').map(c => <li key={c.slug}><Link href={`/shop?c=${c.slug}`}>{c.title}</Link></li>)}<li><Link href="/shop">All Products</Link></li></ul></div>
        <div><h4>Help</h4><ul><li><Link href="/track-order">Track Order</Link></li><li><Link href="/faq">FAQs</Link></li><li><Link href="/contact">Contact Us</Link></li><li><Link href="/policies/shipping">Shipping Policy</Link></li><li><Link href="/policies/refund">Returns &amp; Refunds</Link></li><li><Link href="/account">My Account</Link></li></ul></div>
        <div><h4>Company</h4><ul><li><Link href="/about">Our Story</Link></li><li><Link href="/blog">Mantra Journal</Link></li><li><Link href="/contact#bulk">Bulk &amp; Corporate</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/policies/terms">Terms of Service</Link></li></ul></div>
        <div><h4>Get in touch</h4>
          <ul className="footer__contact">
            <li><Icon name="phone" size="sm" /><a href={waLink(b.whatsapp)}>{b.phone} (WhatsApp)</a></li>
            <li><Icon name="mail" size="sm" /><a href={`mailto:${b.email}`}>{b.email}</a></li>
            <li><Icon name="pin" size="sm" /><span>{b.address}</span></li>
            <li><Icon name="clock" size="sm" /><span>{b.hours}</span></li>
          </ul>
          <div style={{ marginTop: 18 }}><NewsletterForm small /></div>
        </div>
      </div>
      <div className="footer__bottom"><span>© 2026 {b.name}. Made with love in India.</span>
        <div className="pay" aria-label="Payment methods">{['UPI', 'GPay', 'PhonePe', 'Paytm', 'VISA', 'Mastercard', 'RuPay', 'COD'].map(x => <span key={x}>{x}</span>)}</div></div>
    </div></footer>
  );
}

function CartDrawer() {
  const { panel, close, cart, quote, quoteError, setQty, remove, add, products, artOf, bySlug } = useStore();
  const isOpen = panel === 'cart';
  const lines = quote?.lines ?? [];
  const left = quote ? quote.freeShippingAbovePaise - quote.subtotalPaise : 0;
  const ups = products.filter(p => p.inStock && !lines.some(l => l.productSlug === p.slug) && (p.type === 'JAR' || p.slug === 'dryfruit-khajur-pak')).slice(0, 2);
  return (
    <aside className={`drawer drawer--right ${isOpen ? 'is-open' : ''}`} aria-label="Cart" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="drawer__head"><h3>Your Cart</h3><button className="icon-btn" onClick={close} aria-label="Close cart"><Icon name="x" /></button></div>
      <div className="drawer__body">
        {!cart.length ? (
          <div className="empty"><div className="empty__icon"><Icon name="bag" size="lg" /></div><h3>Your cart is empty</h3><p className="muted">Add a muththi of goodness to get started.</p><Link className="btn btn--primary" href="/shop?c=bestseller" onClick={close}>Shop bestsellers</Link></div>
        ) : !quote ? <div className="skeleton" style={{ height: 200 }} /> : <>
          <div className="ship-bar">{left > 0 ? <>You&apos;re <b>{rupees(left)}</b> away from <b>free shipping</b></> : <>🎉 You&apos;ve unlocked <b>free shipping</b>!</>}
            <div className="ship-bar__track"><div className="ship-bar__fill" style={{ width: `${Math.min(100, (quote.subtotalPaise / quote.freeShippingAbovePaise) * 100)}%` }} /></div></div>
          {quote.issues.map(i => <p key={i} className="note err-box" style={{ marginBottom: 10 }}>{i}</p>)}
          {lines.map(l => {
            const p = bySlug(l.productSlug);
            const vi = p ? p.variants.findIndex(v => v.id === l.variantId) : 0;
            return (
              <div key={l.variantId} className="citem">
                <Link className="citem__media" href={`/products/${l.productSlug}`} onClick={close}><ProductArt product={artOf({ slug: l.productSlug, title: l.productTitle, type: l.productType, art: l.art })} variant={Math.max(0, vi)} image={l.image} /></Link>
                <div><Link className="citem__title" href={`/products/${l.productSlug}`} onClick={close}>{l.productTitle}</Link><div className="citem__meta">{l.variantTitle}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <div className="qty"><button onClick={() => setQty(l.variantId, l.qty - 1)} aria-label="Decrease"><Icon name="minus" size="sm" /></button><input value={l.qty} readOnly aria-label="Quantity" /><button onClick={() => setQty(l.variantId, l.qty + 1)} disabled={l.qty >= l.maxQty} aria-label="Increase"><Icon name="plus" size="sm" /></button></div>
                    <button className="remove" onClick={() => remove(l.variantId)}>Remove</button></div></div>
                <b>{rupees(l.lineTotalPaise)}</b>
              </div>
            );
          })}
          {ups.length > 0 && <div className="upsell"><h4>Pairs well with</h4>{ups.map(p => (
            <div key={p.slug} className="upsell__row"><div className="media"><CardArt p={p} /></div><div><b style={{ fontSize: '.9rem' }}>{p.title}</b><div className="muted" style={{ fontSize: '.82rem' }}>{rupees(p.variants[firstAvail(p)].pricePaise)}</div></div>
              <button className="add-btn" onClick={() => add(p.variants[firstAvail(p)].id, 1, { open: false })} aria-label={`Add ${p.title}`}><Icon name="plus" size="sm" /></button></div>
          ))}</div>}
        </>}
        {quoteError && <p className="note err-box">{quoteError}</p>}
      </div>
      {cart.length > 0 && quote && (
        <div className="drawer__foot">
          {quote.mrpSavingsPaise > 0 && <div className="sum-line"><span>You save on MRP</span><span className="save">{rupees(quote.mrpSavingsPaise)}</span></div>}
          <div className="sum-line sum-line--total"><span>Subtotal</span><span>{rupees(quote.subtotalPaise)}</span></div>
          <p className="muted" style={{ fontSize: '.8rem', margin: '4px 0 12px' }}>Extra {quote.prepaidDiscountPct}% off on prepaid orders at checkout.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10 }}>
            <Link className="btn btn--outline" href="/cart" onClick={close}>View cart</Link>
            <Link className="btn btn--primary" href="/checkout" onClick={close}><Icon name="lock" size="sm" /> Checkout</Link>
          </div>
        </div>
      )}
    </aside>
  );
}

function SearchOverlay() {
  const { panel, close, products } = useStore();
  const isOpen = panel === 'search';
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Card[] | null>(null);
  useEffect(() => { if (isOpen) setTimeout(() => input.current?.focus(), 200); }, [isOpen]);
  useEffect(() => {
    const term = q.trim();
    if (!term) { setRes(null); return; }
    const t = setTimeout(() => {
      api<{ items: Card[] }>(`/products?q=${encodeURIComponent(term)}&pageSize=8`).then(r => setRes(r.items)).catch(() => setRes([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  const go = (term: string) => { close(); router.push(`/shop?q=${encodeURIComponent(term)}`); };
  const trending = products.filter(p => p.collections.some(c => c.slug === 'bestseller')).slice(0, 4);
  const row = (p: Card) => (
    <Link key={p.slug} className="sres" href={`/products/${p.slug}`} onClick={close}>
      <div className="media"><CardArt p={p} /></div>
      <div><b>{p.title}</b><div className="muted" style={{ fontSize: '.85rem' }}>{p.inStock ? rupees(p.priceFromPaise) : 'Sold out'} · {catOf(p)?.title}</div></div>
    </Link>
  );
  return (
    <div className={`search ${isOpen ? 'is-open' : ''}`} role="dialog" aria-label="Search" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="container">
        <form className="search__bar" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) go(q.trim()); }}>
          <Icon name="search" size="lg" />
          <input ref={input} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search Khajur Pak, dry fruit mix, gift box…" aria-label="Search products" autoComplete="off" />
          <button type="button" className="icon-btn" onClick={close} aria-label="Close search"><Icon name="x" /></button>
        </form>
        <div className="search__results">
          {!q.trim() ? <>
            <p className="muted" style={{ margin: '0 0 8px' }}>Popular searches</p>
            <div className="search__chips">{['Khajur Pak', 'Dry Fruit Mix', 'Combo', 'Gift Box', 'Protein', 'Masala'].map(s => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}</div>
            <p className="muted" style={{ margin: '0 0 10px' }}>Trending now</p>
            <div className="search__list">{trending.map(row)}</div>
          </> : res === null ? <div className="skeleton" style={{ height: 90 }} /> : res.length ? <>
            <p className="muted" style={{ margin: '0 0 10px' }}>{res.length} product{res.length > 1 ? 's' : ''} found</p>
            <div className="search__list">{res.map(row)}</div>
            <div style={{ marginTop: 18 }}><button className="link" onClick={() => go(q.trim())}>See all results for “{q.trim()}” <Icon name="arrow" size="sm" /></button></div>
          </> : <div className="empty" style={{ padding: 20 }}><h3>No results for “{q.trim()}”</h3><p className="muted">Try “mix”, “khajur” or “gift”.</p></div>}
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  const { panel, close, collections, settings } = useStore();
  const isOpen = panel === 'menu';
  const [sub, setSub] = useState(false);
  return (
    <aside className={`drawer drawer--left ${isOpen ? 'is-open' : ''}`} aria-label="Menu" aria-hidden={!isOpen} inert={!isOpen}>
      <div className="drawer__head"><span className="logo"><span dangerouslySetInnerHTML={{ __html: emblem(38) }} /><span className="logo__name">{settings.brand.name}</span></span><button className="icon-btn" onClick={close} aria-label="Close menu"><Icon name="x" /></button></div>
      <nav className="drawer__body mnav" onClick={e => { if ((e.target as HTMLElement).closest('a')) close(); }}>
        <Link href="/">Home <Icon name="right" size="sm" /></Link>
        <button onClick={() => setSub(s => !s)} aria-expanded={sub}>Shop <Icon name="down" size="sm" /></button>
        <div className={`mnav__sub ${sub ? 'is-open' : ''}`}>{collections.map(c => <Link key={c.slug} href={`/shop?c=${c.slug}`}>{c.title}</Link>)}<Link href="/shop">All Products</Link></div>
        <Link href="/shop?c=gifting">Gifting <Icon name="right" size="sm" /></Link><Link href="/shop?c=combos">Combos <Icon name="right" size="sm" /></Link>
        <Link href="/about">Our Story <Icon name="right" size="sm" /></Link><Link href="/blog">Journal <Icon name="right" size="sm" /></Link>
        <Link href="/track-order">Track Order <Icon name="truck" size="sm" /></Link><Link href="/faq">FAQs <Icon name="right" size="sm" /></Link><Link href="/contact">Contact <Icon name="right" size="sm" /></Link>
        <Link href="/wishlist">Wishlist <Icon name="heart" size="sm" /></Link><Link href="/account">My Account <Icon name="user" size="sm" /></Link>
      </nav>
      <div className="drawer__foot"><a className="btn btn--primary btn--block" href={waLink(settings.brand.whatsapp)}><Icon name="phone" size="sm" /> Chat on WhatsApp</a></div>
    </aside>
  );
}

function OfferModal() {
  const [open, setOpen] = useState(false);
  const { bySlug, artOf } = useStore();
  const path = usePathname();
  useEffect(() => {
    if (path !== '/' || localStorage.getItem('mm_popup')) return;
    const t = setTimeout(() => { if (!localStorage.getItem('mm_popup')) { setOpen(true); localStorage.setItem('mm_popup', '1'); } }, 9000);
    return () => clearTimeout(t);
  }, [path]);
  const p = bySlug('mix-dryfruit');
  if (!open) return null;
  return (
    <div className="modal is-open" role="dialog" aria-modal="true" aria-label="Welcome offer" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal__box">
        <div className="modal__art">{p && <ProductArt product={artOf(p)} />}</div>
        <div className="modal__body">
          <button className="icon-btn modal__close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" /></button>
          <span className="eyebrow">Welcome gift</span><h2>10% off your first muththi</h2><p className="muted">Use the code below at checkout. Valid on orders above ₹499.</p>
          <CopyCode code="MANTRA10" big />
          <NewsletterForm compact />
          <button className="link" style={{ marginTop: 16 }} onClick={() => setOpen(false)}>No thanks, I’ll pay full price</button>
        </div>
      </div>
    </div>
  );
}

export function CopyCode({ code, big }: { code: string; big?: boolean }) {
  const { setCoupon, toast } = useStore();
  return <button className="code" style={big ? { fontSize: '1.4rem', padding: '10px 18px', marginBottom: 18 } : undefined}
    onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); setCoupon(code); toast(`Code ${code} copied & applied`, 'tag'); }}>{code}</button>;
}

export function Overlays() {
  const { panel, close, settings } = useStore();
  const [top, setTop] = useState(false);
  useEffect(() => { const f = () => setTop(scrollY > 700); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  return (
    <>
      <div className={`scrim ${panel && panel !== 'filters' ? 'is-open' : ''}`} onClick={close} aria-hidden="true" />
      <CartDrawer /><SearchOverlay /><MobileNav /><OfferModal />
      <a className="wa-float" href={waLink(settings.brand.whatsapp, 'Hi Meva Mantra!')} aria-label="Chat on WhatsApp" target="_blank" rel="noopener"><WhatsAppGlyph /></a>
      <button className={`to-top ${top ? 'is-on' : ''}`} onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><Icon name="up" /></button>
    </>
  );
}
