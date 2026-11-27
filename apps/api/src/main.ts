import './env.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { UPLOAD_DIR } from './admin/admin.js';
import { AppModule } from './app.module.js';
import { rateLimit } from './common/rate-limit.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true }); // rawBody: webhook signatures
app.setGlobalPrefix('api');
app.enableCors({ origin: (process.env.CORS_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean), credentials: true });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads/', maxAge: '7d', index: false, dotfiles: 'deny' });
app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // real client IP when behind a local reverse proxy (Caddy/Nginx)
// Minimal security headers for a JSON API.
app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(rateLimit);
const port = Number(process.env.PORT ?? 4100);
await app.listen(port);
console.log(`API ready on http://localhost:${port}/api`);
