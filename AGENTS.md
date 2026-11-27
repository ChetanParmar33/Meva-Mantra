# Meva Mantra: project brain (Gooku)

> **Gooku** is this project's AI agent, and this file is its memory. Every AI working here (Claude Code, Codex, Cursor, Copilot, …) reads this first.
> - The user says **"start gooku"** → follow the boot steps in [`.claude/skills/gooku/SKILL.md`](.claude/skills/gooku/SKILL.md).
> - **Learning loop:** after every task, update §10–§12 below. Nothing else carries over between AI sessions, so this file is how Gooku learns.

## 1. What this is

D2C dry fruit store **Meva Mantra**, tagline *"Roz ki muththi, sehat ki kunji"*. Green + Gold theme: `#1F4D3A` green, `#C9A227` gold, `#FBF7EF` cream.
25 products: **7 live** (Dry Fruit Mix, Badam, Kaju, Kishmish, Snack Mix, Dry Fruit Khajur Pak, Dry Fruit Mix + Khajur Pak Combo) and **18 coming soon** (shown only in admin). 11 collections. **The website is the priority**; the admin panel can stay basic.

## 2. Owner preferences (always follow)

- Answer in the language of whoever is asking. The owner writes **Hinglish**: reply in Hinglish (Roman script), short and simple.
- **Free / open-source first.** A paid service only with the owner's OK (SMS OTP, Shiprocket and the WhatsApp API were skipped on purpose).
- **Local-first.** Never deploy, host, publish or upload anything unless the owner asks. GitHub is the only remote.
- **Git:** commit or push only when asked. Push only to `github.com/ChetanParmar33/Meva-Mantra` as the **ChetanParmar33** account (§9).
- **Destructive DB actions** (reset, drop, mass delete) need the owner's explicit OK every time, and a `pnpm db:backup` first.
- Don't copy any other brand's name, logo, photos or text. No generic stock photos as product photos (owner rejected them); wait for the owner's own photos.
- Small choices: pick the sensible default and say so. Big or irreversible choices: ask first.

## 3. Stack and ports

| Part | Tech | Where | Port |
|---|---|---|---|
| Website | Next.js 16 (App Router, `cacheComponents`, `partialPrefetching`) | `apps/web` | 3100 |
| Admin | Next.js 16 + Tailwind 4 | `apps/admin` | 3101 |
| API | NestJS 12 (ESM) + Prisma 7.10 (`@prisma/adapter-pg`) | `apps/api` | 4100, prefix `/api` |
| Database | PostgreSQL 16 in Docker, container `mevamantra-db` | `docker-compose.yml` | 127.0.0.1:5440 |

pnpm workspace (`apps/*`), Node 24+. **Money is stored in paise everywhere** (₹679 = 67900).

## 4. Commands (from repo root)

| Command | What it does |
|---|---|
| `pnpm install` | Install everything (also runs `prisma generate`) |
| `pnpm db:up` / `pnpm db:down` | Start / stop PostgreSQL |
| `pnpm dev` | API + website + admin in watch mode (`dev:api`, `dev:web`, `dev:admin` for one) |
| `pnpm seed` | Seed catalogue, coupons, FAQs, policies, blog, first admin |
| `pnpm test:api` | End-to-end API smoke test (API must run; creates test data in the DB) |
| `pnpm db:backup` | `backups/mevamantra-<date>.sql.gz` |
| `pnpm build` | Production build of all three apps |
| `cd apps/api && pnpm exec prisma migrate dev --name <x>` | New migration (`migrate status`, `migrate deploy`, `pnpm db:studio`) |

Local dev: admin login comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/api/.env`. OTP is shown on screen. Payments run in demo mode without Razorpay keys. Emails print to the API console without `SMTP_URL`.

## 5. Code map

```
apps/api/prisma/schema.prisma     all models · migrations/ · seed-data.json (catalogue source)
apps/api/src/
  main.ts                         /api prefix, CORS, ValidationPipe, /uploads static, trust proxy, security headers, rate limit
  app.module.ts                   global JwtModule, modules, GET /api/health
  seed.ts                         seed script (run via `pnpm seed`)
  common/                         prisma.service, password (scrypt), session (cookies, assetUrl), settings,
                                  mailer, pincode, pricing (quote + coupons), rate-limit
  catalog/catalog.ts              public: collections, products, product detail, settings
  customer/auth.ts, account.ts    OTP login, profile, addresses, my orders
  shop/shop.ts, orders-view.ts    pincode, cart/quote, checkout, Razorpay verify + webhook, demo pay, track, cancel,
                                  StaleOrderReleaser
  content/content.ts              FAQs, policies, blog, reviews, enquiries, newsletter
  admin/admin.ts                  admin auth, products, variants, images, artwork colours
  admin/admin-ops.ts              stats, orders, coupons, reviews, enquiries, subscribers, settings
apps/api/test/smoke.mjs           end-to-end API test
apps/web/src/
  app/                            home, shop, products/[slug], cart, checkout, account, wishlist, track-order, about,
                                  contact, faq, policies/[slug], blog/[slug], art/[...path] (SVG art), sitemap, robots
  app/globals.css                 all styles (mobile: @media max-width 640px and 360px)
  proxy.ts                        real HTTP 404 for unknown product/blog/policy slugs
  lib/api.ts                      server fetch with 'use cache' · lib/client.ts browser fetch to /api · lib/art.ts artwork
  components/                     product.tsx, product-view.tsx, shop-client.tsx, store.tsx (cart/wishlist state),
                                  chrome.tsx (header, footer, cart drawer), checkout.tsx, account.tsx, ui.tsx, forms.tsx
apps/admin/src/
  app/(dash)/                     dashboard, orders, products, coupons, reviews, enquiries, subscribers, settings
  app/login/                      admin login
  components/                     product-edit.tsx, product-form.tsx, variant-row.tsx, order-detail.tsx, ui.tsx
  lib/api.ts                      fetch helper, STORE_URL
docs/                             API.md (endpoint contract), DEPLOY.md (go-live checklist), PRODUCT_PHOTOS.md (image guide: how many images per product, sizes, AI prompts)
```

## 6. How the system works

- **Browser never calls the API directly.** Website and admin rewrite `/api/*` and `/uploads/*` to the API (`next.config.ts`). `NEXT_PUBLIC_API_URL=/api`, server side `API_URL=http://localhost:4100/api`. That is why it works on phones over Wi-Fi (`allowedDevOrigins` 192.168.\*, 10.\*).
- **Sessions:** httpOnly cookies. `mm_user` (customer, path `/api`, 30 days) and `mm_admin` (path `/api/admin`, 12 h). One `JWT_SECRET`, separated by audience.
- **OTP:** hashed, 10 min validity, rate limited. Dev returns the code to the screen.
- **Prices are computed only on the server** (`/cart/quote`): coupons (dates, minimum order, usage limit, first order only), 5% prepaid discount, free shipping from ₹500 (else ₹49), gift wrap ₹49. Values live in Settings.
- **Checkout:** stock reserved atomically, coupon usage counted atomically, order numbers from Postgres sequence `order_number_seq` (MM10001…). Unpaid orders auto-cancel after 30 min and release stock. A Razorpay payment that arrives after auto-cancel is flagged for refund.
- **Razorpay:** order via REST, HMAC signature check, webhook (raw body HMAC with `RAZORPAY_WEBHOOK_SECRET`). No keys → demo payment (dev only).
- **Product images:** generated SVG art at `/art/p/<slug>/<view>-<variant>.svg` (cacheable). An uploaded photo (admin, ≤3 MB JPG/PNG/WebP, file signature checked, stored in `apps/api/uploads/`, not in git) replaces **only the main image (view 0)**. Gallery views 1–3 stay artwork; no per-colour photos yet.
- Store catalogue pages are cached about 60 s, so admin edits show on the store within about a minute.
- Stock counts are never exposed publicly.
- **Product status:** only `ACTIVE` (admin label "Live") is public. `COMING_SOON`, `DRAFT`, `ARCHIVED` are hidden everywhere on the store (API filters `status: 'ACTIVE'` in catalogue, detail, related, reviews, quote) and 404 by URL; collections with no live product are hidden too. To launch a coming-soon product: Admin → Products → status "Live".
- Artwork for a hidden product is not served. `<Art slug={[preferred, fallback…]} />` and the hero scenes in `lib/art.ts` take slugs in order of preference and draw the first live one, so hiding products never leaves empty boxes. Blog covers (`Post.coverSlug`) must point at live products.
- Seed (`seed-data.json`) holds each product's `status` (default active); re-running `pnpm seed` resets catalogue fields, prices and statuses to the seed values.

## 7. Gotchas (learned the hard way)

- **Next 16:** read the matching guide in `apps/<app>/node_modules/next/dist/docs/` before writing Next code. With `cacheComponents`, uncached data must sit inside `<Suspense>` or a `'use cache'` function (`cacheLife`/`cacheTag`). Layouts must always render `children` (no early return). Don't `await params` at the top level of a page; do it inside the Suspense'd component. `LayoutProps`/`PageProps` types need `next typegen`. A real 404 status needs `src/proxy.ts` (streamed pages return 200).
- `next dev` re-adds the `nextjs-agent-rules` block in `apps/web/AGENTS.md` and `apps/admin/AGENTS.md`. Leave it.
- **Admin Tailwind v4:** custom classes need `@utility` (no `@apply` of custom classes). Layout files can't export hooks or contexts (they live in `components/admin-context.tsx`).
- **Nest 12 is ESM:** relative imports end in `.js`; no `__dirname` (use `import.meta.dirname`). Prisma client is generated into `apps/api/src/generated/prisma` (gitignored). The seed runs through `nest build` (`pnpm seed`), not with ts directly.
- `prisma migrate reset` is blocked for AI agents by Prisma's consent guard. Only with the owner's explicit OK, after a backup.
- pnpm 12 build scripts are allowed in `pnpm-workspace.yaml` (`allowBuilds`).
- **Processes:** stop a server by the PID on its port (`ss -ltnp | grep :4100`). Never `pkill -f` (it can kill your own shell). Never start a second `pnpm dev`: duplicate Nest watchers give `EADDRINUSE :4100`.
- **Behind a proxy:** API trusts the loopback proxy; the front proxy (Caddy/Nginx) must set `X-Forwarded-For`, or rate limits see one IP.
- The machine's disk is nearly full: avoid new dependencies and big downloads.

## 8. Verify before saying "done"

- API change → `pnpm test:api` (local DB only, never production).
- TypeScript change → build the app you touched (`pnpm --filter web build`, `--filter admin`, `--filter api`) or `pnpm build`; must exit 0.
- UI change → check desktop 1440 px and mobile 390 px, no console errors (Python Playwright with system Chrome: `chromium.launch(channel='chrome')`).
- Schema change → `prisma migrate dev --name …`, then update the seed and `docs/API.md` if the contract changed.
- Report honestly: what was tested, what failed, what was skipped.

## 9. Git

- Branch `main`. Commit message: one short summary line (e.g. "Mobile polish for the website").
- Never commit `.env*` (except `.env.example`), `node_modules`, `.next`, `dist`, `apps/api/uploads/`, `backups/`, the generated Prisma client.
- Push as ChetanParmar33: `gh auth status` must show **ChetanParmar33** active, then
  `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`

## 10. Status (update after every task)

_Last updated: 2026-11-27_

- **Done:** website, admin, API, docs; mobile polish; same-origin `/api` proxy (phones on Wi-Fi); Gooku agent; launch list (7 live, 18 coming soon, new Badam/Kaju/Kishmish in a new "Dry Fruits" category). Local DB = clean seed (0 orders, next order MM10001).
- **Needs owner input:** confirm Badam/Kaju/Kishmish prices (placeholders, no MRP), descriptions and shelf life; product photos (`docs/PRODUCT_PHOTOS.md`, launch 7 first); real contact details (Admin → Settings); remove demo reviews, ratings and stats; final policies; FSSAI (and GST) number on the site; final prices and stock.
- **Go-live:** domain, server, Razorpay live keys + webhook, SMTP email, production env, daily backups (`docs/DEPLOY.md`).
- **Optional:** multi-photo gallery and per-colour photos; Google Analytics + Search Console; admin mobile polish.
- **Skipped on purpose (paid):** SMS OTP, Shiprocket, WhatsApp Business API.

## 11. Decisions (newest first, one dated line each)

- 2026-11-27: Launch with 7 products (Dry Fruit Mix, Badam, Kaju, Kishmish, Snack Mix, Khajur Pak, Mix + Khajur Pak Combo); the other 18 are COMING_SOON: hidden from the store, visible in admin with a "Coming soon" tag.
- 2026-11-27: Gooku agent created: this file is its memory, `.claude/skills/gooku/SKILL.md` its boot routine.
- 2026-11-27: Generic stock product photos rejected by the owner and reverted; wait for own photos.
- 2026-11-27: Browser → API through a same-origin `/api` proxy (first-party cookies, works over LAN).
- 2026-11-27: Website first; admin can stay basic.
- 2026-11-27: Email OTP and WhatsApp click-to-chat (free) instead of SMS / WhatsApp API.
- 2026-11-27: Stack: Next.js + NestJS + PostgreSQL/Prisma in a pnpm monorepo, all local.
- 2026-11-27: Brand Meva Mantra, Green + Gold theme.

## 12. Keeping this file alive (Gooku's learning loop)

After every task, whoever did it (any AI, any person):
1. Update §10 Status: move finished items to Done, add new pending items, bump the date.
2. The owner decided something → one dated line at the top of §11.
3. Hit a bug or pitfall and found the fix → one line in §7 (or §6 if it is how the system works).
4. The owner stated a preference or corrected the AI → §2.

Keep lines short and delete what is no longer true. **This repo is public: never write passwords, keys, tokens or personal phone numbers/emails here.**
