import type { Metadata } from 'next';
import { CartView } from '@/components/checkout';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return <><PageHero title="Your Cart" sub="Review your items, apply a coupon and check out securely." crumb="Cart" /><CartView /></>;
}
