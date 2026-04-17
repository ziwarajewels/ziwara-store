'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { Gem, Palette, Tag, Ruler } from 'lucide-react';

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [product, setProduct] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch product function
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
    } else {
      setProduct(data);

      if (data?.colors?.length > 0) {
        const validColor = data.colors.find((c: any) => c.image && c.image.trim() !== '');
        setSelectedColor(validColor || data.colors[0]);
      }
    }
    setLoading(false);
  }, [id]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchProduct();

    // Realtime subscription
    const channel = supabase
      .channel(`product-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log("Realtime product update received:", payload.new);
          setProduct(payload.new);

          // Safely update selected color if it still exists
          if (payload.new?.colors?.length > 0 && selectedColor) {
            const colorStillExists = payload.new.colors.find((c: any) => c.name === selectedColor.name);
            if (!colorStillExists) {
              setSelectedColor(payload.new.colors[0]);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.warn("Realtime subscription error - falling back to polling");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchProduct, selectedColor]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor]);

  const getAvailableQty = () => {
    if (!product) return 0;
    if (product.colors?.length > 0 && selectedColor) {
      const color = product.colors.find((c: any) => c.name === selectedColor.name);
      return color?.qty ?? 0;
    }
    return product.stock ?? 0;
  };

  const addToCart = async () => {
    if (!product || isProcessing) return;

    setIsProcessing(true);

    const availableQty = getAvailableQty();
    if (availableQty <= 0) {
      toast.error("This item is out of stock");
      setIsProcessing(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login first");
      setIsProcessing(false);
      return;
    }

    const userId = user.id;
    const selectedColorName = selectedColor?.name || null;

    let { data: existingCart } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .single();

    let items = existingCart ? existingCart.items || [] : [];

    const existingIndex = items.findIndex(
      (i: any) => i.id === product.id && (i.color || null) === selectedColorName
    );

    const currentQty = existingIndex > -1 ? items[existingIndex].qty : 0;

    if (currentQty + 1 > availableQty) {
      toast.error(`Only ${availableQty} items available`);
      setIsProcessing(false);
      return;
    }

    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: selectedColor?.image || product.images?.[0] || '',
      qty: 1,
      color: selectedColorName,
      original_price: product.original_price,
    };

    if (existingIndex > -1) {
      items[existingIndex].qty += 1;
    } else {
      items.push(cartItem);
    }

    const total = items.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0);

    if (existingCart) {
      await supabase
        .from('carts')
        .update({ items, total, updated_at: new Date().toISOString() })
        .eq('id', existingCart.id);
    } else {
      await supabase.from('carts').insert({ user_id: userId, items, total });
    }

    window.dispatchEvent(new Event('cartUpdated'));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
    toast.success("Added to cart ✨");

    setIsProcessing(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading masterpiece...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

  const originalPrice = product.original_price || product.price;
  const hasDiscount = product.original_price && product.original_price > product.price;

  const hasValidColorImage = selectedColor && selectedColor.image && selectedColor.image.trim() !== '';
  const images = hasValidColorImage
    ? [selectedColor.image, ...(product.images || []).filter((img: string) => img !== selectedColor.image)]
    : product.images?.length ? product.images : ['/hero-bg.jpg'];

  const colors = product.colors || [];

  return (
    <>
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

          {/* IMAGE SECTION */}
          <div className="lg:w-5/12">
            <div className="aspect-square bg-[#F9F6F0] rounded-3xl overflow-hidden shadow-sm">
              <img 
                src={images[selectedImageIndex]} 
                className="w-full h-full object-cover" 
                alt={product.name} 
              />
            </div>

            <div className="flex gap-4 mt-6 overflow-x-auto pb-4 snap-x scrollbar-hide">
              {images.map((img: string, i: number) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedImageIndex(i)} 
                  className={`flex-shrink-0 snap-start border-2 rounded-2xl overflow-hidden transition-all ${selectedImageIndex === i ? 'border-[#D4AF37] scale-105' : 'border-transparent hover:border-[#E8E0D0]'}`}
                >
                  <img src={img} className="w-20 h-20 object-cover" alt={`Thumbnail ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* DETAILS SECTION */}
          <div className="lg:w-7/12">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-2 leading-none">
                {product.name}
              </h1>

              {/* Live Price with Discount */}
              <div className="mt-4 flex items-baseline gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-4xl font-medium text-[#D4AF37]">₹{product.price}</span>
                    <span className="line-through text-[#2A3F35]/50 text-2xl">₹{originalPrice}</span>
                  </>
                ) : (
                  <span className="text-4xl font-medium text-[#D4AF37]">₹{product.price}</span>
                )}
              </div>
            </div>

            <div className="prose prose-neutral max-w-none">
              <p className="text-[#2A3F35]/80 leading-relaxed text-lg">
                {product.description || "A timeless handcrafted piece that captures nature's essence with exceptional artistry and sustainable luxury."}
              </p>
            </div>

            {/* Color Variants */}
            {colors.length > 0 && (
              <div className="mt-10">
                <p className="text-sm font-medium text-[#2A3F35]/70 mb-3">Select Color</p>
                <div className="flex gap-4 flex-wrap">
                  {colors.map((color: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedImageIndex(0);
                      }}
                      className={`flex flex-col items-center gap-2 ${selectedColor?.name === color.name ? 'ring-2 ring-[#D4AF37]' : ''}`}
                    >
                      <img
                        src={color.image || "/hero-bg.jpg"}
                        alt={color.name}
                        className="w-16 h-16 object-cover rounded-2xl border border-[#E8E0D0]"
                      />
                      <div className="text-center">
                        <p className="text-sm font-medium">{color.name}</p>
                        <p className="text-xs text-[#2A3F35]/60">
                          {color.qty > 0 ? `${color.qty} left` : 'Not Available'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications */}
            <div className="mt-12 border-t border-[#E8E0D0] pt-10">
              <h3 className="font-semibold text-xl mb-6 flex items-center gap-2">
                <Ruler className="w-5 h-5" /> Details & Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {product.material && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#F9F6F0] flex items-center justify-center flex-shrink-0">
                      <Palette className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-[#2A3F35]/60">MATERIAL</p>
                      <p className="font-medium text-[#2A3F35]">{product.material}</p>
                    </div>
                  </div>
                )}
                {product.gemstone && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#F9F6F0] flex items-center justify-center flex-shrink-0">
                      <Gem className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-[#2A3F35]/60">GEMSTONE</p>
                      <p className="font-medium text-[#2A3F35]">{product.gemstone}</p>
                    </div>
                  </div>
                )}
                {product.category && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#F9F6F0] flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-[#2A3F35]/60">CATEGORY</p>
                      <p className="font-medium text-[#2A3F35]">{product.category}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={addToCart}
              disabled={isProcessing || getAvailableQty() <= 0}
              className="mt-12 w-full bg-[#2A3F35] hover:bg-black text-white py-5 rounded-3xl text-lg font-medium transition-all active:scale-[0.98] shadow-sm disabled:bg-gray-400"
            >
              {isProcessing ? 'Adding...' : addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>

            <p className="text-center text-xs text-[#2A3F35]/50 mt-6">Free shipping</p>
          </div>
        </div>
      </div>
    </>
  );
}