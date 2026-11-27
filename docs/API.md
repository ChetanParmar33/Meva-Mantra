# Meva Mantra API contract

Base URL: `http://localhost:4100/api` (env `API_URL`, server side). Browsers call `/api` on the website/admin host (`NEXT_PUBLIC_API_URL=/api`), which `next.config.ts` rewrites to the API; client IP reaches the API via `X-Forwarded-For` from the front proxy.
All browser calls use `credentials: 'include'` (sessions are httpOnly cookies). Bodies are JSON.
**Money is always in paise** (`₹679 = 67900`). Errors: `{ statusCode, message: string | string[] }`.
Uploaded product images are served from `/uploads/<file>` (relative when `PUBLIC_URL` is empty; the website/admin proxy `/uploads` to the API).

## Public catalogue

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ ok, time }` |
| GET | `/settings` | `{ brand:{name,tagline,phone,whatsapp,email,address,hours}, prepaidDiscountPct, freeShippingAbovePaise, shippingFeePaise, giftWrapPaise }` |
| GET | `/collections` | `[{ slug, title, description, blurb, kind:'CATEGORY'\|'COLLECTION', _count:{products} }]`. Only collections with at least one live product. |
| GET | `/products?collection=&q=&sort=&availability=in\|out&minPrice=&maxPrice=&page=&pageSize=` | `{ items: ProductCard[], total, page, pageSize }` (prices in query are **rupees**) |
| GET | `/products/:slug` | `ProductDetail` (404 if missing) |
| GET | `/pincode/:pin` | `{ pincode, serviceable, state, city, etaMinDays, etaMaxDays, cod }` (400 if not 6 digits) |

`sort`: `featured | relevance | best | az | za | low | high | new | old | rating`

```ts
type ProductCard = {
  id; slug; title; type: 'JAR'|'BOX'|'COMBO'|'HAMPER'|'PURSE'|'CARD'; short; optionName; createdAt;
  art: { label: string; accent: string; bg: string; jars?: string[]; withBox?: boolean; window?: boolean } | null;
  ratingAvg: number; ratingCount: number;
  collections: { slug; title; kind }[];
  image: string | null;            // first uploaded photo URL, else null → render SVG art
  priceFromPaise; mrpPaise: number | null; hasPriceRange: boolean; inStock: boolean;
  variants: { id; title; pricePaise; mrpPaise: number|null; swatch: string|null; inStock: boolean }[];
};
type ProductDetail = ProductCard & {
  description; ingredients: string[]; highlights: string[]; contains: string[];
  shelfLife: string|null; limitedNote: string|null; seoTitle; seoDescription;
  images: { url; alt }[];
  reviews: { id; name; city; rating; text; isVerified; createdAt }[];   // approved only
  related: ProductCard[];
};
```

## Content

| Method | Path | Body / response |
|---|---|---|
| GET | `/faqs` | `[{ id, category, question, answer }]` |
| GET | `/policies` | `[{ slug, title }]` |
| GET | `/policies/:slug` | `{ slug, title, sections:[{heading, body}], updatedAt }` |
| GET | `/posts` | `[{ slug, title, excerpt, tag, coverSlug, readMins, publishedAt }]` |
| GET | `/posts/:slug` | `{ ...above, body }` (markdown-ish: paragraphs split by blank lines) |
| POST | `/products/:slug/reviews` | body `{ name, city?, rating 1-5, text }` → `{ ok, message }` (saved as PENDING; verified if logged-in buyer) |
| POST | `/enquiries` | body `{ type:'CONTACT'\|'BULK', name, email, phone(10 digits), message, company?, topic?, quantity?, occasion? }` → `{ ok }` |
| POST | `/newsletter` | body `{ email }` → `{ ok }` (idempotent) |

## Customer auth (OTP, cookie `mm_user`, 30 days)

| Method | Path | Body / response |
|---|---|---|
| POST | `/auth/otp/request` | `{ target }` (10-digit mobile or email) → `{ sent:true, channel:'sms'\|'email', devCode?: '123456' }` — `devCode` only in local dev. 429 if requested again within 30 s or >5/hour |
| POST | `/auth/otp/verify` | `{ target, code }` → sets cookie, `{ user }`. 400 wrong/expired code (max 5 tries per code) |
| GET | `/auth/me` | `User` or 401 |
| POST | `/auth/logout` | `{ ok }` |

`User = { id, phone, email, name, dob, marketingOptIn }`

## Account (requires `mm_user`)

| Method | Path | Body / response |
|---|---|---|
| PATCH | `/account/profile` | `{ name?, email?, phone?, dob?: 'YYYY-MM-DD', marketingOptIn? }` → `User` |
| GET | `/account/addresses` | `Address[]` |
| POST | `/account/addresses` | `AddressInput` → `Address` |
| DELETE | `/account/addresses/:id` | `{ ok }` |
| GET | `/account/orders` | `OrderSummary[]` (newest first) |
| GET | `/account/orders/:number` | `OrderDetail` |

```ts
type AddressInput = { name; phone /*10 digits*/; line1; landmark?; city; state; pincode /*6 digits*/; type?: 'HOME'|'WORK'|'OTHER' };
type Address = AddressInput & { id; isDefault; createdAt };
type OrderSummary = { number; status; paymentMode; totalPaise; createdAt; itemCount; items: { title; variantTitle; qty; productSlug|null }[] };
type OrderDetail = OrderSummary & {
  shippingAddress: AddressInput & { email? }; subtotalPaise; mrpSavingsPaise; couponCode; couponDiscountPaise;
  prepaidDiscountPaise; shippingPaise; giftWrapPaise; giftMessage; note;
  items: { title; variantTitle; sku; qty; unitPricePaise; lineTotalPaise; productSlug|null }[];
  events: { status; note; createdAt }[];
  shipment: { courier; awb; trackingUrl; shippedAt; deliveredAt } | null;
  payment: { provider; status; method } | null;
};
type OrderStatus = 'PENDING_PAYMENT'|'CONFIRMED'|'PACKED'|'SHIPPED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'CANCELLED'|'RETURNED';
```

## Cart & checkout

Cart lives in the browser (localStorage: `[{ variantId, qty }]`). The server is the source of truth for prices.

| Method | Path | Body / response |
|---|---|---|
| POST | `/cart/quote` | `QuoteInput` → `Quote` (no login needed) |
| POST | `/checkout` | `QuoteInput & { address: AddressInput & { email }, giftMessage?, note?, saveAddress? }` — **requires `mm_user`** → `{ order:{ number, status, totalPaise }, payment: PaymentStart \| null }` (null for COD) |
| POST | `/payments/razorpay/verify` | `{ orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature }` → `{ ok, order:{number,status} }` |
| POST | `/payments/razorpay/webhook` | Razorpay server-to-server events (`payment.captured`, `order.paid`, `payment.failed`). Header `X-Razorpay-Signature` = HMAC-SHA256(raw body, `RAZORPAY_WEBHOOK_SECRET`). Idempotent. A payment that arrives after the order was auto-cancelled is recorded as an order event for refund. |
| POST | `/payments/demo/confirm` | `{ orderNumber }` → `{ ok, order }` (only when Razorpay keys are not configured and not in production) |
| GET | `/orders/track?number=MM10001&phone=9876543210` | `TrackInfo` or 404 |

```ts
type QuoteInput = { items: { variantId: string; qty: number }[]; couponCode?: string; paymentMode?: 'PREPAID'|'COD'; giftWrap?: boolean };
type Quote = {
  lines: { variantId; productSlug; productTitle; variantTitle; art; image; unitPricePaise; mrpPaise; qty; lineTotalPaise; inStock: boolean; maxQty: number }[];
  subtotalPaise; mrpSavingsPaise;
  coupon: { code; valid: boolean; message: string; discountPaise } | null;
  shippingPaise; freeShippingAbovePaise; giftWrapPaise; prepaidDiscountPct; prepaidDiscountPaise; totalPaise;
  issues: string[];   // e.g. "Diwali Gift Hamper is sold out" — checkout refuses while non-empty
};
type PaymentStart =
  | { provider: 'razorpay'; keyId; razorpayOrderId; amountPaise; name; email; phone }   // open Razorpay Checkout (https://checkout.razorpay.com/v1/checkout.js)
  | { provider: 'demo'; amountPaise };                                                // show a "Pay (demo)" button → POST /payments/demo/confirm
type TrackInfo = { number; status; createdAt; city; pincode; itemCount; events:{status;note;createdAt}[]; shipment: {courier;awb;trackingUrl;shippedAt;deliveredAt}|null };
```

Public POSTs (`/enquiries`, `/newsletter`, `/products/:slug/reviews`, `/auth/otp/request`) are rate-limited per IP (10 per 10 min in production) → 429.

Rules: shipping free when subtotal ≥ `freeShippingAbovePaise`, else `shippingFeePaise`. Prepaid discount % applies to (subtotal − coupon) for `PREPAID`. Gift wrap adds `giftWrapPaise`. Stock is reserved when the order is created; cancelling restocks.

## Admin (cookie `mm_admin`)

| Method | Path | Notes |
|---|---|---|
| POST | `/admin/auth/login` · `/admin/auth/logout` · GET `/admin/auth/me` | existing |
| POST | `/admin/auth/password` | `{ currentPassword, newPassword }` (≥10 chars, a letter and a number) → `{ ok }`; 400 with a message if current is wrong |
| GET | `/admin/stats` | `{ products, active, outOfStock (ACTIVE products only), orders, newEnquiries, pendingReviews, revenuePaise, todayOrders, ordersToShip }` |
| GET | `/admin/products` | list with variants (existing) |
| GET | `/admin/products/:id` | full product incl. images, variants, collection slugs |
| POST | `/admin/products` | `{ slug, title, type, short, description, ingredients[], highlights[], contains[], shelfLife?, optionName?, collections: string[], status?: 'ACTIVE'\|'COMING_SOON'\|'DRAFT'\|'ARCHIVED' (default DRAFT; only ACTIVE is public), variants:[{title, sku, pricePaise, mrpPaise?, stock, swatch?}] }` |
| PATCH | `/admin/products/:id` | any of the fields above except variants; `collections` replaces the set; `art: { label, accent, bg }` (hex) sets the generated-artwork colours |
| POST | `/admin/products/:id/variants` | `{ title, sku, pricePaise, mrpPaise?, stock, swatch? }` |
| PATCH | `/admin/variants/:id` | `{ title?, pricePaise?, mrpPaise?, stock?, swatch? }` (existing, extended) |
| DELETE | `/admin/variants/:id` | refuses the last variant |
| POST | `/admin/products/:id/images` | multipart `file` (jpg/png/webp ≤ 3 MB) → `{ id, url, alt, position }` |
| PATCH | `/admin/images/:id` | `{ alt?, position? }` (position moves the image; 0 = main photo) |
| DELETE | `/admin/images/:id` | |
| GET | `/admin/collections` | `[{ id, slug, title, kind }]` |
| GET | `/admin/orders?status=&q=&page=` | `{ items: (OrderSummary & { id, customerName, phone, city })[], total, page, pageSize, counts: { [status]: number } }` |
| GET | `/admin/orders/:number` | `OrderDetail & { phone, email, user }` |
| PATCH | `/admin/orders/:number` | `{ status?, note?, courier?, awb?, trackingUrl? }` — CANCELLED/RETURNED restock; SHIPPED sets shippedAt; DELIVERED sets deliveredAt; every change adds an event |
| GET/POST | `/admin/coupons` | `Coupon[]` / create `{ code, description, type:'PERCENT'\|'FLAT', value, minOrderPaise, maxDiscountPaise?, startsAt?, endsAt?, usageLimit?, firstOrderOnly?, isActive? }` |
| PATCH/DELETE | `/admin/coupons/:id` | |
| GET | `/admin/reviews?status=PENDING\|APPROVED\|REJECTED` | `[{ id, name, city, rating, text, status, isVerified, createdAt, product:{ slug, title } }]` |
| PATCH | `/admin/reviews/:id` | `{ status }` (product rating is recomputed from approved reviews) |
| GET | `/admin/enquiries?type=&status=` · PATCH `/admin/enquiries/:id` `{ status }` | |
| GET | `/admin/subscribers` | `[{ id, email, createdAt }]` |
| GET/PUT | `/admin/settings` | same shape as public `/settings` |
