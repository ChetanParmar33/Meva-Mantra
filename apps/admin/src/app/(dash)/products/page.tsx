'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, rupees, STORE_URL } from '@/lib/api';

type Variant = { id: string; title: string; sku: string; pricePaise: number; mrpPaise: number | null; stock: number };
type Product = { id: string; slug: string; title: string; type: string; status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'; collections: { slug: string; title: string }[]; images: { url: string }[]; variants: Variant[] };
type Draft = { price: string; mrp: string; stock: string };

const LOW_STOCK = 10;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'all' | 'low' | 'out'>('all');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { api<Product[]>('/admin/products').then(setProducts).catch((e) => { if (e.status !== 401) setMsg({ ok: false, text: e.message }); }); }, []);

  const list = useMemo(() => (products ?? []).filter((p) => {
    if (q && !`${p.title} ${p.variants.map((v) => v.sku).join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (view === 'low') return p.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK);
    if (view === 'out') return p.variants.every((v) => v.stock <= 0);
    return true;
  }), [products, q, view]);

  const draftOf = (v: Variant): Draft => drafts[v.id] ?? { price: String(v.pricePaise / 100), mrp: v.mrpPaise ? String(v.mrpPaise / 100) : '', stock: String(v.stock) };
  const isDirty = (v: Variant) => { const d = drafts[v.id]; return !!d && (Number(d.price) * 100 !== v.pricePaise || (d.mrp ? Number(d.mrp) * 100 : null) !== v.mrpPaise || Number(d.stock) !== v.stock); };
  const edit = (v: Variant, k: keyof Draft, val: string) => setDrafts((d) => ({ ...d, [v.id]: { ...draftOf(v), [k]: val } }));

  function replaceVariant(updated: Variant) {
    setProducts((ps) => ps!.map((p) => ({ ...p, variants: p.variants.map((v) => (v.id === updated.id ? updated : v)) })));
    setDrafts((d) => { const { [updated.id]: _, ...rest } = d; return rest; });
  }

  async function save(v: Variant) {
    const d = draftOf(v);
    const price = Math.round(Number(d.price) * 100), mrp = d.mrp ? Math.round(Number(d.mrp) * 100) : null, stock = Number(d.stock);
    if (!(price >= 100) || !Number.isInteger(stock) || stock < 0 || (mrp != null && !(mrp >= 0))) { setMsg({ ok: false, text: 'Check the values: price ≥ ₹1, stock a whole number ≥ 0.' }); return; }
    setSaving(v.id);
    try {
      const updated = await api<Variant>(`/admin/variants/${v.id}`, { method: 'PATCH', body: JSON.stringify({ pricePaise: price, mrpPaise: mrp, stock }) });
      replaceVariant(updated);
      setMsg({ ok: true, text: `Saved ${updated.sku}${mrp && !updated.mrpPaise ? ' (MRP removed because it was not above the price)' : ''}` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setSaving(null);
  }

  async function setStatus(p: Product, status: Product['status']) {
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setProducts((ps) => ps!.map((x) => (x.id === p.id ? { ...x, status } : x)));
      setMsg({ ok: true, text: `${p.title} is now ${status.toLowerCase()}` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  const counts = { all: products?.length ?? 0, low: (products ?? []).filter((p) => p.variants.some((v) => v.stock > 0 && v.stock <= LOW_STOCK)).length, out: (products ?? []).filter((p) => p.variants.every((v) => v.stock <= 0)).length };

  return (
    <>
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-gold-d">Catalogue</p>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold">Products & stock</h1>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <Link href="/products/new" className="btn-primary">+ New product</Link>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'low', 'out'] as const).map((k) => (
          <button key={k} onClick={() => setView(k)} className={`rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold ${view === k ? 'border-green bg-green text-white' : 'border-line bg-white'}`}>
            {{ all: 'All', low: `Low stock (≤${LOW_STOCK})`, out: 'Out of stock' }[k]} · {counts[k]}
          </button>
        ))}
      </div>
      {msg && <p role="status" className={`mb-5 rounded-xl px-4 py-2.5 text-sm font-semibold ${msg.ok ? 'bg-sage text-green' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      {!products ? <div className="card h-64 animate-pulse" /> : (
        <div className="grid gap-4">
          {list.map((p) => (
            <section key={p.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream-2/60 px-5 py-3">
                <div className="flex items-center gap-3">
                  {p.images[0] ? <img src={p.images[0].url} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-sage" aria-hidden="true" />}
                  <div>
                    <Link href={`/products/${p.id}`} className="font-serif text-lg font-semibold text-green-900 hover:underline">{p.title}</Link>
                    <p className="text-xs text-muted">{p.collections.map((c) => c.title).join(' · ')}{p.status === 'ACTIVE' && <> · <a href={`${STORE_URL}/products/${p.slug}`} target="_blank" className="underline">store ↗</a></>}</p>
                  </div>
                </div>
                <select value={p.status} onChange={(e) => setStatus(p, e.target.value as Product['status'])} aria-label={`Status of ${p.title}`}
                  className={`rounded-full border-[1.5px] px-3 py-1.5 text-xs font-bold ${p.status === 'ACTIVE' ? 'border-green text-green' : 'border-line text-muted'}`}>
                  <option value="ACTIVE">Live</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option>
                </select>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm sm:min-w-[640px]">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted">
                    <tr><th className="px-3 py-2 sm:px-5">Size</th><th className="hidden px-2 sm:table-cell">SKU</th><th className="px-1 sm:px-2">Price ₹</th><th className="px-1 sm:px-2">MRP ₹</th><th className="px-1 sm:px-2">Stock</th><th className="px-3 sm:px-5" /></tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v) => {
                      const d = draftOf(v), dirty = isDirty(v);
                      return (
                        <tr key={v.id} className="border-t border-line">
                          <td className="px-3 py-2.5 font-semibold sm:px-5">{v.title}</td>
                          <td className="hidden px-2 font-mono text-xs text-muted sm:table-cell">{v.sku}</td>
                          <td className="px-1 sm:px-2"><input className="input w-[4.5rem] px-2 py-1.5 sm:w-24 sm:px-3.5" inputMode="decimal" value={d.price} onChange={(e) => edit(v, 'price', e.target.value)} aria-label={`Price for ${v.sku}`} /></td>
                          <td className="px-1 sm:px-2"><input className="input w-[4.5rem] px-2 py-1.5 sm:w-24 sm:px-3.5" inputMode="decimal" placeholder="—" value={d.mrp} onChange={(e) => edit(v, 'mrp', e.target.value)} aria-label={`MRP for ${v.sku}`} /></td>
                          <td className="px-1 sm:px-2">
                            <input className={`input w-14 px-2 py-1.5 sm:w-20 sm:px-3.5 ${v.stock <= 0 ? 'border-red-300' : v.stock <= LOW_STOCK ? 'border-gold' : ''}`} inputMode="numeric" value={d.stock} onChange={(e) => edit(v, 'stock', e.target.value)} aria-label={`Stock for ${v.sku}`} />
                          </td>
                          <td className="px-3 text-right sm:px-5">
                            {dirty ? <button className="btn-primary px-3 py-1.5 sm:px-4" disabled={saving === v.id} onClick={() => save(v)}>{saving === v.id ? 'Saving…' : 'Save'}</button>
                              : <span className="hidden text-xs text-muted sm:inline">{rupees(v.pricePaise)}{v.stock <= 0 ? ' · sold out' : ''}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {!list.length && <p className="card p-10 text-center text-muted">No products match.</p>}
        </div>
      )}
    </>
  );
}
