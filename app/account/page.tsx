'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  items: any[];
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({ full_name: '', phone: '', address: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setFormData({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || '',
        address: profileData?.address || ''
      });

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .neq('status', 'CART')
        .order('created_at', { ascending: false });

      setOrders(orderData || []);
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address
      })
      .eq('id', user?.id);

    if (!error) toast.success("Profile updated successfully!");
    else toast.error("Error updating profile");
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const getStatusColor = (status: string) => {
    if (status === 'CONFIRMED') return 'bg-green-100 text-green-700';
    if (status.includes('PENDING')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F9F6F0]">Loading account...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 bg-[#F9F6F0]">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* Mobile Tabs / Desktop Sidebar */}
        <div className="lg:w-80 bg-white rounded-3xl p-6 shadow-sm border border-[#E8E0D0]">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[#2A3F35] rounded-full flex items-center justify-center text-white text-3xl">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-medium text-xl">{formData.full_name}</h3>
              <p className="text-sm text-[#2A3F35]/60">Member since {new Date(user.created_at).getFullYear()}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left font-medium transition ${activeTab === 'profile' ? 'bg-[#2A3F35] text-white' : 'hover:bg-[#F9F6F0]'}`}
            >
              👤 Profile &amp; Security
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left font-medium transition ${activeTab === 'orders' ? 'bg-[#2A3F35] text-white' : 'hover:bg-[#F9F6F0]'}`}
            >
              📦 Order History
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-4 text-red-500 hover:bg-red-50 rounded-2xl text-left"
            >
              Sign Out
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-[#E8E0D0]">
          {activeTab === 'profile' ? (
            <>
              <h2 className="text-2xl font-medium mb-8">Profile Details</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 bg-gray-50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Shipping Address</label>
                  <textarea 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-3xl px-6 py-4 h-28" 
                  />
                </div>
              </div>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="mt-10 bg-[#2A3F35] text-white px-10 py-4 rounded-full font-medium hover:bg-[#D4AF37]"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-medium mb-8">Order History</h2>
              {orders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-6">📦</div>
                  <h3 className="text-2xl font-medium">No orders yet</h3>
                  <p className="text-[#2A3F35]/70 mt-3">When you place your first order, it will appear here.</p>
                  <Link href="/shop" className="mt-8 inline-block bg-[#2A3F35] text-white px-10 py-4 rounded-full">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-[#E8E0D0] rounded-3xl p-8">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                        <div>
                          <p className="text-sm text-[#2A3F35]/60">Order Number</p>
                          <p className="font-mono text-lg font-medium">#{order.order_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#2A3F35]/60">Date</p>
                          <p className="font-medium">{new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-[#2A3F35]/60">Total</p>
                          <p className="font-medium text-xl">₹{(order.total || 0).toFixed(2)}</p>
                        </div>
                        <div className={`px-6 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div className="space-y-4">
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} className="flex gap-4 border-t border-[#E8E0D0] pt-4">
                            <div className="w-16 h-16 bg-[#F9F6F0] rounded-xl overflow-hidden">
                              <img src={item.image || "/hero-bg.jpg"} className="w-full h-full object-cover" alt={item.name} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-[#2A3F35]/60">Qty: {item.qty || 1} × ₹{(item.price || 0).toFixed(2)}</p>
                            </div>
                            <p className="font-medium">₹{((item.qty || 1) * (item.price || 0)).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}