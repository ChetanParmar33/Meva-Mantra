import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException,
  OnModuleDestroy, OnModuleInit, Param, Post, Query, Req, ServiceUnavailableException, UnauthorizedException, UseGuards, type RawBodyRequest,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { sendMail } from '../common/mailer.js';
import { pincodeInfo } from '../common/pincode.js';
import { PrismaService } from '../common/prisma.service.js';
import { QuoteInput, quote } from '../common/pricing.js';
import { isDev } from '../common/session.js';
import { getSettings } from '../common/settings.js';
import { AccountController, AddressDto } from '../customer/account.js';
import { CustomerAuthController, CustomerGuard, userIdFrom, type CustomerRequest } from '../customer/auth.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';

class CheckoutAddress extends AddressDto { @IsEmail() email!: string; }
class CheckoutDto extends QuoteInput {
  @ValidateNested() @Type(() => CheckoutAddress) address!: CheckoutAddress;
  @IsIn(['PREPAID', 'COD']) declare paymentMode: 'PREPAID' | 'COD';
  @IsOptional() @IsString() @MaxLength(200) giftMessage?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
  @IsOptional() @IsBoolean() saveAddress?: boolean;
}
class RazorpayVerifyDto {
  @IsString() @MaxLength(20) orderNumber!: string;
  @IsString() @MaxLength(60) razorpay_order_id!: string;
  @IsString() @MaxLength(60) razorpay_payment_id!: string;
  @IsString() @MaxLength(200) razorpay_signature!: string;
}
class DemoConfirmDto { @IsString() @MaxLength(20) orderNumber!: string; }
class TrackQuery {
  @IsString() @MaxLength(20) number!: string;
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be the 10-digit mobile used for the order' }) phone!: string;
}

const razorpay = () => (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET } : null);
const rs = (p: number) => '₹' + (p / 100).toLocaleString('en-IN');

@Controller()
export class ShopController {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  @Get('pincode/:pin')
  pincode(@Param('pin') pin: string) {
    if (!/^[1-9]\d{5}$/.test(pin)) throw new BadRequestException('Enter a valid 6-digit pincode.');
    return pincodeInfo(pin);
  }

  @Post('cart/quote')
  @HttpCode(200)
  async cartQuote(@Body() dto: QuoteInput, @Req() req: Request) {
    return quote(this.db, dto, await userIdFrom(req, this.jwt));
  }

  @Post('checkout')
  @HttpCode(200)
  @UseGuards(CustomerGuard)
  async checkout(@Body() dto: CheckoutDto, @Req() req: CustomerRequest) {
    const q = await quote(this.db, dto, req.userId);
    if (q.issues.length) throw new ConflictException(q.issues.join(' '));
    if (!q.lines.length) throw new BadRequestException('Your cart is empty.');
    if (dto.couponCode && !q.coupon?.valid) throw new BadRequestException(q.coupon?.message ?? 'Invalid coupon');
    if (dto.paymentMode === 'PREPAID' && !razorpay() && !isDev()) throw new ServiceUnavailableException('Online payment is not configured yet. Please choose Cash on Delivery.');

    const { email, ...addr } = dto.address;
    const order = await this.db.$transaction(async (tx) => {
      // Reserve stock atomically: the update only succeeds while enough stock is left.
      for (const l of q.lines) {
        const r = await tx.productVariant.updateMany({ where: { id: l.variantId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (r.count === 0) throw new ConflictException(`${l.productTitle} (${l.variantTitle}) just sold out. Please update your cart.`);
      }
      if (q.coupon?.valid) {
        const used = await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE code = ${q.coupon.code} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (!used) throw new ConflictException('This coupon has just been fully used.');
      }
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq')`;
      const status: OrderStatus = dto.paymentMode === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT';
      const products = await tx.productVariant.findMany({ where: { id: { in: q.lines.map(l => l.variantId) } }, select: { id: true, sku: true, productId: true } });
      const created = await tx.order.create({
        data: {
          number: `MM${nextval}`, userId: req.userId, status, paymentMode: dto.paymentMode,
          phone: addr.phone, email: email.toLowerCase(), shippingAddress: { ...addr, email } as Prisma.InputJsonValue,
          subtotalPaise: q.subtotalPaise, mrpSavingsPaise: q.mrpSavingsPaise,
          couponCode: q.coupon?.valid ? q.coupon.code : null, couponDiscountPaise: q.coupon?.valid ? q.coupon.discountPaise : 0,
          prepaidDiscountPaise: q.prepaidDiscountPaise, shippingPaise: q.shippingPaise, giftWrapPaise: q.giftWrapPaise, totalPaise: q.totalPaise,
          giftMessage: dto.giftWrap ? dto.giftMessage : null, note: dto.note,
          items: { create: q.lines.map(l => { const p = products.find(x => x.id === l.variantId)!; return { productId: p.productId, variantId: l.variantId, title: l.productTitle, variantTitle: l.variantTitle, sku: p.sku, unitPricePaise: l.unitPricePaise, qty: l.qty, lineTotalPaise: l.lineTotalPaise }; }) },
          events: { create: { status, note: dto.paymentMode === 'COD' ? 'Order placed (Cash on Delivery)' : 'Awaiting online payment' } },
          payments: { create: { provider: dto.paymentMode === 'COD' ? 'cod' : razorpay() ? 'razorpay' : 'demo', amountPaise: q.totalPaise } },
        },
      });
      if (dto.saveAddress) {
        const exists = await tx.address.findFirst({ where: { userId: req.userId, line1: addr.line1, pincode: addr.pincode } });
        if (!exists) await tx.address.create({ data: { ...addr, userId: req.userId, isDefault: (await tx.address.count({ where: { userId: req.userId } })) === 0 } });
      }
      // Fill missing profile details from the first order (email only if no other account uses it).
      const user = await tx.user.findUniqueOrThrow({ where: { id: req.userId } });
      const emailFree = !user.email && !(await tx.user.findUnique({ where: { email: email.toLowerCase() } }));
      if (!user.name || emailFree) await tx.user.update({ where: { id: user.id }, data: { name: user.name ?? addr.name, ...(emailFree ? { email: email.toLowerCase() } : {}) } });
      return created;
    });

    if (order.status === 'CONFIRMED') await this.confirmationMail(order.id);
    let payment = null;
    if (dto.paymentMode === 'PREPAID') {
      const rp = razorpay();
      if (rp) {
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${rp.id}:${rp.secret}`).toString('base64') },
          body: JSON.stringify({ amount: order.totalPaise, currency: 'INR', receipt: order.number, notes: { orderNumber: order.number } }),
        }).catch((e: Error & { cause?: { code?: string } }) => { console.error('[razorpay] network error', e.cause?.code ?? e.message); return null; });
        if (!res?.ok) {
          // 401 here = wrong RAZORPAY_KEY_ID/SECRET. The customer gets 503 (a 401 would log them out of the store).
          if (res) console.error('[razorpay] create order failed', res.status, (await res.text()).slice(0, 300));
          await this.cancel(order.id, 'Payment gateway error');
          throw new ServiceUnavailableException('Payment gateway is unavailable. Please try again or use COD.');
        }
        const rpo = (await res.json()) as { id: string };
        await this.db.payment.updateMany({ where: { orderId: order.id }, data: { providerOrderId: rpo.id } });
        payment = { provider: 'razorpay', keyId: rp.id, razorpayOrderId: rpo.id, amountPaise: order.totalPaise, name: dto.address.name, email: dto.address.email, phone: dto.address.phone };
      } else {
        payment = { provider: 'demo', amountPaise: order.totalPaise };
      }
    }
    return { order: { number: order.number, status: order.status, totalPaise: order.totalPaise }, payment };
  }

  @Post('payments/razorpay/verify')
  @HttpCode(200)
  async verifyRazorpay(@Body() dto: RazorpayVerifyDto) {
    const rp = razorpay();
    if (!rp) throw new ServiceUnavailableException('Razorpay is not configured');
    const pay = await this.db.payment.findUnique({ where: { providerOrderId: dto.razorpay_order_id }, include: { order: true } });
    if (!pay || pay.order.number !== dto.orderNumber) throw new NotFoundException('Payment not found');
    const expected = createHmac('sha256', rp.secret).update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`).digest('hex');
    const ok = expected.length === dto.razorpay_signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(dto.razorpay_signature));
    if (!ok) {
      await this.db.payment.updateMany({ where: { id: pay.id, status: 'CREATED' }, data: { status: 'FAILED' } });
      throw new BadRequestException('Payment could not be verified.');
    }
    return this.markPaid(pay.orderId, pay.id, dto.razorpay_payment_id);
  }

  /** Razorpay → server notification (configure in Razorpay Dashboard → Webhooks: payment.captured, payment.failed).
   *  Confirms the order even if the customer closed the browser before /payments/razorpay/verify ran. */
  @Post('payments/razorpay/webhook')
  @HttpCode(200)
  async razorpayWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature?: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Webhook is not configured');
    if (!req.rawBody || !signature) throw new BadRequestException('Missing body or signature');
    const expected = createHmac('sha256', secret).update(req.rawBody).digest('hex');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new UnauthorizedException('Invalid signature');
    const evt = JSON.parse(req.rawBody.toString('utf8')) as { event?: string; payload?: { payment?: { entity?: { id: string; order_id?: string; method?: string } } } };
    const p = evt.payload?.payment?.entity;
    const pay = p?.order_id ? await this.db.payment.findUnique({ where: { providerOrderId: p.order_id } }) : null;
    if (!p || !pay) return { ok: true, ignored: true }; // not ours / unknown: acknowledge so Razorpay stops retrying
    if (evt.event === 'payment.captured' || evt.event === 'order.paid') await this.markPaid(pay.orderId, pay.id, p.id, p.method);
    else if (evt.event === 'payment.failed' && pay.status === 'CREATED') await this.db.payment.update({ where: { id: pay.id }, data: { status: 'FAILED', providerPaymentId: p.id, method: p.method } });
    return { ok: true };
  }

  @Post('payments/demo/confirm')
  @HttpCode(200)
  @UseGuards(CustomerGuard)
  async demoConfirm(@Body() dto: DemoConfirmDto, @Req() req: CustomerRequest) {
    if (razorpay() || !isDev()) throw new ForbiddenException('Demo payments are disabled');
    const order = await this.db.order.findFirst({ where: { number: dto.orderNumber, userId: req.userId }, include: { payments: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') return { ok: true, order: { number: order.number, status: order.status } };
    return this.markPaid(order.id, order.payments[0]?.id, 'demo_' + Date.now(), 'upi');
  }

  @Get('orders/track')
  async track(@Query() q: TrackQuery) {
    const o = await this.db.order.findFirst({ where: { number: q.number.trim().toUpperCase(), phone: q.phone }, include: { items: true, events: { orderBy: { createdAt: 'asc' } }, shipment: true } });
    if (!o) throw new NotFoundException('We could not find an order with these details.');
    const a = o.shippingAddress as { city?: string; pincode?: string };
    return {
      number: o.number, status: o.status, createdAt: o.createdAt, city: a.city ?? null, pincode: a.pincode ?? null,
      itemCount: o.items.reduce((s, i) => s + i.qty, 0),
      events: o.events.map(e => ({ status: e.status, note: e.note, createdAt: e.createdAt })),
      shipment: o.shipment && { courier: o.shipment.courier, awb: o.shipment.awb, trackingUrl: o.shipment.trackingUrl, shippedAt: o.shipment.shippedAt, deliveredAt: o.shipment.deliveredAt },
    };
  }

  private async markPaid(orderId: string, paymentId: string | undefined, providerPaymentId: string, method?: string) {
    const order = await this.db.$transaction(async (tx) => {
      if (paymentId) await tx.payment.update({ where: { id: paymentId }, data: { status: 'CAPTURED', providerPaymentId, method } });
      const cur = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (cur.status === 'CANCELLED') {
        // Money arrived after the 30-minute auto-cancel released the stock: flag it for a refund / manual re-confirm.
        await tx.orderEvent.create({ data: { orderId, status: 'CANCELLED', note: `Payment ${providerPaymentId} received after the order was cancelled. Refund it, or re-confirm manually if stock allows.` } });
        return cur;
      }
      if (cur.status !== 'PENDING_PAYMENT') return cur;
      return tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', events: { create: { status: 'CONFIRMED', note: 'Payment received' } } } });
    });
    await this.confirmationMail(orderId);
    return { ok: true, order: { number: order.number, status: order.status } };
  }

  private async cancel(orderId: string, note: string) {
    await this.db.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const i of items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED', events: { create: { status: 'CANCELLED', note } } } });
    });
  }

  private async confirmationMail(orderId: string) {
    const o = await this.db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o?.email) return;
    const s = await getSettings(this.db);
    const lines = o.items.map(i => `• ${i.title} (${i.variantTitle}) × ${i.qty} = ${rs(i.lineTotalPaise)}`).join('\n');
    await sendMail(o.email, `Order ${o.number} confirmed – ${s.brand.name}`,
      `Thank you for your order!\n\nOrder: ${o.number}\n${lines}\n\nTotal: ${rs(o.totalPaise)} (${o.paymentMode === 'COD' ? 'Cash on Delivery' : 'Paid online'})\n\nWe pack every order fresh. Track it any time with your order number and mobile number.\n\n${s.brand.name}`);
  }
}

const STALE_MS = 30 * 60 * 1000;

/** Unpaid online orders hold stock; release it if payment never arrives. */
@Injectable()
export class StaleOrderReleaser implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private db: PrismaService) {}
  onModuleInit() { this.timer = setInterval(() => this.run().catch(e => console.error('[stale-orders]', e)), 5 * 60 * 1000); }
  onModuleDestroy() { clearInterval(this.timer); }
  // ponytail: in-process timer; with several API instances move this to a scheduled job with a lock.
  async run() {
    const stale = await this.db.order.findMany({ where: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(Date.now() - STALE_MS) } }, select: { id: true } });
    for (const { id } of stale) {
      await this.db.$transaction(async (tx) => {
        const r = await tx.order.updateMany({ where: { id, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED' } });
        if (!r.count) return; // paid meanwhile
        for (const i of await tx.orderItem.findMany({ where: { orderId: id } })) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
        await tx.orderEvent.create({ data: { orderId: id, status: 'CANCELLED', note: 'Payment not completed within 30 minutes' } });
      });
    }
    return stale.length;
  }
}

@Module({ controllers: [CustomerAuthController, AccountController, ShopController], providers: [CustomerGuard, StaleOrderReleaser] })
export class ShopModule {}

