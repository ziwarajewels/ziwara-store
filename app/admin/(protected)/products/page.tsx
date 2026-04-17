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
    original_price: 0,
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

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const openModal = (product?: any) => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        price: product.price || 0,
        original_price: product.original_price || product.price || 0,
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
        name: '', slug: '', price: 0, original_price: 0, description: '',
        category: '', stock: 0, material: '', gemstone: '', is_new: false,
        is_limited: false, colors: [], files: []
      });
      setEditingProduct(null);
    }
    setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({ ...prev, files: Array.from(e.target.files!) }));
    }
  };

  const addColor = () => {
    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, { name: '', qty: 0, image: '', tempFile: null }]
    }));
  };

  const updateColor = (index: number, field: string, value: any) => {
    const updated = [...formData.colors];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, colors: updated }));
  };

  const removeColor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index)
    }));
  };

  const saveProduct = async () => {
    if (!formData.name || !formData.slug || !formData.category || formData.price <= 0) {
      toast.error("Name, Slug, Category and Price are required");
      return;
    }

    setUploading(true);

    let imageUrls: string[] = editingProduct?.images || [];

    for (const file of formData.files) {
      const fileName = `product-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      imageUrls.push(data.publicUrl);
    }

    const finalColors = await Promise.all(
      formData.colors.map(async (color) => {
        let imageUrl = color.image || '';
        if (color.tempFile) {
          const fileName = `color-${Date.now()}-${color.tempFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error } = await supabase.storage.from('product-images').upload(fileName, color.tempFile);
          if (error) {
            toast.error(`Color upload failed: ${error.message}`);
            setUploading(false);
            return { name: color.name, qty: color.qty, image: '' };
          }
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
        return { name: color.name, qty: color.qty, image: imageUrl };
      })
    );

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.toLowerCase().trim().replace(/\s+/g, '-'),
      price: formData.price,
      original_price: formData.original_price > formData.price ? formData.original_price : null,
      description: formData.description.trim(),
      category: formData.category.trim(),
      stock: formData.stock,
      material: formData.material.trim(),
      gemstone: formData.gemstone.trim(),
      is_new: formData.is_new,
      is_limited: formData.is_limited,
      colors: finalColors,
      images: imageUrls,
    };

    const { error } = editingProduct
      ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
      : await supabase.from('products').insert([payload]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(editingProduct ? "Product updated successfully ✨" : "New product added ✨");
      setShowModal(false);
      fetchProducts();
    }

    setUploading(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      toast.success("Product deleted");
      fetchProducts();
    } else {
      toast.error("Failed to delete");
    }
  };

  return (
    <>
      <Toaster position="top-center" />

      <div className="flex min-h-screen bg-[#F9F6F0]">
        {/* Desktop Sidebar - Consistent with AdminDashboard */}
        <div className="w-72 bg-white border-r border-[#E8E0D0] p-6 hidden md:block">
          <nav className="space-y-2 mt-8">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">
              📊 Overview
            </Link>
            <Link href="/admin/products" className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl font-medium">
              📦 Products
            </Link>
            <Link href="/admin/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium">
              📋 Orders
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Top Bar */}
          <div className="md:hidden bg-white border-b border-[#E8E0D0] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
            <h1 className="text-2xl font-bold text-[#2A3F35]">Products</h1>
            <button onClick={() => setIsSidebarOpen(true)}>
              <Menu size={28} />
            </button>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-6 md:p-10">
            <div className="flex justify-between items-center mb-10">
              <h1 className="hidden md:block text-4xl font-bold text-[#2A3F35]">Product Management</h1>
              <button
                onClick={() => openModal()}
                className="bg-[#2A3F35] hover:bg-[#D4AF37] hover:text-[#2A3F35] text-white px-8 py-4 rounded-full flex items-center gap-3 font-medium transition-all"
              >
                <Plus size={20} /> Add New Product
              </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-3xl overflow-hidden border border-[#E8E0D0]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E0D0]">
                    <th className="pl-10 py-6 text-left">Product</th>
                    <th className="text-left py-6">Price</th>
                    <th className="text-left py-6">Stock</th>
                    <th className="text-left py-6">Status</th>
                    <th className="text-center pr-10 py-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const original = p.original_price || p.price;
                    const hasDiscount = p.original_price && p.original_price > p.price;

                    return (
                      <tr key={p.id} className="border-b hover:bg-[#F9F6F0]/60">
                        <td className="pl-10 py-6">
                          <div className="flex items-center gap-4">
                            <img src={p.images?.[0] || "/hero-bg.jpg"} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-sm text-[#2A3F35]/60">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6">
                          {hasDiscount ? (
                            <div>
                              <span className="line-through text-[#2A3F35]/50">₹{original}</span>
                              <span className="ml-3 font-medium text-[#D4AF37]">₹{p.price}</span>
                            </div>
                          ) : (
                            <span className="font-medium">₹{p.price}</span>
                          )}
                        </td>
                        <td className="py-6">{p.stock}</td>
                        <td className="py-6">
                          {p.is_new && <span className="px-3 py-1 text-xs bg-[#2A3F35] text-white rounded-full">New</span>}
                          {p.is_limited && <span className="ml-2 px-3 py-1 text-xs bg-amber-500 text-white rounded-full">Limited</span>}
                        </td>
                        <td className="pr-10 text-center">
                          <div className="flex gap-4 justify-center">
                            <button onClick={() => openModal(p)} className="text-[#D4AF37]"><Edit2 size={20} /></button>
                            <button onClick={() => deleteProduct(p.id)} className="text-red-500"><Trash2 size={20} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-6">
              {products.map((p) => {
                const original = p.original_price || p.price;
                const hasDiscount = p.original_price && p.original_price > p.price;

                return (
                  <div key={p.id} className="bg-white rounded-3xl p-6 border border-[#E8E0D0]">
                    <div className="flex gap-4">
                      <img src={p.images?.[0] || "/hero-bg.jpg"} alt="" className="w-24 h-24 object-cover rounded-2xl" />
                      <div className="flex-1">
                        <h3 className="font-medium">{p.name}</h3>
                        <p className="text-sm text-[#D4AF37]">{p.category}</p>
                        <div className="mt-2">
                          {hasDiscount ? (
                            <>
                              <span className="line-through text-sm text-[#2A3F35]/50">₹{original}</span>
                              <span className="ml-3 text-xl font-medium text-[#D4AF37]">₹{p.price}</span>
                            </>
                          ) : (
                            <span className="text-xl font-medium">₹{p.price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => openModal(p)} className="flex-1 border border-[#E8E0D0] py-3 rounded-2xl text-sm">Edit</button>
                      <button onClick={() => deleteProduct(p.id)} className="flex-1 border border-red-200 text-red-500 py-3 rounded-2xl text-sm">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay - Same as AdminDashboard */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="bg-white w-72 h-full p-6 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-8">
              <button onClick={() => setIsSidebarOpen(false)} className="text-[#2A3F35]">
                <X size={32} />
              </button>
            </div>

            <nav className="space-y-2">
              <Link 
                href="/admin/dashboard" 
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium"
                onClick={() => setIsSidebarOpen(false)}
              >
                📊 Overview
              </Link>
              <Link 
                href="/admin/products" 
                className="flex items-center gap-3 px-4 py-3 bg-[#2A3F35] text-white rounded-2xl font-medium"
                onClick={() => setIsSidebarOpen(false)}
              >
                📦 Products
              </Link>
              <Link 
                href="/admin/orders" 
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F6F0] rounded-2xl font-medium"
                onClick={() => setIsSidebarOpen(false)}
              >
                📋 Orders
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Modal - Unchanged */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center">
              <h2 className="text-3xl font-bold text-[#2A3F35]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={32} /></button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[calc(92vh-130px)] space-y-8">
              {/* All your form fields - unchanged */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Slug</label>
                  <input 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData({ ...formData, slug: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Selling Price (₹)</label>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Original Price (₹) <span className="text-[#D4AF37] text-xs">(for strikethrough)</span></label>
                  <input 
                    type="number" 
                    value={formData.original_price} 
                    onChange={e => setFormData({ ...formData, original_price: Number(e.target.value) })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Stock</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Material</label>
                  <input 
                    type="text" 
                    value={formData.material} 
                    onChange={e => setFormData({ ...formData, material: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gemstone</label>
                  <input 
                    type="text" 
                    value={formData.gemstone} 
                    onChange={e => setFormData({ ...formData, gemstone: e.target.value })} 
                    className="w-full border border-[#E8E0D0] rounded-full px-6 py-4 focus:border-[#D4AF37]" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  className="w-full border border-[#E8E0D0] rounded-3xl px-6 py-4 h-28 focus:border-[#D4AF37]" 
                />
              </div>

              <div className="flex items-center gap-8 border-t border-b py-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_new} 
                    onChange={e => setFormData({ ...formData, is_new: e.target.checked })} 
                    className="w-5 h-5 accent-[#D4AF37]" 
                  />
                  <span className="font-medium text-[#2A3F35]">New Arrival</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_limited} 
                    onChange={e => setFormData({ ...formData, is_limited: e.target.checked })} 
                    className="w-5 h-5 accent-[#D4AF37]" 
                  />
                  <span className="font-medium text-[#2A3F35]">Limited Edition</span>
                </label>
              </div>

              {/* Color Variants */}
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
                        <input 
                          type="text" 
                          value={color.name} 
                          onChange={(e) => updateColor(index, 'name', e.target.value)} 
                          className="w-full border border-[#E8E0D0] rounded-full px-4 py-3" 
                          placeholder="Rose Gold" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Photo</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) updateColor(index, 'tempFile', e.target.files[0]);
                          }} 
                          className="w-full text-sm" 
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1">Quantity</label>
                          <input 
                            type="number" 
                            value={color.qty} 
                            onChange={(e) => updateColor(index, 'qty', Number(e.target.value))} 
                            className="w-full border border-[#E8E0D0] rounded-full px-4 py-3" 
                          />
                        </div>
                        <button onClick={() => removeColor(index)} className="text-red-500 hover:text-red-700 mt-4">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[#2A3F35]">General Images (optional)</label>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="block w-full mb-8" />
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
                className="w-full bg-[#2A3F35] text-white py-3 rounded-2xl font-medium hover:bg-[#D4AF37] transition-all disabled:opacity-70"
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