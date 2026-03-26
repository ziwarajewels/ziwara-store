'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { confirmOrderServerAction } from '@/app/actions/orderActions';
import { X, Menu } from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchOrders();
    };

    loadData();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        items
      `)
      .order('created_at', { ascending: false });

    setOrders(data || []);
  };

  const openOrderDetails = async (order: any) => {
    let profile = null;
    if (order.user_email) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('email', order.user_email)
        .single();
      profile = data;
    }

    setSelectedOrder({
      ...order,
      customer_name: profile?.full_name || '—',
      customer_phone: profile?.phone || '—',
      shipping_address: profile?.address || '—',
    });
    setShowModal(true);
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!confirm('Confirm this order?')) return;
    const result = await confirmOrderServerAction(orderId);
    if (result.success) {
      toast.success("Order Confirmed Successfully ✨");
      setShowModal(false);
      fetchOrders();
    } else {
      toast.error("Failed to confirm order");
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex min-h-screen bg-[#F9F6F0]">
        <div 
          className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-[#E8E0D0] p-6 transform transition-transform z-50 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="md:hidden flex justify-end mb-8">
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="text-[#2A3F35] hover:text-[#D4AF37] transition-colors"
            >
              <X size={32} />
            </button>
          </div>

          <nav className="space-y-2 mt-4 md:mt-0">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📊 Overview</Link>
            <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📦 Products</Link>
            <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl">📋 Orders</Link>
          </nav>
        </div>

        <div className="flex-1 p-6 md:p-10">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="md:hidden mb-6 text-[#2A3F35]"
          >
            <Menu size={28} />
          </button>

          <h1 className="text-3xl md:text-4xl font-bold tracking-wide mb-8">Orders Management</h1>

          <div className="grid grid-cols-1 md:hidden gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl border border-[#E8E0D0] p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-[#2A3F35]/60">Order #{order.order_number}</p>
                    <p className="text-2xl font-bold mt-1">₹{order.total}</p>
                  </div>
                  <span className={`px-4 py-1 rounded-2xl text-xs font-medium ${
                    order.status === 'CONFIRMED' || order.status === 'DELIVERED' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-6 text-sm">
                  <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString('en-IN')}</p>
                  {order.transaction_id && <p className="mt-1"><strong>Transaction ID:</strong> {order.transaction_id}</p>}
                </div>
                <button onClick={() => openOrderDetails(order)} className="mt-8 w-full bg-[#2A3F35] hover:bg-[#D4AF37] text-white py-3.5 rounded-2xl text-sm font-medium transition-all">
                  View Full Details
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-3xl border border-[#E8E0D0] overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[#F9F6F0]">
                <tr>
                  <th className="pl-6 md:pl-10 py-6 text-left">Order #</th>
                  <th className="hidden md:table-cell">Amount</th>
                  <th className="hidden md:table-cell">Transaction ID</th>
                  <th>Status</th>
                  <th className="text-center pr-6 md:pr-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-[#F9F6F0]/60">
                    <td className="pl-6 md:pl-10 py-6 font-medium">#{order.order_number}</td>
                    <td className="hidden md:table-cell">₹{order.total}</td>
                    <td className="hidden md:table-cell font-mono text-sm">{order.transaction_id || '—'}</td>
                    <td>
                      <span className={`px-4 py-1 rounded-full text-xs font-medium ${
                        order.status === 'CONFIRMED' || order.status === 'DELIVERED' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="pr-6 md:pr-10 text-center">
                      <button onClick={() => openOrderDetails(order)} className="bg-[#2A3F35] hover:bg-[#D4AF37] text-white px-6 py-2.5 rounded-2xl text-sm transition-all">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">Order Details</h2>
              <button onClick={() => setShowModal(false)} className="text-[#2A3F35]"><X size={28} /></button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(90vh-130px)]">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-[#2A3F35]/60">Order Number</p>
                  <p className="text-3xl font-mono font-bold">#{selectedOrder.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#2A3F35]/60">Date</p>
                  <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-[#2A3F35]/60 mb-2">Status</p>
                <span className={`inline-block px-6 py-2 rounded-2xl text-sm font-medium ${
                  selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'DELIVERED' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <p className="text-sm text-[#2A3F35]/60 mb-3">Customer Details</p>
                <div className="bg-[#F9F6F0] p-6 rounded-3xl space-y-3">
                  <p><strong>Name:</strong> {selectedOrder.customer_name || '—'}</p>
                  <p><strong>Email:</strong> {selectedOrder.user_email || '—'}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customer_phone || '—'}</p>
                  <p><strong>Address:</strong> {selectedOrder.shipping_address || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-[#2A3F35]/60 mb-3">Ordered Items</p>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.color && <p className="text-sm text-[#D4AF37]">Color: {item.color}</p>}
                        <p className="text-xs text-[#2A3F35]/60">Qty: {item.qty} × ₹{item.price}</p>
                      </div>
                      <p className="font-medium">₹{(item.qty * item.price).toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t text-xl font-bold">
                <span>Total Amount</span>
                <span>₹{selectedOrder.total}</span>
              </div>

              {selectedOrder.transaction_id && (
                <div>
                  <p className="text-sm text-[#2A3F35]/60">Transaction ID</p>
                  <p className="font-mono text-base break-all pb-5">{selectedOrder.transaction_id}</p>
                </div>
              )}
            </div>

            <div className="px-4 py-4 border-t bg-white sticky bottom-0 flex gap-4">
              {selectedOrder.status === 'PENDING_PAYMENT_CONFIRMATION' && (
                <button onClick={() => handleConfirmOrder(selectedOrder.id)} className="flex-1 bg-[#2A3F35] hover:bg-green-600 text-white py-3 rounded-2xl font-medium transition-all">
                  Confirm Order
                </button>
              )}
              <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E8E0D0] py-4 rounded-2xl font-medium hover:bg-[#F9F6F0]">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}