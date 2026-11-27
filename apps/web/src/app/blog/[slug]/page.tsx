import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import Loading from '../../loading';
import { Art } from '@/components/bits';
import { Icon } from '@/components/icons';
import { NotFoundView } from '@/components/not-found-view';
import { BannerArt } from '@/components/product';
import { getAllProducts, getPost, getPosts, getSettings } from '@/lib/api';
import { fmtDate, rupees } from '@/lib/format';

export async function generateStaticParams() { return (await getPosts()).map(p => ({ slug: p.slug })); }

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const p = await getPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { type: 'article', title: p.title, description: p.excerpt } } : { title: 'Article not found', robots: { index: false } };
}

export default function PostPage({ params }: PageProps<'/blog/[slug]'>) {
  return <Suspense fallback={<Loading />}><Post params={params} /></Suspense>;
}

async function Post({ params }: Pick<PageProps<'/blog/[slug]'>, 'params'>) {
  const { slug } = await params;
  const [post, posts, products, { brand }] = await Promise.all([getPost(slug), getPosts(), getAllProducts(), getSettings()]);
  if (!post) return <NotFoundView title="Article not found" />;
  const prod = products.find(p => p.slug === post.coverSlug);
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.excerpt, datePublished: post.publishedAt, author: { '@type': 'Organization', name: brand.name } };
  return (
    <article className="article container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="right" size="sm" /><Link href="/blog">Journal</Link><Icon name="right" size="sm" /><span>{post.tag}</span></nav>
      <span className="badge badge--soft">{post.tag}</span>
      <h1 style={{ marginTop: 12 }}>{post.title}</h1>
      <p className="muted">{fmtDate(post.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })} · {post.readMins} min read · By Team {brand.name}</p>
      {post.coverSlug && <div className="article__cover"><BannerArt slug={post.coverSlug} /></div>}
      {post.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}
      {prod && (
        <div className="card story-prod">
          <div className="citem__media"><Art slug={prod.slug} /></div>
          <div><span className="eyebrow">Featured in this story</span><h3 style={{ margin: 0 }}>{prod.title}</h3><span className="muted">{rupees(prod.priceFromPaise)}</span></div>
          <Link className="btn btn--primary" href={`/products/${prod.slug}`}>Shop now</Link>
        </div>
      )}
      <h2 style={{ marginTop: 50, fontSize: '1.5rem' }}>More from the journal</h2>
      <div className="blog-grid">
        {posts.filter(p => p.slug !== post.slug).map(p => (
          <Link key={p.slug} className="post" href={`/blog/${p.slug}`}>
            <div className="post__media">{p.coverSlug && <BannerArt slug={p.coverSlug} />}</div>
            <div className="post__body"><span className="badge badge--soft" style={{ justifySelf: 'start' }}>{p.tag}</span><h3 style={{ margin: 0 }}>{p.title}</h3><small className="muted">{fmtDate(p.publishedAt)} · {p.readMins} min read</small></div>
          </Link>
        ))}
      </div>
    </article>
  );
}
