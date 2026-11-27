'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError, type Address, type Quote, type User } from '@/lib/client';
import { rupees } from '@/lib/format';
import { Icon } from './icons';
import { ProductArt, ProductGrid } from './product';
import { useStore } from './store';
import { OtpLogin } from './ui';

export function SummaryLines({ q }: { q: Quote }) {
  return (
    <>
      <div className="sum-line"><span>Subtotal</span><span>{rupees(q.subtotalPaise)}</span></div>
      {q.mrpSavingsPaise > 0 && <div className="sum-line"><span>MRP savings</span><span className="save">−{rupees(q.mrpSavingsPaise)}</span></div>}
      {q.coupon?.valid && <div className="sum-line"><span>Coupon ({q.coupon.code})</span><span className="save">−{rupees(q.coupon.discountPaise)}</span></div>}
      {q.prepaidDiscountPaise > 0 && <div className="sum-line"><span>Prepaid discount ({q.prepaidDiscountPct}%)</span><span className="save">−{rupees(q.prepaidDiscountPaise)}</span></div>}
      {q.giftWrapPaise > 0 && <div className="sum-line"><span>Gift wrap + message</span><span>{rupees(q.giftWrapPaise)}</span></div>}
      <div className="sum-line"><span>Shipping</span><span>{q.shippingPaise ? rupees(q.shippingPaise) : <b className="save">FREE</b>}</span></div>
      <div className="sum-line sum-line--total"><span>Total</span><span>{rupees(q.totalPaise)}</span></div>
    </>
  );
}

function CouponBox() {
  const { coupon, setCoupon, quote } = useStore();
  const [code, setCode] = useState(coupon);
  useEffect(() => setCode(coupon), [coupon]);
  return (
    <>
      <form className="coupon-row" onSubmit={e => { e.preventDefault(); setCoupon(code.trim().toUpperCase()); }}>
        <label className="sr-only" htmlFor="coupon">Coupon code</label>
        <input id="coupon" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
        {coupon ? <button type="button" className="btn btn--outline btn--sm" onClick={() => { setCoupon(''); setCode(''); }}>Remove</button> : <button className="btn btn--outline btn--sm">Apply</button>}
      </form>
      {quote?.coupon && <div className={quote.coupon.valid ? 'success' : 'note err-box'} role="status" style={{ marginBottom: 10 }}>{quote.coupon.valid ? <><Icon name="check" size="sm" /> <b>{quote.coupon.code}</b> applied: </> : null}{quote.coupon.message}</div>}
      {!coupon && <p className="muted" style={{ fontSize: '.82rem', margin: '0 0 10px' }}>First order? Try <b>MANTRA10</b>.</p>}
    </>
  );
}

function Line({ l }: { l: Quote['lines'][number] }) {
  const { setQty, remove, artOf, bySlug } = useStore();
  const p = bySlug(l.productSlug);
  const vi = Math.max(0, p ? p.variants.findIndex(v => v.id === l.variantId) : 0);
  return (
    <div className="citem">
      <Link className="citem__media" href={`/products/${l.productSlug}`}><ProductArt product={artOf({ slug: l.productSlug, title: l.productTitle, type: l.productType, art: l.art })} variant={vi} image={l.image} /></Link>
      <div>
        <Link className="citem__title" style={{ fontSize: '1.05rem' }} href={`/products/${l.productSlug}`}>{l.productTitle}</Link>
        <div className="citem__meta">{l.variantTitle} · {rupees(l.unitPricePaise)} each</div>
        {l.mrpPaise && l.mrpPaise > l.unitPricePaise && <div className="price__off" style={{ fontSize: '.8rem' }}>You save {rupees((l.mrpPaise - l.unitPricePaise) * l.qty)}</div>}
        {!l.inStock && <div style={{ color: 'var(--red)', fontSize: '.85rem', fontWeight: 600 }}>{l.maxQty > 0 ? `Only ${l.maxQty} left` : 'Sold out'}</div>}
        <button className="remove" onClick={() => remove(l.variantId)}>Remove</button>
      </div>
      <div className="qty"><button onClick={() => setQty(l.variantId, l.qty - 1)} aria-label={`Decrease ${l.productTitle}`}><Icon name="minus" size="sm" /></button><input value={l.qty} readOnly aria-label="Quantity" /><button onClick={() => setQty(l.variantId, l.qty + 1)} disabled={l.qty >= l.maxQty} aria-label={`Increase ${l.productTitle}`}><Icon name="plus" size="sm" /></button></div>
      <b style={{ minWidth: 80, textAlign: 'right' }}>{rupees(l.lineTotalPaise)}</b>
    </div>
  );
}

export function CartView() {
  const { cart, quote, quoteError, ready, giftWrap, setGiftWrap, giftMsg, setGiftMsg, products, settings } = useStore();
  const favs = products.filter(p => p.inStock && p.collections.some(c => c.slug === 'bestseller')).slice(0, 4);
  if (!ready) return <div className="container cart-layout"><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!cart.length) return (
    <>
      <div className="container" style={{ padding: '40px 0 60px' }}><div className="empty card"><div className="empty__icon"><Icon name="bag" size="lg" /></div><h2>Your cart is empty</h2><p className="muted">Looks like you haven’t added anything yet.</p><Link className="btn btn--primary" href="/shop">Start shopping</Link></div></div>
      <Favs items={favs} />
    </>
  );
  const left = quote ? quote.freeShippingAbovePaise - quote.subtotalPaise : 0;
  return (
    <>
      <div className="container cart-layout">
        <div>
          {quote && <div className="ship-bar">{left > 0 ? <>Add <b>{rupees(left)}</b> more for <b>free shipping</b></> : <>🎉 Free shipping unlocked!</>}<div className="ship-bar__track"><div className="ship-bar__fill" style={{ width: `${Math.min(100, (quote.subtotalPaise / quote.freeShippingAbovePaise) * 100)}%` }} /></div></div>}
          {quote?.issues.map(i => <p key={i} className="note err-box" style={{ marginBottom: 10 }} role="alert">{i}</p>)}
          {quoteError && <p className="note err-box" role="alert">{quoteError}</p>}
          <div className="card cart-table">{quote ? quote.lines.map(l => <Line key={l.variantId} l={l} />) : <div className="skeleton" style={{ height: 200 }} />}</div>
          <div className="card" style={{ marginTop: 20 }}>
            <label className="check"><input type="checkbox" checked={giftWrap} onChange={e => setGiftWrap(e.target.checked)} /><span><b>Gift wrap + handwritten message</b> ({rupees(settings.giftWrapPaise)})<br /><span className="muted" style={{ fontSize: '.85rem' }}>Festive wrap, ribbon and a card with your note.</span></span></label>
            {giftWrap && <div className="field" style={{ margin: '14px 0 0' }}><label htmlFor="giftMsg">Your message</label><textarea id="giftMsg" rows={2} maxLength={200} placeholder="Happy Diwali! With love…" value={giftMsg} onChange={e => setGiftMsg(e.target.value)} /></div>}
          </div>
        </div>
        <aside className="summary card">
          <h3>Order summary</h3>
          <CouponBox />
          {quote ? <SummaryLines q={quote} /> : <div className="skeleton" style={{ height: 120 }} />}
          <p className="note" style={{ margin: '12px 0' }}><Icon name="tag" size="sm" /> Pay online at checkout and get an extra <b>{settings.prepaidDiscountPct}% off</b>.</p>
          <Link className={`btn btn--primary btn--block btn--lg ${quote && !quote.issues.length ? '' : 'is-disabled'}`} href="/checkout" aria-disabled={!quote || quote.issues.length > 0}><Icon name="lock" size="sm" /> Proceed to checkout</Link>
          <div className="trust-mini"><span><Icon name="lock" size="sm" /> Secure payment</span><span><Icon name="truck" size="sm" /> Fast delivery</span><span><Icon name="refresh" size="sm" /> Easy returns</span></div>
        </aside>
      </div>
      <Favs items={favs} />
    </>
  );
}

function Favs({ items }: { items: Parameters<typeof ProductGrid>[0]['items'] }) {
  return <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="sec-head"><div><span className="eyebrow">Add a little more</span><h2>Customer favourites</h2></div></div><ProductGrid items={items} /></div></section>;
}

/* ---------------- checkout ---------------- */

type AddrForm = { name: string; phone: string; email: string; line1: string; landmark: string; city: string; state: string; pincode: string; type: 'HOME' | 'WORK' | 'OTHER' };
const EMPTY: AddrForm = { name: '', phone: '', email: '', line1: '', landmark: '', city: '', state: '', pincode: '', type: 'HOME' };
type PaymentStart = { provider: 'razorpay'; keyId: string; razorpayOrderId: string; amountPaise: number; name: string; email: string; phone: string } | { provider: 'demo'; amountPaise: number };
type Placed = { number: string; status: string; totalPaise: number; phone: string; paymentMode: 'PREPAID' | 'COD' };
type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: unknown) => void) => void };

function validate(f: AddrForm) {
  const e: Partial<Record<keyof AddrForm, string>> = {};
  if (f.name.trim().length < 2) e.name = 'Enter the full name';
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a valid 10-digit mobile number';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email';
  if (f.line1.trim().length < 5) e.line1 = 'Enter house no., street and area';
  if (!f.city.trim()) e.city = 'Required';
  if (!f.state.trim()) e.state = 'Required';
  if (!/^[1-9]\d{5}$/.test(f.pincode)) e.pincode = '6-digit pincode';
  return e;
}

function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay failed to load')));
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.body.append(s);
  });
}

export function CheckoutView() {
  const { cart, coupon, giftWrap, giftMsg, clearCart, ready, settings, artOf } = useStore();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [chosen, setChosen] = useState<string>('new');
  const [form, setForm] = useState<AddrForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddrForm, string>>>({});
  const [saveAddr, setSaveAddr] = useState(true);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState<'PREPAID' | 'COD'>('PREPAID');
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ order: Placed; payment: PaymentStart } | null>(null);
  const [done, setDone] = useState<Placed | null>(null);

  useEffect(() => { api<User>('/auth/me').then(u => { setUser(u); setStep(2); }).catch(() => setUser(null)); }, []);
  useEffect(() => {
    if (!user) return;
    setForm(f => ({ ...f, email: f.email || user.email || '', phone: f.phone || user.phone || '', name: f.name || user.name || '' }));
    api<Address[]>('/account/addresses').then(a => { setAddresses(a); if (a.length) setChosen(a.find(x => x.isDefault)?.id ?? a[0].id); }).catch(() => {});
  }, [user]);
  // live quote with the chosen payment mode (prepaid discount)
  useEffect(() => {
    if (!ready || !cart.length || done || pending) return;
    let live = true;
    api<Quote>('/cart/quote', { json: { items: cart, couponCode: coupon || undefined, giftWrap, paymentMode: pay } }).then(r => live && setQ(r)).catch(e => live && setErr(e.message));
    return () => { live = false; };
  }, [ready, cart, coupon, giftWrap, pay, done, pending]);

  async function onPin(pin: string) {
    setForm(f => ({ ...f, pincode: pin }));
    if (/^[1-9]\d{5}$/.test(pin)) {
      const r = await api<{ state: string | null; city: string | null }>(`/pincode/${pin}`).catch(() => null);
      if (r) setForm(f => ({ ...f, state: r.state ?? f.state, city: r.city ?? f.city }));
    }
  }

  function addressPayload() {
    if (chosen !== 'new') {
      const a = addresses.find(x => x.id === chosen)!;
      return { name: a.name, phone: a.phone, email: form.email, line1: a.line1, landmark: a.landmark ?? undefined, city: a.city, state: a.state, pincode: a.pincode, type: a.type };
    }
    return { ...form, landmark: form.landmark || undefined };
  }

  function toPayment(e: React.FormEvent) {
    e.preventDefault();
    const errs = chosen === 'new' ? validate(form) : (/^\S+@\S+\.\S+$/.test(form.email) ? {} : { email: 'Enter a valid email for order updates' });
    setErrors(errs);
    if (!Object.keys(errs).length) { setStep(3); setErr(''); }
  }

  async function finishPaid(order: Placed) { clearCart(); setPending(null); setDone(order); scrollTo({ top: 0, behavior: 'smooth' }); }

  async function place() {
    setBusy(true); setErr('');
    try {
      const a = addressPayload();
      const r = await api<{ order: { number: string; status: string; totalPaise: number }; payment: PaymentStart | null }>('/checkout', {
        json: { items: cart, couponCode: coupon || undefined, paymentMode: pay, giftWrap, giftMessage: giftWrap ? giftMsg || undefined : undefined, note: note || undefined, address: a, saveAddress: chosen === 'new' && saveAddr },
      });
      const order: Placed = { ...r.order, phone: a.phone, paymentMode: pay };
      if (!r.payment) { await finishPaid(order); return; }
      clearCart(); // stock is reserved; an unpaid order is released automatically after 30 min
      setPending({ order, payment: r.payment });
      if (r.payment.provider === 'razorpay') await openRazorpay(order, r.payment);
      setBusy(false);
    } catch (x) {
      setErr(x instanceof ApiError && x.status === 401 ? 'Your session expired. Please log in again.' : (x as Error).message);
      if (x instanceof ApiError && x.status === 401) { setUser(null); setStep(1); }
      setBusy(false);
    }
  }

  /** Opens Razorpay Checkout for an already-created order (also used by "Retry payment"). */
  async function openRazorpay(order: Placed, p: Extract<PaymentStart, { provider: 'razorpay' }>) {
    try {
      const Razorpay = await loadRazorpay();
      new Razorpay({
        key: p.keyId, amount: p.amountPaise, currency: 'INR', order_id: p.razorpayOrderId, name: settings.brand.name, description: `Order ${order.number}`,
        prefill: { name: p.name, email: p.email, contact: p.phone }, theme: { color: '#1F4D3A' },
        handler: async (resp: Record<string, string>) => {
          try {
            const v = await api<{ order: { status: string } }>('/payments/razorpay/verify', { json: { orderNumber: order.number, ...resp } });
            await finishPaid({ ...order, status: v.order.status });
          } catch (x) { setErr((x as Error).message); }
        },
      }).open();
    } catch (x) { setErr((x as Error).message); }
  }

  async function demoPay() {
    if (!pending) return;
    setBusy(true); setErr('');
    try {
      const r = await api<{ order: { status: string } }>('/payments/demo/confirm', { json: { orderNumber: pending.order.number } });
      await finishPaid({ ...pending.order, status: r.order.status });
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  if (done) return <Success order={done} />;
  if (!ready || user === undefined) return <div className="container co-layout"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (!cart.length && !pending) return <div className="container" style={{ padding: '40px 0 80px' }}><div className="empty card"><div className="empty__icon"><Icon name="bag" size="lg" /></div><h2>Nothing to check out</h2><p className="muted">Your cart is empty.</p><Link className="btn btn--primary" href="/shop">Shop now</Link></div></div>;

  const field = (k: keyof AddrForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={`field ${errors[k] ? 'has-error' : ''}`}>
      <label htmlFor={`a-${k}`}>{label}</label>
      <input id={`a-${k}`} value={form[k]} onChange={e => k === 'pincode' ? onPin(e.target.value.replace(/\D/g, '').slice(0, 6)) : setForm(f => ({ ...f, [k]: k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value }))} aria-invalid={!!errors[k]} {...props} />
      <span className="err">{errors[k]}</span>
    </div>
  );

  return (
    <>
      <div className="container" style={{ paddingTop: 36 }}>
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/cart">Cart</Link><Icon name="right" size="sm" /><span>Secure checkout</span></nav>
        <ol className="costeps">{['Contact', 'Address', 'Payment'].map((s, i) => <li key={s} className={i + 1 < step ? 'is-done' : i + 1 === step ? 'is-active' : ''} aria-current={i + 1 === step ? 'step' : undefined}>{s}</li>)}</ol>
      </div>
      <div className="container co-layout" style={{ paddingTop: 0 }}>
        <div>
          {err && <p className="note err-box" role="alert" style={{ marginBottom: 16 }}>{err}</p>}
          {pending ? (
            <div className="card">
              <h2>Complete your payment</h2>
              <p className="muted">Order <b>#{pending.order.number}</b> is reserved for 30 minutes.</p>
              {pending.payment.provider === 'demo' ? <>
                <p className="note" style={{ marginBottom: 16 }}>Local demo mode: Razorpay keys aren’t configured, so this button simulates a successful UPI payment.</p>
                <button className="btn btn--primary btn--lg" onClick={demoPay} disabled={busy}><Icon name="lock" size="sm" /> {busy ? 'Processing…' : `Pay ${rupees(pending.payment.amountPaise)} (demo)`}</button>
              </> : <button className="btn btn--primary btn--lg" onClick={() => pending.payment.provider === 'razorpay' && openRazorpay(pending.order, pending.payment)} disabled={busy}><Icon name="lock" size="sm" /> Pay {rupees(pending.payment.amountPaise)}</button>}
            </div>
          ) : step === 1 ? (
            <div className="card"><OtpLogin title="Contact" onDone={u => { setUser(u); setStep(2); }} /></div>
          ) : step === 2 ? (
            <form className="card" onSubmit={toPayment} noValidate>
              <h2>Delivery address</h2>
              {user && <p className="muted" style={{ marginTop: -6 }}>Logged in as <b>{user.phone ? '+91 ' + user.phone : user.email}</b></p>}
              {addresses.length > 0 && (
                <div style={{ display: 'grid', gap: 10, marginBottom: 18 }} role="radiogroup" aria-label="Saved addresses">
                  {addresses.map(a => (
                    <label key={a.id} className={`pay-opt ${chosen === a.id ? 'is-active' : ''}`}>
                      <input type="radio" name="addr" checked={chosen === a.id} onChange={() => setChosen(a.id)} />
                      <span><b>{a.name}</b> <span className="badge badge--soft">{a.type}</span><small>{a.line1}{a.landmark ? ', ' + a.landmark : ''}, {a.city}, {a.state} – {a.pincode} · {a.phone}</small></span><span />
                    </label>
                  ))}
                  <label className={`pay-opt ${chosen === 'new' ? 'is-active' : ''}`}><input type="radio" name="addr" checked={chosen === 'new'} onChange={() => setChosen('new')} /><span><b>+ Add a new address</b></span><span /></label>
                </div>
              )}
              {chosen === 'new' ? <>
                <div className="row2">{field('name', 'Full name', { autoComplete: 'name' })}{field('phone', 'Mobile number', { inputMode: 'numeric', autoComplete: 'tel-national' })}</div>
                {field('email', 'Email (for order updates)', { type: 'email', autoComplete: 'email' })}
                <div className="row3">{field('pincode', 'Pincode', { inputMode: 'numeric', autoComplete: 'postal-code' })}{field('city', 'City', { autoComplete: 'address-level2' })}{field('state', 'State', { autoComplete: 'address-level1' })}</div>
                {field('line1', 'House no., building, street, area', { autoComplete: 'street-address' })}
                {field('landmark', 'Landmark (optional)')}
                <div className="field"><span style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--green-900)' }}>Address type</span><div className="addr-type">{(['HOME', 'WORK', 'OTHER'] as const).map(t => <button type="button" key={t} className={`chip ${form.type === t ? 'is-active' : ''}`} onClick={() => setForm(f => ({ ...f, type: t }))} aria-pressed={form.type === t}>{t[0] + t.slice(1).toLowerCase()}</button>)}</div></div>
                <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} /> Save this address for next time</label>
              </> : field('email', 'Email (for order updates)', { type: 'email', autoComplete: 'email' })}
              <div className="field"><label htmlFor="note">Delivery note (optional)</label><textarea id="note" rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Call before delivery" /></div>
              <button className="btn btn--primary btn--lg">Continue to payment</button>
            </form>
          ) : (
            <div className="card">
              <h2>Payment</h2>
              <div className="note" style={{ marginBottom: 18 }}><Icon name="pin" size="sm" /> Delivering to <b>{addressPayload().name}</b>, {addressPayload().line1}, {addressPayload().city} – {addressPayload().pincode} <button className="link" style={{ marginLeft: 8 }} onClick={() => setStep(2)}>Change</button></div>
              {([['PREPAID', 'Pay online', 'UPI, cards, net banking, wallets', `Save ${settings.prepaidDiscountPct}%`], ['COD', 'Cash on Delivery', 'Pay when your order arrives', '']] as const).map(([k, t, s, b]) => (
                <label key={k} className={`pay-opt ${pay === k ? 'is-active' : ''}`}>
                  <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} />
                  <span><b>{t}</b><small>{s}</small></span>{b ? <span className="badge badge--green">{b}</span> : <span />}
                </label>
              ))}
              {pay === 'COD' && q && <p className="note">Cash on Delivery doesn’t get the {settings.prepaidDiscountPct}% prepaid discount.</p>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                <button className="btn btn--outline" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn--primary btn--lg" onClick={place} disabled={busy || !q || q.issues.length > 0}><Icon name="lock" size="sm" /> {busy ? 'Placing order…' : `Place order · ${q ? rupees(q.totalPaise) : ''}`}</button>
              </div>
            </div>
          )}
        </div>
        <aside className="summary card">
          <h3>Order summary</h3>
          {q ? <>
            {q.lines.map(l => (
              <div key={l.variantId} style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                <div className="citem__media" style={{ width: 56, height: 56 }}><ProductArt product={artOf({ slug: l.productSlug, title: l.productTitle, type: l.productType, art: l.art })} image={l.image} /></div>
                <div style={{ fontSize: '.88rem', lineHeight: 1.3 }}><b>{l.productTitle}</b><div className="muted">{l.variantTitle} × {l.qty}</div></div>
                <b style={{ fontSize: '.9rem' }}>{rupees(l.lineTotalPaise)}</b>
              </div>
            ))}
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0 12px' }} />
            {!pending && <CouponBox />}
            {q.issues.map(i => <p key={i} className="note err-box" role="alert">{i}</p>)}
            <SummaryLines q={q} />
          </> : <div className="skeleton" style={{ height: 200 }} />}
          <div className="trust-mini"><span><Icon name="lock" size="sm" /> 100% secure</span><span><Icon name="shield" size="sm" /> PCI-DSS</span></div>
        </aside>
      </div>
    </>
  );
}

function Success({ order }: { order: Placed }) {
  return (
    <div className="container" style={{ padding: '30px 0 60px' }}>
      <div className="confetti" aria-hidden="true">{Array.from({ length: 60 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#C9A227', '#1F4D3A', '#E6C766', '#3E7B55', '#B3263A'][i % 5], animationDelay: `${(i % 10) * 0.08}s`, animationDuration: `${2 + (i % 7) * 0.2}s` }} />)}</div>
      <div className="done card">
        <div className="done__check"><Icon name="check" size="lg" /></div>
        <span className="eyebrow">Order {order.status === 'CONFIRMED' ? 'confirmed' : 'placed'}</span>
        <h1>Thank you!</h1>
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto 18px' }}>Your order <b>#{order.number}</b> is being packed fresh. We’ll share tracking details once it ships.</p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <div><small className="muted">Amount {order.paymentMode === 'COD' ? 'to pay on delivery' : 'paid'}</small><div className="price__now" style={{ fontSize: '1.4rem' }}>{rupees(order.totalPaise)}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn--primary" href={`/track-order?number=${order.number}&phone=${order.phone}`}><Icon name="truck" size="sm" /> Track order</Link>
          <Link className="btn btn--outline" href="/account">View my orders</Link>
          <Link className="btn btn--outline" href="/shop">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
