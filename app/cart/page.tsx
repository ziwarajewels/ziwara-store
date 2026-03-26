'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
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

  useEffect(() => {
    let channel: any;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCartItems(data?.items || []);
      setLoading(false);

      channel = supabase
        .channel(`cart-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === 'DELETE') setCartItems([]);
            else setCartItems(payload.new?.items || []);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const dispatchCartUpdate = () => {
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const getUniqueId = (item: any) => `${item.id}-${item.color || 'no-color'}`;

  // ✅ STOCK CHECK HELPER (industry grade)
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

  // ✅ UPDATED WITH STOCK VALIDATION
  const updateQty = async (uniqueId: string, newQty: number) => {
    if (newQty < 1 || isProcessing) return;

    const item = cartItems.find(i => getUniqueId(i) === uniqueId);
    if (!item) return;

    const availableQty = await getAvailableQty(item);

    if (newQty > availableQty) {
      toast.error(`Only ${availableQty} available`);
      return;
    }

    const updated = cartItems.map(i =>
      getUniqueId(i) === uniqueId
        ? { ...i, qty: newQty }
        : i
    );

    setCartItems(updated);

    if (userId) {
      await supabase
        .from('carts')
        .update({ items: updated, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    dispatchCartUpdate();
  };

  const removeItem = async (uniqueId: string) => {
    if (isProcessing) return;

    const updated = cartItems.filter(
      item => getUniqueId(item) !== uniqueId
    );

    setCartItems(updated);

    if (userId) {
      await supabase
        .from('carts')
        .update({ items: updated, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    dispatchCartUpdate();
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + tax;

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || 'yourname@oksbi';
  const upiLink = `upi://pay?pa=${upiId}&pn=Ziwara&am=${total}&cu=INR&tn=Order Payment`;

  const handleConfirmPayment = async () => {
    if (!transactionId.trim() || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('transactionId', transactionId);
    formData.append('total', total.toString());
    formData.append('items', JSON.stringify(cartItems));

    try {
      const result = await confirmPaymentServerAction(formData);
      if (result.success) {
        toast.success("Order placed! Waiting for confirmation.");
        setStep('cart');
        setCartItems([]);
        setTransactionId('');
        window.dispatchEvent(new Event('orderPlaced'));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
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
              <h1 className="text-4xl md:text-5xl font-bold text-[#2A3F35] leading-none">Shopping Cart</h1>
              <p className="text-[#2A3F35]/60 mt-1">{cartItems.length} items</p>
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
                            <button onClick={() => updateQty(uniqueId, item.qty - 1)} className="px-5 py-3">−</button>
                            <div className="px-8 py-3 font-medium text-lg border-x border-[#E8E0D0]">{item.qty}</div>
                            <button onClick={() => updateQty(uniqueId, item.qty + 1)} className="px-5 py-3">+</button>
                          </div>

                          <button onClick={() => removeItem(uniqueId)} className="text-red-500 hover:text-red-700 transition">
                            <Trash2 size={22} />
                          </button>
                        </div>
                      </div>

                      <div className="text-right text-xl font-medium text-[#2A3F35] md:mt-2">
                        ₹{item.price * item.qty}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Summary (UNCHANGED UI) */}
            <div className="lg:w-96">
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E8E0D0] sticky top-8 shadow-sm">
                <h2 className="text-2xl font-medium mb-8 text-[#2A3F35]">Order Summary</h2>

                <div className="space-y-5 mb-8 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span className="text-green-600">Free</span></div>
                  <div className="flex justify-between"><span>Est. Tax</span><span>₹{tax}</span></div>
                  <div className="border-t pt-5 flex justify-between text-xl font-medium text-[#2A3F35]">
                    <span>Total</span><span>₹{total}</span>
                  </div>
                </div>

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
                      <p className="font-medium text-lg">₹{total} to pay</p>
                      <p className="font-mono text-sm mt-2">UPI ID: <strong>{upiId}</strong></p>
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
                    <h3 className="font-medium mb-4">Enter Transaction ID</h3>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="UPI Reference / Transaction ID"
                      className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 text-center"
                      disabled={isProcessing}
                    />
                    <button
                      onClick={handleConfirmPayment}
                      disabled={!transactionId.trim() || isProcessing}
                      className="mt-6 w-full bg-[#2A3F35] text-white py-5 rounded-full font-medium hover:bg-[#D4AF37] disabled:bg-gray-300 transition-all"
                    >
                      {isProcessing ? "Processing..." : "Confirm & Place Order"}
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