'use client';
import { useEffect, useState } from 'react';
import { Field, TagInput } from '@/components/ui';
import { api } from '@/lib/api';

export const TYPES = ['JAR', 'BOX', 'COMBO', 'HAMPER', 'PURSE', 'CARD'] as const;
export const STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export type ProductFields = {
  slug: string; title: string; type: (typeof TYPES)[number]; status: (typeof STATUSES)[number]; short: string; description: string;
  ingredients: string[]; highlights: string[]; contains: string[]; shelfLife: string; optionName: string; limitedNote: string;
  seoTitle: string; seoDescription: string; collections: string[];
};
export const emptyProduct: ProductFields = {
  slug: '', title: '', type: 'JAR', status: 'DRAFT', short: '', description: '', ingredients: [], highlights: [], contains: [],
  shelfLife: '', optionName: 'Size', limitedNote: '', seoTitle: '', seoDescription: '', collections: [],
};
export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

/** Optional text fields are sent as null when empty so the API clears them. */
export const toPayload = ({ slug: _slug, shelfLife, limitedNote, seoTitle, seoDescription, ...f }: ProductFields) => ({
  ...f, shelfLife: shelfLife.trim() || null, limitedNote: limitedNote.trim() || null, seoTitle: seoTitle.trim() || null, seoDescription: seoDescription.trim() || null,
});

type Collection = { id: string; slug: string; title: string; kind: 'CATEGORY' | 'COLLECTION' };

export function ProductFieldsForm({ value, onChange, isNew }: { value: ProductFields; onChange: (v: ProductFields) => void; isNew?: boolean }) {
  const [cols, setCols] = useState<Collection[]>([]);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  useEffect(() => { api<Collection[]>('/admin/collections').then(setCols).catch(() => {}); }, []);
  const set = <K extends keyof ProductFields>(k: K, v: ProductFields[K]) => onChange({ ...value, [k]: v, ...(k === 'title' && !slugTouched ? { slug: slugify(String(v)) } : {}) });
  const toggleCol = (slug: string) => set('collections', value.collections.includes(slug) ? value.collections.filter((c) => c !== slug) : [...value.collections, slug]);
  const counter = (s: string, max: number) => <span className={s.length > max ? 'font-bold text-red-600' : ''}>{s.length}/{max}</span>;

  return (
    <div className="grid gap-5">
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Title"><input className="input" required maxLength={160} value={value.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="URL slug" hint={isNew ? 'auto from title' : 'cannot be changed'}>
          <input className="input font-mono text-sm" required disabled={!isNew} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={value.slug}
            onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
        </Field>
        <Field label="Type">
          <select className="input" value={value.type} onChange={(e) => set('type', e.target.value as ProductFields['type'])}>
            {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        </Field>
        <Field label="Status" hint="Draft = hidden from the store">
          <select className="input" value={value.status} onChange={(e) => set('status', e.target.value as ProductFields['status'])}>
            <option value="ACTIVE">Live</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option>
          </select>
        </Field>
        <div className="md:col-span-2"><Field label="Short line" hint={counter(value.short, 300)}><input className="input" required maxLength={300} value={value.short} onChange={(e) => set('short', e.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="Description" hint={counter(value.description, 5000)}><textarea className="input min-h-32" required maxLength={5000} value={value.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
      </section>

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2"><Field label="Ingredients" hint="Enter or comma to add"><TagInput value={value.ingredients} onChange={(v) => set('ingredients', v)} placeholder="Almonds, Cashews…" /></Field></div>
        <Field label="Highlights" hint="up to 8"><TagInput value={value.highlights} onChange={(v) => set('highlights', v)} max={8} placeholder="No preservatives…" /></Field>
        <Field label="What's in the box" hint="combos & hampers"><TagInput value={value.contains} onChange={(v) => set('contains', v)} max={20} placeholder="Dry Fruit Mix (400 g)…" /></Field>
        <Field label="Shelf life"><input className="input" maxLength={40} placeholder="90 days" value={value.shelfLife} onChange={(e) => set('shelfLife', e.target.value)} /></Field>
        <Field label="Option name" hint="Size, Color…"><input className="input" maxLength={20} value={value.optionName} onChange={(e) => set('optionName', e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Limited note" hint="optional, e.g. “Only 15 hampers made”"><input className="input" maxLength={80} value={value.limitedNote} onChange={(e) => set('limitedNote', e.target.value)} /></Field></div>
      </section>

      <section className="card p-5">
        <p className="mb-3 text-sm font-bold text-green-900">Collections</p>
        <div className="flex flex-wrap gap-2">
          {cols.map((c) => (
            <label key={c.slug} className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold ${value.collections.includes(c.slug) ? 'border-green bg-sage text-green' : 'border-line bg-white'}`}>
              <input type="checkbox" className="sr-only" checked={value.collections.includes(c.slug)} onChange={() => toggleCol(c.slug)} />
              {c.title}{c.kind === 'CATEGORY' && <span className="ml-1 text-[10px] uppercase text-gold-d">category</span>}
            </label>
          ))}
        </div>
      </section>

      <section className="card grid gap-4 p-5">
        <p className="text-sm font-bold text-green-900">Search engine (SEO)</p>
        <Field label="SEO title" hint={counter(value.seoTitle, 70)}><input className="input" maxLength={70} placeholder={value.title} value={value.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} /></Field>
        <Field label="SEO description" hint={counter(value.seoDescription, 170)}><textarea className="input" maxLength={170} placeholder={value.short} value={value.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} /></Field>
      </section>
    </div>
  );
}
