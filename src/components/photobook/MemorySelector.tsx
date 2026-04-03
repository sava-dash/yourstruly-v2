'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Image as ImageIcon,
  Video,
  Mic,
  BookOpen,
  Search,
  X,
  Check,
  CheckSquare,
  Square,
  Filter,
  Calendar,
  Users,
  Sparkles,
  ChevronDown,
  Play,
  Eye,
  Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// =============================================================================
// TYPES
// =============================================================================

export type ContentType = 'photo' | 'memory' | 'wisdom'

export interface SelectedItem {
  id: string
  type: ContentType
  title: string
  thumbnail_url?: string
  memory_date?: string
  category?: string
  contact_ids?: string[]
}

export interface MemorySelectorProps {
  // Core props
  maxSelections?: number
  contentTypes?: ContentType[]
  onSelectionChange?: (items: SelectedItem[]) => void
  initialSelection?: string[]
  
  // Legacy support for PhotobookBuilder
  userId?: string
  selectedIds?: string[]
  onSelect?: (memoryIds: string[]) => void
  onClose?: () => void
}

interface MemoryItem {
  id: string
  title: string
  description?: string
  memory_date?: string
  memory_type: string
  location_name?: string
  ai_category?: string
  ai_mood?: string
  ai_labels?: string[]
  tags?: string[]
  is_favorite: boolean
  audio_url?: string
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
  memory_tags?: {
    contact_id: string
    contacts?: {
      id: string
      name: string
    }
  }[]
}

interface Contact {
  id: string
  name: string
  relationship_type?: string
}

type TabType = 'all' | 'photo' | 'memory' | 'wisdom'

// =============================================================================
// CONSTANTS
// =============================================================================

const TAB_CONFIG: { key: TabType; label: string; icon: React.ComponentType<any>; description: string }[] = [
  { key: 'all', label: 'All', icon: Layers, description: 'All content types' },
  { key: 'photo', label: 'Photos', icon: ImageIcon, description: 'Photo memories' },
  { key: 'memory', label: 'Memories', icon: Video, description: 'Video & audio memories' },
  { key: 'wisdom', label: 'Wisdom', icon: BookOpen, description: 'Wisdom entries' },
]

const WISDOM_CATEGORIES = [
  'life_lessons',
  'relationships',
  'family',
  'career',
  'values',
  'recipes',
  'advice',
]

// =============================================================================
// MEMORY SELECTOR COMPONENT
// =============================================================================

export default function MemorySelector({
  maxSelections,
  contentTypes = ['photo', 'memory', 'wisdom'],
  onSelectionChange,
  initialSelection = [],
  // Legacy props
  userId,
  selectedIds,
  onSelect,
  onClose,
}: MemorySelectorProps) {
  const supabase = createClient()
  
  // State
  const [items, setItems] = useState<MemoryItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(initialSelection || selectedIds || [])
  )
  
  // Filters
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Preview
  const [previewItem, setPreviewItem] = useState<MemoryItem | null>(null)
  
  // Drag selection
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  // =============================================================================
  // DATA LOADING
  // =============================================================================
  
  const loadData = useCallback(async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !userId) {
      setLoading(false)
      return
    }
    
    const uid = userId || user?.id
    
    // Load memories and wisdom
    const { data: memories, error } = await supabase
      .from('memories')
      .select(`
        id,
        title,
        description,
        memory_date,
        memory_type,
        location_name,
        ai_category,
        ai_mood,
        ai_labels,
        tags,
        is_favorite,
        audio_url,
        memory_media(id, file_url, file_type, is_cover),
        memory_tags(contact_id, contacts(id, name))
      `)
      .eq('user_id', uid)
      .order('memory_date', { ascending: false })
    
    if (error) {
      console.error('Failed to load memories:', error)
    }
    
    // Load contacts
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, name, relationship_type')
      .eq('user_id', uid)
      .order('name')
    
    setItems((memories || []) as unknown as MemoryItem[])
    setContacts(contactsData || [])
    setLoading(false)
  }, [supabase, userId])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // =============================================================================
  // FILTERING
  // =============================================================================
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filter by tab
      if (activeTab !== 'all') {
        if (activeTab === 'photo') {
          // Photos are memories with images but not video/audio/wisdom
          const hasPhoto = item.memory_media?.some(m => m.file_type?.startsWith('image/'))
          const isNotWisdom = item.memory_type !== 'wisdom'
          const isNotVideoAudio = !item.memory_media?.some(m => 
            m.file_type?.startsWith('video/') || m.file_type?.startsWith('audio/')
          ) && !item.audio_url
          if (!hasPhoto || !isNotWisdom) return false
        } else if (activeTab === 'memory') {
          // Memories with video/audio
          const hasVideoAudio = item.memory_media?.some(m => 
            m.file_type?.startsWith('video/') || m.file_type?.startsWith('audio/')
          ) || item.audio_url
          if (!hasVideoAudio || item.memory_type === 'wisdom') return false
        } else if (activeTab === 'wisdom') {
          if (item.memory_type !== 'wisdom') return false
        }
      }
      
      // Filter by content types (from props)
      if (contentTypes.length > 0 && !contentTypes.includes('photo') && !contentTypes.includes('memory') && !contentTypes.includes('wisdom')) {
        return false
      }
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.location_name?.toLowerCase().includes(query) ||
          (Array.isArray(item.ai_labels) && item.ai_labels.some(l => l?.toLowerCase().includes(query))) ||
          (Array.isArray(item.tags) && item.tags.some(t => t?.toLowerCase().includes(query)))
        if (!matchesSearch) return false
      }
      
      // Filter by date range
      if (dateRange.start && item.memory_date && item.memory_date < dateRange.start) {
        return false
      }
      if (dateRange.end && item.memory_date && item.memory_date > dateRange.end) {
        return false
      }
      
      // Filter by category (for wisdom)
      if (selectedCategory) {
        const matchesCategory = 
          item.ai_category === selectedCategory ||
          item.tags?.includes(selectedCategory)
        if (!matchesCategory) return false
      }
      
      // Filter by person (tagged contacts)
      if (selectedContactId) {
        const matchesPerson = item.memory_tags?.some(t => t.contact_id === selectedContactId)
        if (!matchesPerson) return false
      }
      
      return true
    })
  }, [items, activeTab, contentTypes, searchQuery, dateRange, selectedCategory, selectedContactId])
  
  // =============================================================================
  // SELECTION LOGIC
  // =============================================================================
  
  const toggleSelection = useCallback((id: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        // Check max selections
        if (maxSelections && newSet.size >= maxSelections) {
          return prev
        }
        newSet.add(id)
      }
      return newSet
    })
  }, [maxSelections])
  
  const selectAll = useCallback(() => {
    const idsToAdd = filteredItems.map(i => i.id)
    if (maxSelections) {
      const remaining = maxSelections - selectedItemIds.size
      setSelectedItemIds(prev => {
        const newSet = new Set(prev)
        idsToAdd.slice(0, remaining).forEach(id => newSet.add(id))
        return newSet
      })
    } else {
      setSelectedItemIds(new Set([...selectedItemIds, ...idsToAdd]))
    }
  }, [filteredItems, maxSelections, selectedItemIds])
  
  const deselectAll = useCallback(() => {
    const filteredIds = new Set(filteredItems.map(i => i.id))
    setSelectedItemIds(prev => {
      const newSet = new Set(prev)
      filteredIds.forEach(id => newSet.delete(id))
      return newSet
    })
  }, [filteredItems])
  
  // Notify parent of selection changes
  useEffect(() => {
    const selectedItems: SelectedItem[] = items
      .filter(item => selectedItemIds.has(item.id))
      .map(item => ({
        id: item.id,
        type: getItemType(item),
        title: item.title || 'Untitled',
        thumbnail_url: getCoverUrl(item),
        memory_date: item.memory_date,
        category: item.ai_category,
        contact_ids: item.memory_tags?.map(t => t.contact_id),
      }))
    
    // New callback
    if (onSelectionChange) {
      onSelectionChange(selectedItems)
    }
    
    // Legacy callback
    if (onSelect) {
      onSelect(Array.from(selectedItemIds))
    }
  }, [selectedItemIds, items, onSelectionChange, onSelect])
  
  // =============================================================================
  // DRAG SELECTION
  // =============================================================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    if ((e.target as HTMLElement).closest('[data-item]')) return // Don't start drag on items
    
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragEnd({ x: e.clientX, y: e.clientY })
  }, [])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return
    setDragEnd({ x: e.clientX, y: e.clientY })
  }, [isDragging, dragStart])
  
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }
    
    // Calculate selection box
    const minX = Math.min(dragStart.x, dragEnd.x)
    const maxX = Math.max(dragStart.x, dragEnd.x)
    const minY = Math.min(dragStart.y, dragEnd.y)
    const maxY = Math.max(dragStart.y, dragEnd.y)
    
    // Only process if dragged at least 10px
    if (maxX - minX < 10 && maxY - minY < 10) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }
    
    // Find items within selection box
    const newSelected = new Set(selectedItemIds)
    let addedCount = 0
    
    itemRefs.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect()
      const itemCenterX = rect.left + rect.width / 2
      const itemCenterY = rect.top + rect.height / 2
      
      if (
        itemCenterX >= minX &&
        itemCenterX <= maxX &&
        itemCenterY >= minY &&
        itemCenterY <= maxY
      ) {
        if (!newSelected.has(id)) {
          if (!maxSelections || newSelected.size < maxSelections) {
            newSelected.add(id)
            addedCount++
          }
        }
      }
    })
    
    if (addedCount > 0) {
      setSelectedItemIds(newSelected)
    }
    
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, selectedItemIds, maxSelections])
  
  // =============================================================================
  // HELPERS
  // =============================================================================
  
  const getItemType = (item: MemoryItem): ContentType => {
    if (item.memory_type === 'wisdom') return 'wisdom'
    const hasVideoAudio = item.memory_media?.some(m => 
      m.file_type?.startsWith('video/') || m.file_type?.startsWith('audio/')
    ) || item.audio_url
    if (hasVideoAudio) return 'memory'
    return 'photo'
  }
  
  const getCoverUrl = (item: MemoryItem): string | undefined => {
    const cover = item.memory_media?.find(m => m.is_cover) || item.memory_media?.[0]
    return cover?.file_url
  }
  
  const getTypeIcon = (item: MemoryItem) => {
    const type = getItemType(item)
    switch (type) {
      case 'wisdom':
        return <BookOpen size={12} className="text-amber-500" />
      case 'memory':
        return item.audio_url ? <Mic size={12} className="text-blue-500" /> : <Video size={12} className="text-purple-500" />
      case 'photo':
      default:
        return <ImageIcon size={12} className="text-green-500" />
    }
  }
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const hasActiveFilters = searchQuery || dateRange.start || dateRange.end || selectedCategory || selectedContactId
  
  const clearFilters = () => {
    setSearchQuery('')
    setDateRange({ start: '', end: '' })
    setSelectedCategory(null)
    setSelectedContactId(null)
  }
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  const selectedCount = selectedItemIds.size
  const filteredSelectedCount = filteredItems.filter(i => selectedItemIds.has(i.id)).length
  
  // Filter tabs based on contentTypes prop
  const availableTabs = TAB_CONFIG.filter(tab => {
    if (tab.key === 'all') return true
    return contentTypes.includes(tab.key as ContentType)
  })
  
  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex-shrink-0 space-y-4 p-4 border-b border-[#2D5A3D]/10">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {availableTabs.map(tab => {
            const Icon = tab.icon
            const count = tab.key === 'all' 
              ? items.length 
              : items.filter(i => {
                  const type = getItemType(i)
                  return type === tab.key
                }).length
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#2D5A3D] text-white shadow-lg shadow-[#2D5A3D]/20'
                    : 'bg-white/60 text-[#2D5A3D] hover:bg-white border border-[#2D5A3D]/20'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-white/20' : 'bg-[#2D5A3D]/10'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Search & Filters Row */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search" placeholder="Search by title, content, or tags..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/80 border border-[#2D5A3D]/20 text-[#2d2d2d] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 hover:text-[#2D5A3D]"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-[#B8562E] text-white'
                : 'bg-white/80 text-[#2D5A3D] hover:bg-white border border-[#2D5A3D]/20'
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white" />
            )}
          </button>
        </div>
        
        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* Date Range */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#2D5A3D]/70 flex items-center gap-1">
                    <Calendar size={12} />
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/80 border border-[#2D5A3D]/20 text-sm text-[#2d2d2d] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                    />
                    <span className="text-[#2D5A3D]/50 text-sm">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/80 border border-[#2D5A3D]/20 text-sm text-[#2d2d2d] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                    />
                  </div>
                </div>
                
                {/* Category (for Wisdom) */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#2D5A3D]/70 flex items-center gap-1">
                    <BookOpen size={12} />
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value || null)}
                      className="w-full px-3 py-2 rounded-lg bg-white/80 border border-[#2D5A3D]/20 text-sm text-[#2d2d2d] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                    >
                      <option value="">All categories</option>
                      {WISDOM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 pointer-events-none" />
                  </div>
                </div>
                
                {/* Person Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#2D5A3D]/70 flex items-center gap-1">
                    <Users size={12} />
                    Tagged Person
                  </label>
                  <div className="relative">
                    <select
                      value={selectedContactId || ''}
                      onChange={(e) => setSelectedContactId(e.target.value || null)}
                      className="w-full px-3 py-2 rounded-lg bg-white/80 border border-[#2D5A3D]/20 text-sm text-[#2d2d2d] appearance-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                    >
                      <option value="">All people</option>
                      {contacts.map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50 pointer-events-none" />
                  </div>
                </div>
                
                {/* Clear Filters */}
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-[#B8562E] hover:text-[#a84d28] text-sm font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Selection Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <CheckSquare size={14} />
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <Square size={14} />
              Deselect All
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-[#2D5A3D]/70">
            <Sparkles size={14} className="text-[#C4A235]" />
            <span>
              {selectedCount} selected
              {maxSelections && ` / ${maxSelections} max`}
            </span>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto p-4 relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drag selection box */}
        {isDragging && dragStart && dragEnd && (
          <div
            className="fixed border-2 border-[#2D5A3D] bg-[#2D5A3D]/10 rounded-lg pointer-events-none z-50"
            style={{
              left: Math.min(dragStart.x, dragEnd.x),
              top: Math.min(dragStart.y, dragEnd.y),
              width: Math.abs(dragEnd.x - dragStart.x),
              height: Math.abs(dragEnd.y - dragStart.y),
            }}
          />
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#2D5A3D]/60 text-sm">Loading content...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#2D5A3D]/10 flex items-center justify-center mb-4">
              <ImageIcon size={32} className="text-[#2D5A3D]/40" />
            </div>
            <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">
              {hasActiveFilters ? 'No matching items' : 'No content yet'}
            </h3>
            <p className="text-[#2D5A3D]/60 text-sm max-w-xs">
              {hasActiveFilters
                ? 'Try adjusting your filters to find what you\'re looking for'
                : 'Add memories and wisdom entries to select them for your photobook'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#365a49] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map(item => {
              const isSelected = selectedItemIds.has(item.id)
              const coverUrl = getCoverUrl(item)
              
              return (
                <div
                  key={item.id}
                  ref={el => {
                    if (el) itemRefs.current.set(item.id, el)
                    else itemRefs.current.delete(item.id)
                  }}
                  data-item
                  onClick={() => toggleSelection(item.id)}
                  onMouseEnter={() => setPreviewItem(item)}
                  onMouseLeave={() => setPreviewItem(null)}
                  className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'ring-3 ring-[#2D5A3D] ring-offset-2 scale-[0.98]'
                      : 'hover:ring-2 hover:ring-[#2D5A3D]/30 hover:scale-[1.02]'
                  }`}
                >
                  {/* Thumbnail */}
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={item.title || 'Memory'}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      item.memory_type === 'wisdom'
                        ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                        : 'bg-gradient-to-br from-[#2D5A3D]/10 to-[#8DACAB]/20'
                    }`}>
                      {item.memory_type === 'wisdom' ? (
                        <BookOpen size={32} className="text-amber-500/50" />
                      ) : item.audio_url ? (
                        <Mic size={32} className="text-[#2D5A3D]/50" />
                      ) : (
                        <ImageIcon size={32} className="text-[#2D5A3D]/50" />
                      )}
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className={`absolute inset-0 transition-opacity ${
                    isSelected
                      ? 'bg-[#2D5A3D]/20'
                      : 'bg-black/0 group-hover:bg-black/10'
                  }`} />
                  
                  {/* Selection Checkbox */}
                  <div className={`absolute top-2 left-2 transition-all ${
                    isSelected || 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#2D5A3D] text-white'
                        : 'bg-white/90 border border-[#2D5A3D]/30 text-transparent'
                    }`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm flex items-center gap-1">
                    {getTypeIcon(item)}
                  </div>
                  
                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <h4 className="text-white text-xs font-medium truncate drop-shadow-lg">
                      {item.title || 'Untitled'}
                    </h4>
                    {item.memory_date && (
                      <p className="text-white/70 text-[10px] mt-0.5">
                        {formatDate(item.memory_date)}
                      </p>
                    )}
                  </div>
                  
                  {/* Preview Button (on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewItem(item)
                    }}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                  >
                    <Eye size={14} className="text-[#2D5A3D]" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* Selected Summary Footer */}
      {selectedCount > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-[#2D5A3D]/10 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {/* Selected Thumbnails */}
              <div className="flex items-center -space-x-2">
                {items
                  .filter(i => selectedItemIds.has(i.id))
                  .slice(0, 6)
                  .map(item => {
                    const coverUrl = getCoverUrl(item)
                    return (
                      <div
                        key={item.id}
                        className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden flex-shrink-0"
                      >
                        {coverUrl ? (
                          
<img src={coverUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#2D5A3D]/10 flex items-center justify-center">
                            {getTypeIcon(item)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                {selectedCount > 6 && (
                  <div className="w-10 h-10 rounded-lg border-2 border-white bg-[#2D5A3D] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">+{selectedCount - 6}</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm">
                <span className="font-semibold text-[#2d2d2d]">{selectedCount} items</span>
                <span className="text-[#2D5A3D]/60 ml-2">selected</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedItemIds(new Set())}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#B8562E] hover:bg-[#B8562E]/10 transition-colors"
              >
                Clear
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#365a49] transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Preview Image */}
              {getCoverUrl(previewItem) ? (
                <div className="aspect-video">
                  <img
                    src={getCoverUrl(previewItem)!}
                    alt={previewItem.title || 'Preview'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className={`aspect-video flex items-center justify-center ${
                  previewItem.memory_type === 'wisdom'
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100'
                    : 'bg-gradient-to-br from-[#2D5A3D]/10 to-[#8DACAB]/20'
                }`}>
                  {previewItem.memory_type === 'wisdom' ? (
                    <BookOpen size={48} className="text-amber-500/50" />
                  ) : (
                    <Mic size={48} className="text-[#2D5A3D]/50" />
                  )}
                </div>
              )}
              
              {/* Preview Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-[#2d2d2d]">
                    {previewItem.title || 'Untitled'}
                  </h3>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#2D5A3D]/10 text-xs text-[#2D5A3D]">
                    {getTypeIcon(previewItem)}
                    <span className="capitalize">{getItemType(previewItem)}</span>
                  </span>
                </div>
                
                {previewItem.description && (
                  <p className="text-sm text-[#2D5A3D]/70 line-clamp-3 mb-3">
                    {previewItem.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 text-xs text-[#2D5A3D]/60">
                  {previewItem.memory_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(previewItem.memory_date)}
                    </span>
                  )}
                  {previewItem.ai_category && (
                    <span className="px-2 py-0.5 rounded-full bg-[#C4A235]/20 text-[#2d2d2d]">
                      {previewItem.ai_category}
                    </span>
                  )}
                </div>
                
                {/* Select Button */}
                <button
                  onClick={() => {
                    toggleSelection(previewItem.id)
                    setPreviewItem(null)
                  }}
                  className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    selectedItemIds.has(previewItem.id)
                      ? 'bg-[#B8562E] text-white hover:bg-[#a84d28]'
                      : 'bg-[#2D5A3D] text-white hover:bg-[#365a49]'
                  }`}
                >
                  {selectedItemIds.has(previewItem.id) ? 'Remove from Selection' : 'Add to Selection'}
                </button>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
