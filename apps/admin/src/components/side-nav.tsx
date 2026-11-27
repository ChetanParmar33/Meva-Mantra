'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/products', label: 'Products & stock' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/enquiries', label: 'Enquiries' },
  { href: '/subscribers', label: 'Subscribers' },
  { href: '/settings', label: 'Settings' },
];
const base = 'rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-white/10';

/** Plain links: used as the Suspense fallback while the current path is unknown. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <>{NAV.map((n) => <Link key={n.href} href={n.href} onClick={onNavigate} className={base}>{n.label}</Link>)}</>;
}

export function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  return (
    <>
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active(n.href) ? 'page' : undefined}
          className={`${base} ${active(n.href) ? 'bg-gold text-green-900 hover:bg-gold' : ''}`}>
          {n.label}
        </Link>
      ))}
    </>
  );
}
