'use client';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductFieldsForm, toPayload, type ProductFields } from '@/components/product-form';
import { Badge, FlashBar, PageHead, Skeleton, useFlash } from '@/components/ui';
import { emptyVariant, variantBody, VariantHead, VariantInputs, type VariantDraft } from '@/components/variant-row';
import { api, json, STORE_URL, toRs } from '@/lib/api';

type Variant = { id: string; title: string; sku: string; pricePaise: number; mrpPaise: number | null; stock: number; swatch: string | null };
type Image = { id: string; url: string; alt: string; position: number };
type Product = Omit<ProductFields, 'shelfLife' | 'limitedNote' | 'seoTitle' | 'seoDescription'> & {
  id: string; shelfLife: string | null; limitedNote: string | null; seoTitle: string | null; seoDescription: string | null;
  variants: Variant[]; images: Image[]; art: { label: string; accent: string; bg: string } | null;
};

const toDraft = (v: Variant): VariantDraft => ({ title: v.title, sku: v.sku, price: toRs(v.pricePaise), mrp: toRs(v.mrpPaise), stock: String(v.stock), swatch: v.swatch ?? '' });
const toFields = (p: Product): ProductFields => ({
  slug: p.slug, title: p.title, type: p.type, status: p.status, short: p.short, description: p.description,
  ingredients: p.ingredients, highlights: p.highlights, contains: p.contains, shelfLife: p.shelfLife ?? '', optionName: p.optionName,
  limitedNote: p.limitedNote ?? '', seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', collections: p.collections,
});

export function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created');
  const [p, setP] = useState<Product | null>(null);
  const [f, setF] = useState<ProductFields | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const [newV, setNewV] = useState<VariantDraft | null>(null);
  const [busy, setBusy] = useState('');
  const [missing, setMissing] = useState(false);
  const [art, setArt] = useState({ label: '#1F4D3A', accent: '#C9A227', bg: '#F3EBD6' });
  const [alts, setAlts] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { flash, ok, fail } = useFlash();

  const load = useCallback((prod: Product) => {
    setP(prod); setF(toFields(prod));
    if (prod.art) setArt({ label: prod.art.label, accent: prod.art.accent, bg: prod.art.bg });
    setAlts(Object.fromEntries(prod.images.map((i) => [i.id, i.alt])));
    setDrafts(Object.fromEntries(prod.variants.map((v) => [v.id, toDraft(v)])));
  }, []);
  const reload = useCallback(() => api<Product>(`/admin/products/${id}`).then(load), [id, load]);
  useEffect(() => { reload().catch((e) => (e.status === 404 ? setMissing(true) : fail(e))); }, [reload, fail]);
  // Shown once after creating (ok() is intentionally not a dependency).
  useEffect(() => { if (created) ok('Product created. Add photos below.'); }, [created]);

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try { await fn(); await reload(); ok(done); } catch (e) { fail(e); }
    setBusy('');
  }

  if (missing) return <p className="card p-10 text-center">Product not found. <Link href="/products" className="font-bold text-green underline">Back to products</Link></p>;
  if (!p || !f) return <Skeleton className="h-96" />;
  const color = f.optionName.trim().toLowerCase().startsWith('colo');
  const dirty = (v: Variant) => JSON.stringify(drafts[v.id]) !== JSON.stringify(toDraft(v));

  function saveVariant(v: Variant) {
    const r = variantBody(drafts[v.id]);
    if ('error' in r) return fail(new Error(r.error));
    const { sku: _sku, ...body } = r.body;
    run(v.id, () => api(`/admin/variants/${v.id}`, json('PATCH', body)), `Saved ${v.sku}`);
  }
  function addVariant() {
    const r = variantBody(newV!);
    if ('error' in r) return fail(new Error(r.error));
    run('new', async () => { await api(`/admin/products/${id}/variants`, json('POST', r.body)); setNewV(null); }, 'Size added');
  }
  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return fail(new Error('Image must be 3 MB or smaller.'));
    const fd = new FormData(); fd.append('file', file);
    run('upload', () => api(`/admin/products/${id}/images`, { method: 'POST', body: fd }), 'Photo uploaded').finally(() => { if (fileRef.current) fileRef.current.value = ''; });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); run('save', () => api(`/admin/products/${id}`, json('PATCH', toPayload(f))), 'Product saved'); }}>
      <PageHead eyebrow="Edit product" title={p.title}>
        {p.status === 'COMING_SOON' && <Badge value="COMING_SOON" />}
        <Link href="/products" className="btn-outline">← Products</Link>
        {p.status === 'ACTIVE' && <a href={`${STORE_URL}/products/${p.slug}`} target="_blank" className="btn-outline">View on store ↗</a>}
        <button className="btn-primary" disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save details'}</button>
      </PageHead>

      <section className="card mb-5 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-green-900">Photos <span className="font-normal text-muted">· JPG, PNG or WebP up to 3 MB. Without photos the store shows generated artwork.</span></p>
          <label className={`btn-outline cursor-pointer ${busy === 'upload' ? 'opacity-50' : ''}`}>
            {busy === 'upload' ? 'Uploading…' : '+ Upload photo'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy === 'upload'} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
        {p.images.length ? (
          <div className="flex flex-wrap gap-3">
            {p.images.map((img, i) => (
              <figure key={img.id} className="relative w-40 overflow-hidden rounded-xl border border-line bg-white">
                <img src={img.url} alt={img.alt} className="aspect-square w-full object-cover" />
                {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-full bg-gold px-2 text-[10px] font-bold text-green-900">Main</span>}
                <input className="block w-full border-t border-line px-2 py-1 text-xs outline-none focus:bg-sage" placeholder="Alt text (describe the photo)" aria-label={`Alt text for photo ${i + 1}`}
                  value={alts[img.id] ?? ''} maxLength={160} onChange={(e) => setAlts({ ...alts, [img.id]: e.target.value })}
                  onBlur={() => alts[img.id] !== img.alt && run(img.id, () => api(`/admin/images/${img.id}`, json('PATCH', { alt: alts[img.id] })), 'Alt text saved')} />
                <div className="flex border-t border-line text-xs font-semibold">
                  <button type="button" className="flex-1 py-1 hover:bg-sage disabled:opacity-30" disabled={!!busy || i === 0} aria-label="Move photo left"
                    onClick={() => run(img.id, () => api(`/admin/images/${img.id}`, json('PATCH', { position: i - 1 })), 'Photo moved')}>◀</button>
                  {i > 0 && <button type="button" className="flex-[2] py-1 hover:bg-sage" disabled={!!busy}
                    onClick={() => run(img.id, () => api(`/admin/images/${img.id}`, json('PATCH', { position: 0 })), 'Main photo updated')}>Make main</button>}
                  <button type="button" className="flex-1 py-1 hover:bg-sage disabled:opacity-30" disabled={!!busy || i === p.images.length - 1} aria-label="Move photo right"
                    onClick={() => run(img.id, () => api(`/admin/images/${img.id}`, json('PATCH', { position: i + 1 })), 'Photo moved')}>▶</button>
                </div>
                <button type="button" className="w-full border-t border-line bg-white py-1 text-xs font-semibold text-red-600 hover:bg-red-50" disabled={!!busy}
                  onClick={() => confirm('Delete this photo?') && run(img.id, () => api(`/admin/images/${img.id}`, { method: 'DELETE' }), 'Photo deleted')}>Delete</button>
              </figure>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No photos yet.</p>}
      </section>

      <section className="card mb-5 flex flex-wrap items-end gap-4 p-5">
        <div className="mr-auto">
          <p className="text-sm font-bold text-green-900">Artwork colours</p>
          <p className="text-xs text-muted">Used for the generated product image when there are no photos.</p>
        </div>
        {(['label', 'accent', 'bg'] as const).map((k) => (
          <label key={k} className="text-xs font-semibold text-muted">
            {{ label: 'Label', accent: 'Accent', bg: 'Background' }[k]}
            <input type="color" className="mt-1 block h-10 w-16 cursor-pointer rounded-lg border border-line" value={art[k]} onChange={(e) => setArt({ ...art, [k]: e.target.value })} />
          </label>
        ))}
        <button type="button" className="btn-outline" disabled={busy === 'art'}
          onClick={() => run('art', () => api(`/admin/products/${id}`, json('PATCH', { art })), 'Artwork colours saved')}>{busy === 'art' ? 'Saving…' : 'Save colours'}</button>
      </section>

      <ProductFieldsForm value={f} onChange={setF} />

      <section className="card mt-5 overflow-x-auto p-5">
        <p className="mb-2 text-sm font-bold text-green-900">Sizes / options</p>
        <table className="w-full min-w-[680px] text-sm">
          <VariantHead showSwatch={color} />
          <tbody>
            {p.variants.map((v) => (
              <tr key={v.id}>
                <VariantInputs v={drafts[v.id]} skuLocked showSwatch={color} onChange={(nv) => setDrafts({ ...drafts, [v.id]: nv })} />
                <td className="whitespace-nowrap">
                  {dirty(v) && <button type="button" className="btn-primary px-3 py-1.5" disabled={busy === v.id} onClick={() => saveVariant(v)}>Save</button>}
                  {p.variants.length > 1 && <button type="button" className="ml-2 text-xs text-red-600 underline" disabled={!!busy}
                    onClick={() => confirm(`Delete size ${v.title}? Past orders keep their details.`) && run(v.id, () => api(`/admin/variants/${v.id}`, { method: 'DELETE' }), 'Size deleted')}>Delete</button>}
                </td>
              </tr>
            ))}
            {newV && (
              <tr>
                <VariantInputs v={newV} showSwatch={color} onChange={setNewV} />
                <td className="whitespace-nowrap">
                  <button type="button" className="btn-primary px-3 py-1.5" disabled={busy === 'new'} onClick={addVariant}>Add</button>
                  <button type="button" className="ml-2 text-xs underline" onClick={() => setNewV(null)}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!newV && p.variants.length < 10 && <button type="button" className="btn-outline mt-3" onClick={() => setNewV({ ...emptyVariant })}>+ Add size</button>}
        <p className="mt-2 text-xs text-muted">MRP is only shown when it is higher than the price. SKUs can’t be changed after creation.</p>
      </section>
      <FlashBar flash={flash} />
    </form>
  );
}
