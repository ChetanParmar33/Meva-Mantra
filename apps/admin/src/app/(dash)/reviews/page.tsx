'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Empty, FlashBar, PageHead, Skeleton, Tabs, useFlash } from '@/components/ui';
import { api, fmtDate, json, STORE_URL } from '@/lib/api';

type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
type Review = { id: string; name: string; city: string | null; rating: number; text: string; status: Status; isVerified: boolean; createdAt: string; product: { slug: string; title: string } };

export default function ReviewsPage() {
  const [tab, setTab] = useState<Status>('PENDING');
  const [list, setList] = useState<Review[] | null>(null);
  const [busy, setBusy] = useState('');
  const { flash, ok, fail } = useFlash();
  const load = useCallback(() => { setList(null); api<Review[]>(`/admin/reviews?status=${tab}`).then(setList).catch(fail); }, [tab, fail]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(r: Review, status: Status) {
    setBusy(r.id);
    try {
      await api(`/admin/reviews/${r.id}`, json('PATCH', { status }));
      ok(status === 'APPROVED' ? 'Review approved: now visible on the store' : status === 'REJECTED' ? 'Review rejected' : 'Moved back to pending');
      setList((l) => l && l.filter((x) => x.id !== r.id));
    } catch (e) { fail(e); }
    setBusy('');
  }

  return (
    <>
      <PageHead eyebrow="Customers" title="Reviews" />
      <p className="-mt-3 mb-4 text-sm text-muted">Only approved reviews appear on the store. Product ratings are recalculated from approved reviews.</p>
      <Tabs<Status> value={tab} onChange={setTab} options={[{ value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
      {!list ? <Skeleton /> : !list.length ? <Empty>No {tab.toLowerCase()} reviews.</Empty> : (
        <div className="grid gap-3">
          {list.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-gold" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span></span>
                <b>{r.name}</b>{r.city && <span className="text-muted">{r.city}</span>}
                {r.isVerified && <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-bold text-green">Verified buyer</span>}
                <Badge value={r.status} />
                <span className="text-muted">{fmtDate(r.createdAt)}</span>
              </div>
              <p className="mb-3 whitespace-pre-line">{r.text}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a href={`${STORE_URL}/products/${r.product.slug}`} target="_blank" className="text-sm font-semibold text-green underline">{r.product.title} ↗</a>
                <div className="flex gap-2">
                  {r.status !== 'APPROVED' && <button className="btn-primary px-4 py-1.5" disabled={busy === r.id} onClick={() => setStatus(r, 'APPROVED')}>Approve</button>}
                  {r.status !== 'REJECTED' && <button className="btn border-2 border-red-600 px-4 py-1.5 text-red-700 hover:bg-red-600 hover:text-white" disabled={busy === r.id} onClick={() => setStatus(r, 'REJECTED')}>Reject</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <FlashBar flash={flash} />
    </>
  );
}
