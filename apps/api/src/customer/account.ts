import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards, ConflictException } from '@nestjs/common';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PrismaService } from '../common/prisma.service.js';
import { CustomerGuard, publicUser, type CustomerRequest } from './auth.js';
import { orderDetail, orderSummary } from '../shop/orders-view.js';

export class AddressDto {
  @IsString() @MaxLength(80) name!: string;
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit mobile number' }) phone!: string;
  @IsString() @MaxLength(200) line1!: string;
  @IsOptional() @IsString() @MaxLength(120) landmark?: string;
  @IsString() @MaxLength(60) city!: string;
  @IsString() @MaxLength(60) state!: string;
  @Matches(/^[1-9]\d{5}$/, { message: 'pincode must be 6 digits' }) pincode!: string;
  @IsOptional() @IsIn(['HOME', 'WORK', 'OTHER']) type?: 'HOME' | 'WORK' | 'OTHER';
}

class ProfileDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @Matches(/^[6-9]\d{9}$/) phone?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsBoolean() marketingOptIn?: boolean;
}

@Controller('account')
@UseGuards(CustomerGuard)
export class AccountController {
  constructor(private db: PrismaService) {}

  @Patch('profile')
  async profile(@Req() req: CustomerRequest, @Body() dto: ProfileDto) {
    try {
      return await this.db.user.update({
        where: { id: req.userId },
        data: { ...dto, email: dto.email?.toLowerCase(), dob: dto.dob ? new Date(dto.dob) : undefined },
        select: publicUser,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') throw new ConflictException('That email or phone is already used by another account.');
      throw e;
    }
  }

  @Get('addresses')
  addresses(@Req() req: CustomerRequest) {
    return this.db.address.findMany({ where: { userId: req.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  @Post('addresses')
  async addAddress(@Req() req: CustomerRequest, @Body() dto: AddressDto) {
    const first = (await this.db.address.count({ where: { userId: req.userId } })) === 0;
    return this.db.address.create({ data: { ...dto, userId: req.userId, isDefault: first } });
  }

  @Delete('addresses/:id')
  async deleteAddress(@Req() req: CustomerRequest, @Param('id') id: string) {
    const { count } = await this.db.address.deleteMany({ where: { id, userId: req.userId } });
    if (!count) throw new NotFoundException();
    return { ok: true };
  }

  @Get('orders')
  async orders(@Req() req: CustomerRequest) {
    const rows = await this.db.order.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: { select: { slug: true } } } } } });
    return rows.map(orderSummary);
  }

  @Get('orders/:number')
  async order(@Req() req: CustomerRequest, @Param('number') number: string) {
    const o = await this.db.order.findFirst({ where: { number, userId: req.userId }, include: orderDetail.include });
    if (!o) throw new NotFoundException('Order not found');
    return orderDetail.map(o);
  }
}
