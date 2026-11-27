'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ProductCard, ProductDetail } from '@/lib/api';
import { api } from '@/lib/client';
import { addWorkingDays, fmtDate, pctOff, rupees } from '@/lib/format';
import { CopyCode } from './chrome';
import { Icon, STAR_PATH, Stars } from './icons';
import { CardArt, Price, ProductArt, ProductCard as Card, catOf, firstAvail } from './product';
import { useStore } from './store';
import { Acc } from './ui';

const hlIcon = (h: string) => /sugar|sweet/i.test(h) ? 'nosugar' : /preserv|flavour/i.test(h) ? 'shield' : /ghee|salt|oil/i.test(h) ? 'drop' : /gift|pack|box/i.test(h) ? 'gift' : 'leaf';

function Rail({ title, eyebrow, items }: { title: string; eyebrow: string; items: ProductCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  const by = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="section" style={{ paddingTop: 0 }}><div className="container">
      <div className="sec-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
        <div className="rail-nav"><button onClick={() => by(-1)} aria-label="Previous"><Icon name="left" /></button><button onClick={() => by(1)} aria-label="Next"><Icon name="right" /></button></div></div>
      <div className="rail" ref={ref}>{items.map(p => <Card key={p.slug} p={p} />)}</div>
    </div></section>
  );
}

export function ProductView({ p, fbt }: { p: ProductDetail; fbt: ProductCard[] }) {
  const router = useRouter();
  const { add, wishlist, toggleWish, toast, artOf, settings, products, ready } = useStore();
  const [vi, setVi] = useState(firstAvail(p));
  const [qty, setQty] = useState(1);
  const [gi, setGi] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [pin, setPin] = useState('');
  const [pinRes, setPinRes] = useState<{ ok: boolean; text: string } | null>(null);
  const [sticky, setSticky] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [fbtOn, setFbtOn] = useState(() => [true, ...fbt.map(() => true)]);
  const infoRef = useRef<HTMLDivElement>(null);
  const v = p.variants[vi], oos = !v.inStock;
  const art = artOf(p);
  const isColor = p.optionName === 'Color';
  const wished = wishlist.includes(p.slug);

  // gallery: uploaded photos first, then generated views (ingredients, highlights, lifestyle)
  const slides = [...p.images.map(img => ({ img })), ...(p.images.length ? [1, 2, 3] : [0, 1, 2, 3]).map(view => ({ view }))];
  const slide = slides[Math.min(gi, slides.length - 1)];
  const renderSlide = (s: (typeof slides)[number]) => 'img' in s && s.img ? <img src={s.img.url} alt={s.img.alt || p.title} /> : <ProductArt product={art} view={(s as { view: number }).view} variant={vi} />;

  useEffect(() => {
    const prev: string[] = JSON.parse(localStorage.getItem('mm_recent') ?? '[]');
    setRecent(prev.filter(s => s !== p.slug));
    localStorage.setItem('mm_recent', JSON.stringify([p.slug, ...prev.filter(s => s !== p.slug)].slice(0, 10)));
    const saved = localStorage.getItem('mm_pin'); if (saved) setPin(saved);
  }, [p.slug]);
  useEffect(() => {
    const el = infoRef.current; if (!el) return;
    const io = new IntersectionObserver(([en]) => setSticky(!en.isIntersecting && en.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
  }, []);

  async function checkPin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) { setPinRes({ ok: false, text: 'Please enter a valid 6-digit pincode.' }); return; }
    try {
      const r = await api<{ serviceable: boolean; state: string | null; city: string | null; etaMinDays: number; etaMaxDays: number; cod: boolean }>(`/pincode/${pin}`);
      localStorage.setItem('mm_pin', pin);
      setPinRes(r.serviceable
        ? { ok: true, text: `Delivery to ${pin}${r.state ? ` (${[r.city, r.state].filter(Boolean).join(', ')})` : ''} by ${addWorkingDays(r.etaMinDays)} – ${addWorkingDays(r.etaMaxDays)}${r.cod ? ' · COD available' : ''}` }
        : { ok: false, text: `Sorry, we don't deliver to ${pin} yet. WhatsApp us and we'll try to help.` });
    } catch (x) { setPinRes({ ok: false, text: (x as Error).message }); }
  }

  async function share() {
    const url = location.href;
    if (navigator.share) navigator.share({ title: p.title, url }).catch(() => {});
    else { await navigator.clipboard?.writeText(url).catch(() => {}); toast('Link copied', 'copy'); }
  }

  const fbtItems = [p as ProductCard, ...fbt];
  const fbtVariant = (x: ProductCard) => (x.slug === p.slug ? v : x.variants[firstAvail(x)]);
  const fbtSel = fbtItems.filter((_, i) => fbtOn[i] && fbtVariant(fbtItems[i]).inStock);
  const recentCards = recent.map(s => products.find(x => x.slug === s)).filter(Boolean) as ProductCard[];
  const related = p.related.length >= 4 ? p.related : [...p.related, ...products.filter(x => x.slug !== p.slug && x.collections.some(c => c.slug === 'bestseller') && !p.related.some(r => r.slug === x.slug))].slice(0, 8);
  const dist = [5, 4, 3, 2, 1].map(s => p.reviews.filter(r => r.rating === s).length);
  const cat = catOf(p);

  return (
    <>
      <div className="container" style={{ paddingTop: 24 }}>
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="right" size="sm" /><Link href="/shop">Shop</Link><Icon name="right" size="sm" />{cat && <><Link href={`/shop?c=${cat.slug}`}>{cat.title}</Link><Icon name="right" size="sm" /></>}<span>{p.title}</span></nav>
        <div className="pdp">
          <div className="gallery">
            <div className="gallery__thumbs">
              {slides.map((s, i) => <button key={i} className={i === gi ? 'is-active' : ''} onClick={() => setGi(i)} aria-label={`Image ${i + 1}`} aria-pressed={i === gi}>{renderSlide(s)}</button>)}
            </div>
            <div className={`gallery__main ${zoom ? 'is-zoom' : ''}`} style={zoom ? ({ '--zx': `${zoom.x}%`, '--zy': `${zoom.y}%` } as React.CSSProperties) : undefined}
              onMouseMove={e => { if (!matchMedia('(hover:hover)').matches || (e.target as HTMLElement).closest('.gallery__nav')) { setZoom(null); return; } const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
              onMouseLeave={() => setZoom(null)} onClick={e => { if (!(e.target as HTMLElement).closest('.gallery__nav')) setLightbox(true); }}>
              {renderSlide(slide)}
              <button className="gallery__nav gallery__nav--prev" onClick={() => setGi((gi - 1 + slides.length) % slides.length)} aria-label="Previous image"><Icon name="left" /></button>
              <button className="gallery__nav gallery__nav--next" onClick={() => setGi((gi + 1) % slides.length)} aria-label="Next image"><Icon name="right" /></button>
            </div>
          </div>

          <div className="info" ref={infoRef}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {p.collections.some(c => c.slug === 'bestseller') && <span className="badge badge--gold">★ Bestseller</span>}
              {p.collections.some(c => c.slug === 'new') && <span className="badge badge--soft">New arrival</span>}
              {cat && <span className="badge badge--soft">{cat.title}</span>}
            </div>
            <h1>{p.title}</h1>
            {p.ratingCount > 0 ? <a href="#reviews"><Stars rating={p.ratingAvg} count={`${p.ratingCount} reviews`} /></a> : <a href="#reviews" className="muted" style={{ fontSize: '.9rem' }}>Be the first to review</a>}
            <p className="info__short" style={{ marginTop: 12 }}>{p.short}</p>
            <Price now={v.pricePaise} mrp={v.mrpPaise} />
            <p className="tax">Inclusive of all taxes · {oos ? <b style={{ color: 'var(--red)' }}>Currently sold out</b> : <b style={{ color: 'var(--ok)' }}>In stock, ships in 2–3 days</b>}</p>
            {p.limitedNote && <div className="limited"><Icon name="flame" size="sm" /> {p.limitedNote}</div>}
            <div className="offers">
              <div className="offer"><Icon name="tag" size="sm" /><span>Extra <b>{settings.prepaidDiscountPct}% off</b> on prepaid orders</span></div>
              <div className="offer"><Icon name="truck" size="sm" /><span><b>Free shipping</b> on orders above {rupees(settings.freeShippingAbovePaise)}</span></div>
              <div className="offer"><Icon name="gift" size="sm" /><span>First order? Use <CopyCode code="MANTRA10" /> for 10% off</span></div>
            </div>
            <div className="opt-label" id="opt-label">{p.optionName}: <span>{v.title}</span></div>
            <div className="pills" role="radiogroup" aria-labelledby="opt-label">
              {p.variants.map((x, i) => (
                <button key={x.id} role="radio" aria-checked={i === vi} className={`pill ${i === vi ? 'is-active' : ''} ${x.inStock ? '' : 'is-oos'}`} onClick={() => setVi(i)}>
                  <b>{isColor && x.swatch && <span className="sw" style={{ background: x.swatch }} />}{x.title}</b>
                  <small>{rupees(x.pricePaise)}{pctOff(x.pricePaise, x.mrpPaise) ? ` · ${pctOff(x.pricePaise, x.mrpPaise)}% off` : ''}</small>
                </button>
              ))}
            </div>
            <div className="buy">
              <div className="qty qty--lg"><button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity"><Icon name="minus" /></button><input value={qty} readOnly aria-label="Quantity" /><button onClick={() => setQty(q => Math.min(20, q + 1))} aria-label="Increase quantity"><Icon name="plus" /></button></div>
              {oos ? <button className="btn btn--outline btn--lg" onClick={() => toast('We’ll let you know when it’s back in stock', 'clock')}><Icon name="clock" size="sm" /> Notify me when available</button>
                : <button className="btn btn--primary btn--lg" onClick={() => add(v.id, qty)}><Icon name="bag" size="sm" /> Add to cart · {rupees(v.pricePaise * qty)}</button>}
            </div>
            <div className="buy-row2">
              <button className="btn btn--gold btn--lg" disabled={oos} onClick={() => { add(v.id, qty, { open: false }); router.push('/checkout'); }}>Buy it now</button>
              <button className={`icon-btn pcard__wish ${ready && wished ? 'is-on' : ''}`} style={{ position: 'static', width: 54, height: 54, border: '1.5px solid var(--line)' }} onClick={() => toggleWish(p.slug)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={wished}><Icon name="heart" /></button>
              <button className="icon-btn" style={{ width: 54, height: 54, border: '1.5px solid var(--line)' }} onClick={share} aria-label="Share"><Icon name="share" /></button>
            </div>
            <form className="pin" onSubmit={checkPin}>
              <label htmlFor="pin-in"><b><Icon name="truck" size="sm" /> Check delivery</b></label>
              <div className="pin__row"><input id="pin-in" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /><button className="btn btn--primary btn--sm">Check</button></div>
              {pinRes && <div className="pin__res" role="status">{pinRes.ok ? <div className="success"><Icon name="check" size="sm" /> {pinRes.text}</div> : <span style={{ color: 'var(--red)' }}>{pinRes.text}</span>}</div>}
            </form>
            {p.highlights.length > 0 && <div className="hl">{p.highlights.map(h => <div key={h}><Icon name={hlIcon(h)} />{h}</div>)}</div>}
            <Acc q="Description" a={p.description} defaultOpen />
            {(p.contains.length > 0 || p.ingredients.length > 0) && <Acc q={p.contains.length ? 'What’s in the box' : 'Ingredients'} a={p.contains.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{p.contains.map(c => <li key={c}>{c}</li>)}</ul> : <div className="ingredient-tags">{p.ingredients.map(i => <span key={i}>{i}</span>)}</div>} />}
            <Acc q="Storage & shelf life" a={<>Shelf life: <b>{p.shelfLife ?? 'see pack'}</b> from the date of packing. Store in a cool, dry place in an airtight container, away from direct sunlight. Country of origin: India.</>} />
            <Acc q="Shipping & returns" a={<>Packed fresh in 2–3 working days and delivered in 3–7 days. Free shipping above {rupees(settings.freeShippingAbovePaise)}. Damaged or wrong item? Tell us within 48 hours for a free replacement. <Link className="link" href="/policies/refund">Read policy</Link></>} />
          </div>
        </div>
      </div>

      {fbt.length > 0 && (
        <section className="section section--sage"><div className="container">
          <div className="sec-head"><div><span className="eyebrow">Complete the set</span><h2>Frequently bought together</h2></div></div>
          <div className="fbt">
            <div className="fbt__items">
              {fbtItems.map((x, i) => (
                <div key={x.slug} style={{ display: 'contents' }}>
                  {i > 0 && <span className="fbt__plus" aria-hidden="true">+</span>}
                  <label className={`fbt__item ${fbtOn[i] ? '' : 'is-off'}`}>
                    <div className="media"><CardArt p={x} /></div>
                    <span className="check" style={{ justifyContent: 'center' }}><input type="checkbox" checked={fbtOn[i]} disabled={!fbtVariant(x).inStock} onChange={e => setFbtOn(o => o.map((b, k) => (k === i ? e.target.checked : b)))} /><span style={{ fontSize: '.85rem', fontWeight: 700 }}>{i ? x.title : 'This item'}</span></span>
                    <span className="muted" style={{ fontSize: '.85rem' }}>{rupees(fbtVariant(x).pricePaise)}</span>
                  </label>
                </div>
              ))}
            </div>
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>Total for {fbtSel.length} item{fbtSel.length === 1 ? '' : 's'}</p>
              <div className="price__now" style={{ fontSize: '1.8rem', fontFamily: 'var(--serif)' }}>{rupees(fbtSel.reduce((a, x) => a + fbtVariant(x).pricePaise, 0))}</div>
              <p className="muted" style={{ fontSize: '.85rem' }}>+ extra {settings.prepaidDiscountPct}% off when you pay online</p>
              <button className="btn btn--primary btn--block" disabled={!fbtSel.length} onClick={() => { fbtSel.forEach((x, k) => add(fbtVariant(x).id, 1, { open: k === fbtSel.length - 1 })); }}><Icon name="bag" size="sm" /> Add {fbtSel.length} to cart</button>
            </div>
          </div>
        </div></section>
      )}

      <section className="section" id="reviews"><div className="container">
        <div className="sec-head"><div><span className="eyebrow">Reviews</span><h2>Customer reviews</h2></div></div>
        <div className="rsum">
          <div>
            {p.ratingCount > 0 ? <><div className="rsum__big">{p.ratingAvg}</div><Stars rating={p.ratingAvg} showNum={false} /><p className="muted">Based on {p.ratingCount} reviews</p></> : <p className="muted">No reviews yet.</p>}
            {p.reviews.length > 0 && dist.map((d, i) => <div key={i} className="bar"><span>{5 - i} ★</span><span className="bar__t"><i style={{ width: `${(d / p.reviews.length) * 100}%` }} /></span><span className="muted">{d}</span></div>)}
            <ReviewForm slug={p.slug} />
          </div>
          <div>
            {p.reviews.length ? p.reviews.map(r => (
              <div key={r.id} className="review">
                <div className="review__head"><div><b>{r.name}</b> <span className="muted" style={{ fontSize: '.85rem' }}>· {r.city ?? 'India'}</span><br /><Stars rating={r.rating} showNum={false} /></div>
                  <div style={{ textAlign: 'right' }}>{r.isVerified && <><span className="verified"><Icon name="check" size="sm" /> Verified buyer</span><br /></>}<small className="muted">{fmtDate(r.createdAt)}</small></div></div>
                <p style={{ margin: '6px 0 0' }}>{r.text}</p>
              </div>
            )) : <div className="empty" style={{ padding: 30 }}><p className="muted">Tried it? Your review helps other families choose.</p></div>}
          </div>
        </div>
      </div></section>

      <Rail eyebrow="You may also like" title="More from the kitchen" items={related} />
      <Rail eyebrow="Recently viewed" title="Pick up where you left off" items={recentCards} />

      <div className={`sticky-atc ${sticky ? 'is-on' : ''}`} aria-hidden={!sticky} inert={!sticky}>
        <div className="container sticky-atc__inner">
          <div className="media"><CardArt p={p} /></div>
          <div className="sticky-atc__title">{p.title}<div className="muted" style={{ fontWeight: 500, fontSize: '.85rem' }}>{v.title} · {rupees(v.pricePaise)}</div></div>
          {oos ? <button className="btn btn--outline" disabled>Sold out</button> : <button className="btn btn--primary" onClick={() => add(v.id, qty)}><Icon name="bag" size="sm" /> Add to cart</button>}
        </div>
      </div>

      {lightbox && (
        <div className="lightbox is-open" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={() => setLightbox(false)}>
          <button className="icon-btn lightbox__close" onClick={() => setLightbox(false)} aria-label="Close"><Icon name="x" size="lg" /></button>
          <div className="lightbox__img" onClick={e => e.stopPropagation()}>{renderSlide(slide)}</div>
        </div>
      )}
    </>
  );
}

function ReviewForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (state?.ok) return <div className="success" role="status" style={{ marginTop: 16 }}><Icon name="check" size="sm" /> {state.text}</div>;
  return (
    <>
      <button className="btn btn--outline btn--block" style={{ marginTop: 16 }} onClick={() => setOpen(o => !o)} aria-expanded={open}>Write a review</button>
      {open && (
        <form className="card" style={{ marginTop: 14 }} onSubmit={async e => {
          e.preventDefault(); setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const r = await api<{ message: string }>(`/products/${slug}/reviews`, { json: { name: f.get('name'), city: (f.get('city') as string) || undefined, rating, text: f.get('text') } });
            setState({ ok: true, text: r.message });
          } catch (x) { setState({ ok: false, text: (x as Error).message }); }
          setBusy(false);
        }}>
          <fieldset className="field" style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--green-900)', marginBottom: 6 }}>Your rating</legend>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={rating === n} style={{ color: n <= rating ? 'var(--gold)' : '#DDD5C2' }}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d={STAR_PATH} /></svg>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field"><label htmlFor="rv-name">Name</label><input id="rv-name" name="name" required minLength={2} maxLength={60} /></div>
          <div className="field"><label htmlFor="rv-city">City (optional)</label><input id="rv-city" name="city" maxLength={60} /></div>
          <div className="field"><label htmlFor="rv-text">Review</label><textarea id="rv-text" name="text" rows={3} required minLength={10} maxLength={1000} /></div>
          {state && !state.ok && <p className="note err-box" role="alert">{state.text}</p>}
          <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Sending…' : 'Submit review'}</button>
        </form>
      )}
    </>
  );
}
