# Meva Mantra: dry fruit store

*Roz ki muththi, sehat ki kunji.* Full-stack D2C store: website, admin panel and API. Sab free / open-source.

| App | Tech | Local URL |
|---|---|---|
| Website | Next.js 16 (App Router, Cache Components) | http://localhost:3100 |
| Admin panel | Next.js 16 + Tailwind 4 | http://localhost:3101 |
| API | NestJS 12 (TypeScript, ESM) + Prisma 7 | http://localhost:4100/api |
| Database | PostgreSQL 16 (Docker) | `127.0.0.1:5440` |

## Setup (pehli baar)

Zaroorat: Node 24+, pnpm, Docker.

```bash
pnpm install                                  # also generates the Prisma client
cp apps/api/.env.example apps/api/.env        # set JWT_SECRET (long random string) + ADMIN_EMAIL/ADMIN_PASSWORD
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm db:up                                    # PostgreSQL in Docker
cd apps/api && pnpm exec prisma migrate deploy && cd ../..
pnpm seed                                     # 22 products, collections, coupons, FAQs, policies, blog, first admin
```

## Roz ka kaam

```bash
pnpm db:up      # database (agar band ho)
pnpm dev        # API + website + admin (watch mode)
pnpm test:api   # end-to-end API smoke test (API chalni chahiye)
pnpm db:backup  # backups/*.sql.gz
```

Local dev mein:
- **OTP** screen par dikhta hai (SMS/email ki zaroorat nahi).
- **Online payment** "demo" mode mein chalta hai jab tak Razorpay test keys na daalo.
- **Emails** API console par print hote hain jab tak `SMTP_URL` na ho.
- Admin login `.env` ke `ADMIN_EMAIL` / `ADMIN_PASSWORD` se (seed karta hai). Pehli baar ke baad Admin → Settings se password badlo.

## Features

**Website:** home (hero slider, categories, bestseller tabs, combo spotlight with timer, story, comparison, process, gifting, reviews, journal, FAQ, newsletter), shop (collections, search, filters, sort, pagination), product (gallery + zoom, sizes/colours, pincode delivery estimate, offers, accordions, frequently bought together, reviews + write review, related, recently viewed, sticky add-to-cart), cart drawer + cart page (coupons, gift wrap, free-shipping bar), 3-step checkout (OTP login → address with pincode autofill → UPI/card/netbanking via Razorpay or COD, 5% prepaid discount), account (orders, addresses, profile), wishlist, track order, about, contact + bulk enquiry, FAQ, policies, blog, SEO (metadata, sitemap, robots, JSON-LD), mobile-friendly, WhatsApp click-to-chat.

**Admin:** dashboard (revenue, orders to ship, pending reviews, enquiries, out of stock), orders (filters, search, detail, status flow, courier/AWB, notes, printable invoice), products (stock table, create, edit all fields, sizes, photos with alt text + ordering, artwork colours), coupons, review moderation, enquiries, newsletter subscribers (CSV), settings (brand, prepaid %, shipping, gift wrap, change password).

**API:** server-side pricing (`/cart/quote`), atomic stock reservation, auto-release of unpaid orders after 30 min, coupon rules (dates, minimum, usage limit, first order), Razorpay signature verification, rate limits, httpOnly cookie sessions (separate admin/customer audiences), image upload with file-signature check. Contract: [`docs/API.md`](docs/API.md).

## Structure

```
apps/api      NestJS API · prisma/schema.prisma · src/{catalog,shop,customer,content,admin,common} · test/smoke.mjs
apps/web      Website (src/app routes, src/components, src/lib/art.ts = generated product artwork)
apps/admin    Admin panel
docs/         API.md (endpoints), DEPLOY.md (going live checklist + free hosting)
```

Money is stored in **paise** (₹679 = 67900).

## Before going live

See [`docs/DEPLOY.md`](docs/DEPLOY.md). Short version:
- Replace placeholder contact details, demo ratings/reviews and stats.
- Set production env (`NODE_ENV=production`, strong `JWT_SECRET`, real domains in `CORS_ORIGINS`).
- Add SMTP (free Gmail) for email OTP and Razorpay keys.
- Final-check the policies against your real business rules.
