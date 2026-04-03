'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Leaf, Award, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [limitedProduct, setLimitedProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: limited } = await supabase
        .from('products')
        .select('*')
        .eq('is_limited', true)
        .single();

      const query = supabase
        .from('products')
        .select('*')
        .eq('is_limited', false)
        .order('created_at', { ascending: false });

      if (limited) query.limit(8);

      const { data: featured } = await query;

      setLimitedProduct(limited || null);
      setFeaturedProducts(featured || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-[#2A3F35]">
        Loading treasures...
      </div>
    );
  }

  return (
    <>
      {/* HERO - Mobile optimized */}
      <section
        className="relative h-screen bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <p className="text-[#D4AF37] tracking-[3px] text-sm font-medium mb-4">
            ARTISTRY IN EVERY DETAIL
          </p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-none tracking-wider">
            Nature's Soul,<br />Hand-Forged.
          </h1>
          <p className="mt-6 text-white/90 text-lg sm:text-xl max-w-md mx-auto">
            Discover a collection inspired by the rhythm of the botanical world, crafted for the modern visionary who values slow luxury.
          </p>
          <Link
            href="/shop"
            className="mt-10 inline-block bg-white text-[#2A3F35] px-8 sm:px-10 py-4 rounded-full font-medium hover:bg-[#D4AF37] hover:text-white transition-all text-base"
          >
            Shop Featured Collection
          </Link>
        </div>
      </section>

      {/* Trust Icons */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center border-b border-[#E8E0D0]">
        {[
          { icon: Leaf, title: "Artisanal Crafts", desc: "Every piece is hand-finished in our boutique studio." },
          { icon: Leaf, title: "Kind to Earth", desc: "100% recycled metals and responsibly sourced gems." },
          { icon: Award, title: "Anti-Tarnished Jewels", desc: "These Jewels comes with AntiTarnishing property" },
          { icon: Globe, title: "Global Journey", desc: "Carbon-neutral delivery for all orders within Sehore and VIT Bhopal." },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <item.icon className="w-9 h-9 md:w-10 md:h-10 text-[#2A3F35] mb-4" />
            <h4 className="font-semibold text-lg">{item.title}</h4>
            <p className="text-sm md:text-base text-[#2A3F35]/70 mt-3 max-w-[220px]">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Featured Treasures */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <p className="text-[#D4AF37] tracking-widest text-sm">THE CURATOR'S CHOICE</p>
          <h2 className="text-4xl font-bold mt-2">Featured Treasures</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {featuredProducts.map((product) => (
            <Link href={`/product/${product.id}`} key={product.id} className="group">
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#F9F6F0]">
                <img
                  src={product.images?.[0] || "/hero-bg.jpg"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              </div>
              <div className="mt-5 text-center">
                <h3 className="font-medium text-lg">{product.name}</h3>
                <p className="text-[#D4AF37] font-medium mt-1">₹{product.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LIMITED RELEASE */}
      {limitedProduct && (
        <section className="bg-[#F9F6F0] py-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* LEFT CONTENT */}
              <div>
                <p className="text-[#D4AF37] text-xl tracking-widest">LIMITED RELEASE</p>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight mt-4">
                  {limitedProduct.name}
                </h2>
                <p className="mt-6 text-lg text-[#2A3F35]/80">
                  {limitedProduct.description || "A rare handcrafted piece, available for a limited time only."}
                </p>

                <Link
                  href={`/product/${limitedProduct.id}`}
                  className="inline-block mt-8 bg-[#2A3F35] text-white px-8 py-4 rounded-full hover:bg-[#D4AF37] hover:text-[#2A3F35] transition text-base"
                >
                  Explore Collection
                </Link>
              </div>

              {/* Collage - Responsive */}
              <div className="w-full max-w-[460px] mx-auto md:ml-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href={`/product/${limitedProduct.id}`}
                    className="row-span-2 rounded-[26px] overflow-hidden group relative shadow-sm"
                  >
                    <img
                      src={limitedProduct.images?.[0] || "/hero-bg.jpg"}
                      alt=""
                      className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  </Link>

                  <div className="flex flex-col gap-4">
                    <Link
                      href={`/product/${limitedProduct.id}`}
                      className="h-[120px] rounded-[22px] overflow-hidden group relative shadow-sm"
                    >
                      <img
                        src={limitedProduct.images?.[1] || limitedProduct.images?.[0]}
                        alt=""
                        className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
                      />
                    </Link>
                    <Link
                      href={`/product/${limitedProduct.id}`}
                      className="h-[140px] rounded-[22px] overflow-hidden group relative shadow-sm"
                    >
                      <img
                        src={limitedProduct.images?.[2] || limitedProduct.images?.[0]}
                        alt=""
                        className="w-full h-full object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}