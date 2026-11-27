'use client';
import { useMemo, useState } from 'react';
import type { Faq } from '@/lib/api';
import { api } from '@/lib/client';
import { Icon } from './icons';
import { Acc } from './ui';

type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[]; textarea?: boolean; placeholder?: string; half?: boolean };

/** Contact + bulk enquiry form → POST /enquiries */
export function EnquiryForm({ type, title, fields, submit, phone }: { type: 'CONTACT' | 'BULK'; title: React.ReactNode; fields: Field[]; submit: string; phone: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  if (state === 'done') return <div className="card"><div className="success" style={{ padding: 24, textAlign: 'center' }} role="status"><Icon name="check" size="lg" /><h3 style={{ color: 'var(--ok)', margin: '10px 0 4px' }}>Thank you!</h3>We’ve received your message and will reply within 24 hours. For anything urgent, WhatsApp us at {phone}.</div></div>;
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = (data[f.name] ?? '').trim();
      if (f.required && !v) errs[f.name] = 'Required';
      else if (f.name === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) errs[f.name] = 'Enter a valid email';
      else if (f.name === 'phone' && v && !/^[6-9]\d{9}$/.test(v)) errs[f.name] = 'Enter a valid 10-digit mobile';
      else if (f.name === 'message' && v.length < 5) errs[f.name] = 'Please write a little more';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState('busy');
    const body = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ''));
    try { await api('/enquiries', { json: { ...body, type } }); setState('done'); } catch (x) { setState((x as Error).message); }
  }
  const one = (f: Field) => (
    <div key={f.name} className={`field ${errors[f.name] ? 'has-error' : ''}`}>
      <label htmlFor={`${type}-${f.name}`}>{f.label}</label>
      {f.options ? <select id={`${type}-${f.name}`} name={f.name}>{f.options.map(o => <option key={o}>{o}</option>)}</select>
        : f.textarea ? <textarea id={`${type}-${f.name}`} name={f.name} rows={4} placeholder={f.placeholder} maxLength={2000} aria-invalid={!!errors[f.name]} />
        : <input id={`${type}-${f.name}`} name={f.name} type={f.type ?? 'text'} placeholder={f.placeholder} inputMode={f.name === 'phone' ? 'numeric' : undefined} maxLength={f.name === 'phone' ? 10 : 160} aria-invalid={!!errors[f.name]} />}
      <span className="err">{errors[f.name]}</span>
    </div>
  );
  const rows: Field[][] = [];
  for (const f of fields) { const last = rows[rows.length - 1]; if (f.half && last && last.length === 1 && last[0].half) last.push(f); else rows.push([f]); }
  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      {title}
      {rows.map((r, i) => r.length === 2 ? <div key={i} className="row2">{r.map(one)}</div> : one(r[0]))}
      {state !== 'idle' && state !== 'busy' && <p className="note err-box" role="alert" style={{ marginBottom: 12 }}>{state}</p>}
      <button className={`btn btn--lg ${type === 'BULK' ? 'btn--gold btn--block' : 'btn--primary'}`} disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : submit}</button>
    </form>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const cats = useMemo(() => [...new Set(faqs.map(f => f.category))], [faqs]);
  const [cur, setCur] = useState('All');
  const [q, setQ] = useState('');
  const list = faqs.filter(f => (cur === 'All' || f.category === cur) && (f.question + f.answer).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div style={{ maxWidth: 520, marginBottom: 20 }}><label className="sr-only" htmlFor="faq-q">Search FAQs</label><input className="input" id="faq-q" type="search" placeholder="Search questions…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="tabs tabs--scroll" style={{ marginBottom: 10 }}>{['All', ...cats].map(c => <button key={c} className={`chip ${c === cur ? 'is-active' : ''}`} aria-pressed={c === cur} onClick={() => setCur(c)}>{c}</button>)}</div>
      {!list.length ? <p className="muted">No matching questions. <a className="link" href="/contact">Ask us directly</a></p>
        : cur === 'All' && !q ? cats.map(c => <div key={c}><h3 style={{ marginTop: 30 }}>{c}</h3>{faqs.filter(f => f.category === c).map(f => <Acc key={f.id} q={f.question} a={f.answer} />)}</div>)
        : list.map(f => <Acc key={f.id} q={f.question} a={f.answer} />)}
    </>
  );
}
