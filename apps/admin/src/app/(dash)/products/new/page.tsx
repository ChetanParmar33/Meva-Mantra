'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { emptyProduct, ProductFieldsForm, toPayload, type ProductFields } from '@/components/product-form';
import { FlashBar, PageHead, useFlash } from '@/components/ui';
import { emptyVariant, variantBody, VariantHead, VariantInputs, type VariantDraft } from '@/components/variant-row';
import { api, json } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [f, setF] = useState<ProductFields>(emptyProduct);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...emptyVariant }]);
  const [busy, setBusy] = useState(false);
  const { flash, fail } = useFlash();
  const color = f.optionName.trim().toLowerCase().startsWith('colo');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bodies = [];
    for (const v of variants) {
      const r = variantBody(v);
      if ('error' in r) return fail(new Error(r.error));
      bodies.push(r.body);
    }
    setBusy(true);
    try {
      const p = await api<{ id: string }>('/admin/products', json('POST', { ...toPayload(f), slug: f.slug, variants: bodies }));
      router.push(`/products/${p.id}?created=1`);
    } catch (err) { fail(err); setBusy(false); }
  }

  return (
    <form onSubmit={submit}>
      <PageHead eyebrow="Catalogue" title="New product">
        <Link href="/products" className="btn-outline">Cancel</Link>
        <button className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create product'}</button>
      </PageHead>
      <p className="mb-5 text-sm text-muted">New products start as <b>Draft</b> unless you choose Live. Add photos after creating.</p>
      <ProductFieldsForm value={f} onChange={setF} isNew />
      <section className="card mt-5 overflow-x-auto p-5">
        <p className="mb-2 text-sm font-bold text-green-900">Sizes / options (at least one)</p>
        <table className="w-full min-w-[620px] text-sm">
          <VariantHead showSwatch={color} />
          <tbody>
            {variants.map((v, i) => (
              <tr key={i}>
                <VariantInputs v={v} showSwatch={color} onChange={(nv) => setVariants(variants.map((x, j) => (j === i ? nv : x)))} />
                <td>{variants.length > 1 && <button type="button" className="text-sm text-red-600 underline" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {variants.length < 10 && <button type="button" className="btn-outline mt-3" onClick={() => setVariants([...variants, { ...emptyVariant }])}>+ Add size</button>}
      </section>
      <FlashBar flash={flash} />
    </form>
  );
}
