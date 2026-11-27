import { Controller, Get, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './admin/admin-ops.js';
import { CatalogModule } from './catalog/catalog.js';
import { PrismaModule, PrismaService } from './common/prisma.service.js';
import { ContentModule } from './content/content.js';
import { ShopModule } from './shop/shop.js';

@Controller('health')
class HealthController {
  constructor(private db: PrismaService) {}
  @Get()
  async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { ok: true, time: new Date().toISOString() };
  }
}

@Module({
  imports: [
    PrismaModule,
    // One secret, separated by audience: tokens are signed with aud "admin" or "customer".
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET }),
    CatalogModule, ShopModule, ContentModule, AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
