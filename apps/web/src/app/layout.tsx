import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Footer, Header, Overlays } from '@/components/chrome';
import { StoreProvider } from '@/components/store';
import { getAllProducts, getCollections, getSettings } from '@/lib/api';
import './globals.css';

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const serif = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', style: ['normal', 'italic'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3100'),
  title: { default: 'Meva Mantra | Premium Dry Fruits, Khajur Pak & Healthy Snacks', template: '%s | Meva Mantra' },
  description: 'Small-batch dry fruit mixes, Khajur Pak and healthy snacks roasted in pure cow ghee. No preservatives, no refined sugar.',
  openGraph: { siteName: 'Meva Mantra', type: 'website', locale: 'en_IN' },
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [settings, collections, products] = await Promise.all([getSettings(), getCollections(), getAllProducts()]);
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <StoreProvider settings={settings} collections={collections} products={products}>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <Overlays />
        </StoreProvider>
      </body>
    </html>
  );
}
