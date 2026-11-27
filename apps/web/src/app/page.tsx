import Link from 'next/link';
import { Icon, Stars } from '@/components/icons';
import { BannerArt, Price } from '@/components/product';
import { Acc, Countdown, HeroSlider, NewsletterForm, ProductTabs } from '@/components/ui';
import { AddButton, Art } from '@/components/bits';
import { getAllProducts, getCollections, getFaqs, getPosts, getProduct, getSettings } from '@/lib/api';
import { fmtDate } from '@/lib/format';

const CAT_ART: Record<string, string> = { mixes: 'mix-dryfruit', roasted: 'masala-dryfruit-mix', khajur: 'dryfruit-khajur-pak', seeds: 'classic-granola', combos: 'seven-in-one-combo', gifting: 'khajur-pak-gifting-box-4' };

export default async function Home() {
  const [products, collections, faqs, posts, settings] = await Promise.all([getAllProducts(), getCollections(), getFaqs(), getPosts(), getSettings()]);
  const reviewSources = await Promise.all(['dryfruit-khajur-pak', 'mix-dryfruit', 'seven-in-one-combo'].map(getProduct));
  const testimonials = reviewSources.filter(Boolean).flatMap(p => p!.reviews.slice(0, 1).map(r => ({ ...r, product: p! })));
  const spot = await getProduct('mix-dryfruit-khajur-pak-combo');
  const inColl = (slug: string) => products.filter(p => p.collections.some(c => c.slug === slug)).sort((a, b) => Number(b.inStock) - Number(a.inStock)).slice(0, 8);
  const rated = products.filter(p => p.ratingCount > 0);
  const ratingCount = rated.reduce((a, p) => a + p.ratingCount, 0);
  const ratingAvg = ratingCount ? rated.reduce((a, p) => a + p.ratingAvg * p.ratingCount, 0) / ratingCount : 0;
  const orgLd = { '@context': 'https://schema.org', '@type': 'Organization', name: settings.brand.name, url: process.env.SITE_URL ?? 'http://localhost:3100', email: settings.brand.email, telephone: settings.brand.phone, slogan: settings.brand.tagline };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, '\\u003c') }} />
      <HeroSlider rating={{ avg: ratingAvg, count: ratingCount }} />

      <section className="trust" aria-label="Our promise"><div className="container trust__row">
        {[['leaf', '100% natural ingredients'], ['shield', 'No preservatives added'], ['nosugar', 'No refined sugar or artificial sweetener'], ['drop', 'Roasted in pure cow ghee'], ['award', 'Small-batch, packed after you order']].map(([i, t]) => (
          <div key={i} className="trust__item"><span className="trust__icon"><Icon name={i} /></span>{t}</div>
        ))}
      </div></section>

      <section className="section"><div className="container">
        <div className="sec-head sec-head--center"><span className="eyebrow">Shop by category</span><h2>Find your daily mantra</h2><p>From ghee-roasted mixes to dates-sweetened Khajur Pak, there is a jar for every craving.</p></div>
        <div className="cat-grid">
          {collections.filter(c => c.kind === 'CATEGORY').map(c => (
            <Link key={c.slug} className="cat-card" href={`/shop?c=${c.slug}`}>
              <div className="cat-card__media"><Art slug={[CAT_ART[c.slug], ...inColl(c.slug).map(p => p.slug)]} /></div>
              <h3>{c.title}</h3><p>{c.blurb}</p>
            </Link>
          ))}
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 20 }}><div className="container">
        <ProductTabs tabs={[{ id: 'bestseller', title: 'Bestsellers', items: inColl('bestseller') }, { id: 'new', title: 'New Arrivals', items: inColl('new') }, { id: 'combos', title: 'Combos', items: inColl('combos') }, { id: 'gifting', title: 'Gifting', items: inColl('gifting') }].filter(t => t.items.length)} />
      </div></section>

      {spot && (
        <section className="section section--sage"><div className="container"><div className="spotlight">
          <div className="spotlight__media"><Art slug={spot.slug} view={3} /></div>
          <div className="spotlight__body">
            <span className="badge badge--gold" style={{ alignSelf: 'flex-start' }}>★ Best Seller Combo</span>
            <h2 style={{ margin: 0 }}>{spot.title}</h2>
            {spot.ratingCount > 0 && <Stars rating={spot.ratingAvg} count={`${spot.ratingCount} reviews`} />}
            <p className="muted" style={{ margin: 0 }}>{spot.description}</p>
            <ul className="spotlight__list">{spot.contains.map(c => <li key={c}><Icon name="check" size="sm" /> {c}</li>)}<li><Icon name="check" size="sm" /> Free shipping + festive-ready packing</li></ul>
            <Price now={spot.variants[0].pricePaise} mrp={spot.variants[0].mrpPaise} />
            <div><small className="muted" style={{ fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>Today’s price ends in</small><Countdown /></div>
            <div className="btn-row" style={{ marginTop: 6 }}>
              {spot.inStock && <AddButton variantId={spot.variants[0].id} className="btn btn--primary btn--lg"><Icon name="bag" size="sm" /> Add to cart</AddButton>}
              <Link className="btn btn--outline btn--lg" href={`/products/${spot.slug}`}>View details</Link>
            </div>
          </div>
        </div></div></section>
      )}

      <section className="section"><div className="container split">
        <div className="split__media"><Art slug="dryfruit-khajur-pak" view={3} /><div className="stamp">NO REFINED<br />SUGAR<br />★</div></div>
        <div><span className="eyebrow">Our signature sweet</span><h2>Ghar jaisa Khajur Pak, just like nani made</h2>
          <p className="muted">Soft dates slow-cooked with kaju, badam, pista and seeds, sweetened only with dates and a touch of honey. A mithai you can eat every morning without a second thought.</p>
          <ul className="ticks">
            <li><span className="tick"><Icon name="check" size="sm" /></span><span><b>No refined sugar.</b> Natural sweetness from dates &amp; honey.</span></li>
            <li><span className="tick"><Icon name="check" size="sm" /></span><span><b>Loaded with dry fruits.</b> Cashews, almonds, pistachios and seeds.</span></li>
            <li><span className="tick"><Icon name="check" size="sm" /></span><span><b>Hand-cut &amp; packed fresh.</b> Made the same week it reaches you.</span></li>
          </ul>
          <div className="btn-row"><Link className="btn btn--primary btn--lg" href="/products/dryfruit-khajur-pak">Buy Khajur Pak</Link><Link className="btn btn--outline btn--lg" href="/blog/khajur-pak-story">Read the story</Link></div>
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container">
        <div className="sec-head sec-head--center"><span className="eyebrow">The difference</span><h2>Why families switch to {settings.brand.name}</h2></div>
        <div style={{ overflowX: 'auto' }}><table className="compare">
          <thead><tr><th scope="col"><span className="sr-only">Feature</span></th><th scope="col" className="us">{settings.brand.name}</th><th scope="col">Regular store-bought</th></tr></thead>
          <tbody>
            {[['Roasted in pure cow ghee'], ['Zero preservatives'], ['No refined sugar'], ['Packed only after you order'], ['Premium A-grade nuts', 'Sometimes'], ['Damage-free delivery promise']].map(([f, them]) => (
              <tr key={f}><td>{f}</td><td className="us yes" aria-label="Yes">✓</td><td className="no" aria-label={them ?? 'No'}>{them ?? '✗'}</td></tr>
            ))}
          </tbody></table></div>
      </div></section>

      <section className="section section--green"><div className="container">
        <div className="sec-head sec-head--center"><span className="eyebrow" style={{ color: 'var(--gold-l)' }}>From our kitchen to yours</span><h2>How every jar is made</h2></div>
        <div className="steps">
          {[['Handpicked', 'A-grade almonds, cashews, pistachios and seeds from trusted growers.'], ['Slow-roasted', 'Roasted in small batches in pure cow ghee for that real homemade taste.'], ['Packed fresh', 'Sealed in airtight jars only after you order: never sitting in a warehouse.'], ['Delivered', 'Shipped across India in 3–7 days with order tracking.']].map(([h, t]) => (
            <div key={h} className="step"><h3>{h}</h3><p>{t}</p></div>
          ))}
        </div>
      </div></section>

      <section className="section"><div className="container split">
        <div><span className="eyebrow">Festive &amp; corporate gifting</span><h2>Tohfa jo sehat de</h2>
          <p className="muted">Swap sugary sweets for premium dry fruit hampers and Khajur Pak gift boxes. Perfect for Diwali, Rakhi, weddings and team gifting.</p>
          <ul className="ticks">
            <li><span className="tick"><Icon name="gift" size="sm" /></span><span>Custom logo sleeves &amp; handwritten messages</span></li>
            <li><span className="tick"><Icon name="users" size="sm" /></span><span>Special pricing from 25 boxes</span></li>
            <li><span className="tick"><Icon name="truck" size="sm" /></span><span>Direct delivery to every recipient, pan-India</span></li>
          </ul>
          <div className="btn-row"><Link className="btn btn--gold btn--lg" href="/shop?c=gifting">Shop gifting</Link><Link className="btn btn--outline btn--lg" href="/contact#bulk">Bulk enquiry</Link></div>
        </div>
        <div className="split__media" style={{ background: 'var(--cream-2)' }}><Art hero={2} /></div>
      </div></section>

      {testimonials.length > 0 && (
        <section className="section section--sage"><div className="container">
          <div className="sec-head"><div><span className="eyebrow">Reviews</span><h2>What our customers say</h2>{ratingCount > 0 && <p>Rated <b>{ratingAvg.toFixed(1)}/5</b> by families across India.</p>}</div><Link className="link" href="/shop?c=bestseller">Shop their favourites <Icon name="arrow" size="sm" /></Link></div>
          <div className="tgrid">
            {testimonials.map(r => (
              <div key={r.id} className="tcard"><Stars rating={r.rating} showNum={false} /><p style={{ margin: 0 }}>“{r.text}”</p>
                <Link className="tcard__prod" href={`/products/${r.product.slug}`}>{r.product.title}</Link>
                <div className="tcard__who"><span className="avatar" aria-hidden="true">{r.name[0]}</span><div><b>{r.name}</b><div className="muted" style={{ fontSize: '.85rem' }}>{r.city}{r.isVerified ? ' · Verified buyer' : ''}</div></div></div></div>
            ))}
          </div>
        </div></section>
      )}

      {posts.length > 0 && (
        <section className="section"><div className="container">
          <div className="sec-head"><div><span className="eyebrow">Mantra Journal</span><h2>Recipes, rituals &amp; wellness</h2></div><Link className="link" href="/blog">Read the journal <Icon name="arrow" size="sm" /></Link></div>
          <div className="blog-grid rail-sm">{posts.slice(0, 3).map(p => (
            <Link key={p.slug} className="post" href={`/blog/${p.slug}`}>
              <div className="post__media">{p.coverSlug && <BannerArt slug={p.coverSlug} />}</div>
              <div className="post__body"><span className="badge badge--soft" style={{ justifySelf: 'start' }}>{p.tag}</span><h3 style={{ margin: 0 }}>{p.title}</h3><p className="muted" style={{ margin: 0 }}>{p.excerpt}</p><small className="muted">{fmtDate(p.publishedAt)} · {p.readMins} min read</small></div>
            </Link>
          ))}</div>
        </div></section>
      )}

      <section className="section" style={{ paddingTop: 0 }}><div className="container split" style={{ alignItems: 'start' }}>
        <div><span className="eyebrow">FAQs</span><h2>Questions? We’ve got answers.</h2><p className="muted">Can’t find what you’re looking for? Our team replies on WhatsApp within minutes during working hours.</p>
          <div className="btn-row"><Link className="btn btn--primary" href="/faq">All FAQs</Link><a className="btn btn--outline" href={`https://wa.me/${settings.brand.whatsapp}`}>WhatsApp us</a></div></div>
        <div>{faqs.slice(0, 4).map(f => <Acc key={f.id} q={f.question} a={f.answer} />)}</div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container"><div className="newsletter">
        <div><span className="eyebrow" style={{ color: 'var(--gold-l)' }}>Join the Mantra circle</span><h2>Get 10% off your first order</h2><p style={{ margin: 0 }}>New launches, festive offers and healthy snacking ideas. No spam, ever.</p></div>
        <NewsletterForm />
      </div></div></section>
    </>
  );
}

