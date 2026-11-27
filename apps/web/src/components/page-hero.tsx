import Link from 'next/link';
import { Icon } from './icons';

export function PageHero({ title, sub, crumb, art, children }: { title: string; sub?: string; crumb?: string; art?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="page-hero"><div className="container">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="right" size="sm" /><span>{crumb ?? title}</span></nav>
      <h1>{title}</h1>{sub && <p>{sub}</p>}{children}
    </div>{art && <div className="page-hero__art">{art}</div>}</section>
  );
}
