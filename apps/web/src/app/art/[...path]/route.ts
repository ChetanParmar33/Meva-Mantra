import { banner, hero, view, type ArtProduct } from '@/lib/art';
import { getAllProducts, getProduct, type ProductDetail } from '@/lib/api';

// Generated artwork served as cacheable SVG files instead of being inlined into every page:
//   /art/p/<slug>/<view>-<variant>.svg   product image (view 0-3)
//   /art/hero/<k>.svg                    home hero scene
//   /art/banner/<slug>.svg               blog / banner scene
const toArt = (d: ProductDetail): ArtProduct => ({
  slug: d.slug, title: d.title, type: d.type, art: d.art, variants: d.variants,
  ingredients: d.ingredients, contains: d.contains, highlights: d.highlights,
});

async function lookup() {
  const all = await getAllProducts();
  const details = await Promise.all(all.map(p => getProduct(p.slug)));
  const map = new Map(details.filter((d): d is ProductDetail => !!d).map(d => [d.slug, toArt(d)]));
  return (slug: string) => map.get(slug);
}

const svg = (body: string) => new Response(body, {
  headers: {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // Browsers keep it 10 min, then revalidate in the background; admin colour changes show up quickly.
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
    // Defence in depth: an SVG opened directly can't run scripts or load anything.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  },
});
const notFound = () => new Response('Not found', { status: 404 });

export async function GET(_req: Request, { params }: RouteContext<'/art/[...path]'>) {
  const [kind, a, b] = (await params).path;
  if (kind === 'hero' && a) {
    const k = Number(a.replace(/\.svg$/, ''));
    return Number.isInteger(k) && k >= 0 && k <= 2 ? svg(hero(k, await lookup(), 'h')) : notFound();
  }
  if (kind === 'banner' && a) {
    const d = await getProduct(a.replace(/\.svg$/, ''));
    return d ? svg(banner(toArt(d), 'b')) : notFound();
  }
  if (kind === 'p' && a && b) {
    const m = /^(\d)-(\d{1,2})\.svg$/.exec(b);
    const d = m ? await getProduct(a) : null;
    if (!m || !d || +m[1] > 3) return notFound();
    return svg(view(toArt(d), +m[1], Math.min(+m[2], d.variants.length - 1), 'p'));
  }
  return notFound();
}
