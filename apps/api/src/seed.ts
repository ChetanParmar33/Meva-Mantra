// Seeds the catalogue from prisma/seed-data.json (exported from the HTML prototype). Safe to re-run: everything is upserted.
// Run: pnpm db:seed   (compiles with `nest build`, then runs dist/seed.js)
import './env.js';
import { readFileSync } from 'node:fs';
import { createPrisma } from './common/prisma.service.js';
import { hashPassword } from './common/password.js';
import type { ProductStatus, ProductType } from './generated/prisma/client.js';

const data = JSON.parse(readFileSync(new URL('../prisma/seed-data.json', import.meta.url), 'utf8'));
const db = createPrisma();
const paise = (rupees: number | null | undefined) => (rupees ? rupees * 100 : null);

async function main() {
  const { BRAND, COUPONS, CATEGORIES, COLLECTIONS, PRODUCTS, REVIEWS, FAQS, POLICIES, POSTS } = data;

  // settings
  const settings: Record<string, unknown> = {
    brand: { name: BRAND.name, tagline: BRAND.tagline, phone: BRAND.phone, whatsapp: BRAND.whatsapp, email: BRAND.email, address: BRAND.address, hours: BRAND.hours },
    prepaidDiscountPct: BRAND.prepaidOff,
    freeShippingAbovePaise: BRAND.freeShipAt * 100,
    shippingFeePaise: BRAND.shipFee * 100,
    giftWrapPaise: BRAND.giftWrap * 100,
  };
  for (const [key, value] of Object.entries(settings)) await db.setting.upsert({ where: { key }, create: { key, value: value as object }, update: { value: value as object } });

  // collections: categories first, then other collections ("all" is virtual)
  const catIds = new Set(CATEGORIES.map((c: { id: string }) => c.id));
  for (const [i, c] of CATEGORIES.entries()) {
    const desc = COLLECTIONS.find((x: { id: string }) => x.id === c.id)?.desc ?? null;
    await db.collection.upsert({ where: { slug: c.id }, create: { slug: c.id, title: c.title, blurb: c.blurb, description: desc, kind: 'CATEGORY', sortOrder: i }, update: { title: c.title, blurb: c.blurb, description: desc, kind: 'CATEGORY', sortOrder: i } });
  }
  for (const [i, c] of COLLECTIONS.entries()) {
    if (c.id === 'all' || catIds.has(c.id)) continue;
    await db.collection.upsert({ where: { slug: c.id }, create: { slug: c.id, title: c.title, description: c.desc, sortOrder: i }, update: { title: c.title, description: c.desc, sortOrder: i } });
  }

  // products + variants (demo stock: 50 for available sizes, 0 for sold out)
  for (const [i, p] of PRODUCTS.entries()) {
    const base = {
      title: p.title, type: p.type.toUpperCase() as ProductType, status: (p.status ?? 'active').toUpperCase() as ProductStatus, short: p.short, description: p.desc,
      ingredients: p.ingredients ?? [], highlights: p.highlights ?? [], contains: p.contains ?? [],
      shelfLife: p.shelf, optionName: p.option ?? 'Size', limitedNote: p.limited ?? null, art: p.art,
      ratingAvg: p.rating, ratingCount: p.reviews, sortOrder: i,
      collections: { set: p.cats.map((slug: string) => ({ slug })) },
    };
    const product = await db.product.upsert({ where: { slug: p.id }, create: { slug: p.id, ...base, collections: { connect: p.cats.map((slug: string) => ({ slug })) } }, update: base });
    for (const [pos, v] of p.variants.entries()) {
      const vdata = { productId: product.id, title: v.t, pricePaise: v.p * 100, mrpPaise: v.mrp && v.mrp > v.p ? paise(v.mrp) : null, stock: v.soldOut ? 0 : 50, swatch: v.swatch ?? null, position: pos };
      await db.productVariant.upsert({ where: { sku: v.sku }, create: { sku: v.sku, ...vdata }, update: vdata });
    }
  }

  // coupons
  for (const [code, c] of Object.entries(COUPONS) as [string, { pct: number; min: number; label: string }][]) {
    const d = { description: c.label, type: 'PERCENT' as const, value: c.pct, minOrderPaise: c.min * 100, firstOrderOnly: code === 'MANTRA10' };
    await db.coupon.upsert({ where: { code }, create: { code, ...d }, update: d });
  }

  // demo reviews (placeholders: replace with real reviews before launch)
  if ((await db.review.count()) === 0) {
    for (const r of REVIEWS) {
      const product = await db.product.findUnique({ where: { slug: r.product } });
      if (product) await db.review.create({ data: { productId: product.id, name: r.name, city: r.city, rating: r.r, text: r.text, status: 'APPROVED' } });
    }
  }

  // content
  if ((await db.faq.count()) === 0) await db.faq.createMany({ data: FAQS.map((f: { cat: string; q: string; a: string }, i: number) => ({ category: f.cat, question: f.q, answer: f.a, sortOrder: i })) });
  for (const [slug, pol] of Object.entries(POLICIES) as [string, { title: string; body: [string, string][] }][]) {
    const d = { title: pol.title, sections: pol.body.map(([heading, body]) => ({ heading, body })) };
    await db.policy.upsert({ where: { slug }, create: { slug, ...d }, update: d });
  }
  for (const post of POSTS) {
    const d = { title: post.title, excerpt: post.excerpt, body: post.body.join('\n\n'), tag: post.tag, coverSlug: post.art, readMins: post.mins, publishedAt: new Date(post.date) };
    await db.post.upsert({ where: { slug: post.id }, create: { slug: post.id, ...d }, update: d });
  }

  // first admin
  const email = process.env.ADMIN_EMAIL?.toLowerCase(), password = process.env.ADMIN_PASSWORD;
  if (email && password && !(await db.adminUser.findUnique({ where: { email } }))) {
    await db.adminUser.create({ data: { email, name: 'Store Owner', role: 'OWNER', passwordHash: await hashPassword(password) } });
    console.log(`Admin created: ${email}`);
  }

  const counts = await Promise.all([db.product.count(), db.productVariant.count(), db.collection.count(), db.coupon.count(), db.review.count(), db.faq.count(), db.policy.count(), db.post.count(), db.adminUser.count()]);
  console.log('Seeded → products %d, variants %d, collections %d, coupons %d, reviews %d, faqs %d, policies %d, posts %d, admins %d', ...counts);
}

await main().finally(() => db.$disconnect());
