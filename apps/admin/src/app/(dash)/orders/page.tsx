'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ORDER_STATUSES, type OrderList, type OrderStatus } from '@/components/types';
import { Badge, Empty, FlashBar, PageHead, Skeleton, Tabs, label, useFlash } from '@/components/ui';
import { api, fmtDate, rupees } from '@/lib/api';

type Tab = 'ALL' | OrderStatus;

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderList | null>(null);
  const [counts, setCounts] = useState<OrderList['counts']>({});
  const { flash, fail } = useFlash();

  useEffect(() => {
    setData(null);
    const p = new URLSearchParams({ page: String(page) });
    if (tab !== 'ALL') p.set('status', tab);
    if (search) p.set('q', search);
    api<OrderList>(`/admin/orders?${p}`).then((d) => { setData(d); setCounts(d.counts ?? {}); }).catch(fail);
  }, [tab, search, page, fail]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHead eyebrow="Sales" title="Orders">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }} className="flex gap-2">
          <input className="input w-64" placeholder="Order no., phone, email or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
          <button className="btn-primary">Search</button>
          {search && <button type="button" className="btn-outline" onClick={() => { setQ(''); setSearch(''); setPage(1); }}>Clear</button>}
        </form>
      </PageHead>
      <Tabs<Tab> value={tab} onChange={(v) => { setTab(v); setPage(1); }}
        options={[{ value: 'ALL', label: 'All' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: counts?.[s] ? `${label(s)} · ${counts[s]}` : label(s) }))]} />
      {!data ? <Skeleton className="h-72" /> : !data.items.length ? <Empty>No orders{search ? ` matching “${search}”` : ''}{tab !== 'ALL' ? ` with status ${label(tab).toLowerCase()}` : ''}.</Empty> : (
        <>
          <p className="mb-2 text-sm text-muted">{data.total} order{data.total === 1 ? '' : 's'}</p>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="px-5 py-3">Order</th><th className="px-2">Customer</th><th className="px-2">Items</th><th className="px-2">Payment</th><th className="px-2">Status</th><th className="px-5 text-right">Total</th></tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.id} className="border-t border-line hover:bg-cream">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.number}`} className="font-bold text-green-900 hover:underline">{o.number}</Link>
                      <span className="block text-xs text-muted">{fmtDate(o.createdAt)}</span>
                    </td>
                    <td className="px-2">{o.customerName}<span className="block text-xs text-muted">{o.phone} · {o.city}</span></td>
                    <td className="px-2 text-muted">{o.items.map((i) => `${i.title} (${i.variantTitle}) ×${i.qty}`).join(', ')}</td>
                    <td className="px-2">{o.paymentMode === 'COD' ? 'COD' : 'Prepaid'}</td>
                    <td className="px-2"><Badge value={o.status} /></td>
                    <td className="px-5 text-right font-semibold">{rupees(o.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button className="btn-outline px-4 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button className="btn-outline px-4 py-1.5" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
      <FlashBar flash={flash} />
    </>
  );
}
