'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Edit2, Trash2, X, Menu, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: 0,
    description: '',
    category: '',
    stock: 0,
    material: '',
    gemstone: '',
    is_new: false,
    is_limited: false,
    colors: [] as any[],
    files: [] as File[],
  });

  // Fetch products initially
  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
  };

  // Initial load + Real-time subscription
  useEffect(() => {
    fetchProducts();

    // Real-time subscription for live updates (e.g., stock reduction after order)
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',           // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('Realtime change detected:', payload);
          fetchProducts();     // Simple & reliable way
        }
      )
      .subscribe();

    // Cleanup on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openModal = (product?: any) => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        price: product.price || 0,
        description: product.description || '',
        category: product.category || '',
        stock: product.stock || 0,
        material: product.material || '',
        gemstone: product.gemstone || '',
        is_new: product.is_new || false,
        is_limited: product.is_limited || false,
        colors: product.colors || [],
        files: [],
      });
      setEditingProduct(product);
    } else {
      setFormData({
        name: '', slug: '', price: 0, description: '', category: '',
        stock: 0, material: '', gemstone: '', is_new: false, is_limited: false,
        colors: [], files: []
      });
      setEditingProduct(null);
    }
    setShowModal(true);
  };

  const addColor = () => {
    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, { name: '', image: '', qty: 0 }]
    }));
  };

  const updateColor = (index: number, field: string, value: any) => {
    const updated = [...formData.colors];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, colors: updated }));
  };

  const removeColor = (index: number) => {
    const updated = formData.colors.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, colors: updated }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: Array.from(e.target.files!) }));
    }
  };

  const saveProduct = async () => {
    if (!formData.name || !formData.slug || !formData.category) {
      toast.error("Name, Slug and Category are required");
      return;
    }

    setUploading(true);

    let newImageUrls: string[] = [];

    // Upload new general images (if any selected)
    for (const file of formData.files) {
      const fileName = `media-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      newImageUrls.push(data.publicUrl);
    }

    // Handle color images (if new tempFile selected)
    const updatedColors = [];
    for (const color of formData.colors) {
      let imageUrl = color.image || '';

      if (color.tempFile) {
        const fileName = `color-${Date.now()}-${color.tempFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, color.tempFile);
        if (error) {
          toast.error(`Color upload failed: ${error.message}`);
          setUploading(false);
          return;
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      updatedColors.push({ 
        name: color.name, 
        qty: color.qty, 
        image: imageUrl 
      });
    }

    // Final payload - Keep old images if no new ones are uploaded
    const payload = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
      price: formData.price,
      description: formData.description,
      category: formData.category,
      stock: formData.stock,
      material: formData.material,
      gemstone: formData.gemstone,
      is_new: formData.is_new,
      is_limited: formData.is_limited,
      colors: updatedColors,
      // ✅ Fixed & Clear logic: Keep existing images unless new ones are uploaded
      images: newImageUrls.length > 0 
        ? newImageUrls 
        : (editingProduct?.images || [])
    };

    const result = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert([payload]);

    if (!result.error) {
      toast.success(editingProduct ? "Product updated ✨" : "Product added ✨");
      setShowModal(false);
      // No need to manually fetch here because realtime will handle it
    } else {
      toast.error(result.error.message || "Failed to save");
    }

    setUploading(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete permanently?')) return;
    await supabase.from('products').delete().eq('id', id);
    toast.success('Product deleted');
    // Realtime will automatically refresh the list
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex min-h-screen bg-[#F9F6F0]">
        <div className={`fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-[#E8E0D0] p-6 transform transition-transform z-50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="md:hidden flex justify-end mb-8">
            <button onClick={() => setIsSidebarOpen(false)} className="text-[#2A3F35] hover:text-[#D4AF37] transition-colors">
              <X size={32} />
            </button>
          </div>
          <nav className="space-y-2 mt-4 md:mt-0">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📊 Overview</Link>
            <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl">📦 Products</Link>
            <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">📋 Orders</Link>
          </nav>
        </div>

        <div className="flex-1 p-6 md:p-10">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mb-6 text-[#2A3F35]">
            <Menu size={28} />
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wide">Product Management</h1>
            <button onClick={() => openModal()} className="bg-[#2A3F35] hover:bg-[#D4AF37] text-white px-8 py-3.5 rounded-full flex items-center gap-3 transition-all font-medium">
              <Plus size={20} /> Add New Product
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 md:hidden gap-6">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-3xl border border-[#E8E0D0] p-6">
                <div className="flex gap-4">
                  <img src={p.images?.[0] || "/hero-bg.jpg"} alt={p.name} className="w-24 h-24 object-cover rounded-2xl" />
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{p.name}</h3>
                    <p className="text-[#D4AF37] text-sm">{p.category}</p>
                    <p className="text-2xl font-bold mt-1">₹{p.price}</p>
                    <div className="text-xs text-[#2A3F35]/70 mt-3">
                      Stock: {p.stock} • {p.is_new && "New"} {p.is_limited && "Limited"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => openModal(p)} className="flex-1 border border-[#E8E0D0] py-3 rounded-2xl flex items-center justify-center gap-2 text-sm">
                    <Edit2 size={18} /> Edit
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="flex-1 border border-red-200 text-red-500 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm">
                    <Trash2 size={18} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-[#E8E0D0] overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#F9F6F0]">
                <tr>
                  <th className="pl-10 py-6 text-left">Media</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>New</th>
                  <th>Limited</th>
                  <th className="text-center pr-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-[#F9F6F0]/60">
                    <td className="pl-10 py-6">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} width={80} height={80} className="rounded-2xl object-cover" />
                      ) : (
                        <div className="w-20 h-20 bg-[#F9F6F0] rounded-2xl" />
                      )}
                    </td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.stock}</td>
                    <td>₹{p.price}</td>
                    <td className="text-center">{p.is_new ? '✅' : ''}</td>
                    <td className="text-center">{p.is_limited ? '✅' : ''}</td>
                    <td className="pr-10">
                      <div className="flex items-center justify-center gap-5">
                        <button onClick={() => openModal(p)}><Edit2 size={19} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-500"><Trash2 size={19} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#2A3F35]"><X size={28} /></button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(90vh-130px)] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Product Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Slug</label>
                  <input type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Price (₹)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Stock</label>
                  <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Category</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Material</label>
                  <input type="text" value={formData.material} onChange={e => setFormData({ ...formData, material: e.target.value })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Gemstone</label>
                  <input type="text" value={formData.gemstone} onChange={e => setFormData({ ...formData, gemstone: e.target.value })} className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#2A3F35]">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-[#E8E0D0] rounded-3xl px-6 py-4 h-28 focus:border-[#D4AF37]" />
              </div>

              <div className="flex items-center gap-8 border-t border-b py-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.is_new} onChange={e => setFormData({ ...formData, is_new: e.target.checked })} className="w-5 h-5 accent-[#D4AF37]" />
                  <span className="font-medium text-[#2A3F35]">New Arrival</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.is_limited} onChange={e => setFormData({ ...formData, is_limited: e.target.checked })} className="w-5 h-5 accent-[#D4AF37]" />
                  <span className="font-medium text-[#2A3F35]">Limited Edition</span>
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[#2A3F35]">Color Variants</label>
                  <button onClick={addColor} className="flex items-center gap-2 text-[#D4AF37] hover:text-[#2A3F35]">
                    <PlusCircle size={20} /> Add Color
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.colors.map((color, index) => (
                    <div key={index} className="border border-[#E8E0D0] rounded-3xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium mb-1">Color Name</label>
                        <input type="text" value={color.name} onChange={(e) => updateColor(index, 'name', e.target.value)} className="w-full border border-[#E8E0D0] rounded-full px-4 py-3" placeholder="Rose Gold" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Photo</label>
                        <input type="file" accept="image/*" onChange={(e) => { 
                          if (e.target.files?.[0]) updateColor(index, 'tempFile', e.target.files[0]); 
                        }} className="w-full text-sm" />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1">Quantity</label>
                          <input type="number" value={color.qty} onChange={(e) => updateColor(index, 'qty', Number(e.target.value))} className="w-full border border-[#E8E0D0] rounded-full px-4 py-3" />
                        </div>
                        <button onClick={() => removeColor(index)} className="text-red-500 hover:text-red-700 mt-6">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#2A3F35]">General Images (optional)</label>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="block w-full mb-4" />
                {editingProduct && editingProduct.images?.length > 0 && (
                  <p className="text-xs text-[#2A3F35]/60 mt-1">
                    Current images will be kept if you don’t upload new ones.
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-white sticky bottom-0">
              <button 
                onClick={saveProduct} 
                disabled={uploading} 
                className="w-full bg-[#2A3F35] text-white py-2 rounded-2xl font-medium hover:bg-[#D4AF37] transition-all disabled:opacity-70"
              >
                {uploading ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}