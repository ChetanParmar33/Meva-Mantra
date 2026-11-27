import type { Metadata } from 'next';
import Link from 'next/link';
import { Art } from '@/components/bits';
import { PageHero } from '@/components/page-hero';
import { BannerArt } from '@/components/product';
import { getPosts } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Mantra Journal', description: 'Recipes, rituals and honest wellness tips from our kitchen.' };

export default async function Blog() {
  const posts = await getPosts();
  return (
    <>
      <PageHero title="Mantra Journal" sub="Recipes, rituals and honest wellness tips from our kitchen." crumb="Journal" art={<Art slug="classic-granola" />} />
      <section className="section"><div className="container"><div className="blog-grid">
        {posts.map((p, i) => (
          <Link key={p.slug} className={`post ${i === 0 ? 'post--featured' : ''}`} href={`/blog/${p.slug}`}>
            <div className="post__media">{p.coverSlug && <BannerArt slug={p.coverSlug} />}</div>
            <div className="post__body"><span className="badge badge--soft" style={{ justifySelf: 'start' }}>{p.tag}</span><h2 style={{ margin: 0, fontSize: i === 0 ? undefined : '1.3rem' }}>{p.title}</h2><p className="muted" style={{ margin: 0 }}>{p.excerpt}</p><small className="muted">{fmtDate(p.publishedAt)} · {p.readMins} min read</small></div>
          </Link>
        ))}
      </div></div></section>
    </>
  );
}
