'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Save, X, Search, BookOpen, Check } from 'lucide-react'

interface KnowledgeArticle {
  id: string
  title: string
  category: string
  content: string
  keywords: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const CATEGORIES = ['general', 'features', 'navigation', 'account', 'troubleshooting', 'billing']

export default function SupportKnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const loadArticles = async () => {
    const { data } = await supabase
      .from('support_knowledge')
      .select('*')
      .order('category')
      .order('sort_order')
    setArticles(data || [])
    setLoading(false)
  }

  useEffect(() => { loadArticles() }, [])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    const payload = {
      title: editing.title,
      category: editing.category,
      content: editing.content,
      keywords: editing.keywords,
      is_active: editing.is_active,
      sort_order: editing.sort_order,
      updated_at: new Date().toISOString(),
    }

    if (isNew) {
      await supabase.from('support_knowledge').insert(payload)
    } else {
      await supabase.from('support_knowledge').update(payload).eq('id', editing.id)
    }

    setSaving(false)
    setEditing(null)
    setIsNew(false)
    loadArticles()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return
    await supabase.from('support_knowledge').delete().eq('id', id)
    loadArticles()
  }

  const handleNew = () => {
    setIsNew(true)
    setEditing({
      id: '',
      title: '',
      category: 'general',
      content: '',
      keywords: [],
      is_active: true,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    })
  }

  const filtered = articles.filter(a => {
    if (filterCategory && a.category !== filterCategory) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filtered.reduce<Record<string, KnowledgeArticle[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Articles the AI Concierge uses to answer platform questions
          </p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#234A31] text-sm font-medium">
          <Plus size={16} /> Add Article
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!filterCategory ? 'bg-[#2D5A3D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filterCategory === cat ? 'bg-[#2D5A3D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-lg">{isNew ? 'New Article' : 'Edit Article'}</h2>
              <button onClick={() => { setEditing(null); setIsNew(false) }} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  placeholder="How to create a memory"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat} className="capitalize">{cat}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Order</label>
                  <input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Content</label>
                <textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 resize-none leading-relaxed"
                  rows={6}
                  placeholder="Write the knowledge article content..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Keywords (comma-separated)</label>
                <input
                  value={(editing.keywords || []).join(', ')}
                  onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  placeholder="memory, create, add, how to"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-gray-600">Active (visible to AI concierge)</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => { setEditing(null); setIsNew(false) }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !editing.title || !editing.content} className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#234A31] text-sm font-medium disabled:opacity-40">
                {saving ? 'Saving...' : <><Save size={14} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Articles list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, arts]) => (
            <div key={category}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 capitalize">{category}</h3>
              <div className="space-y-2">
                {arts.map(article => (
                  <div key={article.id} className={`flex items-start gap-4 p-4 rounded-xl border ${article.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <BookOpen size={16} className="text-[#2D5A3D] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900">{article.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.content}</p>
                      {article.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {article.keywords.map(kw => (
                            <span key={kw} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditing(article); setIsNew(false) }} className="p-2 text-gray-400 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/5 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(article.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No articles found. Add your first support article.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
