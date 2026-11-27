import {
  BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, HttpException, HttpStatus,
  Injectable, Post, Req, Res, ServiceUnavailableException, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString, Length, Matches, MaxLength } from 'class-validator';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { sendMail, mailConfigured } from '../common/mailer.js';
import { PrismaService } from '../common/prisma.service.js';
import { USER_COOKIE, cookieOpts, isDev, readCookie } from '../common/session.js';

export type CustomerRequest = Request & { userId: string };
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000, OTP_GAP_MS = 30 * 1000, OTP_PER_HOUR = 5, OTP_MAX_TRIES = 5;

/** "98765 43210" / "+91 9876543210" → "9876543210"; emails lower-cased. */
export function normalizeTarget(raw: string): { target: string; channel: 'sms' | 'email' } | null {
  const t = raw.trim().toLowerCase();
  if (/^\S+@\S+\.\S+$/.test(t)) return { target: t, channel: 'email' };
  const digits = t.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? { target: digits, channel: 'sms' } : null;
}
const hash = (target: string, code: string) => createHash('sha256').update(`${target}:${code}:${process.env.JWT_SECRET}`).digest('hex');

export async function userIdFrom(req: Request, jwt: JwtService): Promise<string | undefined> {
  const token = readCookie(req, USER_COOKIE);
  if (!token) return;
  try { return (await jwt.verifyAsync<{ sub: string }>(token, { audience: 'customer' })).sub; } catch { return; }
}

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<CustomerRequest>();
    const id = await userIdFrom(req, this.jwt);
    if (!id) throw new UnauthorizedException('Please log in');
    req.userId = id;
    return true;
  }
}

class OtpRequestDto { @IsString() @MaxLength(120) target!: string; }
class OtpVerifyDto {
  @IsString() @MaxLength(120) target!: string;
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/) code!: string;
}

export const publicUser = { id: true, phone: true, email: true, name: true, dob: true, marketingOptIn: true } as const;

@Controller('auth')
export class CustomerAuthController {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  @Post('otp/request')
  @HttpCode(200)
  async request(@Body() dto: OtpRequestDto) {
    const n = normalizeTarget(dto.target);
    if (!n) throw new BadRequestException('Enter a valid 10-digit mobile number or email.');
    const recent = await this.db.otpCode.findMany({ where: { target: n.target, createdAt: { gt: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' } });
    if (recent[0] && Date.now() - +recent[0].createdAt < OTP_GAP_MS) throw new HttpException('Please wait 30 seconds before requesting another code.', HttpStatus.TOO_MANY_REQUESTS);
    if (recent.length >= OTP_PER_HOUR) throw new HttpException('Too many codes requested. Try again in an hour.', HttpStatus.TOO_MANY_REQUESTS);
    // SMS needs a paid provider; until one is added, phones only work in local dev (code shown on screen).
    if (n.channel === 'sms' && !isDev()) throw new ServiceUnavailableException('SMS login is not available yet. Please use your email.');
    if (n.channel === 'email' && !mailConfigured() && !isDev()) throw new ServiceUnavailableException('Email is not configured.');

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.db.otpCode.create({ data: { target: n.target, codeHash: hash(n.target, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    if (n.channel === 'email') await sendMail(n.target, `${code} is your Meva Mantra login code`, `Your login code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, ignore this email.`);
    else console.log(`[otp:dev] ${n.target} → ${code}`);
    return { sent: true, channel: n.channel, ...(isDev() ? { devCode: code } : {}) };
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verify(@Body() dto: OtpVerifyDto, @Res({ passthrough: true }) res: Response) {
    const n = normalizeTarget(dto.target);
    if (!n) throw new BadRequestException('Invalid mobile number or email.');
    const otp = await this.db.otpCode.findFirst({ where: { target: n.target, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.attempts >= OTP_MAX_TRIES) throw new BadRequestException('Code expired. Please request a new one.');
    const ok = timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(hash(n.target, dto.code)));
    if (!ok) {
      await this.db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException(`Incorrect code. ${OTP_MAX_TRIES - otp.attempts - 1} tries left.`);
    }
    await this.db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const where = n.channel === 'email' ? { email: n.target } : { phone: n.target };
    const user = await this.db.user.upsert({ where, create: where, update: {}, select: publicUser });
    res.cookie(USER_COOKIE, await this.jwt.signAsync({ sub: user.id }, { audience: 'customer', expiresIn: '30d' }), { ...cookieOpts('/api'), maxAge: SESSION_MS });
    return { user };
  }

  @Get('me')
  @UseGuards(CustomerGuard)
  async me(@Req() req: CustomerRequest) {
    const user = await this.db.user.findUnique({ where: { id: req.userId }, select: publicUser });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(USER_COOKIE, cookieOpts('/api'));
    return { ok: true };
  }
}

