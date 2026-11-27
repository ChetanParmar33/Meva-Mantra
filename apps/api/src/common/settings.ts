import type { PrismaService } from './prisma.service.js';

export type StoreSettings = {
  brand: { name: string; tagline: string; phone: string; whatsapp: string; email: string; address: string; hours: string };
  prepaidDiscountPct: number;
  freeShippingAbovePaise: number;
  shippingFeePaise: number;
  giftWrapPaise: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  brand: { name: 'Meva Mantra', tagline: '', phone: '', whatsapp: '', email: '', address: '', hours: '' },
  prepaidDiscountPct: 5, freeShippingAbovePaise: 50000, shippingFeePaise: 4900, giftWrapPaise: 4900,
};

export async function getSettings(db: PrismaService): Promise<StoreSettings> {
  const rows = await db.setting.findMany();
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map(r => [r.key, r.value])) } as StoreSettings;
}
