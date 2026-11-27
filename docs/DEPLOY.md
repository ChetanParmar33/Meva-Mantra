# Going live: checklist & (almost) free hosting

> Abhi project **sirf local** hai. Ye guide tab ke liye hai jab live karna ho. Kuch bhi upload/deploy apne aap nahi hota.

## 1. Kharcha kya hoga

| Cheez | Free option | Note |
|---|---|---|
| Code (Next.js, NestJS, PostgreSQL, Prisma) | Free, open-source | |
| Server | **Oracle Cloud "Always Free" VM** (ARM, kaafi RAM) ya koi bhi chhota VPS (~₹400–800/mahina) | Ek hi server par website + admin + API + database + Caddy chal jaayenge. Free tier ki terms sign-up se pehle check karna. |
| HTTPS certificate | **Caddy** (Let's Encrypt): free, automatic | |
| Domain | `mevamantra.in`: ~₹500–900/saal | Ye kharcha bachta nahi |
| OTP + order emails | Gmail SMTP (app password): free, ~500/din | Ya Brevo/Resend ka free tier |
| SMS OTP | Paid (MSG91 etc.) | Tab tak email OTP. Production mein phone OTP 503 deta hai jab tak SMS provider na lage |
| WhatsApp | Click-to-chat link: free | WhatsApp Business API paid hai |
| Payments | Razorpay: account free, har transaction par fee | COD free |
| Shipping | Admin mein courier + AWB khud daalo | Shiprocket API baad mein (per-shipment charge) |

## 2. Launch se pehle (zaroori)

- [ ] `apps/api/.env`: `NODE_ENV=production`, naya lamba `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Admin password badlo (Admin → Settings → Change password). `ADMIN_PASSWORD` env se hata do
- [ ] Website + admin: `API_URL=http://127.0.0.1:4100/api`, `NEXT_PUBLIC_API_URL=/api` (browser calls go through the site's own `/api` proxy, so login cookies are first-party). API: `PUBLIC_URL=""` (relative image URLs).
- [ ] Aage wala proxy (Caddy/Nginx) **X-Forwarded-For** set kare, taaki API ko asli customer IP mile (spam limit isi par chalti hai). Caddy default theek hai; Nginx mein `proxy_set_header X-Forwarded-For $remote_addr;` (client ka bheja header aage mat jaane do).
- [ ] `SMTP_URL` + `MAIL_FROM` set karo (email OTP aur order emails ke liye)
- [ ] Razorpay **live** keys (`RAZORPAY_KEY_ID/SECRET`). Pehle test keys se ek poora order test karo.
- [ ] Razorpay Dashboard → Webhooks: URL `https://api.mevamantra.in/api/payments/razorpay/webhook`, events `payment.captured`, `payment.failed`, ek secret banao aur wahi `RAZORPAY_WEBHOOK_SECRET` mein daalo. Isse customer browser band kar de tab bhi order confirm hota hai.
- [ ] Demo data hatao: reviews/ratings (Admin → Reviews), placeholder phone/email/address (Admin → Settings), "50,000+ jars" jaise numbers
- [ ] Policies apne asli business rules ke hisaab se final karo
- [ ] Database password badlo; Postgres sirf `127.0.0.1` par (docker-compose already aisa hai)
- [ ] Firewall: sirf 22, 80, 443 khule
- [ ] Backup: roz `pnpm db:backup` (cron) + `apps/api/uploads/` folder ka backup

## 3. Server par chalana (ek VM)

```bash
# server par (Ubuntu): Node 24, pnpm, Docker, Caddy install karo
cd /srv/meva-mantra            # project copy karo (scp/rsync)
pnpm install --frozen-lockfile
pnpm db:up
cd apps/api && pnpm exec prisma migrate deploy && pnpm db:seed && cd ../..
pnpm build
# teeno apps ko systemd service ya `pm2` se chalao:
#   apps/api:   node dist/main.js           (port 4100)
#   apps/web:   pnpm start                  (port 3100)
#   apps/admin: pnpm start                  (port 3101)
```

`/etc/caddy/Caddyfile` (HTTPS automatic):
```
mevamantra.in, www.mevamantra.in {
  reverse_proxy 127.0.0.1:3100
}
admin.mevamantra.in {
  reverse_proxy 127.0.0.1:3101
}
api.mevamantra.in {               # optional: only for Razorpay webhooks / external access
  reverse_proxy 127.0.0.1:4100
}
```
Website aur admin `/api` ko khud API tak proxy karte hain, isliye customers ke liye alag API domain zaroori nahi. Razorpay webhook URL `https://mevamantra.in/api/payments/razorpay/webhook` bhi chalega.

Cookies: login cookies website/admin ke apne domain par `/api` proxy se set hoti hain (first-party, `SameSite=Lax`). `NODE_ENV=production` par cookies `Secure` ho jaati hain (HTTPS zaroori).

## 4. Backup se restore

```bash
gunzip -c backups/mevamantra-YYYY-MM-DD-HHMM.sql.gz | docker exec -i mevamantra-db psql -U mevamantra mevamantra
```
