'use client';
import { useEffect, useState } from 'react';
import { Empty, FlashBar, PageHead, Skeleton, useFlash } from '@/components/ui';
import { api, fmtDate } from '@/lib/api';

type Sub = { id: string; email: string; createdAt: string };
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

export default function SubscribersPage() {
  const [list, setList] = useState<Sub[] | null>(null);
  const { flash, fail } = useFlash();
  useEffect(() => { api<Sub[]>('/admin/subscribers').then(setList).catch(fail); }, [fail]);

  function download() {
    const csv = ['email,subscribed_at', ...list!.map((s) => `${csvCell(s.email)},${s.createdAt}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `meva-mantra-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHead eyebrow="Marketing" title="Newsletter subscribers">
        {list && list.length > 0 && <button className="btn-primary" onClick={download}>Download CSV</button>}
      </PageHead>
      {!list ? <Skeleton /> : !list.length ? <Empty>No subscribers yet.</Empty> : (
        <div className="card overflow-x-auto">
          <p className="border-b border-line px-5 py-3 text-sm text-muted">{list.length} subscriber{list.length === 1 ? '' : 's'}</p>
          <table className="w-full text-sm">
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-line first:border-0">
                  <td className="px-5 py-2.5"><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></td>
                  <td className="px-5 text-right text-muted">{fmtDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FlashBar flash={flash} />
    </>
  );
}
