'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ShopContent() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('search')?.toLowerCase().trim() || '';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedGemstones, setSelectedGemstones] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState(1000);
  const [sortType, setSortType] = useState<'newest' | 'price-low' | 'price-high'>('newest');

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_limited', false)
        .order('created_at', { ascending: false });

      setProducts(data || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  // ✅ FIXED REALTIME (ONLY CHANGE HERE)
  useEffect(() => {
    const channel = supabase
      .channel('shop-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          supabase
            .from('products')
            .select('*')
            .eq('is_limited', false)
            .order('created_at', { ascending: false })
            .then(({ data }) => setProducts(data || []));
        }
      )
      .subscribe();

    // ✅ IMPORTANT FIX: wrap in {} so no Promise is returned
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 1000;
    return Math.max(...products.map(p => p.price || 0));
  }, [products]);

  useEffect(() => {
    setPriceRange(maxPrice);
  }, [maxPrice]);

  const categories = [...new Set(products.map(p => p.category))];
  const materials = [...new Set(products.map(p => p.material).filter(Boolean))];
  const gemstones = [...new Set(products.map(p => p.gemstone).filter(Boolean))];
  const allColors = [...new Set(products.flatMap(p => p.colors?.map((c: any) => c.name) || []))];

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategories.length > 0) result = result.filter(p => selectedCategories.includes(p.category));
    if (selectedMaterials.length > 0) result = result.filter(p => selectedMaterials.includes(p.material || ''));
    if (selectedGemstones.length > 0) result = result.filter(p => selectedGemstones.includes(p.gemstone || ''));
    if (selectedColors.length > 0) {
      result = result.filter(p => p.colors?.some((color: any) => selectedColors.includes(color.name)));
    }
    result = result.filter(p => (p.price || 0) <= priceRange);

    if (searchTerm) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        (p.category && p.category.toLowerCase().includes(searchTerm)) ||
        (p.material && p.material.toLowerCase().includes(searchTerm)) ||
        (p.gemstone && p.gemstone.toLowerCase().includes(searchTerm))
      );
    }

    if (sortType === 'newest') {
      result.sort((a, b) => {
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortType === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortType === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategories, selectedMaterials, selectedGemstones, selectedColors, priceRange, sortType, searchTerm]);

  const toggleCategory = (cat: string) => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleMaterial = (mat: string) => setSelectedMaterials(prev => prev.includes(mat) ? prev.filter(m => m !== mat) : [...prev, mat]);
  const toggleGemstone = (gem: string) => setSelectedGemstones(prev => prev.includes(gem) ? prev.filter(g => g !== gem) : [...prev, gem]);
  const toggleColor = (color: string) => setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);

  if (loading) return <div className="text-center py-20 text-[#2A3F35]">Loading collection...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {searchTerm && (
        <div className="mb-8 bg-[#F9F6F0] border border-[#E8E0D0] rounded-3xl p-6 text-center">
          <p className="text-[#2A3F35]/70">Showing results for</p>
          <p className="text-2xl font-medium text-[#2A3F35]">“{searchTerm}”</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-wider">Artisanal Collections</h1>
        </div>

        <select value={sortType} onChange={(e) => setSortType(e.target.value as any)} className="bg-white border border-[#E8E0D0] px-6 py-3 rounded-full text-sm font-medium focus:outline-none focus:border-[#D4AF37]">
          <option value="newest">Newest Arrivals</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-64 flex-shrink-0">
          <div className="sticky top-6 bg-white border border-[#E8E0D0] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button onClick={() => {
                setSelectedCategories([]);
                setSelectedMaterials([]);
                setSelectedGemstones([]);
                setSelectedColors([]);
                setPriceRange(maxPrice);
              }} className="text-sm text-[#D4AF37] hover:text-[#2A3F35]">Clear All</button>
            </div>

            {/* Collections */}
            {categories.length > 0 && (
              <div className="mb-8">
                <h4 className="font-medium mb-4 text-[#2A3F35]">Collections</h4>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="accent-[#D4AF37] w-4 h-4" />
                      <span className="text-[#2A3F35]">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {materials.length > 0 && (
              <div className="mb-8">
                <h4 className="font-medium mb-4 text-[#2A3F35]">Material</h4>
                <div className="space-y-3">
                  {materials.map(mat => (
                    <label key={mat} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedMaterials.includes(mat)} onChange={() => toggleMaterial(mat)} className="accent-[#D4AF37] w-4 h-4" />
                      <span className="text-[#2A3F35]">{mat}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Gemstones */}
            {gemstones.length > 0 && (
              <div className="mb-8">
                <h4 className="font-medium mb-4 text-[#2A3F35]">Gemstone</h4>
                <div className="space-y-3">
                  {gemstones.map(gem => (
                    <label key={gem} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedGemstones.includes(gem)} onChange={() => toggleGemstone(gem)} className="accent-[#D4AF37] w-4 h-4" />
                      <span className="text-[#2A3F35]">{gem}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Colors Filter */}
            {allColors.length > 0 && (
              <div className="mb-8">
                <h4 className="font-medium mb-4 text-[#2A3F35]">Colors</h4>
                <div className="space-y-3">
                  {allColors.map(color => (
                    <label key={color} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => toggleColor(color)} className="accent-[#D4AF37] w-4 h-4" />
                      <span className="text-[#2A3F35]">{color}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range - NOW DYNAMIC */}
            <div>
              <h4 className="font-medium mb-4 text-[#2A3F35]">Price Range</h4>
              <input
                type="range"
                min="100"
                max={maxPrice}
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#D4AF37]"
              />
              <div className="flex justify-between text-xs mt-2 text-[#2A3F35]/70">
                <span>₹100</span>
                <span>₹{priceRange}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredProducts.map(product => {
              const original = product.original_price || product.price;
              const hasDiscount = product.original_price && product.original_price > product.price;
              const discountPercent = hasDiscount
                ? Math.round(((original - product.price) / original) * 100)
                : 0;

              return (
                <Link href={`/product/${product.id}`} key={product.id} className="group">
                  <div className="relative aspect-square overflow-hidden rounded-3xl bg-[#F9F6F0] shadow-sm border border-[#E8E0D0]/50 group-hover:shadow-xl transition-all duration-500">
                    <img
                      src={product.colors?.[0]?.image || product.images?.[0] || "/hero-bg.jpg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                    />

                    {product.is_new && (
                      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-[#2A3F35] text-xs font-semibold px-3 py-1.5 rounded-full tracking-widest shadow-sm">
                        NEW
                      </div>
                    )}

                    {/* Discount Badge - Cute & Premium */}
                    {hasDiscount && (
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-[#D4AF37] text-xs font-semibold px-3 py-1.5 rounded-2xl shadow-md border border-[#D4AF37]/30 flex items-center gap-1.5">
                        <span>-{discountPercent}% OFF</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 px-1">
                    <p className="text-xs tracking-widest text-[#D4AF37]">{product.category}</p>
                    <h3 className="font-medium mt-1 text-[#2A3F35] group-hover:text-[#D4AF37] transition">{product.name}</h3>

                    <div className="mt-1 flex items-baseline gap-2">
                      {hasDiscount ? (
                        <>
                          <span className="text-[#D4AF37] font-medium">₹{product.price}</span>
                          <span className="line-through text-[#2A3F35]/50 text-sm">₹{original}</span>
                        </>
                      ) : (
                        <span className="text-[#D4AF37] font-medium">₹{product.price}</span>
                      )}
                    </div>

                    {product.colors && product.colors.length > 0 && (
                      <p className="text-xs text-[#D4AF37] mt-2">
                        Available in {product.colors.length} colors
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}