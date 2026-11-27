import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import Loading from '../../loading';
import { PageHero } from '@/components/page-hero';
import { getPolicies, getPolicy, getSettings } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export async function generateStaticParams() { return (await getPolicies()).map(p => ({ slug: p.slug })); }

export async function generateMetadata({ params }: PageProps<'/policies/[slug]'>): Promise<Metadata> {
  const p = await getPolicy((await params).slug);
  return p ? { title: p.title, alternates: { canonical: `/policies/${p.slug}` } } : { title: 'Policy not found', robots: { index: false } };
}

// Unknown slugs get a real HTTP 404 from src/proxy.ts; notFound() below is the fallback.
export default function PolicyPage({ params }: PageProps<'/policies/[slug]'>) {
  return <Suspense fallback={<Loading />}><Policy params={params} /></Suspense>;
}

async function Policy({ params }: Pick<PageProps<'/policies/[slug]'>, 'params'>) {
  const { slug } = await params;
  const [p, all, { brand }] = await Promise.all([getPolicy(slug), getPolicies(), getSettings()]);
  if (!p) notFound();
  return (
    <>
      <PageHero title={p.title} sub="Clear, simple and fair: the way it should be." crumb="Policies" />
      <section className="section"><div className="container">
        <nav className="ptabs" aria-label="Policies">{all.map(x => <Link key={x.slug} className={`chip ${x.slug === p.slug ? 'is-active' : ''}`} href={`/policies/${x.slug}`} aria-current={x.slug === p.slug ? 'page' : undefined}>{x.title}</Link>)}</nav>
        <div className="prose">
          {p.sections.map(s => <div key={s.heading}><h3>{s.heading}</h3><p>{s.body}</p></div>)}
          <p className="muted" style={{ marginTop: 30 }}>Questions? Write to <a className="link" href={`mailto:${brand.email}`}>{brand.email}</a> or WhatsApp {brand.phone}. Last updated: {fmtDate(p.updatedAt, { month: 'long', year: 'numeric' })}.</p>
        </div>
      </div></section>
    </>
  );
}
