import Link from 'next/link';

export function NotFoundView({ title = 'Oops, this jar is empty', text = 'The page you’re looking for has been moved or doesn’t exist.' }: { title?: string; text?: string }) {
  return (
    <section className="nf"><div className="container">
      <div className="nf__num" aria-hidden="true">4<span>0</span>4</div>
      <h1>{title}</h1><p className="muted">{text}</p>
      <div className="btn-row btn-row--center" style={{ marginTop: 24 }}>
        <Link className="btn btn--primary btn--lg" href="/">Go home</Link><Link className="btn btn--outline btn--lg" href="/shop">Shop all products</Link>
      </div>
    </div></section>
  );
}
