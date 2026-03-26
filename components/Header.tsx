'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Header() {
  const [cartCount, setCartCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  // Cart count logic (unchanged)
  useEffect(() => {
    let subscription: any = null;

    const fetchCartCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartCount(0);
        return;
      }
      const { data } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      const count = data?.items?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0;
      setCartCount(count);
    };

    fetchCartCount();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      subscription = supabase
        .channel('cart-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${user.id}` },
          fetchCartCount
        )
        .subscribe();
    };
    setupSubscription();

    const handleCartUpdate = () => fetchCartCount();
    const handleOrderPlaced = () => setCartCount(0);

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('orderPlaced', handleOrderPlaced);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('orderPlaced', handleOrderPlaced);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  // Block body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-[#E8E0D0] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">

          {/* Logo - SMALLER & ELEGANT on mobile, full size on desktop */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-[#D4AF37]/30 shadow-sm bg-white flex items-center justify-center">
              <Image
                src="/logocenter.png"
                alt="Ziwara"
                width={48}
                height={48}
                className="object-contain md:w-16 md:h-16"
                priority
              />
            </div>
            <span className="text-2xl md:text-3xl tracking-widest text-[#2A3F35] font-bold">ZIWARA</span>
          </Link>

          {/* DESKTOP ONLY: Nav + Search */}
          <div className="hidden md:flex items-center flex-1 max-w-[640px] mx-8">
            <nav className="flex items-center gap-8 text-lg font-medium text-[#2A3F35]">
              <Link href="/shop" className="hover:text-[#D4AF37] transition">Shop All</Link>
              <Link href="/our-story" className="hover:text-[#D4AF37] transition">Our Story</Link>
            </nav>

            <div className="flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, gemstone, material or category..."
                  className="w-full bg-[#F9F6F0] border border-[#E8E0D0] rounded-full py-3 px-5 text-sm focus:outline-none focus:border-[#D4AF37] pl-12 transition-all"
                />
                <button
                  type="submit"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#2A3F35]/60 hover:text-[#D4AF37] transition"
                >
                  <Search size={20} />
                </button>
              </form>
            </div>
          </div>

          {/* Right side icons + Mobile Hamburger */}
          <div className="flex items-center gap-5 md:gap-6">
            <Link href="/cart" className="relative hover:text-[#D4AF37] transition">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-white text-[10px] font-medium px-1.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link href="/account" className="hover:text-[#D4AF37] transition">
              <User className="w-5 h-5 md:w-6 md:h-6" />
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-[#2A3F35]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      <div
        className={`md:hidden fixed inset-0 bg-[#F9F6F0] z-[999] flex flex-col transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Menu Header */}
        <div className="px-6 py-6 border-b border-[#E8E0D0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logocenter.png"
              alt="Ziwara"
              width={48}
              height={48}
              className="object-contain"
            />
            <span className="text-3xl tracking-widest text-[#2A3F35] font-bold">ZIWARA</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-[#2A3F35]"
          >
            <X size={32} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, gemstone..."
              className="w-full bg-white border border-[#E8E0D0] rounded-3xl py-4 px-6 text-base focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-[#2A3F35]/70"
            >
              <Search size={24} />
            </button>
          </form>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-6 py-8 space-y-8 text-3xl font-medium text-[#2A3F35]">
          <Link
            href="/shop"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-[#D4AF37] transition-colors"
          >
            Shop All
          </Link>
          <Link
            href="/our-story"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block hover:text-[#D4AF37] transition-colors"
          >
            Our Story
          </Link>
        </nav>
      </div>
    </>
  );
}