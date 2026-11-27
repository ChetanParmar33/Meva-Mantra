'use client';
export type VariantDraft = { title: string; sku: string; price: string; mrp: string; stock: string; swatch: string };
export const emptyVariant: VariantDraft = { title: '', sku: '', price: '', mrp: '', stock: '0', swatch: '' };

/** Form strings (rupees) → API body (paise). Returns an error message instead when invalid. */
export function variantBody(v: VariantDraft): { body: Record<string, unknown> } | { error: string } {
  const price = Math.round(Number(v.price) * 100), stock = Number(v.stock);
  const mrp = v.mrp.trim() ? Math.round(Number(v.mrp) * 100) : null;
  if (!v.title.trim()) return { error: 'Each size needs a name (e.g. 400 g).' };
  if (!/^[A-Za-z0-9-]{2,40}$/.test(v.sku)) return { error: `SKU “${v.sku}”: use letters, numbers and dashes (2–40).` };
  if (!(price >= 100)) return { error: `Price for ${v.title} must be at least ₹1.` };
  if (mrp != null && !(mrp >= 0)) return { error: `MRP for ${v.title} is not a number.` };
  if (!Number.isInteger(stock) || stock < 0) return { error: `Stock for ${v.title} must be a whole number ≥ 0.` };
  if (v.swatch && !/^#[0-9a-fA-F]{6}$/.test(v.swatch)) return { error: 'Colour must look like #7A1F2B.' };
  return { body: { title: v.title.trim(), sku: v.sku, pricePaise: price, mrpPaise: mrp, stock, swatch: v.swatch || null } };
}

export function VariantInputs({ v, onChange, showSwatch, skuLocked }: { v: VariantDraft; onChange: (v: VariantDraft) => void; showSwatch?: boolean; skuLocked?: boolean }) {
  const set = (k: keyof VariantDraft) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...v, [k]: k === 'sku' ? e.target.value.toUpperCase() : e.target.value });
  return (
    <>
      <td className="py-1.5 pr-2"><input className="input py-1.5" placeholder="400 g" aria-label="Size name" value={v.title} onChange={set('title')} /></td>
      <td className="pr-2"><input className="input py-1.5 font-mono text-xs" placeholder="MM-XYZ-400" aria-label="SKU" value={v.sku} disabled={skuLocked} onChange={set('sku')} /></td>
      <td className="pr-2"><input className="input w-24 py-1.5" inputMode="decimal" placeholder="679" aria-label="Price in rupees" value={v.price} onChange={set('price')} /></td>
      <td className="pr-2"><input className="input w-24 py-1.5" inputMode="decimal" placeholder="—" aria-label="MRP in rupees" value={v.mrp} onChange={set('mrp')} /></td>
      <td className="pr-2"><input className="input w-20 py-1.5" inputMode="numeric" aria-label="Stock" value={v.stock} onChange={set('stock')} /></td>
      {showSwatch && <td className="pr-2"><input type="color" className="h-10 w-12 cursor-pointer rounded-lg border border-line" aria-label="Colour swatch" value={v.swatch || '#1f4d3a'} onChange={set('swatch')} /></td>}
    </>
  );
}

export const VariantHead = ({ showSwatch }: { showSwatch?: boolean }) => (
  <thead className="text-left text-xs uppercase tracking-wider text-muted">
    <tr><th className="py-2">Size / option</th><th>SKU</th><th>Price ₹</th><th>MRP ₹</th><th>Stock</th>{showSwatch && <th>Colour</th>}<th /></tr>
  </thead>
);
