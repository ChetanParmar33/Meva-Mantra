'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProductCard as Card } from '@/lib/api';
import { api, type User } from '@/lib/client';
import { Icon } from './icons';
import { HeroArt, ProductGrid } from './product';

export function Acc({ q, a, defaultOpen = false }: { q: string; a: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`acc ${open ? 'is-open' : ''}`}>
      <button className="acc__q" aria-expanded={open} onClick={() => setOpen(o => !o)}>{q}<span className="plus"><Icon name="plus" size="sm" /></span></button>
      <div className="acc__a"><div>{a}</div></div>
    </div>
  );
}

export function NewsletterForm({ small, compact }: { small?: boolean; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  if (state === 'done') return <div className="success" role="status"><Icon name="check" size="sm" /> Subscribed! Code <b>MANTRA10</b> is yours.</div>;
  return (
    <form className="inline-form" style={compact ? { border: '1.5px solid var(--line)' } : undefined} onSubmit={async e => {
      e.preventDefault();
      const email = new FormData(e.currentTarget).get('email') as string;
      setState('busy');
      try { await api('/newsletter', { json: { email } }); setState('done'); localStorage.setItem('mm_popup', '1'); } catch (err) { setState((err as Error).message); }
    }}>
      <input name="email" type="email" required placeholder={compact ? 'Email for exclusive offers' : small ? 'Your email' : 'Enter your email'} aria-label="Email" />
      <button className={`btn ${compact ? 'btn--primary' : 'btn--gold'} ${small || compact ? 'btn--sm' : ''}`} disabled={state === 'busy'}>{small ? 'Join' : compact ? 'Subscribe' : 'Get my code'}</button>
      {state !== 'idle' && state !== 'busy' && <span role="alert" style={{ position: 'absolute', top: '100%', left: 12, color: '#FCE8E6', fontSize: '.8rem' }}>{state}</span>}
    </form>
  );
}

/** Counts down to local midnight. Renders nothing until mounted (avoids hydration mismatch). */
export function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => { const end = new Date(); end.setHours(24, 0, 0, 0); setLeft(Math.max(0, Math.floor((+end - Date.now()) / 1000))); };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, []);
  const parts = left == null ? [0, 0, 0] : [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60];
  return (
    <div className="timer" style={{ marginTop: 8 }} aria-label="Offer ends at midnight">
      {(['Hours', 'Mins', 'Secs'] as const).map((l, i) => <div key={l}><b>{left == null ? '--' : String(parts[i]).padStart(2, '0')}</b><small>{l}</small></div>)}
    </div>
  );
}

const SLIDES = [
  { e: 'Small-batch · Roasted in pure cow ghee', h: <>Roz ki <em>muththi</em>,<br />sehat ki kunji</>, p: 'Premium dry fruit mixes, Khajur Pak and roasted snacks, made fresh in small batches with zero preservatives.', c: ['Shop Bestsellers', '/shop?c=bestseller'], c2: ['Explore Combos', '/shop?c=combos'] },
  { e: 'Our signature sweet', h: <>Ghar jaisa<br /><em>Khajur Pak</em></>, p: 'Sweetened only with dates and honey. No refined sugar, no shortcuts, just nani-style goodness in every bite.', c: ['Order Khajur Pak', '/products/dryfruit-khajur-pak'], c2: ['View Gift Boxes', '/shop?c=khajur'] },
  { e: 'Festive & corporate gifting', h: <>Tohfa jo<br /><em>sehat</em> de</>, p: 'Premium gift boxes and hampers for Diwali, Rakhi, weddings and teams, with custom branding on bulk orders.', c: ['Explore Gifting', '/shop?c=gifting'], c2: ['Bulk Enquiry', '/contact#bulk'] },
];

export function HeroSlider({ rating }: { rating: { avg: number; count: number } }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused) return; const t = setInterval(() => setI(x => (x + 1) % SLIDES.length), 6500); return () => clearInterval(t); }, [paused]);
  return (
    <section className="hero" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="hero__slides">
        {SLIDES.map((s, k) => (
          <div key={k} className={`hero__slide container ${k === i ? 'is-active' : ''}`} aria-hidden={k !== i} inert={k !== i}>
            <div className="hero__copy">
              <span className="eyebrow">{s.e}</span>
              {k === 0 ? <h1>{s.h}</h1> : <h2 style={{ fontSize: 'clamp(2.2rem, 4.6vw, 3.8rem)' }}>{s.h}</h2>}
              <p>{s.p}</p>
              <div className="hero__cta"><Link className="btn btn--primary btn--lg" href={s.c[1]}>{s.c[0]} <Icon name="arrow" size="sm" /></Link><Link className="btn btn--outline btn--lg" href={s.c2[1]}>{s.c2[0]}</Link></div>
              <div className="hero__proof">
                <div><strong>{rating.avg.toFixed(1)}/5 rating</strong>{rating.count.toLocaleString('en-IN')} reviews</div><span className="sep" />
                <div><strong>Small-batch</strong>made after you order</div><span className="sep" />
                <div><strong>100%</strong>natural</div>
              </div>
            </div>
            <div className="hero__art"><HeroArt k={k} /></div>
          </div>
        ))}
        <div className="hero__dots">{SLIDES.map((_, k) => <button key={k} className={k === i ? 'is-active' : ''} aria-label={`Slide ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} />)}</div>
      </div>
    </section>
  );
}

export function ProductTabs({ tabs }: { tabs: { id: string; title: string; items: Card[] }[] }) {
  const [cur, setCur] = useState(tabs[0].id);
  const tab = tabs.find(t => t.id === cur)!;
  return (
    <>
      <div className="sec-head"><div><span className="eyebrow">Shop the range</span><h2>Loved by thousands of families</h2></div><Link className="link" href={`/shop?c=${cur}`}>View all <Icon name="arrow" size="sm" /></Link></div>
      <div className="tabs tabs--scroll" role="tablist" style={{ marginBottom: 28 }}>{tabs.map(t => <button key={t.id} role="tab" aria-selected={t.id === cur} className={`chip ${t.id === cur ? 'is-active' : ''}`} onClick={() => setCur(t.id)}>{t.title}</button>)}</div>
      <ProductGrid items={tab.items} />
    </>
  );
}

/** OTP login used by checkout and account. Calls onDone with the logged-in user. */
export function OtpLogin({ onDone, title = 'Login or sign up', compact }: { onDone: (u: User) => void; title?: string; compact?: boolean }) {
  const [target, setTarget] = useState('');
  const [sent, setSent] = useState<{ channel: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function request(e?: React.FormEvent) {
    e?.preventDefault(); setErr(''); setBusy(true);
    try { setSent(await api('/auth/otp/request', { json: { target } })); setCode(''); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api<{ user: User }>('/auth/otp/verify', { json: { target, code } }); onDone(r.user); } catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  return (
    <div>
      {!compact && <h2>{title}</h2>}
      <p className="muted">We’ll send a 6-digit code to your mobile number or email. No password needed.</p>
      {!sent ? (
        <form onSubmit={request} noValidate>
          <div className={`field ${err ? 'has-error' : ''}`}>
            <label htmlFor="otp-target">Mobile number or email</label>
            <input id="otp-target" value={target} onChange={e => setTarget(e.target.value)} placeholder="98765 43210 or you@email.com" autoComplete="username" required />
            <span className="err" role="alert">{err}</span>
          </div>
          <button className="btn btn--primary btn--lg" disabled={busy || !target.trim()}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p>Enter the code sent to <b>{target}</b> <button type="button" className="link" style={{ marginLeft: 8 }} onClick={() => { setSent(null); setErr(''); }}>Change</button></p>
          {sent.devCode && <p className="note" style={{ marginBottom: 12 }}>Local dev: your code is <b>{sent.devCode}</b></p>}
          <div className={`field ${err ? 'has-error' : ''}`}>
            <label htmlFor="otp-code">6-digit code</label>
            <input id="otp-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} style={{ letterSpacing: '.5em', fontSize: '1.3rem', fontWeight: 800, maxWidth: 240 }} required />
            <span className="err" role="alert">{err}</span>
          </div>
          <div className="btn-row">
            <button className="btn btn--primary btn--lg" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => request()}>Resend code</button>
          </div>
        </form>
      )}
    </div>
  );
}
