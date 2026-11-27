import { Body, Controller, Get, HttpCode, Module, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { sendMail } from '../common/mailer.js';
import { PrismaService } from '../common/prisma.service.js';
import { getSettings } from '../common/settings.js';
import { userIdFrom } from '../customer/auth.js';

class ReviewDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @MinLength(10) @MaxLength(1000) text!: string;
}

class EnquiryDto {
  @IsIn(['CONTACT', 'BULK']) type!: 'CONTACT' | 'BULK';
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() email!: string;
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit mobile number' }) phone!: string;
  @IsString() @MinLength(5) @MaxLength(2000) message!: string;
  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @IsString() @MaxLength(80) topic?: string;
  @IsOptional() @IsString() @MaxLength(40) quantity?: string;
  @IsOptional() @IsString() @MaxLength(40) occasion?: string;
}

class NewsletterDto { @IsEmail() @MaxLength(160) email!: string; }

@Controller()
export class ContentController {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  @Get('faqs')
  faqs() { return this.db.faq.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, category: true, question: true, answer: true } }); }

  @Get('policies')
  policies() { return this.db.policy.findMany({ select: { slug: true, title: true }, orderBy: { slug: 'asc' } }); }

  @Get('policies/:slug')
  async policy(@Param('slug') slug: string) {
    const p = await this.db.policy.findUnique({ where: { slug }, select: { slug: true, title: true, sections: true, updatedAt: true } });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Get('posts')
  posts() {
    return this.db.post.findMany({ where: { publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, select: { slug: true, title: true, excerpt: true, tag: true, coverSlug: true, readMins: true, publishedAt: true } });
  }

  @Get('posts/:slug')
  async post(@Param('slug') slug: string) {
    const p = await this.db.post.findFirst({ where: { slug, publishedAt: { lte: new Date() } }, select: { slug: true, title: true, excerpt: true, body: true, tag: true, coverSlug: true, readMins: true, publishedAt: true } });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Post('products/:slug/reviews')
  @HttpCode(200)
  async review(@Param('slug') slug: string, @Body() dto: ReviewDto, @Req() req: Request) {
    const product = await this.db.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    const userId = await userIdFrom(req, this.jwt);
    const bought = userId ? await this.db.orderItem.count({ where: { productId: product.id, order: { userId, status: { in: ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } } } }) : 0;
    await this.db.review.create({ data: { ...dto, productId: product.id, userId, isVerified: bought > 0, status: 'PENDING' } });
    return { ok: true, message: 'Thank you! Your review will appear after a quick check.' };
  }

  @Post('enquiries')
  @HttpCode(200)
  async enquiry(@Body() dto: EnquiryDto) {
    await this.db.enquiry.create({ data: { ...dto, email: dto.email.toLowerCase() } });
    const s = await getSettings(this.db);
    if (s.brand.email) await sendMail(s.brand.email, `New ${dto.type === 'BULK' ? 'bulk order' : 'contact'} enquiry from ${dto.name}`, `${dto.name} <${dto.email}> · ${dto.phone}\n${dto.company ? 'Company: ' + dto.company + '\n' : ''}${dto.quantity ? 'Quantity: ' + dto.quantity + '\n' : ''}${dto.occasion ? 'Occasion: ' + dto.occasion + '\n' : ''}${dto.topic ? 'Topic: ' + dto.topic + '\n' : ''}\n${dto.message}`);
    return { ok: true };
  }

  @Post('newsletter')
  @HttpCode(200)
  async newsletter(@Body() dto: NewsletterDto) {
    const email = dto.email.toLowerCase();
    await this.db.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
    return { ok: true };
  }
}

@Module({ controllers: [ContentController] })
export class ContentModule {}
