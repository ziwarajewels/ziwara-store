'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function AdminDashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;

    const fetchStats = async () => {
      // Products stats
      const { data: products } = await supabase
        .from('products')
        .select('stock');

      // Orders stats
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status');

      const active = products?.length || 0;
      const low = products?.filter((p: any) => p.stock < 5).length || 0;
      const totalOrd = orders?.length || 0;
      const revenue = orders?.reduce((sum: number, o: any) => {
        return o.status === 'CONFIRMED' || o.status === 'DELIVERED' 
          ? sum + (o.total || 0) 
          : sum;
      }, 0) || 0;

      setActiveListings(active);
      setLowStock(low);
      setTotalOrders(totalOrd);
      setTotalRevenue(revenue);
      setLoading(false);
    };

    fetchStats();

    // Realtime subscription (safe cleanup)
    channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchStats)
      .subscribe();

    // Cleanup function (must be synchronous)
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F9F6F0]">Loading dashboard...</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F9F6F0]">
      {/* Sidebar - unchanged */}
      <div className="w-64 bg-white border-r border-[#E8E0D0] p-6 hidden md:block">
        <nav className="space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl font-medium">📊 Overview</Link>
          <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📦 Products</Link>
          <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📋 Orders</Link>
        </nav>
      </div>

      <div className="flex-1 p-8">
        <h1 className="text-4xl font-bold text-[#2A3F35] mb-10">Dashboard Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E8E0D0]">
            <p className="text-[#2A3F35]/70 text-sm">Total Revenue</p>
            <p className="text-4xl font-bold text-[#2A3F35] mt-2">₹{totalRevenue}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#E8E0D0]">
            <p className="text-[#2A3F35]/70 text-sm">Active Listings</p>
            <p className="text-4xl font-bold text-[#2A3F35] mt-2">{activeListings}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#E8E0D0]">
            <p className="text-[#2A3F35]/70 text-sm">Total Orders</p>
            <p className="text-4xl font-bold text-[#2A3F35] mt-2">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-[#E8E0D0]">
            <p className="text-[#2A3F35]/70 text-sm">Low Stock Items</p>
            <p className="text-4xl font-bold text-[#D4AF37] mt-2">{lowStock}</p>
          </div>
        </div>
      </div>
    </div>
  );
}