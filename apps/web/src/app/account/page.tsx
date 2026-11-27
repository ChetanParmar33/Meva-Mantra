import type { Metadata } from 'next';
import { AccountView } from '@/components/account';
import { PageHero } from '@/components/page-hero';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };

export default function AccountPage() {
  return <><PageHero title="My Account" sub="Track orders, manage addresses and update your profile." crumb="Account" /><div className="container"><AccountView /></div></>;
}
