'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Emblem } from '@/components/emblem';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      await api('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) });
      router.replace('/');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(800px_400px_at_80%_20%,var(--color-sage),transparent)] p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8 shadow-xl shadow-green/5">
        <div className="mb-6 flex items-center gap-3">
          <Emblem size={46} />
          <div>
            <h1 className="text-xl font-bold">Meva Mantra</h1>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-d">Admin panel</p>
          </div>
        </div>
        <label className="mb-1 block text-sm font-bold text-green-900" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input mb-4" />
        <label className="mb-1 block text-sm font-bold text-green-900" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" className="input mb-4" />
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
