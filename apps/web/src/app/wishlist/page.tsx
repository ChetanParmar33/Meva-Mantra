import type { Metadata } from 'next';
import { WishlistView } from '@/components/account';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default function WishlistPage() {
  return <><PageHero title="Your Wishlist" sub="Everything you’ve saved for later, in one place." crumb="Wishlist" /><section className="section"><div className="container"><WishlistView /></div></section></>;
}
