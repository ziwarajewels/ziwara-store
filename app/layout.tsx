import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://ziwarajewels.vercel.app'),

  title: {
    default: 'Ziwara | Handcrafted Jewelry Inspired by Nature',
    template: '%s | Ziwara',
  },

  description:
    'Premium handcrafted jewelry by Kritika & Saransh. Ethically sourced, sustainably made with love and artistry.',

  keywords: [
    'handcrafted jewelry',
    'ethical jewelry',
    'sustainable jewelry',
    'ziwara',
    'ziwarajewels',
    'indian handmade jewelry',
    'gold jewelry india',
    'pearl jewelry',
  ],

  authors: [{ name: 'Kritika & Saransh' }],

  openGraph: {
    title: 'Ziwara | Handcrafted Jewelry Inspired by Nature',
    description:
      'Premium handcrafted jewelry by Kritika & Saransh. Ethically sourced and designed with love.',
    url: 'https://ziwarajewels.vercel.app',
    siteName: 'Ziwara',
    images: [
      {
        url: '/hero-bg.jpg',
        width: 1200,
        height: 630,
        alt: 'Ziwara Jewelry Collection',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Ziwara | Handcrafted Jewelry Inspired by Nature',
    description:
      'Premium handcrafted jewelry by Kritika & Saransh.',
    images: ['/hero-bg.jpg'],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <head>
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="3BVeD1rYTH3i2fh0bHaE5XQVddQjeJt5UFQB1KDY-8I" />
      </head>
      <body className="bg-[#F9F6F0] text-[#2A3F35]">
        
        {/* Global Header */}
        <Header />

        {/* Page Content */}
        <main>{children}</main>

        {/* Global Footer */}
        <Footer />

      </body>
    </html>
  );
}