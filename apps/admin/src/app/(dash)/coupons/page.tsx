'use client';
import { useCallback, useEffect, useState } from 'react';
import { Empty, Field, FlashBar, PageHead, Skeleton, useFlash } from '@/components/ui';
import { api, fmtDate, json, rupees, toPaise, toRs } from '@/lib/api';

type Coupon = {
  id: string; code: string; description: string; type: 'PERCENT' | 'FLAT'; value: number; minOrderPaise: number; maxDiscountPaise: number | null;
  startsAt: string | null; endsAt: string | null; usageLimit: number | null; usedCount: number; firstOrderOnly: boolean; isActive: boolean;
};
type Draft = { code: string; description: string; type: 'PERCENT' | 'FLAT'; value: string; minOrder: string; maxDiscount: string; startsAt: string; endsAt: string; usageLimit: string; firstOrderOnly: boolean; isActive: boolean };
const blank: Draft = { code: '', description: '', type: 'PERCENT', value: '', minOrder: '0', maxDiscount: '', startsAt: '', endsAt: '', usageLimit: '', firstOrderOnly: false, isActive: true };
const day = (d: string | null) => (d ? d.slice(0, 10) : '');
const toDraft = (c: Coupon): Draft => ({
  code: c.code, description: c.description, type: c.type, value: c.type === 'PERCENT' ? String(c.value) : toRs(c.value), minOrder: toRs(c.minOrderPaise),
  maxDiscount: toRs(c.maxDiscountPaise), startsAt: day(c.startsAt), endsAt: day(c.endsAt), usageLimit: c.usageLimit == null ? '' : String(c.usageLimit),
  firstOrderOnly: c.firstOrderOnly, isActive: c.isActive,
});
/** Form → API body. Percent stays a number; flat amounts become paise. End date covers the whole day (IST). */
function toBody(d: Draft) {
  const value = d.type === 'PERCENT' ? Math.round(Number(d.value)) : toPaise(d.value);
  if (!value || value < 1) throw new Error(d.type === 'PERCENT' ? 'Enter a discount percent (1–90).' : 'Enter a discount amount in ₹.');
  return {
    description: d.description.trim(), type: d.type, value, minOrderPaise: toPaise(d.minOrder) ?? 0, maxDiscountPaise: toPaise(d.maxDiscount),
    startsAt: d.startsAt ? new Date(`${d.startsAt}T00:00:00+05:30`).toISOString() : null,
    endsAt: d.endsAt ? new Date(`${d.endsAt}T23:59:59+05:30`).toISOString() : null,
    usageLimit: d.usageLimit ? Number(d.usageLimit) : null, firstOrderOnly: d.firstOrderOnly, isActive: d.isActive,
  };
}

export default function CouponsPage() {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; d: Draft } | null>(null);
  const [busy, setBusy] = useState(false);
  const { flash, ok, fail } = useFlash();
  const load = useCallback(() => api<Coupon[]>('/admin/coupons').then(setList).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      const body = toBody(edit.d);
      if (edit.id) await api(`/admin/coupons/${edit.id}`, json('PATCH', body));
      else await api('/admin/coupons', json('POST', { ...body, code: edit.d.code.trim().toUpperCase() }));
      ok(edit.id ? 'Coupon updated' : 'Coupon created');
      setEdit(null); load();
    } catch (err) { fail(err); }
    setBusy(false);
  }
  async function toggle(c: Coupon) {
    try { await api(`/admin/coupons/${c.id}`, json('PATCH', { isActive: !c.isActive })); ok(`${c.code} ${c.isActive ? 'paused' : 'activated'}`); load(); } catch (e) { fail(e); }
  }
  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}? Customers won't be able to use it.`)) return;
    try { await api(`/admin/coupons/${c.id}`, { method: 'DELETE' }); ok(`${c.code} deleted`); load(); } catch (e) { fail(e); }
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEdit((x) => x && { ...x, d: { ...x.d, [k]: v } });

  return (
    <>
      <PageHead eyebrow="Offers" title="Coupons">
        {!edit && <button className="btn-primary" onClick={() => setEdit({ id: null, d: blank })}>+ New coupon</button>}
      </PageHead>

      {edit && (
        <form onSubmit={save} className="card mb-6 grid gap-4 p-5 md:grid-cols-3">
          <h2 className="text-lg font-semibold md:col-span-3">{edit.id ? `Edit ${edit.d.code}` : 'New coupon'}</h2>
          <Field label="Code" hint="A–Z, 0–9"><input className="input font-mono uppercase" required disabled={!!edit.id} pattern="[A-Za-z0-9]{3,20}" maxLength={20} value={edit.d.code} onChange={(e) => set('code', e.target.value.toUpperCase())} /></Field>
          <div className="md:col-span-2"><Field label="Description (shown to customers)"><input className="input" required minLength={3} maxLength={120} value={edit.d.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <Field label="Discount type">
            <select className="input" value={edit.d.type} onChange={(e) => set('type', e.target.value as Draft['type'])}><option value="PERCENT">Percent (%)</option><option value="FLAT">Flat amount (₹)</option></select>
          </Field>
          <Field label={edit.d.type === 'PERCENT' ? 'Discount %' : 'Discount ₹'}><input className="input" required inputMode="decimal" value={edit.d.value} onChange={(e) => set('value', e.target.value)} /></Field>
          <Field label="Minimum order ₹"><input className="input" inputMode="decimal" value={edit.d.minOrder} onChange={(e) => set('minOrder', e.target.value)} /></Field>
          <Field label="Max discount ₹" hint="optional"><input className="input" inputMode="decimal" value={edit.d.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} /></Field>
          <Field label="Starts" hint="optional"><input className="input" type="date" value={edit.d.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
          <Field label="Ends" hint="optional"><input className="input" type="date" value={edit.d.endsAt} onChange={(e) => set('endsAt', e.target.value)} /></Field>
          <Field label="Usage limit" hint="total uses, optional"><input className="input" inputMode="numeric" value={edit.d.usageLimit} onChange={(e) => set('usageLimit', e.target.value.replace(/\D/g, ''))} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-green" checked={edit.d.firstOrderOnly} onChange={(e) => set('firstOrderOnly', e.target.checked)} /> First order only</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-green" checked={edit.d.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
          <div className="flex gap-2 md:col-span-3">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button>
            <button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!list ? <Skeleton /> : !list.length ? <Empty>No coupons yet.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-5 py-3">Code</th><th className="px-2">Discount</th><th className="px-2">Rules</th><th className="px-2">Valid</th><th className="px-2">Used</th><th className="px-2">Status</th><th className="px-5" /></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="px-5 py-3"><b className="font-mono text-green-900">{c.code}</b><span className="block text-xs text-muted">{c.description}</span></td>
                  <td className="px-2 font-semibold">{c.type === 'PERCENT' ? `${c.value}%` : rupees(c.value)}{c.maxDiscountPaise != null && <span className="block text-xs font-normal text-muted">max {rupees(c.maxDiscountPaise)}</span>}</td>
                  <td className="px-2 text-xs text-muted">{c.minOrderPaise ? `Min ${rupees(c.minOrderPaise)}` : 'No minimum'}{c.firstOrderOnly && <span className="block font-semibold text-gold-d">First order only</span>}</td>
                  <td className="px-2 text-xs text-muted">{c.startsAt || c.endsAt ? `${c.startsAt ? fmtDate(c.startsAt, false) : '…'} → ${c.endsAt ? fmtDate(c.endsAt, false) : '…'}` : 'Always'}</td>
                  <td className="px-2">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ''}</td>
                  <td className="px-2">
                    <button onClick={() => toggle(c)} aria-label={`${c.isActive ? 'Pause' : 'Activate'} ${c.code}`}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${c.isActive ? 'bg-sage text-green' : 'bg-stone-200 text-stone-700'}`}>{c.isActive ? 'Active' : 'Paused'}</button>
                  </td>
                  <td className="px-5 text-right whitespace-nowrap">
                    <button className="text-sm font-semibold text-green underline" onClick={() => setEdit({ id: c.id, d: toDraft(c) })}>Edit</button>
                    <button className="ml-3 text-sm text-red-600 underline" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FlashBar flash={flash} />
    </>
  );
}
