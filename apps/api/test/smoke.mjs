// End-to-end smoke test against a running local API (pnpm dev:api + seeded DB).
// Run: node test/smoke.mjs   — creates test orders/users, then cancels the orders so stock is restored.
import assert from 'node:assert/strict';

const API = process.env.API_URL ?? 'http://localhost:4100/api';
const jars = { user: new Map(), admin: new Map() };

async function call(path, { method = 'GET', body, as, form } = {}) {
  const jar = as ? jars[as] : null;
  const headers = form ? {} : { 'Content-Type': 'application/json' };
  if (jar?.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(API + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [kv] = c.split(';'); const [k, v] = kv.split('=');
    if (jar) v ? jar.set(k, v) : jar.delete(k);
  }
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
const ok = (r, status = 200) => { assert.equal(r.status, status, JSON.stringify(r.data)); return r.data; };
const step = (name) => console.log('✓', name);

// --- catalogue ---
const list = ok(await call('/products?pageSize=60'));
assert.equal(list.total, 7, 'only live products are public (coming soon hidden)');
const mix = ok(await call('/products/mix-dryfruit'));
const v400 = mix.variants.find(v => v.title === '400 g');
assert.equal(v400.pricePaise, 67900);
assert.equal('stock' in v400, false, 'stock count must not be public');
step('catalogue + no stock leak');

ok(await call('/pincode/380015'));
assert.equal(ok(await call('/pincode/380015')).state, 'Gujarat');
assert.equal((await call('/pincode/12')).status, 400);
step('pincode');

// --- quote maths ---
let q = ok(await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: v400.id, qty: 1 }] } }));
assert.equal(q.subtotalPaise, 67900);
assert.equal(q.shippingPaise, 0, 'free shipping above ₹500');
assert.equal(q.totalPaise, 67900);
q = ok(await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: v400.id, qty: 1 }], couponCode: 'mantra10', paymentMode: 'PREPAID', giftWrap: true } }));
assert.equal(q.coupon.valid, true);
assert.equal(q.coupon.discountPaise, 6790);                          // 10% of 679
assert.equal(q.prepaidDiscountPaise, Math.round((67900 - 6790) * 0.05)); // 5% after coupon
assert.equal(q.giftWrapPaise, 4900);
assert.equal(q.totalPaise, 67900 - 6790 - 3056 + 4900);
const snack150 = ok(await call('/products/dry-fruit-snack-mix')).variants.find(v => v.title === '150 g');
q = ok(await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: snack150.id, qty: 1 }], couponCode: 'FESTIVE15' } }));
assert.equal(q.shippingPaise, 4900, '₹49 shipping below ₹500');
assert.equal(q.coupon.valid, false, 'FESTIVE15 needs ₹1,499');
assert.equal((await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: v400.id, qty: 0 }] } })).status, 400);
step('quote: coupon, prepaid, gift wrap, shipping, validation');

// --- OTP login ---
const phone = '9' + String(Date.now()).slice(-9);
assert.equal((await call('/checkout', { method: 'POST', body: {} , as: 'user' })).status, 401);
const otp = ok(await call('/auth/otp/request', { method: 'POST', body: { target: phone } }));
assert.match(otp.devCode, /^\d{6}$/);
assert.equal((await call('/auth/otp/request', { method: 'POST', body: { target: phone } })).status, 429, '30 s gap');
const wrong = otp.devCode === '000000' ? '111111' : '000000';
assert.equal((await call('/auth/otp/verify', { method: 'POST', body: { target: phone, code: wrong }, as: 'user' })).status, 400);
const me = ok(await call('/auth/otp/verify', { method: 'POST', body: { target: phone, code: otp.devCode }, as: 'user' }));
assert.equal(me.user.phone, phone);
assert.equal((await call('/auth/otp/verify', { method: 'POST', body: { target: phone, code: otp.devCode } })).status, 400, 'code is single-use');
ok(await call('/auth/me', { as: 'user' }));
step('OTP: rate limit, wrong code, single use, session cookie');

// --- admin session can't be used as customer and vice versa ---
ok(await call('/admin/auth/login', { method: 'POST', body: { email: 'admin@mevamantra.in', password: 'ChangeMe@123' }, as: 'admin' }));
const adminToken = jars.admin.get('mm_admin');
jars.user.set('mm_user_backup', jars.user.get('mm_user'));
const swapped = new Map([['mm_user', adminToken]]);
jars.swap = swapped;
assert.equal((await call('/auth/me', { as: 'swap' })).status, 401, 'admin token rejected as customer');
jars.swap2 = new Map([['mm_admin', jars.user.get('mm_user')]]);
assert.equal((await call('/admin/stats', { as: 'swap2' })).status, 401, 'customer token rejected as admin');
jars.user.delete('mm_user_backup');
step('token audiences');

// --- coming soon products are hidden; sold-out sizes are reported ---
const adminList = ok(await call('/admin/products', { as: 'admin' }));
const soon = adminList.find(p => p.status === 'COMING_SOON');
assert.equal((await call(`/products/${soon.slug}`)).status, 404, 'coming soon product hidden');
assert.ok(!ok(await call('/collections')).some(c => c.slug === 'rakhi'), 'collection with no live products hidden');
q = ok(await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: soon.variants[0].id, qty: 1 }] } }));
assert.match(q.issues.join(' '), /no longer available/);
const v800 = mix.variants.find(v => v.title === '800 g');
const stock800 = adminList.find(p => p.slug === 'mix-dryfruit').variants.find(v => v.id === v800.id).stock;
ok(await call(`/admin/variants/${v800.id}`, { method: 'PATCH', as: 'admin', body: { stock: 0 } }));
q = ok(await call('/cart/quote', { method: 'POST', body: { items: [{ variantId: v800.id, qty: 1 }] } }));
assert.match(q.issues.join(' '), /sold out/);
ok(await call(`/admin/variants/${v800.id}`, { method: 'PATCH', as: 'admin', body: { stock: stock800 } }));
step('coming soon hidden, sold out reported');

// --- checkout COD: stock goes down ---
const before = ok(await call('/admin/products', { as: 'admin' })).find(p => p.slug === 'mix-dryfruit').variants.find(v => v.title === '400 g').stock;
const address = { name: 'Smoke Test', phone, email: `smoke${phone}@example.com`, line1: '12 Test Street', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' };
const cod = ok(await call('/checkout', { method: 'POST', as: 'user', body: { items: [{ variantId: v400.id, qty: 2 }], paymentMode: 'COD', address, saveAddress: true } }));
assert.match(cod.order.number, /^MM\d{5,}$/);
assert.equal(cod.order.status, 'CONFIRMED');
assert.equal(cod.payment, null);
const after = ok(await call('/admin/products', { as: 'admin' })).find(p => p.slug === 'mix-dryfruit').variants.find(v => v.title === '400 g').stock;
assert.equal(after, before - 2);
assert.equal(ok(await call('/account/addresses', { as: 'user' })).length, 1);
step(`checkout COD ${cod.order.number}: stock ${before} → ${after}, address saved`);

// --- checkout prepaid (demo payment) with first-order coupon ---
const pre = ok(await call('/checkout', { method: 'POST', as: 'user', body: { items: [{ variantId: v400.id, qty: 3 }], paymentMode: 'PREPAID', couponCode: 'FESTIVE15', address } }));
assert.equal(pre.order.status, 'PENDING_PAYMENT');
assert.equal(pre.payment.provider, 'demo');
const paid = ok(await call('/payments/demo/confirm', { method: 'POST', as: 'user', body: { orderNumber: pre.order.number } }));
assert.equal(paid.order.status, 'CONFIRMED');
q = ok(await call('/cart/quote', { method: 'POST', as: 'user', body: { items: [{ variantId: v400.id, qty: 1 }], couponCode: 'MANTRA10' } }));
assert.equal(q.coupon.valid, false, 'MANTRA10 is first-order only');
step(`checkout prepaid ${pre.order.number} + demo payment, first-order coupon blocked`);

// --- tracking + account ---
assert.equal(ok(await call(`/orders/track?number=${cod.order.number}&phone=${phone}`)).status, 'CONFIRMED');
assert.equal((await call(`/orders/track?number=${cod.order.number}&phone=9000000000`)).status, 404, 'wrong phone hides order');
assert.equal(ok(await call('/account/orders', { as: 'user' })).length, 2);
step('track + account orders');

// --- admin order flow: transitions, shipment, cancel restocks ---
let o = ok(await call(`/admin/orders/${cod.order.number}`, { method: 'PATCH', as: 'admin', body: { status: 'SHIPPED', courier: 'Delhivery', awb: 'TEST123' } }));
assert.equal(o.status, 'SHIPPED');
assert.equal(o.shipment.awb, 'TEST123');
assert.equal((await call(`/admin/orders/${cod.order.number}`, { method: 'PATCH', as: 'admin', body: { status: 'CANCELLED' } })).status, 400, 'cannot cancel after shipping');
o = ok(await call(`/admin/orders/${cod.order.number}`, { method: 'PATCH', as: 'admin', body: { status: 'RETURNED', note: 'smoke test' } }));
o = ok(await call(`/admin/orders/${pre.order.number}`, { method: 'PATCH', as: 'admin', body: { status: 'CANCELLED', note: 'smoke test' } }));
const restored = ok(await call('/admin/products', { as: 'admin' })).find(p => p.slug === 'mix-dryfruit').variants.find(v => v.title === '400 g').stock;
assert.equal(restored, before, 'stock restored after return + cancel');
step('admin order transitions + restock');

// --- reviews moderation recomputes rating ---
ok(await call('/products/badam/reviews', { method: 'POST', as: 'user', body: { name: 'Smoke', rating: 4, text: 'Crunchy and fresh, smoke test review.' } }));
const pending = ok(await call('/admin/reviews?status=PENDING', { as: 'admin' })).find(r => r.text.startsWith('Crunchy and fresh, smoke'));
assert.ok(pending);
ok(await call(`/admin/reviews/${pending.id}`, { method: 'PATCH', as: 'admin', body: { status: 'REJECTED' } }));
step('review submit (pending) + moderation');

// --- enquiries, newsletter, coupons, settings, upload ---
ok(await call('/enquiries', { method: 'POST', body: { type: 'BULK', name: 'Smoke Co', email: 'b@example.com', phone: '9876543210', message: '100 Diwali boxes please', quantity: '100–500 boxes' } }));
assert.equal((await call('/enquiries', { method: 'POST', body: { type: 'BULK', name: 'x', email: 'bad', phone: '1', message: '' } })).status, 400);
ok(await call('/newsletter', { method: 'POST', body: { email: 'smoke@example.com' } }));
ok(await call('/newsletter', { method: 'POST', body: { email: 'smoke@example.com' } }));
const coupon = ok(await call('/admin/coupons', { method: 'POST', as: 'admin', body: { code: 'SMOKE' + (Date.now() % 1e5), description: 'Smoke ₹100 off', type: 'FLAT', value: 10000, minOrderPaise: 0, usageLimit: 1 } }), 201);
ok(await call(`/admin/coupons/${coupon.id}`, { method: 'DELETE', as: 'admin' }));
const s = ok(await call('/admin/settings', { as: 'admin' }));
assert.equal((await call('/admin/settings', { method: 'PUT', as: 'admin', body: { ...s, prepaidDiscountPct: 99 } })).status, 400);
const fd = new FormData(); fd.append('file', new Blob(['<svg onload=alert(1)>']), 'evil.png');
assert.equal((await call(`/admin/products/${mix.id}/images`, { method: 'POST', as: 'admin', form: fd })).status, 400, 'non-image rejected by magic bytes');
step('enquiries, newsletter, coupons CRUD, settings validation, upload guard');

const stats = ok(await call('/admin/stats', { as: 'admin' }));
assert.ok(stats.orders >= 2);
ok(await call('/auth/logout', { method: 'POST', as: 'user' }));
assert.equal((await call('/auth/me', { as: 'user' })).status, 401);
step('stats + logout');
console.log('\nAll smoke checks passed.');
