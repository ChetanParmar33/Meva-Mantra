import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Module, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PrismaService } from '../common/prisma.service.js';
import { getSettings } from '../common/settings.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { orderDetail, orderSummary } from '../shop/orders-view.js';
import { AdminAuthController, AdminGuard, AdminProductsController } from './admin.js';

const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const;
/** Allowed manual moves. Anything not listed is refused so stock and history stay consistent. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

class OrdersQuery {
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
}

class UpdateOrderDto {
  @IsOptional() @IsIn(ORDER_STATUSES) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
  @IsOptional() @IsString() @MaxLength(60) courier?: string;
  @IsOptional() @IsString() @MaxLength(60) awb?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) trackingUrl?: string;
}

class CouponDto {
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'code: 3-20 capital letters/numbers' }) code!: string;
  @IsString() @MinLength(3) @MaxLength(120) description!: string;
  @IsIn(['PERCENT', 'FLAT']) type!: 'PERCENT' | 'FLAT';
  @IsInt() @Min(1) value!: number;
  @IsInt() @Min(0) minOrderPaise!: number;
  @IsOptional() @IsInt() @Min(0) maxDiscountPaise?: number | null;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class UpdateCouponDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) description?: string;
  @IsOptional() @IsIn(['PERCENT', 'FLAT']) type?: 'PERCENT' | 'FLAT';
  @IsOptional() @IsInt() @Min(1) value?: number;
  @IsOptional() @IsInt() @Min(0) minOrderPaise?: number;
  @IsOptional() @IsInt() @Min(0) maxDiscountPaise?: number | null;
  @IsOptional() @IsDateString() startsAt?: string | null;
  @IsOptional() @IsDateString() endsAt?: string | null;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class StatusQuery { @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status?: 'PENDING' | 'APPROVED' | 'REJECTED'; }
class ReviewStatusDto { @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status!: 'PENDING' | 'APPROVED' | 'REJECTED'; }
class EnquiryQuery {
  @IsOptional() @IsIn(['CONTACT', 'BULK']) type?: 'CONTACT' | 'BULK';
  @IsOptional() @IsIn(['NEW', 'IN_PROGRESS', 'CLOSED']) status?: 'NEW' | 'IN_PROGRESS' | 'CLOSED';
}
class EnquiryStatusDto { @IsIn(['NEW', 'IN_PROGRESS', 'CLOSED']) status!: 'NEW' | 'IN_PROGRESS' | 'CLOSED'; }

class BrandDto {
  @IsString() @MaxLength(60) name!: string;
  @IsString() @MaxLength(120) tagline!: string;
  @IsString() @MaxLength(30) phone!: string;
  @Matches(/^\d{10,13}$/, { message: 'whatsapp: digits with country code, e.g. 919876543210' }) whatsapp!: string;
  @IsEmail() email!: string;
  @IsString() @MaxLength(200) address!: string;
  @IsString() @MaxLength(80) hours!: string;
}
class SettingsDto {
  @ValidateNested() @Type(() => BrandDto) brand!: BrandDto;
  @IsInt() @Min(0) @Max(50) prepaidDiscountPct!: number;
  @IsInt() @Min(0) freeShippingAbovePaise!: number;
  @IsInt() @Min(0) shippingFeePaise!: number;
  @IsInt() @Min(0) giftWrapPaise!: number;
}

const PAID: OrderStatus[] = ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminOpsController {
  constructor(private db: PrismaService) {}

  @Get('stats')
  async stats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [products, active, outOfStock, orders, newEnquiries, pendingReviews, revenue, todayOrders, ordersToShip] = await Promise.all([
      this.db.product.count(),
      this.db.product.count({ where: { status: 'ACTIVE' } }),
      this.db.product.count({ where: { status: 'ACTIVE', variants: { every: { stock: { lte: 0 } } } } }),
      this.db.order.count({ where: { status: { not: 'PENDING_PAYMENT' } } }),
      this.db.enquiry.count({ where: { status: 'NEW' } }),
      this.db.review.count({ where: { status: 'PENDING' } }),
      this.db.order.aggregate({ _sum: { totalPaise: true }, where: { status: { in: PAID } } }),
      this.db.order.count({ where: { createdAt: { gte: today }, status: { in: PAID } } }),
      this.db.order.count({ where: { status: { in: ['CONFIRMED', 'PACKED'] } } }),
    ]);
    return { products, active, outOfStock, orders, newEnquiries, pendingReviews, revenuePaise: revenue._sum.totalPaise ?? 0, todayOrders, ordersToShip };
  }

  /* orders */
  @Get('orders')
  async orders(@Query() q: OrdersQuery) {
    const pageSize = 20, page = q.page ?? 1;
    const s = q.q?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(s ? { OR: [{ number: { contains: s.toUpperCase() } }, { phone: { contains: s } }, { email: { contains: s.toLowerCase() } }, { user: { name: { contains: s, mode: 'insensitive' } } }] } : {}),
    };
    const [rows, total, groups] = await Promise.all([
      this.db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { items: { include: { product: { select: { slug: true } } } } } }),
      this.db.order.count({ where }),
      this.db.order.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      items: rows.map(o => { const a = o.shippingAddress as { name?: string; city?: string }; return { ...orderSummary(o), id: o.id, customerName: a.name ?? '', phone: o.phone, city: a.city ?? '' }; }),
      total, page, pageSize,
      counts: Object.fromEntries(groups.map(g => [g.status, g._count])) as Partial<Record<OrderStatus, number>>,
    };
  }

  @Get('orders/:number')
  async order(@Param('number') number: string) {
    const o = await this.db.order.findUnique({ where: { number }, include: { ...orderDetail.include, user: { select: { id: true, name: true, phone: true, email: true } } } });
    if (!o) throw new NotFoundException();
    return { ...orderDetail.map(o), phone: o.phone, email: o.email, user: o.user };
  }

  @Patch('orders/:number')
  async updateOrder(@Param('number') number: string, @Body() dto: UpdateOrderDto) {
    const o = await this.db.order.findUnique({ where: { number }, include: { items: true, payments: true } });
    if (!o) throw new NotFoundException();
    if (dto.status && dto.status !== o.status && !NEXT[o.status].includes(dto.status)) {
      throw new BadRequestException(`Can't move an order from ${o.status} to ${dto.status}.`);
    }
    const changing = dto.status && dto.status !== o.status ? dto.status : null;
    await this.db.$transaction(async (tx) => {
      if (changing) {
        // optimistic check: only update if nobody changed the status meanwhile
        const r = await tx.order.updateMany({ where: { id: o.id, status: o.status }, data: { status: changing } });
        if (!r.count) throw new ConflictException('This order was just updated. Refresh and try again.');
        if (changing === 'CANCELLED' || changing === 'RETURNED') {
          for (const i of o.items) if (i.variantId) await tx.productVariant.update({ where: { id: i.variantId }, data: { stock: { increment: i.qty } } });
        }
        if (changing === 'DELIVERED') {
          await tx.payment.updateMany({ where: { orderId: o.id, provider: 'cod' }, data: { status: 'CAPTURED' } });
        }
      }
      if (dto.courier !== undefined || dto.awb !== undefined || dto.trackingUrl !== undefined || changing === 'SHIPPED' || changing === 'DELIVERED') {
        const ship = { courier: dto.courier, awb: dto.awb, trackingUrl: dto.trackingUrl, ...(changing === 'SHIPPED' ? { shippedAt: new Date() } : {}), ...(changing === 'DELIVERED' ? { deliveredAt: new Date() } : {}) };
        await tx.shipment.upsert({ where: { orderId: o.id }, create: { orderId: o.id, ...ship }, update: ship });
      }
      if (changing || dto.note) await tx.orderEvent.create({ data: { orderId: o.id, status: changing ?? o.status, note: dto.note ?? null } });
    });
    return this.order(number);
  }

  /* coupons */
  @Get('coupons')
  coupons() { return this.db.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }

  @Post('coupons')
  async createCoupon(@Body() dto: CouponDto) {
    if (await this.db.coupon.findUnique({ where: { code: dto.code } })) throw new ConflictException('This code already exists.');
    this.checkPercent(dto.type, dto.value);
    return this.db.coupon.create({ data: { ...dto, startsAt: dto.startsAt ? new Date(dto.startsAt) : null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null } });
  }

  @Patch('coupons/:id')
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    const c = await this.db.coupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    this.checkPercent(dto.type ?? c.type, dto.value ?? c.value);
    return this.db.coupon.update({
      where: { id },
      data: { ...dto, ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}), ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}) },
    });
  }

  @Delete('coupons/:id')
  async deleteCoupon(@Param('id') id: string) {
    const { count } = await this.db.coupon.deleteMany({ where: { id } });
    if (!count) throw new NotFoundException();
    return { ok: true };
  }

  private checkPercent(type: string, value: number) {
    if (type === 'PERCENT' && value > 90) throw new BadRequestException('Percent discount can be at most 90%.');
  }

  /* reviews */
  @Get('reviews')
  reviews(@Query() q: StatusQuery) {
    return this.db.review.findMany({ where: q.status ? { status: q.status } : {}, orderBy: { createdAt: 'desc' }, take: 200, include: { product: { select: { slug: true, title: true } } } })
      .then(rows => rows.map(({ productId: _p, userId: _u, ...r }) => r));
  }

  @Patch('reviews/:id')
  async reviewStatus(@Param('id') id: string, @Body() dto: ReviewStatusDto) {
    const r = await this.db.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.db.review.update({ where: { id }, data: { status: dto.status } });
    if (r.status !== 'APPROVED' && dto.status !== 'APPROVED') return { ok: true }; // approved set unchanged
    // Rating shown on the store = average of approved reviews.
    const agg = await this.db.review.aggregate({ where: { productId: r.productId, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
    await this.db.product.update({ where: { id: r.productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
    return { ok: true };
  }

  /* enquiries & subscribers */
  @Get('enquiries')
  enquiries(@Query() q: EnquiryQuery) {
    return this.db.enquiry.findMany({ where: { ...(q.type ? { type: q.type } : {}), ...(q.status ? { status: q.status } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  @Patch('enquiries/:id')
  async enquiryStatus(@Param('id') id: string, @Body() dto: EnquiryStatusDto) {
    const { count } = await this.db.enquiry.updateMany({ where: { id }, data: { status: dto.status } });
    if (!count) throw new NotFoundException();
    return { ok: true };
  }

  @Get('subscribers')
  subscribers() { return this.db.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } }); }

  /* settings */
  @Get('settings')
  settings() { return getSettings(this.db); }

  @Put('settings')
  async saveSettings(@Body() dto: SettingsDto) {
    for (const [key, value] of Object.entries(dto)) {
      await this.db.setting.upsert({ where: { key }, create: { key, value: value as Prisma.InputJsonValue }, update: { value: value as Prisma.InputJsonValue } });
    }
    return getSettings(this.db);
  }
}

@Module({ controllers: [AdminAuthController, AdminProductsController, AdminOpsController], providers: [AdminGuard] })
export class AdminModule {}
