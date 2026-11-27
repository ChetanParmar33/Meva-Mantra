// Browser-side API calls (sessions are httpOnly cookies on the API origin).
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...rest,
      method: rest.method ?? (json !== undefined ? 'POST' : 'GET'),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, 'Network error. Please check your connection and try again.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, msg || `Something went wrong (${res.status})`);
  }
  return body as T;
}

export type User = { id: string; phone: string | null; email: string | null; name: string | null; dob: string | null; marketingOptIn: boolean };
export type Address = { id: string; name: string; phone: string; line1: string; landmark: string | null; city: string; state: string; pincode: string; type: 'HOME' | 'WORK' | 'OTHER'; isDefault: boolean };
export type QuoteLine = { variantId: string; productSlug: string; productTitle: string; variantTitle: string; productType: string; art: import('./art').ArtColors | null; image: string | null; unitPricePaise: number; mrpPaise: number | null; qty: number; lineTotalPaise: number; inStock: boolean; maxQty: number };
export type Quote = {
  lines: QuoteLine[]; subtotalPaise: number; mrpSavingsPaise: number;
  coupon: { code: string; valid: boolean; message: string; discountPaise: number } | null;
  shippingPaise: number; freeShippingAbovePaise: number; giftWrapPaise: number; prepaidDiscountPct: number; prepaidDiscountPaise: number; totalPaise: number;
  issues: string[];
};
export type OrderEvent = { status: string; note: string | null; createdAt: string };
export type Shipment = { courier: string | null; awb: string | null; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null } | null;
export type OrderSummary = { number: string; status: string; paymentMode: 'PREPAID' | 'COD'; totalPaise: number; createdAt: string; itemCount: number; items: { title: string; variantTitle: string; qty: number; productSlug: string | null }[] };
export type OrderDetail = Omit<OrderSummary, 'items'> & {
  shippingAddress: { name: string; phone: string; line1: string; landmark?: string; city: string; state: string; pincode: string; email?: string };
  subtotalPaise: number; mrpSavingsPaise: number; couponCode: string | null; couponDiscountPaise: number; prepaidDiscountPaise: number; shippingPaise: number; giftWrapPaise: number;
  giftMessage: string | null; note: string | null;
  items: { title: string; variantTitle: string; sku: string; qty: number; unitPricePaise: number; lineTotalPaise: number; productSlug: string | null }[];
  events: OrderEvent[]; shipment: Shipment; payment: { provider: string; status: string; method: string | null } | null;
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment', CONFIRMED: 'Order confirmed', PACKED: 'Packed fresh', SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', RETURNED: 'Returned',
};
export const STATUS_FLOW = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
