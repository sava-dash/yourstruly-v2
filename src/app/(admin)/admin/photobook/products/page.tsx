'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen,
  Check,
  X,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  size: string;
  base_price: number;
  price_per_page: number;
  min_pages: number;
  max_pages: number;
  binding: 'hardcover' | 'softcover' | 'layflat';
  prodigi_sku: string | null;
  features: string[];
  image_url: string | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
}

const BINDINGS = [
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'softcover', label: 'Softcover' },
  { value: 'layflat', label: 'Layflat' },
];

const emptyProduct: Omit<Product, 'id' | 'created_at'> = {
  name: '',
  slug: '',
  description: '',
  size: '',
  base_price: 29.99,
  price_per_page: 0.40,
  min_pages: 24,
  max_pages: 80,
  binding: 'hardcover',
  prodigi_sku: '',
  features: [],
  image_url: null,
  sort_order: 0,
  is_enabled: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'created_at'>>(emptyProduct);
  const [showForm, setShowForm] = useState(false);
  const [featuresInput, setFeaturesInput] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('photobook_products')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      size: product.size,
      base_price: product.base_price,
      price_per_page: product.price_per_page,
      min_pages: product.min_pages,
      max_pages: product.max_pages,
      binding: product.binding,
      prodigi_sku: product.prodigi_sku || '',
      features: product.features || [],
      image_url: product.image_url,
      sort_order: product.sort_order,
      is_enabled: product.is_enabled,
    });
    setFeaturesInput((product.features || []).join('\n'));
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setFormData({ ...emptyProduct, sort_order: products.length });
    setFeaturesInput('');
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(emptyProduct);
    setFeaturesInput('');
    setShowForm(false);
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[×"]/g, 'x')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function handleSave() {
    setSaving(true);
    
    const features = featuresInput
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    
    const dataToSave = {
      ...formData,
      features,
      slug: formData.slug || generateSlug(formData.name),
      prodigi_sku: formData.prodigi_sku || null,
      description: formData.description || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('photobook_products')
        .update(dataToSave)
        .eq('id', editingId);
      
      if (error) {
        console.error('Error updating product:', error);
        alert('Failed to update product');
      }
    } else {
      const { error } = await supabase
        .from('photobook_products')
        .insert([dataToSave]);
      
      if (error) {
        console.error('Error creating product:', error);
        alert('Failed to create product');
      }
    }
    
    setSaving(false);
    cancelEdit();
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const { error } = await supabase
      .from('photobook_products')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } else {
      fetchProducts();
    }
  }

  async function toggleEnabled(product: Product) {
    const { error } = await supabase
      .from('photobook_products')
      .update({ is_enabled: !product.is_enabled })
      .eq('id', product.id);
    
    if (error) {
      console.error('Error toggling product:', error);
    } else {
      fetchProducts();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/photobook"
            className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2a1f1a]">Photobook Products</h1>
            <p className="text-[#2a1f1a]/60 mt-1">Manage sizes, bindings, and pricing</p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">
            {editingId ? 'Edit Product' : 'New Product'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder='e.g., 8×8" Hardcover'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="Auto-generated from name"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Description</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="Brief description of the product"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Size</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder='e.g., 8×8"'
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Binding</label>
              <select
                value={formData.binding}
                onChange={(e) => setFormData({ ...formData, binding: e.target.value as 'hardcover' | 'softcover' | 'layflat' })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              >
                {BINDINGS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Base Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Price per Page ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_per_page}
                onChange={(e) => setFormData({ ...formData, price_per_page: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Min Pages</label>
              <input
                type="number"
                min="1"
                value={formData.min_pages}
                onChange={(e) => setFormData({ ...formData, min_pages: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Max Pages</label>
              <input
                type="number"
                min="1"
                value={formData.max_pages}
                onChange={(e) => setFormData({ ...formData, max_pages: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Prodigi SKU</label>
              <input
                type="text"
                value={formData.prodigi_sku || ''}
                onChange={(e) => setFormData({ ...formData, prodigi_sku: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="e.g., BOOK-HARD-SQ-9X9"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Features (one per line)</label>
              <textarea
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="PUR binding&#10;Matte-laminated cover&#10;200gsm paper"
              />
            </div>
            
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/50"
              />
              <label htmlFor="is_enabled" className="text-sm font-medium text-[#2a1f1a]/70">
                Enabled (visible to users)
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#B8562E]/10">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-[#2a1f1a]/70 hover:text-[#2a1f1a] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.size}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="glass">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D5A3D]" />
            <p className="text-[#2a1f1a]/60 mt-2">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-[#B8562E]/30" />
            <p className="text-[#2a1f1a]/60 mt-4">No products yet</p>
            <button
              onClick={startNew}
              className="mt-4 text-[#2D5A3D] hover:underline"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#B8562E]/10">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-4 p-4 hover:bg-white/30 transition-colors ${
                  !product.is_enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-shrink-0 text-[#2a1f1a]/30">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#2D5A3D]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#2a1f1a]">{product.name}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] capitalize">
                      {product.binding}
                    </span>
                  </div>
                  <p className="text-sm text-[#2a1f1a]/60 truncate">
                    {product.size} • {product.min_pages}-{product.max_pages} pages
                    {product.prodigi_sku && ` • SKU: ${product.prodigi_sku}`}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-[#2a1f1a]">${product.base_price}</p>
                  <p className="text-xs text-[#2a1f1a]/50">+${product.price_per_page}/page</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEnabled(product)}
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                    title={product.is_enabled ? 'Disable' : 'Enable'}
                  >
                    {product.is_enabled ? (
                      <ToggleRight className="w-5 h-5 text-[#2D5A3D]" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-[#2a1f1a]/30" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => startEdit(product)}
                    className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#B8562E] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
