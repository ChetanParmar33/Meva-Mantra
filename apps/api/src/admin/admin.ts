import {
  BadRequestException, Body, CanActivate, ConflictException, Controller, Delete, ExecutionContext, Get, HttpCode, HttpException,
  HttpStatus, Injectable, NotFoundException, Param, Patch, Post, Req, Res, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../common/password.js';
import { PrismaService } from '../common/prisma.service.js';
import { ADMIN_COOKIE, assetUrl, cookieOpts, readCookie } from '../common/session.js';

type AdminClaims = { sub: string; role: string };
export type AdminRequest = Request & { admin: AdminClaims };

/* ---------- auth ---------- */

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(200) password!: string;
}

class ChangePasswordDto {
  @IsString() @MaxLength(200) currentPassword!: string;
  @IsString() @MinLength(10, { message: 'New password must be at least 10 characters.' }) @MaxLength(200)
  @Matches(/[A-Za-z]/, { message: 'New password needs a letter.' }) @Matches(/\d/, { message: 'New password needs a number.' })
  newPassword!: string;
}

// ponytail: in-memory lockout, resets on restart and is per-process. Move to Redis/DB when running more than one API instance.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5, LOCK_MS = 15 * 60 * 1000, SESSION_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AdminRequest>();
    const token = readCookie(req, ADMIN_COOKIE) ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();
    try {
      req.admin = await this.jwt.verifyAsync<AdminClaims>(token, { audience: 'admin' });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const key = dto.email.toLowerCase();
    const a = attempts.get(key);
    if (a && a.count >= MAX_ATTEMPTS && a.until > Date.now()) {
      throw new HttpException('Too many attempts. Try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const admin = await this.db.adminUser.findUnique({ where: { email: key } });
    const ok = !!admin && admin.isActive && (await verifyPassword(dto.password, admin.passwordHash));
    if (!ok) {
      const count = (a && a.until > Date.now() ? a.count : 0) + 1;
      attempts.set(key, { count, until: Date.now() + LOCK_MS });
      throw new UnauthorizedException('Invalid email or password');
    }
    attempts.delete(key);
    await this.db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const token = await this.jwt.signAsync({ sub: admin.id, role: admin.role } satisfies AdminClaims, { audience: 'admin', expiresIn: '12h' });
    res.cookie(ADMIN_COOKIE, token, { ...cookieOpts('/api/admin'), maxAge: SESSION_MS });
    return { admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_COOKIE, cookieOpts('/api/admin'));
    return { ok: true };
  }

  @Post('password')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async changePassword(@Req() req: AdminRequest, @Body() dto: ChangePasswordDto) {
    const admin = await this.db.adminUser.findUnique({ where: { id: req.admin.sub } });
    if (!admin || !(await verifyPassword(dto.currentPassword, admin.passwordHash))) throw new BadRequestException('Current password is incorrect.');
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Choose a different password.');
    await this.db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(dto.newPassword) } });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  async me(@Req() req: AdminRequest) {
    const admin = await this.db.adminUser.findUnique({ where: { id: req.admin.sub }, select: { id: true, email: true, name: true, role: true } });
    if (!admin) throw new UnauthorizedException();
    return admin;
  }
}

/* ---------- products ---------- */

const TYPES = ['JAR', 'BOX', 'COMBO', 'HAMPER', 'PURSE', 'CARD'] as const;
const STATUSES = ['ACTIVE', 'COMING_SOON', 'DRAFT', 'ARCHIVED'] as const;

class VariantDto {
  @IsString() @MinLength(1) @MaxLength(60) title!: string;
  @Matches(/^[A-Za-z0-9-]{2,40}$/, { message: 'sku: letters, numbers and dashes only' }) sku!: string;
  @IsInt() @Min(100) pricePaise!: number;
  @IsOptional() @IsInt() @Min(0) mrpPaise?: number | null;
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) swatch?: string | null;
}

class UpdateVariantDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60) title?: string;
  @IsOptional() @IsInt() @Min(100) pricePaise?: number;
  @IsOptional() @IsInt() @Min(0) mrpPaise?: number | null;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) swatch?: string | null;
}

class ArtDto {
  @Matches(/^#[0-9a-fA-F]{6}$/) label!: string;
  @Matches(/^#[0-9a-fA-F]{6}$/) accent!: string;
  @Matches(/^#[0-9a-fA-F]{6}$/) bg!: string;
}

class ImageDto {
  @IsOptional() @IsString() @MaxLength(160) alt?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

class ProductFields {
  @IsOptional() @ValidateNested() @Type(() => ArtDto) art?: ArtDto;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) title?: string;
  @IsOptional() @IsIn(TYPES) type?: (typeof TYPES)[number];
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(300) short?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) @ArrayMaxSize(30) ingredients?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) @ArrayMaxSize(8) highlights?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(120, { each: true }) @ArrayMaxSize(20) contains?: string[];
  @IsOptional() @IsString() @MaxLength(40) shelfLife?: string | null;
  @IsOptional() @IsString() @MaxLength(20) optionName?: string;
  @IsOptional() @IsString() @MaxLength(80) limitedNote?: string | null;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(170) seoDescription?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(12) collections?: string[];
}

class CreateProductDto extends ProductFields {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug: lowercase letters, numbers and dashes' }) @MaxLength(120) slug!: string;
  @IsString() @MinLength(2) @MaxLength(160) declare title: string;
  @IsIn(TYPES) declare type: (typeof TYPES)[number];
  @IsString() @MaxLength(300) declare short: string;
  @IsString() @MaxLength(5000) declare description: string;
  @ValidateNested({ each: true }) @Type(() => VariantDto) @ArrayMinSize(1) @ArrayMaxSize(10) variants!: VariantDto[];
}

/** Only MRPs above the selling price make sense; anything else is stored as "no MRP". */
const cleanMrp = (mrp: number | null | undefined, price: number) => (mrp && mrp > price ? mrp : null);

const IMAGE_TYPES: [string, (b: Buffer) => boolean][] = [
  ['jpg', b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['png', b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['webp', b => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'],
];
export const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private db: PrismaService) {}

  @Get('collections')
  collections() { return this.db.collection.findMany({ orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }], select: { id: true, slug: true, title: true, kind: true } }); }

  @Get('products')
  products() {
    return this.db.product.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true, title: true, type: true, status: true, art: true, updatedAt: true,
        collections: { select: { slug: true, title: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        variants: { orderBy: { position: 'asc' }, select: { id: true, title: true, sku: true, pricePaise: true, mrpPaise: true, stock: true, swatch: true } },
      },
    }).then(rows => rows.map(r => ({ ...r, images: r.images.map(i => ({ url: assetUrl(i.url) })) })));
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    const p = await this.db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { position: 'asc' } }, images: { orderBy: { position: 'asc' } }, collections: { select: { slug: true } } },
    });
    if (!p) throw new NotFoundException();
    return { ...p, collections: p.collections.map(c => c.slug), images: p.images.map(i => ({ ...i, url: assetUrl(i.url) })) };
  }

  @Post('products')
  async create(@Body() dto: CreateProductDto) {
    if (await this.db.product.findUnique({ where: { slug: dto.slug } })) throw new ConflictException('A product with this slug already exists.');
    const skus = dto.variants.map(v => v.sku);
    if (new Set(skus).size !== skus.length || (await this.db.productVariant.count({ where: { sku: { in: skus } } }))) throw new ConflictException('SKU already in use.');
    const { variants, collections, ...fields } = dto;
    const last = await this.db.product.aggregate({ _max: { sortOrder: true } });
    const p = await this.db.product.create({
      data: {
        ...fields, status: fields.status ?? 'DRAFT', sortOrder: (last._max.sortOrder ?? 0) + 1,
        art: { label: '#1F4D3A', accent: '#C9A227', bg: '#F3EBD6', ...dto.art },
        collections: { connect: (collections ?? []).map(slug => ({ slug })) },
        variants: { create: variants.map((v, position) => ({ ...v, mrpPaise: cleanMrp(v.mrpPaise, v.pricePaise), position })) },
      },
    });
    return this.product(p.id);
  }

  @Patch('products/:id')
  async update(@Param('id') id: string, @Body() dto: ProductFields) {
    await this.ensure(this.db.product.findUnique({ where: { id } }));
    const { collections, art, ...fields } = dto;
    const cur = await this.db.product.findUniqueOrThrow({ where: { id }, select: { art: true } });
    await this.db.product.update({
      where: { id },
      data: {
        ...fields,
        ...(art ? { art: { ...((cur.art as object) ?? {}), ...art } } : {}), // keep extra art keys (jars, withBox, window)
        ...(collections ? { collections: { set: collections.map(slug => ({ slug })) } } : {}),
      },
    });
    return this.product(id);
  }

  @Post('products/:id/variants')
  async addVariant(@Param('id') id: string, @Body() dto: VariantDto) {
    await this.ensure(this.db.product.findUnique({ where: { id } }));
    if (await this.db.productVariant.findUnique({ where: { sku: dto.sku } })) throw new ConflictException('SKU already in use.');
    const position = await this.db.productVariant.count({ where: { productId: id } });
    return this.db.productVariant.create({ data: { ...dto, mrpPaise: cleanMrp(dto.mrpPaise, dto.pricePaise), productId: id, position } });
  }

  @Patch('variants/:id')
  async updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    const v = await this.ensure(this.db.productVariant.findUnique({ where: { id } }));
    const price = dto.pricePaise ?? v.pricePaise;
    const mrp = dto.mrpPaise === undefined ? cleanMrp(v.mrpPaise, price) : cleanMrp(dto.mrpPaise, price);
    return this.db.productVariant.update({
      where: { id },
      data: { pricePaise: price, mrpPaise: mrp, ...(dto.stock !== undefined ? { stock: dto.stock } : {}), ...(dto.title ? { title: dto.title } : {}), ...(dto.swatch !== undefined ? { swatch: dto.swatch } : {}) },
      select: { id: true, title: true, sku: true, pricePaise: true, mrpPaise: true, stock: true, swatch: true },
    });
  }

  @Delete('variants/:id')
  async deleteVariant(@Param('id') id: string) {
    const v = await this.ensure(this.db.productVariant.findUnique({ where: { id } }));
    if ((await this.db.productVariant.count({ where: { productId: v.productId } })) <= 1) throw new BadRequestException('A product needs at least one size. Archive the product instead.');
    await this.db.productVariant.delete({ where: { id } });
    return { ok: true };
  }

  @Post('products/:id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024, files: 1 } }))
  async upload(@Param('id') id: string, @UploadedFile() file?: { buffer: Buffer; size: number }) {
    await this.ensure(this.db.product.findUnique({ where: { id } }));
    if (!file?.buffer?.length) throw new BadRequestException('Choose an image file (JPG, PNG or WebP, up to 3 MB).');
    // Trust the file's bytes, not its name or the browser's Content-Type.
    const ext = IMAGE_TYPES.find(([, test]) => test(file.buffer))?.[0];
    if (!ext) throw new BadRequestException('Only JPG, PNG or WebP images are allowed.');
    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomBytes(12).toString('hex')}.${ext}`;
    await writeFile(join(UPLOAD_DIR, name), file.buffer);
    const position = await this.db.productImage.count({ where: { productId: id } });
    const product = await this.db.product.findUniqueOrThrow({ where: { id }, select: { title: true } });
    const img = await this.db.productImage.create({ data: { productId: id, url: `/uploads/${name}`, alt: product.title, position } });
    return { ...img, url: assetUrl(img.url) };
  }

  @Patch('images/:id')
  async updateImage(@Param('id') id: string, @Body() dto: ImageDto) {
    const img = await this.ensure(this.db.productImage.findUnique({ where: { id } }));
    if (dto.position !== undefined) {
      // move within the product's images and renumber 0..n-1
      const all = await this.db.productImage.findMany({ where: { productId: img.productId }, orderBy: { position: 'asc' } });
      const rest = all.filter(i => i.id !== id);
      rest.splice(Math.min(dto.position, rest.length), 0, img);
      await this.db.$transaction(rest.map((i, position) => this.db.productImage.update({ where: { id: i.id }, data: { position } })));
    }
    const updated = await this.db.productImage.update({ where: { id }, data: dto.alt !== undefined ? { alt: dto.alt } : {} });
    return { ...updated, url: assetUrl(updated.url) };
  }

  @Delete('images/:id')
  async deleteImage(@Param('id') id: string) {
    const img = await this.ensure(this.db.productImage.findUnique({ where: { id } }));
    await this.db.productImage.delete({ where: { id } });
    if (img.url.startsWith('/uploads/')) await unlink(join(UPLOAD_DIR, img.url.slice('/uploads/'.length))).catch(() => {});
    return { ok: true };
  }

  private async ensure<T>(p: Promise<T | null>): Promise<T> {
    const r = await p;
    if (!r) throw new NotFoundException();
    return r;
  }
}

