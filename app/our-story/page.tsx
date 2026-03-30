'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function OurStory() {
  return (
    <div className="bg-[#F9F6F0]">
      {/* Hero Section */}
      <section className="relative h-[75vh] flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 bg-black/65" />

        <div className="relative z-10 text-center px-6 max-w-4xl text-white">
          <h1 className="text-6xl md:text-7xl font-bold leading-none tracking-wider">
            The Story of<br />Ziwara
          </h1>
          <p className="mt-6 text-lg max-w-md mx-auto">
            Where tradition meets vision, and every piece tells a story of love and craftsmanship.
          </p>
          
          <Link 
            href="/shop"
            className="mt-10 inline-block border-2 border-white px-12 py-4 rounded-full text-lg hover:bg-white hover:text-[#2A3F35] transition"
          >
            Discover the Collection
          </Link>
        </div>
      </section>

      {/* The Story Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-bold mb-8 text-[#2A3F35]">The Story of Ziwara</h2>
          
          <div className="text-[#2A3F35]/80 leading-relaxed space-y-6 text-lg">
            <p>
              Ziwara was born from the ancient word <strong>“Zewar”</strong> — meaning jewelry in its purest form. 
              It is more than just a brand; it is a dream brought to life by Kritika, a visionary young gurl whose heart beats for beauty, creativity, and excellence.
            </p>
            
            <p>
              A keen student, an eager explorer, and a perfect learner — Kritika always knew she wanted to create something meaningful. 
              With endless passion and tireless dedication, she worked day and night, turning her vision into reality. 
              From sketching the first designs to carefully selecting every gem and metal, she poured her soul into Ziwara.
            </p>
            
            <p>
              Today, Ziwara stands as a celebration of slow luxury — handcrafted pieces inspired by nature’s quiet elegance. 
              Every jewel carries Kritika’s personal touch, her attention to detail, and her deep belief that jewelry should not only adorn but also tell a story.
            </p>
            
            <p>
              Kritika continues to work tirelessly, dreaming bigger every day. Her goal is simple yet powerful — to build Ziwara into a legacy that celebrates craftsmanship, sustainability, and timeless beauty.
            </p>
          </div>

          <div className="mt-12 flex items-center gap-8">
            <div>
              <p className="font-medium text-[#2A3F35]">Kritika</p>
              <p className="text-sm text-[#2A3F35]/70">Founder, Ziwara</p>
            </div>
          </div>
        </div>

        {/* Kritika's Photo */}
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-[#E8E0D0]">
          <Image 
            src="/Kritika.webp"
            alt="Kritika - Founder of Ziwara"
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-8 left-8 text-white">
            <p className="text-sm tracking-widest">FOUNDER’S VISION</p>
            <p className="text-2xl font-medium mt-1">Crafted with love,<br />worn with pride.</p>
          </div>
        </div>
      </section>
    </div>
  );
}