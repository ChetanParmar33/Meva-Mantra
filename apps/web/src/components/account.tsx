'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, STATUS_FLOW, STATUS_LABEL, type Address, type OrderDetail, type OrderEvent, type OrderSummary, type Shipment, type User } from '@/lib/client';
import { fmtDate, rupees } from '@/lib/format';
import { Emblem } from './emblem';
import { Icon } from './icons';
import { ProductGrid } from './product';
import { useStore } from './store';
import { OtpLogin } from './ui';

/** Status timeline shared by Account order detail and Track Order. */
export function Timeline({ status, events, shipment }: { status: string; events: OrderEvent[]; shipment: Shipment }) {
  if (status === 'CANCELLED' || status === 'RETURNED' || status === 'PENDING_PAYMENT') {
    return <ul className="timeline">{events.map((e, i) => <li key={i} className={i === events.length - 1 ? 'is-current' : 'is-done'}><b>{STATUS_LABEL[e.status] ?? e.status}</b><small>{fmtDate(e.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{e.note ? ` · ${e.note}` : ''}</small></li>)}</ul>;
  }
  const cur = STATUS_FLOW.indexOf(status);
  return (
    <ul className="timeline">
      {STATUS_FLOW.map((s, i) => {
        const ev = [...events].reverse().find(e => e.status === s);
        return (
          <li key={s} className={i < cur ? 'is-done' : i === cur ? 'is-current' : ''}>
            <b>{STATUS_LABEL[s]}</b>
            <small>{ev ? fmtDate(ev.createdAt, { weekday: 'short', day: 'numeric', month: 'short' }) + (ev.note ? ` · ${ev.note}` : '') : i > cur ? 'Pending' : ''}
              {s === 'SHIPPED' && shipment?.awb ? ` · ${shipment.courier ?? 'Courier'} · AWB ${shipment.awb}` : ''}</small>
            {s === 'SHIPPED' && shipment?.trackingUrl && i <= cur && <a className="link" href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Track with courier</a>}
          </li>
        );
      })}
    </ul>
  );
}

const badgeFor = (s: string) => (s === 'DELIVERED' ? 'badge--green' : s === 'CANCELLED' || s === 'RETURNED' ? 'badge--grey' : 'badge--gold');

function OrderDetailView({ number, onBack }: { number: string; onBack: () => void }) {
  const [o, setO] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<OrderDetail>(`/account/orders/${number}`).then(setO).catch(e => setErr(e.message)); }, [number]);
  if (err) return <p className="note err-box">{err}</p>;
  if (!o) return <div className="skeleton" style={{ height: 300 }} />;
  const a = o.shippingAddress;
  return (
    <div>
      <button className="link" onClick={onBack} style={{ marginBottom: 16 }}><Icon name="left" size="sm" /> All orders</button>
      <div className="card">
        <div className="order__head"><div><h3 style={{ margin: 0 }}>Order #{o.number}</h3><span className="muted" style={{ fontSize: '.9rem' }}>{fmtDate(o.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })} · {o.paymentMode === 'COD' ? 'Cash on Delivery' : 'Paid online'}</span></div><span className={`badge ${badgeFor(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span></div>
        <Timeline status={o.status} events={o.events} shipment={o.shipment} />
        <div className="row2">
          <div><h4 style={{ fontFamily: 'var(--sans)', fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>Items</h4>
            {o.items.map((i, k) => <div key={k} className="sum-line"><span>{i.productSlug ? <Link className="link" style={{ border: 0, padding: 0 }} href={`/products/${i.productSlug}`}>{i.title}</Link> : i.title} <span className="muted">({i.variantTitle} × {i.qty})</span></span><span>{rupees(i.lineTotalPaise)}</span></div>)}
            <hr style={{ border: 0, borderTop: '1px dashed var(--line)' }} />
            <div className="sum-line"><span>Subtotal</span><span>{rupees(o.subtotalPaise)}</span></div>
            {o.couponDiscountPaise > 0 && <div className="sum-line"><span>Coupon {o.couponCode}</span><span className="save">−{rupees(o.couponDiscountPaise)}</span></div>}
            {o.prepaidDiscountPaise > 0 && <div className="sum-line"><span>Prepaid discount</span><span className="save">−{rupees(o.prepaidDiscountPaise)}</span></div>}
            {o.giftWrapPaise > 0 && <div className="sum-line"><span>Gift wrap</span><span>{rupees(o.giftWrapPaise)}</span></div>}
            <div className="sum-line"><span>Shipping</span><span>{o.shippingPaise ? rupees(o.shippingPaise) : 'FREE'}</span></div>
            <div className="sum-line sum-line--total"><span>Total</span><span>{rupees(o.totalPaise)}</span></div>
          </div>
          <div><h4 style={{ fontFamily: 'var(--sans)', fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>Delivery address</h4>
            <p className="muted"><b style={{ color: 'var(--ink)' }}>{a.name}</b><br />{a.line1}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.city}, {a.state} – {a.pincode}<br />{a.phone}</p>
            {o.giftMessage && <p className="note">Gift message: “{o.giftMessage}”</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressBook() {
  const [list, setList] = useState<Address[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const load = () => api<Address[]>('/account/addresses').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try { await api('/account/addresses', { json: { ...f, landmark: f.landmark || undefined } }); setAdding(false); load(); } catch (x) { setErr((x as Error).message); }
  }
  async function del(id: string) {
    if (!confirm('Delete this address?')) return;
    await api(`/account/addresses/${id}`, { method: 'DELETE' }).catch(x => setErr(x.message)); load();
  }
  return (
    <>
      {err && <p className="note err-box" role="alert">{err}</p>}
      {!list ? <div className="skeleton" style={{ height: 160 }} /> : (
        <div className="grid grid--3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {list.map(a => <div key={a.id} className="card"><span className="badge badge--soft">{a.type}</span>{a.isDefault && <span className="badge badge--gold" style={{ marginLeft: 6 }}>Default</span>}<p style={{ margin: '10px 0 4px' }}><b>{a.name}</b></p><p className="muted" style={{ fontSize: '.9rem' }}>{a.line1}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.city}, {a.state} – {a.pincode}<br />{a.phone}</p><button className="remove" onClick={() => del(a.id)}>Delete</button></div>)}
          {!list.length && !adding && <p className="muted">No saved addresses yet. Addresses you use at checkout are saved here.</p>}
        </div>
      )}
      {adding ? (
        <form className="card" style={{ marginTop: 20, maxWidth: 640 }} onSubmit={add}>
          <div className="row2"><div className="field"><label htmlFor="ad-name">Full name</label><input id="ad-name" name="name" required /></div><div className="field"><label htmlFor="ad-phone">Mobile</label><input id="ad-phone" name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} required /></div></div>
          <div className="field"><label htmlFor="ad-line1">House no., street, area</label><input id="ad-line1" name="line1" required /></div>
          <div className="field"><label htmlFor="ad-lm">Landmark (optional)</label><input id="ad-lm" name="landmark" /></div>
          <div className="row3"><div className="field"><label htmlFor="ad-pin">Pincode</label><input id="ad-pin" name="pincode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} required /></div><div className="field"><label htmlFor="ad-city">City</label><input id="ad-city" name="city" required /></div><div className="field"><label htmlFor="ad-state">State</label><input id="ad-state" name="state" required /></div></div>
          <div className="field"><label htmlFor="ad-type">Type</label><select id="ad-type" name="type" defaultValue="HOME"><option value="HOME">Home</option><option value="WORK">Work</option><option value="OTHER">Other</option></select></div>
          <div style={{ display: 'flex', gap: 10 }}><button className="btn btn--primary">Save address</button><button type="button" className="btn btn--outline" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      ) : <button className="btn btn--outline" style={{ marginTop: 20 }} onClick={() => setAdding(true)}><Icon name="plus" size="sm" /> Add address</button>}
    </>
  );
}

function Profile({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="card" style={{ maxWidth: 560 }} onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const body: Record<string, unknown> = { name: f.get('name') || undefined, email: f.get('email') || undefined, phone: f.get('phone') || undefined, dob: f.get('dob') || undefined, marketingOptIn: f.get('optin') === 'on' };
      try { onSaved(await api<User>('/account/profile', { method: 'PATCH', json: body })); setMsg({ ok: true, text: 'Profile saved' }); } catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
    }}>
      <div className="row2"><div className="field"><label htmlFor="pf-name">Full name</label><input id="pf-name" name="name" defaultValue={user.name ?? ''} /></div><div className="field"><label htmlFor="pf-dob">Birthday</label><input id="pf-dob" name="dob" type="date" defaultValue={user.dob?.slice(0, 10) ?? ''} /></div></div>
      <div className="row2"><div className="field"><label htmlFor="pf-phone">Mobile</label><input id="pf-phone" name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} defaultValue={user.phone ?? ''} /></div><div className="field"><label htmlFor="pf-email">Email</label><input id="pf-email" name="email" type="email" defaultValue={user.email ?? ''} /></div></div>
      <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" name="optin" defaultChecked={user.marketingOptIn} /> Send me offers and new launches</label>
      {msg && <p className={msg.ok ? 'success' : 'note err-box'} role="status" style={{ marginBottom: 12 }}>{msg.text}</p>}
      <button className="btn btn--primary">Save changes</button>
    </form>
  );
}

export function AccountView() {
  const { wishlist, products } = useStore();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [tab, setTab] = useState<'orders' | 'wishlist' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api<User>('/auth/me').then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => { if (user) api<OrderSummary[]>('/account/orders').then(setOrders).catch(() => setOrders([])); }, [user]);

  if (user === undefined) return <div className="container"><div className="skeleton" style={{ height: 300, margin: '40px 0' }} /></div>;
  if (!user) return <div className="auth card"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Emblem size={64} /></div><OtpLogin title="Welcome back" onDone={setUser} /></div>;

  const tabs = [['orders', 'My orders', 'box'], ['wishlist', 'Wishlist', 'heart'], ['addresses', 'Addresses', 'pin'], ['profile', 'Profile', 'user']] as const;
  const wished = products.filter(p => wishlist.includes(p.slug));
  return (
    <div className="dash">
      <nav className="dash__nav" aria-label="Account">
        <div style={{ padding: '10px 14px 14px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
          <span className="avatar" style={{ marginBottom: 8 }} aria-hidden="true">{(user.name || user.phone || user.email || 'U')[0].toUpperCase()}</span>
          <b>{user.name || 'Hello!'}</b><div className="muted" style={{ fontSize: '.85rem' }}>{user.phone ? '+91 ' + user.phone : user.email}</div>
        </div>
        {tabs.map(([k, t, i]) => <button key={k} className={tab === k ? 'is-active' : ''} aria-current={tab === k} onClick={() => { setTab(k); setOpen(null); }}><Icon name={i} size="sm" /> {t}</button>)}
        <button onClick={async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null); setOrders(null); }}><Icon name="logout" size="sm" /> Logout</button>
      </nav>
      <div>
        <h2>{tabs.find(t => t[0] === tab)![1]}</h2>
        {tab === 'orders' && (open ? <OrderDetailView number={open} onBack={() => setOpen(null)} /> : !orders ? <div className="skeleton" style={{ height: 200 }} /> : orders.length ? orders.map(o => (
          <div key={o.number} className="order">
            <div className="order__head"><div><b>Order #{o.number}</b><div className="muted" style={{ fontSize: '.85rem' }}>{fmtDate(o.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })} · {o.paymentMode === 'COD' ? 'Cash on Delivery' : 'Paid online'}</div></div><span className={`badge ${badgeFor(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span></div>
            <p className="muted" style={{ fontSize: '.9rem' }}>{o.items.map(i => `${i.title} (${i.variantTitle}) × ${i.qty}`).join(' · ')}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}><b>Total {rupees(o.totalPaise)}</b><button className="btn btn--outline btn--sm" onClick={() => setOpen(o.number)}>View details</button></div>
          </div>
        )) : <div className="empty card"><div className="empty__icon"><Icon name="box" size="lg" /></div><h3>No orders yet</h3><p className="muted">Your orders will appear here.</p><Link className="btn btn--primary" href="/shop">Start shopping</Link></div>)}
        {tab === 'wishlist' && (wished.length ? <ProductGrid items={wished} className="grid grid--3" /> : <div className="empty card"><div className="empty__icon"><Icon name="heart" size="lg" /></div><h3>Your wishlist is empty</h3><Link className="btn btn--primary" href="/shop">Browse products</Link></div>)}
        {tab === 'addresses' && <AddressBook />}
        {tab === 'profile' && <Profile user={user} onSaved={setUser} />}
      </div>
    </div>
  );
}

type TrackInfo = { number: string; status: string; createdAt: string; city: string | null; pincode: string | null; itemCount: number; events: OrderEvent[]; shipment: Shipment };

export function TrackView() {
  const { settings } = useStore();
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [res, setRes] = useState<TrackInfo | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function track(n: string, ph: string) {
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await api<TrackInfo>(`/orders/track?number=${encodeURIComponent(n.trim())}&phone=${encodeURIComponent(ph.trim())}`)); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  useEffect(() => {
    const u = new URLSearchParams(location.search);
    const n = u.get('number') ?? '', ph = u.get('phone') ?? '';
    if (n) { setNumber(n); setPhone(ph); if (ph) track(n, ph); }
  }, []);
  return (
    <section className="section"><div className="container" style={{ maxWidth: 760 }}>
      <form className="card" onSubmit={e => { e.preventDefault(); track(number, phone); }}>
        <div className="row2">
          <div className="field"><label htmlFor="tid">Order ID</label><input id="tid" placeholder="e.g. MM10001" value={number} onChange={e => setNumber(e.target.value.toUpperCase())} required /></div>
          <div className="field"><label htmlFor="tph">Mobile number used for the order</label><input id="tph" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} required pattern="[6-9][0-9]{9}" /></div>
        </div>
        <button className="btn btn--primary btn--lg" disabled={busy}><Icon name="truck" size="sm" /> {busy ? 'Checking…' : 'Track order'}</button>
      </form>
      {err && <div className="note err-box" style={{ marginTop: 20 }} role="alert">{err}</div>}
      {res && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="order__head"><div><span className="eyebrow">Tracking</span><h2 style={{ margin: 0 }}>Order #{res.number}</h2></div><span className={`badge ${badgeFor(res.status)}`} style={{ alignSelf: 'center' }}>{STATUS_LABEL[res.status] ?? res.status}</span></div>
          <p className="muted" style={{ margin: 0 }}>{res.itemCount} item{res.itemCount === 1 ? '' : 's'} · placed {fmtDate(res.createdAt)}{res.city ? ` · shipping to ${res.city} – ${res.pincode}` : ''}</p>
          <Timeline status={res.status} events={res.events} shipment={res.shipment} />
          <a className="btn btn--primary btn--sm" href={`https://wa.me/${settings.brand.whatsapp}?text=${encodeURIComponent('Hi, I need help with order #' + res.number)}`}><Icon name="phone" size="sm" /> Need help? WhatsApp us</a>
        </div>
      )}
    </div></section>
  );
}

export function WishlistView() {
  const { wishlist, products, ready } = useStore();
  const items = products.filter(p => wishlist.includes(p.slug));
  if (!ready) return <div className="skeleton" style={{ height: 300 }} />;
  return items.length ? <ProductGrid items={items} /> : (
    <div className="empty card"><div className="empty__icon"><Icon name="heart" size="lg" /></div><h2>Your wishlist is empty</h2><p className="muted">Tap the heart on any product to save it here.</p><Link className="btn btn--primary" href="/shop?c=bestseller">Explore bestsellers</Link></div>
  );
}
