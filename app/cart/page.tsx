'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { confirmPaymentServerAction } from '@/app/actions/orderActions';

const QRCode = dynamic(
  () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeCanvas })),
  { ssr: false }
);

export default function CartPage() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'cart' | 'payment' | 'transaction'>('cart');
  const [transactionId, setTransactionId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dispatch event so header cart icon updates
  const dispatchCartUpdate = () => {
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Sync latest price + original_price from products table
  const syncCartPrices = async (items: any[]): Promise<any[]> => {
    if (!items?.length) return items;

    setIsSyncing(true);

    const syncedItems = await Promise.all(
      items.map(async (item: any) => {
        const { data: product } = await supabase
          .from('products')
          .select('price, original_price')
          .eq('id', item.id)
          .single();

        if (product) {
          return {
            ...item,
            price: product.price ?? item.price,
            original_price: product.original_price ?? item.original_price ?? product.price,
          };
        }
        return item;
      })
    );

    setIsSyncing(false);
    return syncedItems;
  };

  useEffect(() => {
    let channel: any = null;

    const initCart = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Cart fetch error:', error);
      }

      let initialItems = data?.items || [];
      initialItems = await syncCartPrices(initialItems);

      setCartItems(initialItems);
      setLoading(false);

      // Silent DB update with fresh prices
      if (user.id && initialItems.length > 0) {
        await supabase
          .from('carts')
          .update({ items: initialItems, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      // Realtime - Force fresh fetch + sync (most reliable for JSONB)
      channel = supabase
        .channel(`cart-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'carts',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Cart realtime update:', payload);

            if (payload.eventType === 'DELETE') {
              setCartItems([]);
              dispatchCartUpdate();
              return;
            }

            // Force fresh fetch + price sync
            const { data: freshCart } = await supabase
              .from('carts')
              .select('items')
              .eq('user_id', user.id)
              .single();

            let freshItems = freshCart?.items || [];
            freshItems = await syncCartPrices(freshItems);

            setCartItems(freshItems);
            dispatchCartUpdate();        // ← This updates header
          }
        )
        .subscribe();
    };

    initCart();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const getUniqueId = (item: any) => `${item.id}-${item.color || 'no-color'}`;

  const getAvailableQty = async (item: any) => {
    const { data } = await supabase
      .from('products')
      .select('stock, colors')
      .eq('id', item.id)
      .single();

    if (!data) return 0;

    if (data.colors?.length > 0 && item.color) {
      const color = data.colors.find((c: any) => c.name === item.color);
      return color?.qty ?? 0;
    }
    return data.stock ?? 0;
  };

  const updateQty = async (uniqueId: string, newQty: number) => {
    if (newQty < 1 || isProcessing) return;

    const item = cartItems.find((i) => getUniqueId(i) === uniqueId);
    if (!item) return;

    const availableQty = await getAvailableQty(item);
    if (newQty > availableQty) {
      toast.error(`Only ${availableQty} available`);
      return;
    }

    const updated = cartItems.map((i) =>
      getUniqueId(i) === uniqueId ? { ...i, qty: newQty } : i
    );

    setCartItems(updated);

    if (userId) {
      await supabase
        .from('carts')
        .update({ items: updated, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    dispatchCartUpdate();   // ← Important for header
  };

  const removeItem = async (uniqueId: string) => {
    if (isProcessing) return;

    const updated = cartItems.filter((item) => getUniqueId(item) !== uniqueId);
    setCartItems(updated);

    if (userId) {
      await supabase
        .from('carts')
        .update({ items: updated, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    dispatchCartUpdate();   // ← Important for header
  };

  // Professional pricing with discount
  const calculatePricing = (itemsToCalculate: any[] = cartItems) => {
    let originalSubtotal = 0;
    let finalSubtotal = 0;

    itemsToCalculate.forEach((item) => {
      const price = Number(item.price) || 0;
      const originalPrice = Number(item.original_price) || price;
      originalSubtotal += originalPrice * item.qty;
      finalSubtotal += price * item.qty;
    });

    const discount = originalSubtotal - finalSubtotal;
    const tax = Math.round(finalSubtotal * 0.08);
    const total = finalSubtotal + tax;

    return { originalSubtotal, finalSubtotal, discount, tax, total };
  };

  const { originalSubtotal, finalSubtotal, discount, tax, total } = calculatePricing();

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'yourname@oksbi';
  const upiLink = `upi://pay?pa=${upiId}&pn=Ziwara&am=${total}&cu=INR&tn=Order Payment`;

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      toast.error("Please enter Transaction ID / UPI Reference");
      return;
    }
    if (isProcessing || !userId) return;

    setIsProcessing(true);

    let itemsForOrder = await syncCartPrices(cartItems);
    const { total: finalTotal } = calculatePricing(itemsForOrder);

    // Final stock check
    for (const item of itemsForOrder) {
      const available = await getAvailableQty(item);
      if (item.qty > available) {
        toast.error(`Only ${available} left for "${item.name}". Please adjust.`);
        setIsProcessing(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('transactionId', transactionId.trim());
    formData.append('total', finalTotal.toString());
    formData.append('items', JSON.stringify(itemsForOrder));

    try {
      const result = await confirmPaymentServerAction(formData);

      if (result.success) {
        toast.success("Order placed successfully! ✨");
        setStep('cart');
        setCartItems([]);           // Clear local state
        setTransactionId('');
        dispatchCartUpdate();       // ← This updates header immediately
        window.dispatchEvent(new Event('orderPlaced')); // For any other listeners
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading cart...</div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="bg-[#F9F6F0] min-h-screen pb-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12">

          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-sm text-[#2A3F35]/70 mb-1">Home → Cart</div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#2A3F35]">Shopping Cart</h1>
              <p className="text-[#2A3F35]/60 mt-1">
                {cartItems.length} items {isSyncing && '(updating prices...)'}
              </p>
            </div>

            <Link href="/shop" className="text-[#D4AF37] hover:text-[#2A3F35] font-medium flex items-center gap-1 transition-colors">
              ← Continue Shopping
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">

            {/* Cart Items */}
            <div className="flex-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-2xl text-[#2A3F35]/70">Your cart is empty</p>
                  <Link href="/shop" className="mt-8 inline-block bg-[#2A3F35] text-white px-10 py-4 rounded-full font-medium hover:bg-[#D4AF37]">
                    Browse Shop
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => {
                  const uniqueId = getUniqueId(item);
                  const originalPrice = item.original_price || item.price;
                  const hasDiscount = Number(item.original_price) > Number(item.price);

                  return (
                    <div key={uniqueId} className="flex flex-col md:flex-row gap-6 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#E8E0D0] mb-8 hover:shadow-md transition-shadow">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-[#F9F6F0] flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-xl text-[#2A3F35]">
                          {item.name} {item.color ? `(${item.color})` : ''}
                        </h3>

                        <div className="mt-6 flex items-center justify-between md:justify-start gap-8">
                          <div className="flex border border-[#E8E0D0] rounded-full overflow-hidden bg-white">
                            <button onClick={() => updateQty(uniqueId, item.qty - 1)} className="px-5 py-3 hover:bg-gray-100">−</button>
                            <div className="px-8 py-3 font-medium text-lg border-x border-[#E8E0D0]">{item.qty}</div>
                            <button onClick={() => updateQty(uniqueId, item.qty + 1)} className="px-5 py-3 hover:bg-gray-100">+</button>
                          </div>

                          <button onClick={() => removeItem(uniqueId)} className="text-red-500 hover:text-red-700 transition">
                            <Trash2 size={22} />
                          </button>
                        </div>
                      </div>

                      <div className="text-right md:mt-2">
                        {hasDiscount ? (
                          <div>
                            <div className="line-through text-[#2A3F35]/50 text-base">₹{originalPrice}</div>
                            <div className="text-xl font-medium text-[#2A3F35]">₹{item.price} × {item.qty}</div>
                          </div>
                        ) : (
                          <div className="text-xl font-medium text-[#2A3F35]">₹{item.price * item.qty}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Summary - Professional */}
            <div className="lg:w-96">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E8E0D0] sticky top-8 shadow-sm">
                <h2 className="text-2xl font-medium mb-8 text-[#2A3F35]">Order Summary</h2>

                {cartItems.length > 0 && (
                  <div className="space-y-6 mb-10">
                    <div className="flex justify-between text-sm">
                      <span className="text-black">MRP</span>
                      <span>₹{originalSubtotal}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>- ₹{discount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm border-t pt-4">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-medium">₹{finalSubtotal}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-[#2A3F35]/70">Estimated Tax (8%)</span>
                      <span>₹{tax}</span>
                    </div>

                    <div className="border-t pt-6 flex justify-between text-2xl font-semibold text-[#2A3F35]">
                      <span>Total</span>
                      <span>₹{total}</span>
                    </div>
                  </div>
                )}

                {/* Payment Steps - unchanged */}
                {step === 'cart' ? (
                  <button
                    onClick={() => setStep('payment')}
                    disabled={cartItems.length === 0 || isProcessing}
                    className="w-full bg-[#2A3F35] hover:bg-[#D4AF37] disabled:bg-gray-300 text-white py-5 rounded-full font-medium transition-all"
                  >
                    Proceed to Payment
                  </button>
                ) : step === 'payment' ? (
                  <div className="text-center">
                    <div className="bg-[#F9F6F0] p-8 rounded-2xl mb-8">
                      <div className="flex justify-center mb-6">
                        <QRCode value={upiLink} size={180} />
                      </div>
                      <p className="font-medium text-2xl mb-1">₹{total}</p>
                      <p className="font-mono text-sm">UPI ID: <strong>{upiId}</strong></p>
                    </div>

                    <button
                      onClick={() => setStep('transaction')}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-5 rounded-full font-medium transition-all"
                    >
                      I HAVE COMPLETED PAYMENT
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="font-medium mb-4 text-[#2A3F35]">Enter Transaction ID</h3>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="UPI Reference Number"
                      className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-center focus:outline-none focus:border-[#D4AF37]"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={handleConfirmPayment}
                      disabled={!transactionId.trim() || isProcessing}
                      className="mt-6 w-full bg-[#2A3F35] text-white py-5 rounded-full font-medium hover:bg-[#D4AF37] disabled:bg-gray-300 transition-all"
                    >
                      {isProcessing ? "Processing Order..." : "Confirm & Place Order"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}