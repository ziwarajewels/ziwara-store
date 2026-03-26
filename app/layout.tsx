import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://ziwara-store.vercel.app'), // 🔥 replace with your real domain

  title: {
    default: 'Ziwara | Handcrafted Jewelry Inspired by Nature',
    template: '%s | Ziwara',
  },

  description:
    'Premium handcrafted jewelry by Kritika & Saransh. Ethically sourced, sustainably made, and designed with love.',

  keywords: [
    'handcrafted jewelry',
    'ethical jewelry India',
    'sustainable jewelry',
    'ziwara',
    'indian handmade jewelry',
  ],

  openGraph: {
    title: 'Ziwara | Handcrafted Jewelry Inspired by Nature',
    description:
      'Premium handcrafted jewelry by Kritika & Saransh.',
    url: '/',
    siteName: 'Ziwara',
    images: [
      {
        url: '/hero-bg.jpg',
        width: 1200,
        height: 630,
        alt: 'Ziwara Jewelry',
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
      <body className="bg-[#F9F6F0] text-[#2A3F35]">
        
        {/* ✅ GLOBAL HEADER */}
        <Header />

        {/* ✅ PAGE CONTENT */}
        <main>{children}</main>

        {/* ✅ GLOBAL FOOTER */}
        <Footer />

      </body>
    </html>
  );
}