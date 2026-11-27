import type { Metadata } from 'next';
import Link from 'next/link';
import { Art } from '@/components/bits';
import { EnquiryForm } from '@/components/forms';
import { Icon } from '@/components/icons';
import { PageHero } from '@/components/page-hero';
import { getSettings } from '@/lib/api';

export const metadata: Metadata = { title: 'Contact us', description: 'Questions about an order, a product or bulk gifting? Reach out on WhatsApp, email or the contact form.' };

export default async function Contact() {
  const { brand } = await getSettings();
  return (
    <>
      <PageHero title="We’d love to hear from you" sub="Questions about an order, a product or bulk gifting? Reach out: we reply within 24 hours." crumb="Contact" />
      <div className="container"><div className="contact-cards">
        <a className="ccard" href={`https://wa.me/${brand.whatsapp}`}><div className="value__icon"><Icon name="phone" size="lg" /></div><h3>WhatsApp</h3><p className="muted">{brand.phone}</p></a>
        <a className="ccard" href={`mailto:${brand.email}`}><div className="value__icon"><Icon name="mail" size="lg" /></div><h3>Email</h3><p className="muted">{brand.email}</p></a>
        <div className="ccard"><div className="value__icon"><Icon name="clock" size="lg" /></div><h3>Hours</h3><p className="muted">{brand.hours}</p></div>
        <Link className="ccard" href="/track-order"><div className="value__icon"><Icon name="truck" size="lg" /></div><h3>Track order</h3><p className="muted">Live order status</p></Link>
      </div></div>

      <section className="section"><div className="container contact-grid">
        <EnquiryForm type="CONTACT" phone={brand.phone} title={<h2>Send us a message</h2>} submit="Send message" fields={[
          { name: 'name', label: 'Name', required: true, half: true }, { name: 'email', label: 'Email', type: 'email', required: true, half: true },
          { name: 'phone', label: 'Phone', required: true, half: true }, { name: 'topic', label: 'Topic', options: ['Order help', 'Product question', 'Returns & refunds', 'Bulk / corporate gifting', 'Something else'], half: true },
          { name: 'message', label: 'Message', required: true, textarea: true },
        ]} />
        <div>
          <div className="map"><svg viewBox="0 0 400 300" width="100%" height="100%" role="img" aria-label="Map placeholder"><rect width="400" height="300" fill="#E8F0E6" /><path d="M0 200C80 170 120 230 200 190S320 120 400 150" stroke="#fff" strokeWidth="18" fill="none" /><path d="M120 0V300M280 0V300M0 90H400" stroke="#fff" strokeWidth="10" /><circle cx="200" cy="140" r="40" fill="#C9A227" opacity=".25" /><path d="M200 165s-26-24-26-44a26 26 0 0 1 52 0c0 20-26 44-26 44z" fill="#1F4D3A" /><circle cx="200" cy="121" r="9" fill="#E6C766" /></svg></div>
          <div className="card" style={{ marginTop: 18 }}><h3>Visit our kitchen</h3><p className="muted">{brand.address}</p><p className="muted" style={{ margin: 0 }}>Tastings by appointment only.</p></div>
          <div className="card" style={{ marginTop: 18 }}><h3>Quick answers</h3><p className="muted">Delivery times, returns, coupons and storage tips are all in our FAQ.</p><Link className="link" href="/faq">Visit FAQs <Icon name="arrow" size="sm" /></Link></div>
        </div>
      </div></section>

      <section className="section section--sage" id="bulk"><div className="container split">
        <div><span className="eyebrow">Bulk &amp; corporate gifting</span><h2>Gift health to your team, clients or wedding guests</h2>
          <ul className="ticks">{['Custom logo sleeves, ribbons & message cards', 'Special pricing from 25 boxes', 'Individual delivery to every address in India', 'GST invoice for businesses'].map(t => <li key={t}><span className="tick"><Icon name="check" size="sm" /></span>{t}</li>)}</ul>
          <div style={{ maxWidth: 460 }}><Art hero={1} /></div></div>
        <EnquiryForm type="BULK" phone={brand.phone} title={<h3>Get a quote within 24 hours</h3>} submit="Request a quote" fields={[
          { name: 'name', label: 'Name', required: true, half: true }, { name: 'company', label: 'Company (optional)', half: true },
          { name: 'email', label: 'Email', type: 'email', required: true, half: true }, { name: 'phone', label: 'Phone', required: true, half: true },
          { name: 'quantity', label: 'Quantity', options: ['25–50 boxes', '50–100 boxes', '100–500 boxes', '500+ boxes'], half: true }, { name: 'occasion', label: 'Occasion', options: ['Diwali', 'Wedding', 'Corporate event', 'Rakhi', 'Other'], half: true },
          { name: 'message', label: 'Requirements', required: true, textarea: true, placeholder: 'Budget per box, delivery date, branding needs…' },
        ]} />
      </div></section>
    </>
  );
}
