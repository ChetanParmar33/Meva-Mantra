import type { Metadata } from 'next';
import { Suspense } from 'react';
import Loading from '../../loading';
import { NotFoundView } from '@/components/not-found-view';
import { ProductView } from '@/components/product-view';
import { getAllProducts, getProduct, getSettings } from '@/lib/api';

export async function generateStaticParams() {
  return (await getAllProducts()).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  return {
    title: p.seoTitle ?? p.title,
    description: p.seoDescription ?? p.short,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.title, description: p.short, ...(p.image ? { images: [p.image] } : {}) },
  };
}

export default function ProductPage({ params }: PageProps<'/products/[slug]'>) {
  return <Suspense fallback={<Loading />}><ProductDetails params={params} /></Suspense>;
}

async function ProductDetails({ params }: Pick<PageProps<'/products/[slug]'>, 'params'>) {
  const { slug } = await params;
  const [p, settings, all] = await Promise.all([getProduct(slug), getSettings(), getAllProducts()]);
  if (!p) return <NotFoundView title="Product not found" text="It may have moved or sold out for good. Try our bestsellers instead." />;
  const site = process.env.SITE_URL ?? 'http://localhost:3100';
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.description, sku: p.slug,
    brand: { '@type': 'Brand', name: settings.brand.name }, ...(p.image ? { image: [p.image] } : {}),
    offers: p.variants.map(v => ({ '@type': 'Offer', name: v.title, price: (v.pricePaise / 100).toFixed(2), priceCurrency: 'INR', availability: `https://schema.org/${v.inStock ? 'InStock' : 'OutOfStock'}`, url: `${site}/products/${p.slug}` })),
    ...(p.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
  };
  const pool = ['dryfruit-khajur-pak', 'mix-dryfruit', 'masala-dryfruit-mix', 'seed-mix-with-haldi-roasted-salted', 'protein-beans-mix']
    .filter(s => s !== p.slug).map(s => all.find(x => x.slug === s)).filter(x => x?.inStock).slice(0, 2) as typeof all;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <ProductView p={p} fbt={pool} />
    </>
  );
}
