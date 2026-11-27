import type { Metadata } from 'next';
import { TrackView } from '@/components/account';
import { Art } from '@/components/bits';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = { title: 'Track your order', description: 'Enter your order ID and mobile number to see live order status.' };

export default function TrackPage() {
  return <><PageHero title="Track your order" sub="Enter your order ID and mobile number to see live status." crumb="Track Order" art={<Art slug="mix-dryfruit" />} /><TrackView /></>;
}
