import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import type { Coupon } from '../generated/prisma/client.js';
import type { PrismaService } from './prisma.service.js';
import { assetUrl } from './session.js';
import { getSettings } from './settings.js';

export const MAX_QTY = 20;

export class CartItemInput {
  @IsString() @MaxLength(40) variantId!: string;
  @IsInt() @Min(1) @Max(MAX_QTY) qty!: number;
}

export class QuoteInput {
  @ValidateNested({ each: true }) @Type(() => CartItemInput) @ArrayMinSize(1) @ArrayMaxSize(50) items!: CartItemInput[];
  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
  @IsOptional() @IsIn(['PREPAID', 'COD']) paymentMode?: 'PREPAID' | 'COD';
  @IsOptional() @IsBoolean() giftWrap?: boolean;
}

/** Discount for a coupon on a subtotal, or a reason it doesn't apply. */
export async function evaluateCoupon(db: PrismaService, coupon: Coupon | null, code: string, subtotal: number, userId?: string) {
  const no = (message: string) => ({ code, valid: false, message, discountPaise: 0 });
  if (!coupon || !coupon.isActive) return no('This coupon code is not valid.');
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return no('This coupon is not active yet.');
  if (coupon.endsAt && coupon.endsAt < now) return no('This coupon has expired.');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return no('This coupon has been fully used.');
  if (subtotal < coupon.minOrderPaise) return no(`Add items worth ₹${Math.ceil((coupon.minOrderPaise - subtotal) / 100)} more to use ${coupon.code}.`);
  if (coupon.firstOrderOnly && userId && (await db.order.count({ where: { userId, status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } } })) > 0) {
    return no(`${coupon.code} is only for your first order.`);
  }
  let discount = coupon.type === 'PERCENT' ? Math.floor((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
  if (coupon.maxDiscountPaise != null) discount = Math.min(discount, coupon.maxDiscountPaise);
  return { code: coupon.code, valid: true, message: coupon.firstOrderOnly && !userId ? `${coupon.description} (checked again at checkout)` : coupon.description, discountPaise: discount };
}

/** Server-side source of truth for every price shown in cart and checkout. */
export async function quote(db: PrismaService, input: QuoteInput, userId?: string) {
  const settings = await getSettings(db);
  // merge duplicate lines
  const wanted = new Map<string, number>();
  for (const it of input.items) wanted.set(it.variantId, Math.min(MAX_QTY, (wanted.get(it.variantId) ?? 0) + it.qty));

  const variants = await db.productVariant.findMany({
    where: { id: { in: [...wanted.keys()] } },
    include: { product: { select: { slug: true, title: true, status: true, art: true, type: true, images: { orderBy: { position: 'asc' }, take: 1 } } } },
  });
  const issues: string[] = [];
  const lines = [];
  for (const [variantId, qty] of wanted) {
    const v = variants.find(x => x.id === variantId);
    if (!v || v.product.status !== 'ACTIVE') { issues.push('An item in your cart is no longer available.'); continue; }
    const inStock = v.stock >= qty;
    if (!inStock) issues.push(v.stock > 0 ? `Only ${v.stock} left of ${v.product.title} (${v.title}).` : `${v.product.title} (${v.title}) is sold out.`);
    lines.push({
      variantId, productSlug: v.product.slug, productTitle: v.product.title, variantTitle: v.title, productType: v.product.type,
      art: v.product.art, image: v.product.images[0] ? assetUrl(v.product.images[0].url) : null,
      unitPricePaise: v.pricePaise, mrpPaise: v.mrpPaise, qty, lineTotalPaise: v.pricePaise * qty,
      inStock, maxQty: Math.min(MAX_QTY, v.stock),
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.lineTotalPaise, 0);
  const mrpSavings = lines.reduce((a, l) => a + (l.mrpPaise && l.mrpPaise > l.unitPricePaise ? (l.mrpPaise - l.unitPricePaise) * l.qty : 0), 0);
  const code = input.couponCode?.trim().toUpperCase();
  const coupon = code ? await evaluateCoupon(db, await db.coupon.findUnique({ where: { code } }), code, subtotal, userId) : null;
  const couponDiscount = coupon?.valid ? coupon.discountPaise : 0;
  const shipping = subtotal === 0 || subtotal >= settings.freeShippingAbovePaise ? 0 : settings.shippingFeePaise;
  const giftWrap = input.giftWrap && subtotal > 0 ? settings.giftWrapPaise : 0;
  const prepaid = input.paymentMode === 'PREPAID' ? Math.round(((subtotal - couponDiscount) * settings.prepaidDiscountPct) / 100) : 0;

  return {
    lines, subtotalPaise: subtotal, mrpSavingsPaise: mrpSavings, coupon,
    shippingPaise: shipping, freeShippingAbovePaise: settings.freeShippingAbovePaise,
    giftWrapPaise: giftWrap, prepaidDiscountPct: settings.prepaidDiscountPct, prepaidDiscountPaise: prepaid,
    totalPaise: subtotal - couponDiscount - prepaid + shipping + giftWrap,
    issues,
  };
}
export type Quote = Awaited<ReturnType<typeof quote>>;
