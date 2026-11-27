import { Controller, Get, Injectable, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../common/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { assetUrl } from '../common/session.js';

export const SORTS = ['featured', 'relevance', 'best', 'az', 'za', 'low', 'high', 'new', 'old', 'rating'] as const;

export class ProductQuery {
  @IsOptional() @IsString() collection?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(SORTS) sort?: (typeof SORTS)[number];
  @IsOptional() @IsIn(['in', 'out']) availability?: 'in' | 'out';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number; // rupees
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number; // rupees
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) pageSize?: number;
}

const listInclude = {
  variants: { orderBy: { position: 'asc' } },
  images: { orderBy: { position: 'asc' }, take: 1 },
  collections: { select: { slug: true, title: true, kind: true } },
} satisfies Prisma.ProductInclude;
type ListRow = Prisma.ProductGetPayload<{ include: typeof listInclude }>;

/** Public shape: never exposes exact stock counts. */
function toCard(p: ListRow) {
  const cheapest = p.variants.reduce((a, v) => (v.pricePaise < a.pricePaise ? v : a), p.variants[0]);
  return {
    id: p.id, slug: p.slug, title: p.title, type: p.type, short: p.short, art: p.art,
    ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, optionName: p.optionName, createdAt: p.createdAt,
    collections: p.collections,
    image: p.images[0] ? assetUrl(p.images[0].url) : null,
    priceFromPaise: cheapest?.pricePaise ?? 0,
    mrpPaise: cheapest?.mrpPaise ?? null,
    hasPriceRange: new Set(p.variants.map(v => v.pricePaise)).size > 1,
    inStock: p.variants.some(v => v.stock > 0),
    variants: p.variants.map(v => ({ id: v.id, title: v.title, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, swatch: v.swatch, inStock: v.stock > 0 })),
  };
}

@Injectable()
export class CatalogService {
  constructor(private db: PrismaService) {}

  collections() {
    return this.db.collection.findMany({
      where: { products: { some: { status: 'ACTIVE' } } }, // empty collections stay hidden
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      select: { slug: true, title: true, description: true, blurb: true, kind: true, _count: { select: { products: { where: { status: 'ACTIVE' } } } } },
    });
  }

  async products(q: ProductQuery) {
    const and: Prisma.ProductWhereInput[] = [{ status: 'ACTIVE' }];
    if (q.collection && q.collection !== 'all') and.push({ collections: { some: { slug: q.collection } } });
    const words = q.q?.trim().split(/\s+/).filter(Boolean) ?? [];
    for (const w of words) and.push({ OR: [
      { title: { contains: w, mode: 'insensitive' } },
      { short: { contains: w, mode: 'insensitive' } },
      { ingredients: { has: w[0].toUpperCase() + w.slice(1).toLowerCase() } },
      { collections: { some: { title: { contains: w, mode: 'insensitive' } } } },
    ] });
    if (q.availability === 'in') and.push({ variants: { some: { stock: { gt: 0 } } } });
    if (q.availability === 'out') and.push({ variants: { every: { stock: { lte: 0 } } } });
    if (q.minPrice != null || q.maxPrice != null) {
      and.push({ variants: { some: { pricePaise: { gte: (q.minPrice ?? 0) * 100, ...(q.maxPrice != null ? { lte: q.maxPrice * 100 } : {}) } } } });
    }
    const where: Prisma.ProductWhereInput = { AND: and };

    // ponytail: filter in SQL, sort + paginate in memory. Fine for a catalogue of a few hundred products; move price sort to SQL if it grows.
    const rows = (await this.db.product.findMany({ where, include: listInclude, orderBy: { sortOrder: 'asc' } })).map(toCard);
    const sort = q.sort ?? (words.length ? 'relevance' : 'featured');
    const score = (c: ReturnType<typeof toCard>) => words.reduce((s, w) => s + (c.title.toLowerCase().includes(w.toLowerCase()) ? 3 : 1), 0);
    const cmp: Record<string, (a: ReturnType<typeof toCard>, b: ReturnType<typeof toCard>) => number> = {
      featured: (a, b) => Number(b.inStock) - Number(a.inStock),
      relevance: (a, b) => score(b) - score(a) || Number(b.inStock) - Number(a.inStock),
      best: (a, b) => b.ratingCount - a.ratingCount,
      az: (a, b) => a.title.localeCompare(b.title),
      za: (a, b) => b.title.localeCompare(a.title),
      low: (a, b) => a.priceFromPaise - b.priceFromPaise,
      high: (a, b) => b.priceFromPaise - a.priceFromPaise,
      new: (a, b) => +b.createdAt - +a.createdAt,
      old: (a, b) => +a.createdAt - +b.createdAt,
      rating: (a, b) => b.ratingAvg - a.ratingAvg,
    };
    rows.sort(cmp[sort]);

    const pageSize = q.pageSize ?? 12, page = q.page ?? 1;
    return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }

  async product(slug: string) {
    const p = await this.db.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: {
        ...listInclude,
        images: { orderBy: { position: 'asc' } },
        reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, name: true, city: true, rating: true, text: true, isVerified: true, createdAt: true } },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    const related = await this.db.product.findMany({
      where: { status: 'ACTIVE', id: { not: p.id }, collections: { some: { slug: { in: p.collections.filter(c => c.kind === 'CATEGORY').map(c => c.slug) } } } },
      include: listInclude, take: 8, orderBy: { sortOrder: 'asc' },
    });
    const { reviews, images, ...rest } = p;
    return {
      ...toCard(p),
      description: rest.description, ingredients: rest.ingredients, highlights: rest.highlights, contains: rest.contains,
      shelfLife: rest.shelfLife, limitedNote: rest.limitedNote, seoTitle: rest.seoTitle, seoDescription: rest.seoDescription,
      images: images.map(i => ({ url: assetUrl(i.url), alt: i.alt })),
      reviews,
      related: related.map(toCard),
    };
  }

  async settings() {
    const rows = await this.db.setting.findMany();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
}

@Controller()
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get('collections') collections() { return this.catalog.collections(); }
  @Get('products') products(@Query() q: ProductQuery) { return this.catalog.products(q); }
  @Get('products/:slug') product(@Param('slug') slug: string) { return this.catalog.product(slug); }
  @Get('settings') settings() { return this.catalog.settings(); }
}

@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
