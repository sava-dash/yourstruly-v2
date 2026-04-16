'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Search, Edit2, Trash2, Eye, EyeOff, Loader2, Gift, ChevronLeft, ChevronRight, CheckSquare, Square, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

const PAGE_SIZE = 50

export default function MarketplacePage() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null)

  const supabase = createClient()

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
      setSelected(new Set())
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('marketplace_products')
      .select('*', { count: 'exact' })

    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%,provider.ilike.%${debouncedSearch}%`)
    }
    if (filterActive === 'active') query = query.eq('is_active', true)
    if (filterActive === 'inactive') query = query.eq('is_active', false)

    const start = (page - 1) * PAGE_SIZE
    query = query
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1)

    const { data, error, count } = await query
    if (!error && data) {
      setProducts(data)
      setTotal(count || 0)
    }
    setLoading(false)
  }, [debouncedSearch, filterActive, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Reset page when filter changes
  useEffect(() => { setPage(1); setSelected(new Set()) }, [filterActive])

  // Stats (fetch totals separately)
  const [stats, setStats] = useState({ total: 0, active: 0 })
  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: total }, { count: active }] = await Promise.all([
        supabase.from('marketplace_products').select('*', { count: 'exact', head: true }),
        supabase.from('marketplace_products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ])
      setStats({ total: total || 0, active: active || 0 })
    }
    fetchStats()
  }, [products]) // refresh when products change

  // Toggle single product
  const toggleActive = async (product: MarketplaceProduct) => {
    setToggling(prev => new Set(prev).add(product.id))
    const { error } = await supabase
      .from('marketplace_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    if (!error) {
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ))
    }
    setToggling(prev => { const s = new Set(prev); s.delete(product.id); return s })
  }

  // Bulk toggle selected
  const bulkToggle = async (activate: boolean) => {
    if (selected.size === 0) return
    setBulkWorking(true)
    const ids = [...selected]
    const { error } = await supabase
      .from('marketplace_products')
      .update({ is_active: activate })
      .in('id', ids)

    if (!error) {
      setProducts(prev => prev.map(p =>
        selected.has(p.id) ? { ...p, is_active: activate } : p
      ))
      setSelected(new Set())
    }
    setBulkWorking(false)
  }

  // Delete product
  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('marketplace_products').delete().eq('id', id)
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id))
      setTotal(prev => prev - 1)
    }
  }

  // Selection helpers
  const allSelected = products.length > 0 && products.every(p => selected.has(p.id))
  const someSelected = products.some(p => selected.has(p.id))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); products.forEach(p => s.delete(p.id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); products.forEach(p => s.add(p.id)); return s })
    }
  }
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">Marketplace Products</h1>
          <p className="text-[#2a1f1a]/60 mt-1">
            {stats.active} of {stats.total} products active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#406A56]/30 text-[#406A56] rounded-lg hover:bg-[#406A56]/5 transition-colors"
            title="Paste a JSON array of products to import in bulk"
          >
            <Upload size={18} />
            Bulk import from JSON
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#355847] transition-colors"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10">
          <Package className="w-5 h-5 text-[#2D5A3D]" />
          <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stats.total}</p>
          <p className="text-sm text-[#2a1f1a]/60">Total</p>
        </div>
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10">
          <Eye className="w-5 h-5 text-green-600" />
          <p className="text-2xl font-bold text-green-700 mt-2">{stats.active}</p>
          <p className="text-sm text-[#2a1f1a]/60">Active</p>
        </div>
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10">
          <EyeOff className="w-5 h-5 text-gray-400" />
          <p className="text-2xl font-bold text-gray-500 mt-2">{stats.total - stats.active}</p>
          <p className="text-sm text-[#2a1f1a]/60">Inactive</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
          <input
            type="text"
            placeholder="Search by name, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 border border-[#B8562E]/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-4 py-2 rounded-lg capitalize text-sm transition-colors ${
                filterActive === f
                  ? 'bg-[#2D5A3D] text-white'
                  : 'bg-white/60 text-[#2a1f1a]/60 hover:bg-white/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#2D5A3D]/10 border border-[#2D5A3D]/20 rounded-xl">
          <span className="text-sm font-medium text-[#2D5A3D]">
            {selected.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => bulkToggle(true)}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {bulkWorking ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              Enable All
            </button>
            <button
              onClick={() => bulkToggle(false)}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {bulkWorking ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />}
              Disable All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-sm text-[#2a1f1a]/50 hover:text-[#2a1f1a] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 bg-white/40 backdrop-blur-sm rounded-xl border border-[#B8562E]/10 text-center">
          <Package className="w-12 h-12 mx-auto text-[#B8562E]/30" />
          <h3 className="text-lg font-medium text-[#2a1f1a] mt-4">No Products Found</h3>
          <p className="text-[#2a1f1a]/60 mt-2 text-sm">
            {searchQuery ? 'Try a different search term' : 'No products match this filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#2D5A3D]/5 border-b border-[#B8562E]/10">
              <tr>
                <th className="p-4 w-10">
                  <button onClick={toggleSelectAll} className="text-[#2a1f1a]/40 hover:text-[#2D5A3D]">
                    {allSelected ? <CheckSquare size={18} className="text-[#2D5A3D]" /> : <Square size={18} />}
                  </button>
                </th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80 text-sm">Product</th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80 text-sm">Price</th>
                <th className="text-left p-4 font-medium text-[#2a1f1a]/80 text-sm hidden md:table-cell">Occasions</th>
                <th className="text-center p-4 font-medium text-[#2a1f1a]/80 text-sm">Active</th>
                <th className="text-right p-4 font-medium text-[#2a1f1a]/80 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8562E]/10">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-white/40 transition-colors ${
                    selected.has(product.id) ? 'bg-[#2D5A3D]/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <button onClick={() => toggleSelect(product.id)} className="text-[#2a1f1a]/40 hover:text-[#2D5A3D]">
                      {selected.has(product.id)
                        ? <CheckSquare size={18} className="text-[#2D5A3D]" />
                        : <Square size={18} />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-[#2D5A3D]/40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-[#2a1f1a] text-sm truncate max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-[#2a1f1a]/50 truncate">{product.provider || 'Internal'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-[#2a1f1a] text-sm">
                      ${(product.base_price_cents / 100).toFixed(2)}
                    </p>
                    {product.sale_price_cents && (
                      <p className="text-xs text-green-600">
                        ${(product.sale_price_cents / 100).toFixed(2)}
                      </p>
                    )}
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {product.occasions?.slice(0, 2).map((occ) => (
                        <span
                          key={occ}
                          className="px-1.5 py-0.5 bg-[#2D5A3D]/10 text-[#2D5A3D] text-xs rounded-full capitalize"
                        >
                          {occ}
                        </span>
                      ))}
                      {(product.occasions?.length || 0) > 2 && (
                        <span className="text-xs text-[#2a1f1a]/40">+{product.occasions.length - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Toggle Switch */}
                  <td className="p-4">
                    <div className="flex justify-center">
                      {toggling.has(product.id) ? (
                        <Loader2 size={20} className="animate-spin text-[#2D5A3D]" />
                      ) : (
                        <button
                          onClick={() => toggleActive(product)}
                          className="transition-colors"
                          title={product.is_active ? 'Click to disable' : 'Click to enable'}
                        >
                          {product.is_active ? (
                            <ToggleRight size={28} className="text-green-500 hover:text-green-600" />
                          ) : (
                            <ToggleLeft size={28} className="text-gray-300 hover:text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-1.5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={15} className="text-[#2a1f1a]/50" />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#B8562E]/10 bg-[#2D5A3D]/5">
              <p className="text-sm text-[#2a1f1a]/60">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={18} className="text-[#2a1f1a]" />
                </button>
                <span className="text-sm text-[#2a1f1a]/80 px-2 py-1">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-white/60 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={18} className="text-[#2a1f1a]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => { setShowAddModal(false); setEditingProduct(null) }}
          onSave={() => { fetchProducts(); setShowAddModal(false); setEditingProduct(null) }}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onImported={() => { fetchProducts() }}
        />
      )}
    </div>
  )
}

// ── Product Add/Edit Modal ───────────────────────────────────────────────────

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
    provider: product?.provider || 'goody',
    base_price_cents: product?.base_price_cents ? product.base_price_cents / 100 : 0,
    sale_price_cents: product?.sale_price_cents ? product.sale_price_cents / 100 : '',
    images: product?.images?.join('\n') || '',
    in_stock: product?.in_stock ?? true,
    is_curated: product?.is_curated ?? false,
    curated_score: product?.curated_score ?? 50,
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

    const result = product
      ? await supabase.from('marketplace_products').update(data).eq('id', product.id)
      : await supabase.from('marketplace_products').insert(data)

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }
    onSave()
  }

  const fields: { label: string; key: keyof typeof form; type?: string; span?: boolean; options?: string[]; placeholder?: string; textarea?: boolean }[] = [
    { label: 'Product Name *', key: 'name', span: true },
    { label: 'Description', key: 'description', span: true, textarea: true },
    { label: 'Price ($) *', key: 'base_price_cents', type: 'number' },
    { label: 'Sale Price ($)', key: 'sale_price_cents', type: 'number' },
    { label: 'Provider / Brand', key: 'provider' },
    { label: 'Goody Product ID', key: 'external_id' },
    { label: 'Image URLs (one per line)', key: 'images', span: true, textarea: true, placeholder: 'https://...' },
    { label: 'Occasions (comma-separated)', key: 'occasions', span: true, placeholder: 'birthday, anniversary, thank-you' },
    { label: 'Curated Score (0–100)', key: 'curated_score', type: 'number' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2a1f1a]">{product ? 'Edit Product' : 'Add Product'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.span ? 'col-span-2' : ''}>
                <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    value={String(form[f.key])}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    rows={3}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 text-sm"
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={String(form[f.key])}
                    onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? e.target.value : e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 text-sm"
                  />
                )}
              </div>
            ))}

            <div className="col-span-2 flex flex-wrap gap-5 pt-2">
              {([
                ['in_stock', 'In Stock'],
                ['is_curated', 'Curated Collection'],
                ['is_active', 'Active (visible in storefront)'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })}
                    className="w-4 h-4 text-[#2D5A3D] rounded"
                  />
                  <span className="text-sm text-[#2a1f1a]/80">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#2a1f1a]/60 hover:text-[#2a1f1a]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#355847] text-sm disabled:opacity-50 flex items-center gap-2"
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

// ── Bulk Import Modal ────────────────────────────────────────────────────────

interface BulkImportResponse {
  inserted: number
  skipped: number
  errors: Array<{ index: number; name?: string; reason: string }>
}

function BulkImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BulkImportResponse | null>(null)

  const placeholder = `[
  {
    "name": "Example Mug",
    "brand_name": "Example Brand",
    "description": "A test mug",
    "base_price_cents": 2500,
    "images": ["https://images.unsplash.com/photo-..."] ,
    "categories": ["home"],
    "scope": ["best_seller"]
  }
]`

  const handleSubmit = async () => {
    setError('')
    setResult(null)
    setBusy(true)

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError("That isn't valid JSON. Paste a JSON array like the example below.")
      setBusy(false)
      return
    }

    if (!Array.isArray(parsed)) {
      setError('Expected a JSON array (starts with `[`, ends with `]`).')
      setBusy(false)
      return
    }

    try {
      const res = await fetch('/api/admin/marketplace/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsed }),
      })
      const json = await res.json() as BulkImportResponse | { error?: string }
      if (!res.ok) {
        setError((json as { error?: string }).error || `Import failed (HTTP ${res.status})`)
      } else {
        setResult(json as BulkImportResponse)
        onImported()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2a1f1a]">Bulk import from JSON</h2>
            <p className="text-sm text-[#2a1f1a]/60 mt-1">
              Paste a JSON array of products. We&rsquo;ll auto-slug the brand and set the starting price.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#B8562E]/10 border border-[#B8562E]/30 text-[#B8562E] rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-[#406A56]/10 border border-[#406A56]/30 text-[#406A56] rounded-lg text-sm space-y-2">
              <div>
                <strong>{result.inserted}</strong> inserted, <strong>{result.skipped}</strong> skipped.
              </div>
              {result.errors.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Skipped rows:</p>
                  <ul className="text-xs list-disc pl-5 space-y-0.5">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        [{err.index}] {err.name ? `"${err.name}" — ` : ''}{err.reason}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>… and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
              JSON array of products
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={14}
              placeholder={placeholder}
              className="w-full px-3 py-2 font-mono text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
            />
            <p className="text-xs text-[#2a1f1a]/50 mt-1">
              Required per entry: <code>name</code>, <code>brand_name</code>, <code>base_price_cents</code>.
              Optional: description, images, categories, scope, brand_slug, in_stock.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#2a1f1a]/60 hover:text-[#2a1f1a]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || text.trim().length === 0}
              className="px-6 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#355847] text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
