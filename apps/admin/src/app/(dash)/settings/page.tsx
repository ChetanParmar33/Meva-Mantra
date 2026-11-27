'use client';
import { useEffect, useState } from 'react';
import { Field, FlashBar, PageHead, Skeleton, useFlash } from '@/components/ui';
import { api, json, toPaise, toRs } from '@/lib/api';

type Brand = { name: string; tagline: string; phone: string; whatsapp: string; email: string; address: string; hours: string };
type Settings = { brand: Brand; prepaidDiscountPct: number; freeShippingAbovePaise: number; shippingFeePaise: number; giftWrapPaise: number };
type Draft = { brand: Brand; prepaid: string; freeAbove: string; shipFee: string; giftWrap: string };
const toDraft = (s: Settings): Draft => ({ brand: { ...s.brand }, prepaid: String(s.prepaidDiscountPct), freeAbove: toRs(s.freeShippingAbovePaise), shipFee: toRs(s.shippingFeePaise), giftWrap: toRs(s.giftWrapPaise) });

const BRAND_FIELDS: [keyof Brand, string, string?][] = [
  ['name', 'Store name'], ['tagline', 'Tagline'], ['phone', 'Phone (shown on site)', '+91 98765 43210'],
  ['whatsapp', 'WhatsApp number', 'digits with country code, e.g. 919876543210'], ['email', 'Email'], ['hours', 'Working hours'],
];

export default function SettingsPage() {
  const [d, setD] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const { flash, ok, fail } = useFlash();
  useEffect(() => { api<Settings>('/admin/settings').then((s) => setD(toDraft(s))).catch(fail); }, [fail]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d) return;
    const prepaid = Number(d.prepaid), money = [d.freeAbove, d.shipFee, d.giftWrap].map((v) => toPaise(v || '0'));
    if (!Number.isInteger(prepaid) || prepaid < 0 || prepaid > 50) return fail(new Error('Prepaid discount must be a whole number between 0 and 50.'));
    if (money.some((m) => m == null || Number.isNaN(m) || m < 0)) return fail(new Error('Amounts must be numbers ≥ 0.'));
    setBusy(true);
    try {
      const s = await api<Settings>('/admin/settings', json('PUT', { brand: d.brand, prepaidDiscountPct: prepaid, freeShippingAbovePaise: money[0], shippingFeePaise: money[1], giftWrapPaise: money[2] }));
      setD(toDraft(s));
      ok('Settings saved. The store picks them up within a few minutes.');
    } catch (err) { fail(err); }
    setBusy(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return fail(new Error('New password and confirmation do not match.'));
    if (pw.next.length < 10 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) return fail(new Error('New password needs at least 10 characters, with a letter and a number.'));
    setPwBusy(true);
    try {
      await api('/admin/auth/password', json('POST', { currentPassword: pw.current, newPassword: pw.next }));
      setPw({ current: '', next: '', confirm: '' });
      ok('Password changed. Use the new password next time you log in.');
    } catch (err) { fail(err); }
    setPwBusy(false);
  }

  if (!d) return <><PageHead eyebrow="Store" title="Settings" /><Skeleton className="h-96" /><FlashBar flash={flash} /></>;
  const setBrand = (k: keyof Brand, v: string) => setD({ ...d, brand: { ...d.brand, [k]: v } });

  return (
    <>
      <form onSubmit={save}>
        <PageHead eyebrow="Store" title="Settings">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </PageHead>
        <section className="card mb-5 grid gap-4 p-5 md:grid-cols-2">
          <h2 className="text-lg font-semibold md:col-span-2">Brand & contact</h2>
          {BRAND_FIELDS.map(([k, text, hint]) => (
            <Field key={k} label={text} hint={hint}>
              <input className="input" required type={k === 'email' ? 'email' : 'text'} value={d.brand[k]} onChange={(e) => setBrand(k, e.target.value)}
                {...(k === 'whatsapp' ? { pattern: '\\d{10,13}', inputMode: 'numeric' as const } : {})} />
            </Field>
          ))}
          <div className="md:col-span-2"><Field label="Address"><textarea className="input" required maxLength={200} value={d.brand.address} onChange={(e) => setBrand('address', e.target.value)} /></Field></div>
        </section>
        <section className="card grid gap-4 p-5 md:grid-cols-4">
          <h2 className="text-lg font-semibold md:col-span-4">Checkout rules</h2>
          <Field label="Prepaid discount %" hint="0–50"><input className="input" inputMode="numeric" value={d.prepaid} onChange={(e) => setD({ ...d, prepaid: e.target.value })} /></Field>
          <Field label="Free shipping above ₹"><input className="input" inputMode="decimal" value={d.freeAbove} onChange={(e) => setD({ ...d, freeAbove: e.target.value })} /></Field>
          <Field label="Shipping fee ₹" hint="below the limit"><input className="input" inputMode="decimal" value={d.shipFee} onChange={(e) => setD({ ...d, shipFee: e.target.value })} /></Field>
          <Field label="Gift wrap ₹"><input className="input" inputMode="decimal" value={d.giftWrap} onChange={(e) => setD({ ...d, giftWrap: e.target.value })} /></Field>
        </section>
      </form>

      <form onSubmit={changePassword} className="card mt-5 grid gap-4 p-5 md:grid-cols-3">
        <div className="md:col-span-3">
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="text-sm text-muted">At least 10 characters with a letter and a number.</p>
        </div>
        <Field label="Current password"><input className="input" type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="New password"><input className="input" type="password" required minLength={10} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <Field label="Confirm new password"><input className="input" type="password" required minLength={10} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        <div className="md:col-span-3"><button className="btn-outline" disabled={pwBusy}>{pwBusy ? 'Changing…' : 'Change password'}</button></div>
      </form>
      <FlashBar flash={flash} />
    </>
  );
}
