'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { NEXT_STATUS, type OrderStatus } from '@/components/types';
import { Badge, Field, FlashBar, PageHead, Skeleton, label, useFlash } from '@/components/ui';
import { api, fmtDate, json, rupees, STORE_URL } from '@/lib/api';

type Address = { name: string; phone: string; email?: string; line1: string; landmark?: string; city: string; state: string; pincode: string; type?: string };
type Order = {
  number: string; status: OrderStatus; paymentMode: 'PREPAID' | 'COD'; totalPaise: number; createdAt: string; itemCount: number;
  shippingAddress: Address; subtotalPaise: number; mrpSavingsPaise: number; couponCode: string | null; couponDiscountPaise: number;
  prepaidDiscountPaise: number; shippingPaise: number; giftWrapPaise: number; giftMessage: string | null; note: string | null;
  items: { title: string; variantTitle: string; sku: string; qty: number; unitPricePaise: number; lineTotalPaise: number; productSlug: string | null }[];
  events: { status: OrderStatus; note: string | null; createdAt: string }[];
  shipment: { courier: string | null; awb: string | null; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null } | null;
  payment: { provider: string; status: string; method: string | null } | null;
  phone: string; email: string | null; user: { id: string; name: string | null; phone: string | null; email: string | null } | null;
};
type Settings = { brand: { name: string; phone: string; email: string; address: string } };

export function OrderDetail() {
  const { number } = useParams<{ number: string }>();
  const [o, setO] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [brand, setBrand] = useState<Settings['brand'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [ship, setShip] = useState({ courier: '', awb: '', trackingUrl: '' });
  const { flash, ok, fail } = useFlash();

  const load = useCallback((order: Order) => {
    setO(order);
    setShip({ courier: order.shipment?.courier ?? '', awb: order.shipment?.awb ?? '', trackingUrl: order.shipment?.trackingUrl ?? '' });
  }, []);
  useEffect(() => {
    api<Order>(`/admin/orders/${number}`).then(load).catch((e) => (e.status === 404 ? setMissing(true) : fail(e)));
    api<Settings>('/admin/settings').then((s) => setBrand(s.brand)).catch(() => {});
  }, [number, load, fail]);

  async function update(body: Record<string, string>, done: string) {
    setBusy(true);
    try {
      load(await api<Order>(`/admin/orders/${number}`, json('PATCH', body)));
      ok(done);
      setNote('');
    } catch (e) { fail(e); }
    setBusy(false);
  }

  if (missing) return <p className="card p-10 text-center">Order {number} not found. <Link href="/orders" className="font-bold text-green underline">Back to orders</Link></p>;
  if (!o) return <Skeleton className="h-96" />;
  const a = o.shippingAddress;
  const next = NEXT_STATUS[o.status];
  const rows: [string, number, boolean?][] = [
    ['Subtotal', o.subtotalPaise], ['MRP savings', -o.mrpSavingsPaise, true],
    [`Coupon${o.couponCode ? ` (${o.couponCode})` : ''}`, -o.couponDiscountPaise], ['Prepaid discount', -o.prepaidDiscountPaise],
    ['Gift wrap', o.giftWrapPaise], ['Shipping', o.shippingPaise],
  ];

  return (
    <>
      <PageHead eyebrow="Order" title={o.number}>
        <Link href="/orders" className="btn-outline">← Orders</Link>
        <button className="btn-primary" onClick={() => window.print()}>Print invoice / packing slip</button>
      </PageHead>

      {/* Printed header only */}
      <div className="mb-6 hidden border-b border-line pb-4 print:block">
        <p className="font-serif text-2xl font-bold">{brand?.name ?? 'Meva Mantra'}</p>
        <p className="text-sm">{brand?.address}<br />{brand?.phone} · {brand?.email}</p>
        <p className="mt-3 text-lg font-bold">Invoice / Packing slip · {o.number} · {fmtDate(o.createdAt, false)}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] print:block">
        <div className="grid gap-5">
          <section className="card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Badge value={o.status} />
              <span className="text-sm text-muted">Placed {fmtDate(o.createdAt)} · {o.paymentMode === 'COD' ? 'Cash on Delivery' : 'Prepaid'}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-2">Item</th><th>SKU</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.sku} className="border-t border-line">
                    <td className="py-2.5">
                      {i.productSlug ? <a href={`${STORE_URL}/products/${i.productSlug}`} target="_blank" className="font-semibold hover:underline print:no-underline">{i.title}</a> : <span className="font-semibold">{i.title}</span>}
                      <span className="block text-xs text-muted">{i.variantTitle}</span>
                    </td>
                    <td className="font-mono text-xs text-muted">{i.sku}</td>
                    <td className="text-right">{rupees(i.unitPricePaise)}</td>
                    <td className="text-right">{i.qty}</td>
                    <td className="text-right font-semibold">{rupees(i.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
              {rows.filter(([, v, info]) => v !== 0 && !info).map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd>{v < 0 ? '−' + rupees(-v) : rupees(v)}</dd></div>
              ))}
              {o.shippingPaise === 0 && <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>Free</dd></div>}
              <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{rupees(o.totalPaise)}</dd></div>
              {o.mrpSavingsPaise > 0 && <p className="text-right text-xs text-muted print:hidden">Customer saved {rupees(o.mrpSavingsPaise)} on MRP</p>}
            </dl>
          </section>

          {(o.giftMessage || o.note) && (
            <section className="card grid gap-2 p-5 text-sm">
              {o.giftMessage && <p><b className="text-green-900">🎁 Gift message:</b> {o.giftMessage}</p>}
              {o.note && <p><b className="text-green-900">Customer note:</b> {o.note}</p>}
            </section>
          )}

          <section className="card p-5 print:hidden">
            <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
            <ol className="grid gap-3 border-l-2 border-line pl-4 text-sm">
              {o.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full bg-gold" />
                  <b>{label(e.status)}</b> <span className="text-muted">· {fmtDate(e.createdAt)}</span>
                  {e.note && <p className="text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid content-start gap-5">
          <section className="card p-5 text-sm print:mt-5 print:border-0 print:p-0">
            <h2 className="mb-2 text-lg font-semibold">Ship to</h2>
            <p className="font-semibold">{a.name}</p>
            <p>{a.line1}{a.landmark ? `, ${a.landmark}` : ''}<br />{a.city}, {a.state} – {a.pincode}</p>
            <p className="mt-2">📞 <a href={`tel:+91${o.phone}`} className="underline">{o.phone}</a>
              <a href={`https://wa.me/91${o.phone}?text=${encodeURIComponent(`Hi ${a.name}, about your Meva Mantra order ${o.number}`)}`} target="_blank" className="ml-2 font-semibold text-green underline print:hidden">WhatsApp</a></p>
            {o.email && <p>✉️ <a href={`mailto:${o.email}`} className="underline">{o.email}</a></p>}
            <p className="mt-3 text-muted print:hidden">Payment: {o.payment ? `${o.payment.provider.toUpperCase()} · ${label(o.payment.status)}${o.payment.method ? ` · ${o.payment.method}` : ''}` : '—'}</p>
          </section>

          <section className="card grid gap-3 p-5 print:hidden">
            <h2 className="text-lg font-semibold">Update status</h2>
            {next.length ? (
              <>
                <Field label="Note (optional, saved in the timeline)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <button key={s} disabled={busy}
                      className={s === 'CANCELLED' || s === 'RETURNED' ? 'btn border-2 border-red-600 text-red-700 hover:bg-red-600 hover:text-white' : 'btn-primary'}
                      onClick={() => {
                        if ((s === 'CANCELLED' || s === 'RETURNED') && !confirm(`Mark ${o.number} as ${label(s).toLowerCase()}? Stock will be added back.`)) return;
                        update({ status: s, ...(note ? { note } : {}) }, `Order marked ${label(s).toLowerCase()}`);
                      }}>
                      {label(s)}
                    </button>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-muted">No further status changes for a {label(o.status).toLowerCase()} order.</p>}
            {next.length > 0 && note && <button className="btn-outline" disabled={busy} onClick={() => update({ note }, 'Note added')}>Add note only</button>}
          </section>

          <form className="card grid gap-3 p-5 print:hidden" onSubmit={(e) => {
            e.preventDefault();
            update({ courier: ship.courier.trim(), awb: ship.awb.trim(), ...(ship.trackingUrl.trim() ? { trackingUrl: ship.trackingUrl.trim() } : {}) }, 'Shipment details saved');
          }}>
            <h2 className="text-lg font-semibold">Shipment</h2>
            <Field label="Courier"><input className="input" placeholder="Delhivery, Bluedart…" value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} /></Field>
            <Field label="AWB / tracking number"><input className="input" value={ship.awb} onChange={(e) => setShip({ ...ship, awb: e.target.value })} /></Field>
            <Field label="Tracking URL"><input className="input" type="url" placeholder="https://…" value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} /></Field>
            {o.shipment?.shippedAt && <p className="text-xs text-muted">Shipped {fmtDate(o.shipment.shippedAt)}{o.shipment.deliveredAt ? ` · Delivered ${fmtDate(o.shipment.deliveredAt)}` : ''}</p>}
            <button className="btn-outline" disabled={busy}>Save shipment</button>
          </form>
        </div>
      </div>
      <FlashBar flash={flash} />
    </>
  );
}
