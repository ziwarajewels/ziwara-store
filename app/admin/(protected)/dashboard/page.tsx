'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Menu, X, TrendingUp, Package, ShoppingCart, AlertTriangle, Clock, Users, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [zeroStock, setZeroStock] = useState(0);
  const [abandonedCartsCount, setAbandonedCartsCount] = useState(0);
  const [abandonedUsers, setAbandonedUsers] = useState<any[]>([]);
  const [showAbandonedModal, setShowAbandonedModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showZeroStockModal, setShowZeroStockModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [zeroStockItems, setZeroStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Toggle for Sales Chart
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  const fetchAllStats = async () => {
    try {
      const { data: products } = await supabase.from('products').select('*');
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, status, created_at, user_id')
        .order('created_at', { ascending: false });

      const { data: carts } = await supabase.from('carts').select('user_id, updated_at');

      const active = products?.length || 0;
      const low = products?.filter((p: any) => p.stock > 0 && p.stock < 5).length || 0;
      const zero = products?.filter((p: any) => p.stock === 0).length || 0;

      const revenue = orders?.reduce((sum: number, o: any) => {
        return (o.status === 'CONFIRMED' || o.status === 'DELIVERED') 
          ? sum + Number(o.total || 0) 
          : sum;
      }, 0) || 0;

      const totalOrd = orders?.length || 0;

      // Abandoned Carts = All carts
      const abandonedCarts = carts || [];

      const abandonedDetails = await Promise.all(
        abandonedCarts.map(async (cart) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', cart.user_id)
            .single();

          return {
            user_id: cart.user_id,
            email: profile?.email || 'No email',
            full_name: profile?.full_name || 'Unknown User',
            last_updated: cart.updated_at
          };
        })
      );

      const recent = orders?.slice(0, 5) || [];

      const productSales: any = {};
      orders?.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.id) productSales[item.id] = (productSales[item.id] || 0) + (item.qty || 1);
          });
        }
      });

      const topProd = Object.entries(productSales)
        .map(([id, qty]) => {
          const prod = products?.find((p: any) => p.id === id);
          return prod ? { ...prod, qty_sold: qty } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.qty_sold - a.qty_sold)
        .slice(0, 5);

      const lowItems = products?.filter((p: any) => p.stock > 0 && p.stock < 5) || [];
      const zeroItems = products?.filter((p: any) => p.stock === 0) || [];

      // ==================== SALES TREND ====================
      const days = timeRange === '7d' ? 7 : 30;
      const salesTrend = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayRevenue = orders?.filter(o => {
          const orderDate = o.created_at.split('T')[0];
          return orderDate === dateStr && (o.status === 'CONFIRMED' || o.status === 'DELIVERED');
        }).reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;

        salesTrend.push({
          day: timeRange === '7d' 
            ? date.toLocaleDateString('en-IN', { weekday: 'short' })   // Mon, Tue...
            : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), // 1 Apr, 2 Apr...
          revenue: dayRevenue,
        });
      }

      setActiveListings(active);
      setLowStock(low);
      setZeroStock(zero);
      setTotalOrders(totalOrd);
      setTotalRevenue(revenue);
      setAbandonedCartsCount(abandonedCarts.length);
      setAbandonedUsers(abandonedDetails);
      setRecentOrders(recent);
      setTopProducts(topProd);
      setLowStockItems(lowItems);
      setZeroStockItems(zeroItems);
      setSalesData(salesTrend);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStats();

    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchAllStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carts' }, fetchAllStats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [timeRange]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const openAbandonedModal = () => setShowAbandonedModal(true);
  const openLowStockModal = () => setShowLowStockModal(true);
  const openZeroStockModal = () => setShowZeroStockModal(true);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F9F6F0]">Loading dashboard...</div>;
  }

  return (
    <>
      <div className="flex min-h-screen bg-[#F9F6F0]">
        <div className="w-72 bg-white border-r border-[#E8E0D0] p-6 hidden md:block">
          <nav className="space-y-2 mt-8">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl font-medium">📊 Overview</Link>
            <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📦 Products</Link>
            <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📋 Orders</Link>
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-h-screen">
          <div className="md:hidden bg-white border-b border-[#E8E0D0] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
            <h1 className="text-2xl font-bold text-[#2A3F35]">Dashboard</h1>
            <button onClick={() => setIsSidebarOpen(true)}><Menu size={28} /></button>
          </div>

          <div className="flex-1 p-6 md:p-10">
            <h1 className="text-4xl font-bold text-[#2A3F35] mb-10">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-8 border border-[#E8E0D0]">
                <p className="text-sm text-[#2A3F35]/70">Total Revenue</p>
                <p className="text-4xl font-bold text-[#2A3F35] mt-3">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-[#E8E0D0]">
                <p className="text-sm text-[#2A3F35]/70">Active Listings</p>
                <p className="text-4xl font-bold text-[#2A3F35] mt-3">{activeListings}</p>
              </div>
              <div className="bg-white rounded-3xl p-8 border border-[#E8E0D0]">
                <p className="text-sm text-[#2A3F35]/70">Total Orders</p>
                <p className="text-4xl font-bold text-[#2A3F35] mt-3">{totalOrders}</p>
              </div>
              <div 
                className="bg-white rounded-3xl p-8 border border-[#E8E0D0] cursor-pointer hover:shadow-md transition-all"
                onClick={openAbandonedModal}
              >
                <p className="text-sm text-[#2A3F35]/70">Abandoned Carts</p>
                <p className="text-4xl font-bold text-amber-600 mt-3">{abandonedCartsCount}</p>
                <p className="text-xs text-amber-600 mt-2">Click to see users</p>
              </div>
            </div>

            {/* Sales Trend with Weekly / Monthly Toggle */}
            <div className="mt-12 bg-white rounded-3xl p-8 border border-[#E8E0D0]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <TrendingUp size={24} /> Sales Trend
                </h2>
                <div className="flex bg-[#F9F6F0] rounded-3xl p-1">
                  <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-6 py-2 text-sm font-medium rounded-3xl transition-all ${
                      timeRange === '7d' ? 'bg-[#2A3F35] text-white' : 'hover:bg-white'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeRange('30d')}
                    className={`px-6 py-2 text-sm font-medium rounded-3xl transition-all ${
                      timeRange === '30d' ? 'bg-[#2A3F35] text-white' : 'hover:bg-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`₹${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Low & Zero Stock Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              <div className="bg-white rounded-3xl border border-[#E8E0D0] p-8 cursor-pointer hover:shadow-md transition-all" onClick={openLowStockModal}>
                <h3 className="text-lg font-semibold text-[#2A3F35]">Low Stock Items</h3>
                <p className="text-5xl font-bold text-orange-600 mt-4">{lowStock}</p>
              </div>
              <div className="bg-white rounded-3xl border border-[#E8E0D0] p-8 cursor-pointer hover:shadow-md transition-all" onClick={openZeroStockModal}>
                <h3 className="text-lg font-semibold text-[#2A3F35]">Out of Stock Items</h3>
                <p className="text-5xl font-bold text-red-600 mt-4">{zeroStock}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abandoned Carts Modal */}
      {showAbandonedModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Abandoned Carts ({abandonedCartsCount})</h2>
              <button onClick={() => setShowAbandonedModal(false)}><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {abandonedUsers.length > 0 ? abandonedUsers.map((user, i) => (
                <div key={i} className="border-b py-4 last:border-b-0">
                  <p className="font-medium">{user.full_name || 'Unknown User'}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last activity: {new Date(user.last_updated).toLocaleString()}
                  </p>
                </div>
              )) : <p className="text-center py-12 text-gray-500">No abandoned carts found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Modal */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Low Stock Items ({lowStock})</h2>
              <button onClick={() => setShowLowStockModal(false)}><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center py-4 border-b last:border-b-0">
                  <img src={item.images?.[0] || "/hero-bg.jpg"} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-orange-600">Stock left: {item.stock}</p>
                  </div>
                </div>
              )) : <p className="text-center py-12 text-gray-500">No low stock items</p>}
            </div>
          </div>
        </div>
      )}

      {/* Zero Stock Modal */}
      {showZeroStockModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">Out of Stock Items ({zeroStock})</h2>
              <button onClick={() => setShowZeroStockModal(false)}><X size={28} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {zeroStockItems.length > 0 ? zeroStockItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center py-4 border-b last:border-b-0">
                  <img src={item.images?.[0] || "/hero-bg.jpg"} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-red-600">Currently 0 in stock</p>
                  </div>
                </div>
              )) : <p className="text-center py-12 text-gray-500">No out of stock items</p>}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar - Unchanged */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsSidebarOpen(false)}>
          <div className="bg-white w-72 h-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-8"><button onClick={() => setIsSidebarOpen(false)}><X size={32} /></button></div>
            <nav className="space-y-2">
              <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl font-medium" onClick={() => setIsSidebarOpen(false)}>📊 Overview</Link>
              <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium" onClick={() => setIsSidebarOpen(false)}>📦 Products</Link>
              <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium" onClick={() => setIsSidebarOpen(false)}>📋 Orders</Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}