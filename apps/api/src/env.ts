// Imported first by main.ts / seed.ts so process.env is ready before other modules evaluate.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing ${key} in apps/api/.env`);
}
