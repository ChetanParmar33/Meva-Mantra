'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Empty, FlashBar, PageHead, Skeleton, useFlash } from '@/components/ui';
import { api, fmtDate, json } from '@/lib/api';

type Status = 'NEW' | 'IN_PROGRESS' | 'CLOSED';
type Enquiry = { id: string; type: 'CONTACT' | 'BULK'; name: string; email: string; phone: string; company: string | null; topic: string | null; quantity: string | null; occasion: string | null; message: string; status: Status; createdAt: string };

export default function EnquiriesPage() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [list, setList] = useState<Enquiry[] | null>(null);
  const { flash, ok, fail } = useFlash();
  const load = useCallback(() => {
    setList(null);
    const p = new URLSearchParams();
    if (type) p.set('type', type);
    if (status) p.set('status', status);
    api<Enquiry[]>(`/admin/enquiries?${p}`).then(setList).catch(fail);
  }, [type, status, fail]);
  useEffect(() => { load(); }, [load]);

  async function change(e: Enquiry, s: Status) {
    try {
      await api(`/admin/enquiries/${e.id}`, json('PATCH', { status: s }));
      setList((l) => l && l.map((x) => (x.id === e.id ? { ...x, status: s } : x)));
      ok(`Marked ${s.replace('_', ' ').toLowerCase()}`);
    } catch (err) { fail(err); }
  }

  return (
    <>
      <PageHead eyebrow="Customers" title="Enquiries">
        <select className="input w-40" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option><option value="CONTACT">Contact</option><option value="BULK">Bulk / corporate</option>
        </select>
        <select className="input w-40" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="CLOSED">Closed</option>
        </select>
      </PageHead>
      {!list ? <Skeleton /> : !list.length ? <Empty>No enquiries.</Empty> : (
        <div className="grid gap-3">
          {list.map((e) => (
            <details key={e.id} className="card group p-5" open={e.status === 'NEW'}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.type === 'BULK' ? 'bg-gold-soft text-gold-d' : 'bg-cream-2 text-ink'}`}>{e.type === 'BULK' ? 'Bulk' : 'Contact'}</span>
                <b>{e.name}</b>{e.company && <span className="text-muted">{e.company}</span>}
                <Badge value={e.status} />
                <span className="ml-auto text-sm text-muted">{fmtDate(e.createdAt)}</span>
              </summary>
              <div className="mt-3 grid gap-3 text-sm">
                <p className="flex flex-wrap gap-x-4 gap-y-1">
                  <a className="font-semibold text-green underline" href={`mailto:${e.email}`}>{e.email}</a>
                  <a className="font-semibold text-green underline" href={`tel:+91${e.phone}`}>+91 {e.phone}</a>
                  <a className="font-semibold text-green underline" target="_blank" href={`https://wa.me/91${e.phone}?text=${encodeURIComponent(`Hi ${e.name}, thanks for contacting Meva Mantra!`)}`}>WhatsApp</a>
                </p>
                {(e.topic || e.quantity || e.occasion) && <p className="text-muted">{[e.topic && `Topic: ${e.topic}`, e.quantity && `Quantity: ${e.quantity}`, e.occasion && `Occasion: ${e.occasion}`].filter(Boolean).join(' · ')}</p>}
                <p className="whitespace-pre-line rounded-xl bg-cream p-3">{e.message}</p>
                <div className="flex flex-wrap gap-2">
                  {(['NEW', 'IN_PROGRESS', 'CLOSED'] as Status[]).filter((s) => s !== e.status).map((s) => (
                    <button key={s} className="btn-outline px-4 py-1.5" onClick={() => change(e, s)}>Mark {s.replace('_', ' ').toLowerCase()}</button>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
      <FlashBar flash={flash} />
    </>
  );
}
