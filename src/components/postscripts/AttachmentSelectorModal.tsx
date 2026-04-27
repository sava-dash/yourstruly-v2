'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, Brain, Image as ImageIcon, Search, CheckCircle2, 
  Loader2, Sparkles, Calendar, Tag, Lightbulb, Heart,
  BookOpen, Users, GraduationCap, Briefcase, Utensils,
  Compass, Baby, Activity, Palette, Moon, HelpCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Memory interface (subset of fields needed for selection)
interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  ai_summary: string
  ai_category: string
  ai_labels: string[]
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

// Wisdom interface (subset of fields needed for selection)
interface WisdomEntry {
  id: string
  title: string
  description: string
  audio_url?: string
  tags: string[]
  created_at: string
  category?: string
  ai_category?: string
}

export type AttachmentType = 'memory' | 'wisdom'

export interface SelectedAttachment {
  id: string
  type: AttachmentType
  title: string
  description: string
  imageUrl?: string
  date?: string
  category?: string
  tags?: string[]
}

interface AttachmentSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (attachments: SelectedAttachment[]) => void
  type: AttachmentType
  preselectedIds?: string[]
  allowMultiple?: boolean
}

// Wisdom category config with icons
const WISDOM_CATEGORIES = [
  { key: 'life_lessons', label: 'Life Lessons', icon: Lightbulb, color: '#C4A235' },
  { key: 'relationships', label: 'Relationships', icon: Heart, color: '#B8562E' },
  { key: 'family', label: 'Family', icon: Users, color: '#2D5A3D' },
  { key: 'career', label: 'Career', icon: Briefcase, color: '#4A3552' },
  { key: 'parenting', label: 'Parenting', icon: Baby, color: '#8DACAB' },
  { key: 'health', label: 'Health', icon: Activity, color: '#5B8A72' },
  { key: 'spirituality', label: 'Spirituality', icon: Moon, color: '#6B5B95' },
  { key: 'creativity', label: 'Creativity', icon: Palette, color: '#E07C52' },
  { key: 'values', label: 'Values', icon: Compass, color: '#3D7068' },
  { key: 'recipes', label: 'Recipes', icon: Utensils, color: '#B8562E' },
  { key: 'advice', label: 'Advice', icon: GraduationCap, color: '#C4A235' },
  { key: 'other', label: 'Other', icon: HelpCircle, color: '#888888' },
]

// Memory categories
const MEMORY_CATEGORIES = [
  { key: 'travel', label: 'Travel' },
  { key: 'family', label: 'Family' },
  { key: 'celebration', label: 'Celebrations' },
  { key: 'nature', label: 'Nature' },
  { key: 'food', label: 'Food' },
  { key: 'everyday', label: 'Everyday' },
]

export function AttachmentSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect,
  type,
  preselectedIds = [],
  allowMultiple = true
}: AttachmentSelectorModalProps) {
  const supabase = createClient()
  
  const [items, setItems] = useState<(Memory | WisdomEntry)[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedIds))
  const [isSaving, setIsSaving] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedCategory(null)
      setSelectedIds(new Set(preselectedIds))
      fetchItems()
    }
  }, [isOpen, type, preselectedIds])

  async function fetchItems() {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    if (type === 'memory') {
      const { data } = await supabase
        .from('memories')
        .select(`
          id, title, description, memory_date, memory_type,
          location_name, ai_summary, ai_category, ai_labels,
          memory_media(id, file_url, file_type, is_cover)
        `)
        .eq('user_id', user.id)
        .neq('memory_type', 'wisdom')
        .order('memory_date', { ascending: false })
        .limit(100)
      
      setItems(data || [])
    } else {
      // Fetch wisdom entries
      const { data } = await supabase
        .from('memories')
        .select(`
          id, title, description, memory_date, memory_type,
          ai_summary, ai_category, ai_labels, memory_media(id, file_url, file_type, is_cover)
        `)
        .eq('user_id', user.id)
        .eq('memory_type', 'wisdom')
        .order('memory_date', { ascending: false })
        .limit(100)
      
      // Transform to wisdom format
      const wisdomItems: WisdomEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled Wisdom',
        description: item.description || item.ai_summary || '',
        tags: item.ai_labels || [],
        created_at: item.memory_date || item.created_at,
        category: item.ai_category,
        ai_category: item.ai_category
      }))
      
      setItems(wisdomItems)
    }
    
    setLoading(false)
  }

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const tags = 'tags' in item ? item.tags : undefined
    const category = 'category' in item ? item.category : undefined
    const matchesSearch = !searchQuery || 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tags && tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())))
    
    const matchesCategory = !selectedCategory || 
      item.ai_category === selectedCategory ||
      category === selectedCategory ||
      (tags && tags.includes(selectedCategory))
    
    return matchesSearch && matchesCategory
  })

  function toggleSelection(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      if (!allowMultiple) {
        newSelected.clear()
      }
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function handleConfirm() {
    const selectedAttachments: SelectedAttachment[] = items
      .filter(item => selectedIds.has(item.id))
      .map(item => {
        const isMemory = type === 'memory'
        const memoryItem = item as Memory
        const wisdomItem = item as WisdomEntry
        
        return {
          id: item.id,
          type,
          title: item.title || (isMemory ? 'Untitled Memory' : 'Untitled Wisdom'),
          description: item.description || (isMemory ? memoryItem.ai_summary : '') || '',
          imageUrl: isMemory && memoryItem.memory_media?.length 
            ? memoryItem.memory_media.find(m => m.is_cover)?.file_url || memoryItem.memory_media[0]?.file_url
            : undefined,
          date: isMemory ? memoryItem.memory_date : wisdomItem.created_at,
          category: item.ai_category || (isMemory ? undefined : wisdomItem.category),
          tags: (isMemory ? memoryItem.ai_labels : wisdomItem.tags) || []
        }
      })
    
    onSelect(selectedAttachments)
    onClose()
  }

  function getCategoryIcon(categoryKey: string) {
    if (type === 'wisdom') {
      const cat = WISDOM_CATEGORIES.find(c => c.key === categoryKey)
      return cat?.icon || HelpCircle
    }
    return Tag
  }

  function getCategoryLabel(categoryKey: string) {
    if (type === 'wisdom') {
      const cat = WISDOM_CATEGORIES.find(c => c.key === categoryKey)
      return cat?.label || categoryKey
    }
    const cat = MEMORY_CATEGORIES.find(c => c.key === categoryKey)
    return cat?.label || categoryKey
  }

  if (!isOpen) return null

  const title = type === 'memory' ? 'Attach Memories' : 'Attach Wisdom'
  const subtitle = type === 'memory' 
    ? 'Select memories to share with this message' 
    : 'Select wisdom entries to include'
  const icon = type === 'memory' ? ImageIcon : Brain
  const categories = type === 'memory' ? MEMORY_CATEGORIES : WISDOM_CATEGORIES

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          background: 'var(--ed-cream, #F3ECDC)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '2px solid var(--ed-ink, #111)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center"
              style={{
                width: 40, height: 40,
                background: type === 'memory' ? 'var(--ed-blue, #2A5CD3)' : 'var(--ed-yellow, #F2C84B)',
                color: type === 'memory' ? '#fff' : 'var(--ed-ink, #111)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              {React.createElement(icon, { className: "w-5 h-5" })}
            </span>
            <div>
              <p
                className="text-[10px] tracking-[0.22em] text-[var(--ed-muted,#6F6B61)]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                {subtitle.toUpperCase()}
              </p>
              <h2
                className="text-[var(--ed-ink,#111)] leading-tight"
                style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: 22 }}
              >
                {title.toUpperCase()}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36,
              borderRadius: 999,
              border: '2px solid var(--ed-ink, #111)',
              background: 'var(--ed-paper, #FFFBF1)',
            }}
            aria-label="Close"
          >
            <X size={16} className="text-[var(--ed-ink,#111)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${type === 'memory' ? 'memories' : 'wisdom'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                       focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${!selectedCategory 
                  ? 'bg-[#B8562E] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              All {type === 'memory' ? 'Memories' : 'Wisdom'}
            </button>
            {categories.map(cat => {
              const wisdomCat = cat as typeof WISDOM_CATEGORIES[number]
              const CatIcon = 'icon' in cat ? wisdomCat.icon : null
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2
                    ${selectedCategory === cat.key 
                      ? 'bg-[#B8562E] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {CatIcon && <CatIcon size={14} />}
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Selected Count */}
          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 bg-[#B8562E]/5 border border-[#B8562E]/20 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-[#B8562E]">
                {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Items Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#B8562E] animate-spin mb-3" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">
                {searchQuery || selectedCategory 
                  ? `No ${type} found matching your filters`
                  : `No ${type} entries yet`
                }
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory(null) }}
                  className="mt-2 text-[#B8562E] hover:underline text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const isSelected = selectedIds.has(item.id)
                const memoryItem = item as Memory
                const coverImage = type === 'memory' && memoryItem.memory_media?.length
                  ? memoryItem.memory_media.find(m => m.is_cover)?.file_url || memoryItem.memory_media[0]?.file_url
                  : null
                
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={`group relative text-left bg-white border-2 rounded-xl overflow-hidden
                             transition-all ${
                               isSelected 
                                 ? 'border-[#B8562E] ring-2 ring-[#B8562E]/20' 
                                 : 'border-gray-200 hover:border-[#B8562E]/50'
                             }`}
                  >
                    {/* Selection Indicator */}
                    <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center
                                   transition-all ${isSelected ? 'bg-[#B8562E] scale-100' : 'bg-white/80 scale-90 opacity-0 group-hover:opacity-100'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                    </div>

                    {/* Image */}
                    {coverImage ? (
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <img
                          src={coverImage}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                    ) : (
                      <div className={`aspect-video flex items-center justify-center ${
                        type === 'memory' ? 'bg-[#2D5A3D]/10' : 'bg-[#C4A235]/10'
                      }`}>
                        {React.createElement(icon, { 
                          className: `w-12 h-12 ${type === 'memory' ? 'text-[#2D5A3D]/40' : 'text-[#C4A235]/60'}` 
                        })}
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title || 'Untitled'}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {item.description || (item as Memory).ai_summary || 'No description'}
                      </p>
                      
                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {item.ai_category && (
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            {getCategoryLabel(item.ai_category)}
                          </span>
                        )}
                        {((item as Memory).memory_date || (item as WisdomEntry).created_at) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date((item as Memory).memory_date || (item as WisdomEntry).created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {allowMultiple ? 'Click items to select multiple' : 'Click an item to select it'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isSaving}
              className="px-6 py-2 bg-[#B8562E] text-white rounded-lg font-medium
                       hover:bg-[#A84E2A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Attach {selectedIds.size > 0 && `(${selectedIds.size})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttachmentSelectorModal
