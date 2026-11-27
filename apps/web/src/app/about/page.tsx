import type { Metadata } from 'next';
import Link from 'next/link';
import { Art } from '@/components/bits';
import { Icon } from '@/components/icons';
import { getAllProducts, getSettings } from '@/lib/api';

export const metadata: Metadata = { title: 'Our story', description: 'Meva Mantra began in a family kitchen with one belief: snacks should be as honest as the ones our grandmothers made.' };

export default async function About() {
  const [settings, products] = await Promise.all([getSettings(), getAllProducts()]);
  const rated = products.filter(p => p.ratingCount > 0);
  const n = rated.reduce((a, p) => a + p.ratingCount, 0);
  const avg = n ? rated.reduce((a, p) => a + p.ratingAvg * p.ratingCount, 0) / n : 0;
  const name = settings.brand.name;
  return (
    <>
      <section className="hero" style={{ padding: '40px 0' }}><div className="container split">
        <div><nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="right" size="sm" /><span>Our Story</span></nav>
          <span className="eyebrow">Our story</span><h1>The mantra behind every muththi</h1>
          <p className="muted lead">{name} began in a family kitchen with one simple belief: the snacks we give our families should be as honest as the ones our grandmothers made.</p>
          <Link className="btn btn--primary btn--lg" href="/shop">Taste the difference</Link></div>
        <div className="hero__art"><Art hero={0} /></div>
      </div></section>

      <section className="section"><div className="container split">
        <div className="split__media"><Art slug="dryfruit-khajur-pak" view={3} /></div>
        <div><span className="eyebrow">How it started</span><h2>From nani’s recipe book to your doorstep</h2>
          <p>It started with Khajur Pak: the dates-and-dry-fruit sweet that was always waiting in a steel dabba at home. No sugar syrup, no shortcuts, just dates, nuts, ghee and patience.</p>
          <p>When friends started asking for “one more box”, we knew we had something worth sharing. Today we make a whole range of dry fruit mixes, roasted snacks and gift boxes, still in small batches, still the ghar-jaisa way.</p>
          <p className="muted">Every jar is roasted, packed and sealed only after you order, so it reaches you as fresh as it left our kitchen.</p></div>
      </div></section>

      <section className="section section--sage"><div className="container">
        <div className="sec-head sec-head--center"><span className="eyebrow">What we stand for</span><h2>Our four promises</h2></div>
        <div className="values">
          {[['leaf', 'Real ingredients', 'A-grade nuts, seeds and dates. Nothing artificial, nothing hidden.'], ['nosugar', 'No refined sugar', 'Sweetness only from dates, honey and jaggery.'], ['drop', 'Pure cow ghee', 'Slow-roasted the traditional way for real homemade taste.'], ['heartHand', 'Made with care', 'Small batches, hand-packed, sealed fresh after every order.']].map(([i, h, t]) => (
            <div key={h} className="value"><div className="value__icon"><Icon name={i} size="lg" /></div><h3>{h}</h3><p className="muted">{t}</p></div>
          ))}
        </div>
      </div></section>

      <section className="section section--green"><div className="container stats">
        <div><b>{products.length}</b>products &amp; hampers</div>
        {n > 0 && <div><b>{avg.toFixed(1)}★</b>average rating</div>}
        {n > 0 && <div><b>{n.toLocaleString('en-IN')}</b>customer reviews</div>}
        <div><b>0</b>preservatives, ever</div>
      </div></section>

      <section className="section"><div className="container"><p className="quote">“If I wouldn’t feed it to my own family, it doesn’t go in a {name} jar. That’s the only rule in our kitchen.”</p><p className="center muted" style={{ marginTop: 18 }}><b style={{ color: 'var(--green-900)' }}>Founder</b>, {name}</p></div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="newsletter">
        <div><span className="eyebrow" style={{ color: 'var(--gold-l)' }}>Taste the story</span><h2>Start with our bestseller combo</h2><p style={{ margin: 0 }}>Dry Fruit Mix + Khajur Pak: the pair that started it all.</p></div>
        <div style={{ position: 'relative', zIndex: 1 }}><Link className="btn btn--gold btn--lg" href="/products/mix-dryfruit-khajur-pak-combo">Shop the combo</Link></div>
      </div></div></section>
    </>
  );
}
