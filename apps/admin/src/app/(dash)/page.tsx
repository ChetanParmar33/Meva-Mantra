'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import type { OrderList } from '@/components/types';
import { Badge, Empty, PageHead, Skeleton } from '@/components/ui';
import { api, fmtDate, rupees } from '@/lib/api';

type Stats = { products: number; active: number; outOfStock: number; orders: number; newEnquiries: number; pendingReviews: number; revenuePaise: number; todayOrders: number; ordersToShip: number };

export default function Dashboard() {
  const admin = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<OrderList | null>(null);
  const [error, setError] = useState('');
  // 401 is handled by the layout (redirect to /login), so only show other errors here.
  useEffect(() => {
    setError('');
    const fail = (e: { status?: number; message: string }) => { if (e.status !== 401) setError(e.message); };
    api<Stats>('/admin/stats').then(setStats).catch(fail);
    api<OrderList>('/admin/orders').then(setRecent).catch(fail);
  }, []);

  const cards = stats ? [
    { label: 'Revenue', value: rupees(stats.revenuePaise), note: `Confirmed → delivered orders · ${stats.orders} placed in total`, href: '/orders' },
    { label: "Today's orders", value: stats.todayOrders, note: 'Confirmed since midnight', href: '/orders' },
    { label: 'To pack & ship', value: stats.ordersToShip, note: 'Confirmed or packed', href: '/orders', warn: stats.ordersToShip > 0 },
    { label: 'Pending reviews', value: stats.pendingReviews, note: 'Waiting for approval', href: '/reviews', warn: stats.pendingReviews > 0 },
    { label: 'New enquiries', value: stats.newEnquiries, note: 'Contact & bulk forms', href: '/enquiries', warn: stats.newEnquiries > 0 },
    { label: 'Out of stock', value: stats.outOfStock, note: `of ${stats.products} products (${stats.active} live)`, href: '/products', warn: stats.outOfStock > 0 },
  ] : [];

  return (
    <>
      <PageHead eyebrow="Dashboard" title={`Namaste${admin ? `, ${admin.name.split(' ')[0]}` : ''} 👋`} />
      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats ? cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 transition hover:border-green">
            <p className="text-sm font-semibold text-muted">{c.label}</p>
            <p className={`my-1 font-serif text-3xl font-semibold ${c.warn ? 'text-gold-d' : 'text-green-900'}`}>{c.value}</p>
            <p className="text-xs text-muted">{c.note}</p>
          </Link>
        )) : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>

      <div className="mt-10 mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">Recent orders</h2>
        <Link href="/orders" className="text-sm font-bold text-green underline">All orders</Link>
      </div>
      {!recent ? <Skeleton /> : !recent.items.length ? <Empty>No orders yet.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {recent.items.slice(0, 8).map((o) => (
                <tr key={o.id} className="border-t border-line first:border-0">
                  <td className="px-5 py-3"><Link href={`/orders/${o.number}`} className="font-bold text-green-900 hover:underline">{o.number}</Link></td>
                  <td className="px-2">{o.customerName}<span className="block text-xs text-muted">{o.city}</span></td>
                  <td className="px-2 text-muted">{fmtDate(o.createdAt)}</td>
                  <td className="px-2"><Badge value={o.status} /></td>
                  <td className="px-5 text-right font-semibold">{rupees(o.totalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
