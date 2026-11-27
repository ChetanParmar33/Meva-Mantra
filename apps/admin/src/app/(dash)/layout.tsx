'use client';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AdminCtx, type Admin } from '@/components/admin-context';
import { Emblem } from '@/components/emblem';
import { ActiveNavLinks, NavLinks } from '@/components/side-nav';
import { api, ApiError } from '@/lib/api';

export default function DashLayout({ children }: LayoutProps<'/'>) {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Admin>('/admin/auth/me')
      .then(setAdmin)
      .catch((e) => { if (e instanceof ApiError && e.status === 401) router.replace('/login'); });
  }, [router]);

  async function logout() {
    await api('/admin/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
  }
  const close = () => setOpen(false);

  return (
    <AdminCtx.Provider value={admin}>
      <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
        <aside className="bg-green-900 text-[#C9D8CE] md:sticky md:top-0 md:flex md:h-screen md:flex-col md:p-5 print:hidden">
          <div className="flex items-center justify-between p-4 md:mb-8 md:p-0">
            <div className="flex items-center gap-3">
              <Emblem size={40} />
              <div>
                <p className="font-serif text-lg font-bold text-white">Meva Mantra</p>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold-l">Admin</p>
              </div>
            </div>
            <button className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white md:hidden" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen(!open)}>
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
          <div id="admin-nav" className={`${open ? 'flex' : 'hidden'} flex-1 flex-col px-4 pb-4 md:flex md:p-0`}>
            <nav className="grid gap-1" aria-label="Admin">
              <Suspense fallback={<NavLinks onNavigate={close} />}><ActiveNavLinks onNavigate={close} /></Suspense>
            </nav>
            <div className="mt-6 border-t border-white/10 pt-4 text-sm md:mt-auto">
              <p className="font-semibold text-white">{admin?.name ?? '…'}</p>
              <p className="mb-3 truncate text-xs">{admin?.email ?? ''}</p>
              <button onClick={logout} className="text-gold-l underline">Log out</button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 p-5 md:p-10 print:p-0">{children}</main>
      </div>
    </AdminCtx.Provider>
  );
}
