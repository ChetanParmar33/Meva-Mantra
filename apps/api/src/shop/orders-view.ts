import type { Prisma } from '../generated/prisma/client.js';

type SummaryRow = Prisma.OrderGetPayload<{ include: { items: { include: { product: { select: { slug: true } } } } } }>;

export const orderSummary = (o: SummaryRow) => ({
  number: o.number, status: o.status, paymentMode: o.paymentMode, totalPaise: o.totalPaise, createdAt: o.createdAt,
  itemCount: o.items.reduce((a, i) => a + i.qty, 0),
  items: o.items.map(i => ({ title: i.title, variantTitle: i.variantTitle, qty: i.qty, productSlug: i.product?.slug ?? null })),
});

const include = {
  items: { include: { product: { select: { slug: true } } } },
  events: { orderBy: { createdAt: 'asc' } },
  shipment: true,
  payments: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.OrderInclude;
type DetailRow = Prisma.OrderGetPayload<{ include: typeof include }>;

export const orderDetail = {
  include,
  map: (o: DetailRow) => ({
    ...orderSummary(o),
    shippingAddress: o.shippingAddress,
    subtotalPaise: o.subtotalPaise, mrpSavingsPaise: o.mrpSavingsPaise, couponCode: o.couponCode, couponDiscountPaise: o.couponDiscountPaise,
    prepaidDiscountPaise: o.prepaidDiscountPaise, shippingPaise: o.shippingPaise, giftWrapPaise: o.giftWrapPaise,
    giftMessage: o.giftMessage, note: o.note,
    items: o.items.map(i => ({ title: i.title, variantTitle: i.variantTitle, sku: i.sku, qty: i.qty, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.lineTotalPaise, productSlug: i.product?.slug ?? null })),
    events: o.events.map(e => ({ status: e.status, note: e.note, createdAt: e.createdAt })),
    shipment: o.shipment && { courier: o.shipment.courier, awb: o.shipment.awb, trackingUrl: o.shipment.trackingUrl, shippedAt: o.shipment.shippedAt, deliveredAt: o.shipment.deliveredAt },
    payment: o.payments[0] ? { provider: o.payments[0].provider, status: o.payments[0].status, method: o.payments[0].method } : null,
  }),
};
