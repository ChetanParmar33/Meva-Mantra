'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-gold-d">{eyebrow}</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

type Flash = { ok: boolean; text: string } | null;
/** Short-lived success/error message. 401s are handled by the layout (redirect), so they are ignored here. */
export function useFlash() {
  const [flash, setFlash] = useState<Flash>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((ok: boolean, text: string) => {
    clearTimeout(timer.current);
    setFlash({ ok, text });
    timer.current = setTimeout(() => setFlash(null), ok ? 3500 : 7000);
  }, []);
  const fail = useCallback((e: unknown) => {
    if ((e as { status?: number }).status === 401) return;
    show(false, (e as Error).message || 'Something went wrong');
  }, [show]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { flash, ok: (t: string) => show(true, t), fail };
}

export function FlashBar({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return (
    <p role={flash.ok ? 'status' : 'alert'} className={`fixed top-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg print:hidden ${flash.ok ? 'bg-green text-white' : 'bg-red-600 text-white'}`}>
      {flash.text}
    </p>
  );
}

export const Skeleton = ({ className = 'h-40' }: { className?: string }) => <div className={`card animate-pulse bg-cream-2 ${className}`} />;
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="card p-10 text-center text-muted">{children}</div>;

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800', CONFIRMED: 'bg-sky-100 text-sky-800', PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800', OUT_FOR_DELIVERY: 'bg-fuchsia-100 text-fuchsia-800', DELIVERED: 'bg-sage text-green',
  CANCELLED: 'bg-red-100 text-red-700', RETURNED: 'bg-stone-200 text-stone-700',
  PENDING: 'bg-amber-100 text-amber-800', APPROVED: 'bg-sage text-green', REJECTED: 'bg-red-100 text-red-700',
  NEW: 'bg-amber-100 text-amber-800', IN_PROGRESS: 'bg-sky-100 text-sky-800', CLOSED: 'bg-stone-200 text-stone-700',
  ACTIVE: 'bg-sage text-green', COMING_SOON: 'bg-gold-soft text-gold-d', DRAFT: 'bg-stone-200 text-stone-700', ARCHIVED: 'bg-red-100 text-red-700',
};
export const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export function Badge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${STATUS_STYLE[value] ?? 'bg-cream-2 text-ink'}`}>{label(value)}</span>;
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold ${value === o.value ? 'border-green bg-green text-white' : 'border-line bg-white hover:border-green'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label: text, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="flex justify-between gap-2 font-bold text-green-900">{text}{hint && <span className="font-normal text-muted">{hint}</span>}</span>
      {children}
    </label>
  );
}

/** Comma/Enter separated chips for string arrays (ingredients, highlights…). */
export function TagInput({ value, onChange, placeholder, max = 30 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean).filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts].slice(0, max));
    setDraft('');
  };
  return (
    <div className="input flex min-h-[46px] flex-wrap items-center gap-1.5 py-1.5">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-green">
          {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-green/70 hover:text-red-600">×</button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={add} placeholder={value.length ? '' : placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1)); }}
        className="min-w-24 flex-1 bg-transparent py-1 outline-none" />
    </div>
  );
}
