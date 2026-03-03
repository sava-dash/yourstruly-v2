'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Search, Edit2, Trash2, Eye, EyeOff, Loader2, Filter, Gift } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface MarketplaceProduct {
  id: string
  external_id: string | null
  name: string
  description: string | null
  provider: string | null
  category_id: string | null
  base_price_cents: number
  sale_price_cents: number | null
  images: string[]
  in_stock: boolean
  is_curated: boolean
  curated_score: number | null
  occasions: string[]
  emotional_impact: string | null
  why_we_love_it: string | null
  is_active: boolean
  created_at: string
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  // Fetch products
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketplace_products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProducts(data)
    }
    setLoading(false)
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterActive === 'all' || 
      (filterActive === 'active' && p.is_active) ||
      (filterActive === 'inactive' && !p.is_active)
    return matchesSearch && matchesFilter
  })

  // Toggle active status
  const toggleActive = async (product: MarketplaceProduct) => {
    const { error } = await supabase
      .from('marketplace_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    if (!error) {
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ))
    }
  }

  // Delete product
  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    const { error } = await supabase
      .from('marketplace_products')
      .delete()
      .eq('id', id)

    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  // Stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    curated: products.filter(p => p.is_curated).length,
    inStock: products.filter(p => p.in_stock).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">Marketplace Products</h1>
          <p className="text-[#2a1f1a]/60 mt-1">Manage curated gifts and products</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#355847] transition-colors"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#C35F33]/10">
          <Package className="w-6 h-6 text-[#406A56]" />
          <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stats.total}</p>
          <p className="text-sm text-[#2a1f1a]/60">Total Products</p>
        </div>
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#C35F33]/10">
          <Eye className="w-6 h-6 text-green-600" />
          <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stats.active}</p>
          <p className="text-sm text-[#2a1f1a]/60">Active</p>
        </div>
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#C35F33]/10">
          <Gift className="w-6 h-6 text-[#C35F33]" />
          <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stats.curated}</p>
          <p className="text-sm text-[#2a1f1a]/60">Curated</p>
        </div>
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#C35F33]/10">
          <Package className="w-6 h-6 text-blue-600" />
          <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stats.inStock}</p>
          <p className="text-sm text-[#2a1f1a]/60">In Stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2a1f1a]/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/60 border border-[#C35F33]/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter as any)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filterActive === filter
                  ? 'bg-[#406A56] text-white'
                  : 'bg-white/60 text-[#2a1f1a]/60 hover:bg-white/80'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 bg-white/40 backdrop-blur-sm rounded-xl border border-[#C35F33]/10 text-center">
          <Package className="w-16 h-16 mx-auto text-[#C35F33]/30" />
          <h3 className="text-lg font-medium text-[#2a1f1a] mt-4">No Products Found</h3>
          <p className="text-[#2a1f1a]/60 mt-2">
            {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#355847] transition-colors"
          >
            Add Product
          </button>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#C35F33]/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#406A56]/5 border-b border-[#C35F33]/10">
              <tr>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80">Product</th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80">Price</th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80">Occasions</th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80">Status</th>
                <th className="text-right p-4 font-medium text-[#2a1f1a]/80">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C35F33]/10">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-white/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#406A56]/10 flex items-center justify-center">
                          <Package className="w-6 h-6 text-[#406A56]/40" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#2a1f1a]">{product.name}</p>
                        <p className="text-sm text-[#2a1f1a]/60">{product.provider || 'Internal'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-[#2a1f1a]">
                      ${(product.base_price_cents / 100).toFixed(2)}
                    </p>
                    {product.sale_price_cents && (
                      <p className="text-sm text-green-600">
                        Sale: ${(product.sale_price_cents / 100).toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {product.occasions?.slice(0, 3).map((occ) => (
                        <span
                          key={occ}
                          className="px-2 py-0.5 bg-[#406A56]/10 text-[#406A56] text-xs rounded-full capitalize"
                        >
                          {occ}
                        </span>
                      ))}
                      {(product.occasions?.length || 0) > 3 && (
                        <span className="px-2 py-0.5 text-[#2a1f1a]/40 text-xs">
                          +{product.occasions.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className="text-sm text-[#2a1f1a]/60">
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {product.is_curated && (
                        <span className="px-2 py-0.5 bg-[#C35F33]/10 text-[#C35F33] text-xs rounded-full">
                          Curated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(product)}
                        className="p-2 hover:bg-[#406A56]/10 rounded-lg transition-colors"
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {product.is_active ? (
                          <EyeOff size={18} className="text-[#2a1f1a]/60" />
                        ) : (
                          <Eye size={18} className="text-[#2a1f1a]/60" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 hover:bg-[#406A56]/10 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} className="text-[#2a1f1a]/60" />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false)
            setEditingProduct(null)
          }}
          onSave={() => {
            fetchProducts()
            setShowAddModal(false)
            setEditingProduct(null)
          }}
        />
      )}
    </div>
  )
}

// Product Add/Edit Modal
function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: MarketplaceProduct | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    external_id: product?.external_id || '',
    provider: product?.provider || 'internal',
    base_price_cents: product?.base_price_cents ? product.base_price_cents / 100 : 0,
    sale_price_cents: product?.sale_price_cents ? product.sale_price_cents / 100 : '',
    images: product?.images?.join('\n') || '',
    in_stock: product?.in_stock ?? true,
    is_curated: product?.is_curated ?? true,
    curated_score: product?.curated_score || 80,
    occasions: product?.occasions?.join(', ') || '',
    emotional_impact: product?.emotional_impact || 'medium',
    why_we_love_it: product?.why_we_love_it || '',
    is_active: product?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const data = {
      name: form.name,
      description: form.description || null,
      external_id: form.external_id || null,
      provider: form.provider || null,
      base_price_cents: Math.round(Number(form.base_price_cents) * 100),
      sale_price_cents: form.sale_price_cents ? Math.round(Number(form.sale_price_cents) * 100) : null,
      images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
      in_stock: form.in_stock,
      is_curated: form.is_curated,
      curated_score: form.curated_score,
      occasions: form.occasions.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      emotional_impact: form.emotional_impact,
      why_we_love_it: form.why_we_love_it || null,
      is_active: form.is_active,
    }

    let result
    if (product) {
      result = await supabase
        .from('marketplace_products')
        .update(data)
        .eq('id', product.id)
    } else {
      result = await supabase
        .from('marketplace_products')
        .insert(data)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-[#2a1f1a]">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.base_price_cents}
                onChange={(e) => setForm({ ...form, base_price_cents: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.sale_price_cents}
                onChange={(e) => setForm({ ...form, sale_price_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Provider
              </label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              >
                <option value="internal">Internal</option>
                <option value="goody">Goody</option>
                <option value="amazon">Amazon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                External ID
              </label>
              <input
                type="text"
                value={form.external_id}
                onChange={(e) => setForm({ ...form, external_id: e.target.value })}
                placeholder="Goody product ID, etc."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Image URLs (one per line)
              </label>
              <textarea
                value={form.images}
                onChange={(e) => setForm({ ...form, images: e.target.value })}
                rows={3}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 font-mono text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Occasions (comma-separated)
              </label>
              <input
                type="text"
                value={form.occasions}
                onChange={(e) => setForm({ ...form, occasions: e.target.value })}
                placeholder="birthday, anniversary, sympathy, congratulations"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Emotional Impact
              </label>
              <select
                value={form.emotional_impact}
                onChange={(e) => setForm({ ...form, emotional_impact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Curated Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.curated_score}
                onChange={(e) => setForm({ ...form, curated_score: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Why We Love It
              </label>
              <textarea
                value={form.why_we_love_it}
                onChange={(e) => setForm({ ...form, why_we_love_it: e.target.value })}
                rows={2}
                placeholder="A personal note about why this gift is special..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />
            </div>

            <div className="col-span-2 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                  className="w-4 h-4 text-[#406A56] rounded"
                />
                <span className="text-sm text-[#2a1f1a]/80">In Stock</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_curated}
                  onChange={(e) => setForm({ ...form, is_curated: e.target.checked })}
                  className="w-4 h-4 text-[#406A56] rounded"
                />
                <span className="text-sm text-[#2a1f1a]/80">Curated Collection</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#406A56] rounded"
                />
                <span className="text-sm text-[#2a1f1a]/80">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#2a1f1a]/60 hover:text-[#2a1f1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#355847] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
