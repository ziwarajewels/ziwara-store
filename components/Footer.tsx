'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#F9F6F0] border-t border-[#E8E0D0] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand Column - centered on mobile */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D4AF37]/30">
                <Image
                  src="/Logo.png"
                  alt="Ziwara"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <span className="text-3xl tracking-widest font-bold text-[#2A3F35]">ZIWARA</span>
            </div>
            <p className="text-[#2A3F35]/70 leading-relaxed max-w-xs mx-auto md:mx-0 text-sm">
              Handcrafted jewelry inspired by nature’s quiet beauty.
              Every piece is made with love, intention, and the finest materials.
            </p>
          </div>

          {/* Quick Links - centered on mobile */}
          <div className="text-center md:text-left">
            <h4 className="font-semibold text-[#2A3F35] mb-5 tracking-wider text-sm">EXPLORE</h4>
            <div className="space-y-3 text-sm">
              <Link href="/shop" className="block hover:text-[#D4AF37] transition">Shop All</Link>
              <Link href="/our-story" className="block hover:text-[#D4AF37] transition">Our Story</Link>
              <Link href="/contact" className="block hover:text-[#D4AF37] transition font-medium">Contact Us</Link>
            </div>
          </div>

          {/* Connect + Contact Info - centered on mobile */}
          <div className="text-center md:text-left">
            <h4 className="font-semibold text-[#2A3F35] mb-5 tracking-wider text-sm">CONNECT</h4>

            <a
              href="https://www.instagram.com/ziwara.jewelss"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center md:justify-start gap-4 mx-auto md:mx-0"
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#E8E0D0] group-hover:border-[#D4AF37] transition">
                <Image
                  src="/instagram.png"
                  alt="Instagram"
                  width={50}
                  height={50}
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="font-medium text-[#2A3F35] group-hover:text-[#D4AF37] transition">
                  @ziwara.jewelss
                </p>
                <p className="text-xs text-[#2A3F35]/60">Follow our journey</p>
              </div>
            </a>

            <div className="mt-10">
              <h4 className="font-semibold text-[#2A3F35] mb-4 text-sm tracking-wider">GET IN TOUCH</h4>
              <div className="space-y-2 text-sm text-[#2A3F35]/80">
                <div className="font-bold text-base text-[#2A3F35]">Kritika Rathod</div>
                <a href="mailto:ziwarajewels@gmail.com" className="block hover:text-[#D4AF37] transition">
                  ziwarajewels@gmail.com
                </a>
                <div className="space-y-1">
                  <a href="tel:+917225841587" className="block hover:text-[#D4AF37] transition">
                    +91 72258 41587
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - centered on mobile */}
        <div className="mt-16 pt-8 border-t border-[#E8E0D0] flex flex-col md:flex-row items-center justify-center md:justify-between gap-6 text-xs text-[#2A3F35]/60">
          <div className="flex items-center gap-6 text-center md:text-left">
            <span>🔒 Secure Checkout</span>
            <span>Handcrafted in India</span>
          </div>

          <p className="text-center">© {new Date().getFullYear()} ZIWARA. All rights reserved.</p>

        </div>
      </div>
    </footer>
  );
}