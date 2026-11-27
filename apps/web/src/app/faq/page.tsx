import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList } from '@/components/forms';
import { PageHero } from '@/components/page-hero';
import { getFaqs, getSettings } from '@/lib/api';

export const metadata: Metadata = { title: 'FAQs', description: 'Answers about orders, delivery, returns, storage and bulk gifting.' };

export default async function FaqPage() {
  const [faqs, { brand }] = await Promise.all([getFaqs(), getSettings()]);
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <PageHero title="Frequently asked questions" sub="Everything about orders, delivery, returns and our products." crumb="FAQs" />
      <section className="section"><div className="container" style={{ maxWidth: 900 }}>
        <FaqList faqs={faqs} />
        <div className="card center" style={{ marginTop: 40 }}><h3>Still have a question?</h3><p className="muted">Our team is happy to help.</p>
          <div className="btn-row btn-row--center"><a className="btn btn--primary" href={`https://wa.me/${brand.whatsapp}`}>WhatsApp us</a><Link className="btn btn--outline" href="/contact">Contact form</Link></div></div>
      </div></section>
    </>
  );
}
