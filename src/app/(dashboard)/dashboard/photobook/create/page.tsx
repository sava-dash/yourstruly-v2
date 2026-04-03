'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GlassCard from '@/components/ui/GlassCard'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  BookOpen, 
  Image as ImageIcon, 
  Layout, 
  Eye, 
  CreditCard,
  Plus,
  Trash2,
  QrCode,
  Wand2,
  GripVertical,
  X,
  ArrowLeft,
  Loader2,
  Package,
  Sparkles,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Move,
  Printer,
  AlertTriangle,
  Copy,
  Square,
  CheckSquare
} from 'lucide-react'
import { 
  LAYOUT_TEMPLATES, 
  TEMPLATES_BY_CATEGORY, 
  getTemplateById,
  LayoutTemplate 
} from '@/lib/photobook/templates'
import { PRODIGI_PHOTOBOOK_SKUS } from '@/components/photobook/types'
import { getEnabledProducts, getEnabledTemplates, DbProduct } from '@/lib/photobook/db'

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string
  name: string
  description: string
  size: string
  basePrice: number
  pricePerPage: number
  minPages: number
  maxPages: number
  binding: 'hardcover' | 'softcover' | 'layflat'
  icon: React.ReactNode
  features: string[]
  prodigiSku?: string
}

interface Memory {
  id: string
  title: string
  description?: string
  memory_date?: string
  created_at: string
  memory_media: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface TextStyle {
  fontFamily: string
  fontSize: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

interface CropData {
  scale: number
  x: number
  y: number
}

interface SlotData {
  slotId: string
  type: 'photo' | 'text' | 'qr'
  memoryId?: string
  mediaId?: string
  fileUrl?: string
  text?: string
  qrMemoryId?: string
  textStyle?: TextStyle
  crop?: CropData
  cropZoom?: CropZoomData
}

// Extended crop data for slot storage
interface CropZoomData {
  scale: number
  offsetX: number
  offsetY: number
}

interface PageData {
  id: string
  pageNumber: number
  layoutId: string
  slots: SlotData[]
  background?: string // CSS color or gradient
}

// History state for undo/redo
interface HistoryState {
  pages: PageData[]
  timestamp: number
}

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

// ============================================================================
// EDITOR CONSTANTS
// ============================================================================

const FONT_FAMILIES = [
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: 'var(--font-playfair), Georgia, serif', label: 'Playfair Display' },
  { value: 'var(--font-handwritten), cursive', label: 'Caveat' },
]

const FONT_SIZES = [
  { value: 'sm', label: '12pt', px: 12 },
  { value: 'md', label: '16pt', px: 16 },
  { value: 'lg', label: '20pt', px: 20 },
  { value: 'xl', label: '28pt', px: 28 },
  { value: '2xl', label: '36pt', px: 36 },
]

const TEXT_COLORS = [
  '#333333', '#000000', '#ffffff', '#666666',
  '#8b4513', '#2c3e50', '#c0392b', '#27ae60',
  '#8e44ad', '#d35400', '#2980b9', '#16a085'
]

const BACKGROUND_COLORS = [
  // Neutrals
  { value: '#ffffff', label: 'White' },
  { value: '#faf9f6', label: 'Cream' },
  { value: '#f5f5f5', label: 'Light Gray' },
  { value: '#1a1a1a', label: 'Black' },
  // Pastels
  { value: '#fce4ec', label: 'Soft Pink' },
  { value: '#e3f2fd', label: 'Soft Blue' },
  { value: '#e8f5e9', label: 'Soft Green' },
  { value: '#fff3e0', label: 'Soft Orange' },
  { value: '#f3e5f5', label: 'Soft Purple' },
  { value: '#fffde7', label: 'Soft Yellow' },
  // Rich Colors
  { value: '#2c3e50', label: 'Navy Blue' },
  { value: '#8b4513', label: 'Saddle Brown' },
  { value: '#2e7d32', label: 'Forest Green' },
  { value: '#6a1b9a', label: 'Deep Purple' },
  { value: '#c62828', label: 'Deep Red' },
  { value: '#00695c', label: 'Teal' },
  // Gradients (CSS strings)
  { value: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)', label: 'Warm Gradient' },
  { value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Purple Gradient' },
  { value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', label: 'Cool Gray' },
  { value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', label: 'Sunset' },
  { value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', label: 'Cotton Candy' },
  { value: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)', label: 'Fresh Green' },
]

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: 'md',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  color: '#333333',
}

function getFontSizePx(size: string): number {
  return FONT_SIZES.find(f => f.value === size)?.px || 16
}

// ============================================================================
// PRODUCTS
// ============================================================================

// Prodigi photobook specs: https://www.prodigi.com/blog/photo-books-technical-guide/
// Hardcover: 24-300 pages, Softcover: 20-300 pages, Layflat: 18-122 pages
// We limit max pages for MVP to keep it manageable
const PRODUCTS: Product[] = [
  {
    id: '8x8_hardcover',
    name: '8×8" Hardcover',
    description: 'Classic square format, perfect for family albums',
    size: '8×8"',
    basePrice: 29.99,
    pricePerPage: 0.40, // ~$0.40/page for additional pages
    minPages: 24,
    maxPages: 80, // Prodigi allows up to 300, we limit for MVP
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['PUR binding', 'Matte-laminated cover', 'Printable spine'],
    prodigiSku: 'BOOK-HARD-SQ-9X9' // 9x9" is closest Prodigi size
  },
  {
    id: '10x10_hardcover',
    name: '10×10" Hardcover',
    description: 'Large format for stunning photo displays',
    size: '10×10"',
    basePrice: 39.99,
    pricePerPage: 0.50,
    minPages: 24,
    maxPages: 80,
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['PUR binding', 'Matte-laminated cover', '200gsm gloss paper'],
    prodigiSku: 'BOOK-HARD-SQ-12X12'
  },
  {
    id: '11x8_landscape',
    name: '11×8" Landscape',
    description: 'Wide format ideal for panoramic shots',
    size: '11×8"',
    basePrice: 34.99,
    pricePerPage: 0.45,
    minPages: 24,
    maxPages: 80,
    binding: 'hardcover',
    icon: <BookOpen className="w-8 h-8" />,
    features: ['Landscape orientation', '200gsm gloss paper', 'PUR binding'],
    prodigiSku: 'BOOK-HARD-LS-11X9'
  },
  {
    id: '8x8_softcover',
    name: '8×8" Softcover',
    description: 'Affordable option with professional quality',
    size: '8×8"',
    basePrice: 19.99,
    pricePerPage: 0.30,
    minPages: 20,
    maxPages: 60,
    binding: 'softcover',
    icon: <Package className="w-8 h-8" />,
    features: ['Flexible matte cover', '150gsm gloss paper', 'Faster production'],
    prodigiSku: 'BOOK-SOFT-SQ-9X9'
  },
  {
    id: '12x12_layflat',
    name: '12×12" Layflat Premium',
    description: 'Our finest photobook with seamless spreads',
    size: '12×12"',
    basePrice: 59.99,
    pricePerPage: 1.00,
    minPages: 18,
    maxPages: 60, // Prodigi allows up to 122
    binding: 'layflat',
    icon: <Sparkles className="w-8 h-8" />,
    features: ['180° lay-flat binding', '190gsm lustre paper', 'Seamless panoramas'],
    prodigiSku: 'BOOK-LAYFLAT-SQ-12X12'
  },
  {
    id: 'calendar_wall',
    name: 'Wall Calendar',
    description: '12-month custom photo calendar',
    size: '11×8.5"',
    basePrice: 24.99,
    pricePerPage: 0,
    minPages: 13,
    maxPages: 13,
    binding: 'softcover',
    icon: <Layout className="w-8 h-8" />,
    features: ['Wire-O binding', 'Hanging hook', 'US holidays included'],
    prodigiSku: 'CALENDAR-WALL-A3'
  }
]

// ============================================================================
// STEP COMPONENTS
// ============================================================================

// Step 1: Choose Product
function ProductStep({ 
  selectedProduct, 
  onSelect,
  products,
  isLoading
}: { 
  selectedProduct: Product | null
  onSelect: (product: Product) => void
  products: Product[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#406A56]" />
        <p className="text-[#406A56]/60 mt-4">Loading products...</p>
      </div>
    )
  }
  
  if (products.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center py-16">
        <Package className="w-16 h-16 mx-auto text-[#406A56]/30" />
        <h3 className="text-lg font-medium text-[#406A56] mt-4">No Products Available</h3>
        <p className="text-[#406A56]/60 mt-2">Please check back later or contact support.</p>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#406A56] mb-2">Choose Your Product</h2>
        <p className="text-[#406A56]/60">Select the perfect format for your memories</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isSelected = selectedProduct?.id === product.id
          const displayPrice = (product.basePrice * 1.3).toFixed(2) // 30% markup
          
          return (
            <motion.div
              key={product.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassCard
                variant="warm"
                padding="none"
                hover
                onClick={() => onSelect(product)}
                className={`cursor-pointer overflow-hidden transition-all ${
                  isSelected 
                    ? 'ring-2 ring-[#406A56] ring-offset-2 ring-offset-[#E8E4D6]' 
                    : ''
                }`}
              >
                {/* Product Icon Header */}
                <div className={`p-6 ${
                  isSelected 
                    ? 'bg-gradient-to-br from-[#406A56] to-[#4a7a64]' 
                    : 'bg-gradient-to-br from-[#406A56]/10 to-[#406A56]/5'
                }`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#406A56]'
                  }`}>
                    {product.icon}
                  </div>
                </div>
                
                {/* Product Details */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-[#406A56]">{product.name}</h3>
                      <p className="text-sm text-[#406A56]/60">{product.size}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#406A56] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-[#406A56]/70 mb-4">{product.description}</p>
                  
                  {/* Features */}
                  <ul className="space-y-1 mb-4">
                    {product.features.map((feature, i) => (
                      <li key={i} className="text-xs text-[#406A56]/60 flex items-center gap-2">
                        <Check className="w-3 h-3 text-[#406A56]/40" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {/* Price */}
                  <div className="pt-4 border-t border-[#406A56]/10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-[#406A56]">${displayPrice}</span>
                      <span className="text-xs text-[#406A56]/50">
                        {product.minPages}-{product.maxPages} pages
                      </span>
                    </div>
                    {product.pricePerPage > 0 && (
                      <p className="text-xs text-[#406A56]/50 mt-1">
                        +${(product.pricePerPage * 1.3).toFixed(2)}/additional page
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Step 2: Select Content (Memory Selector)
function ContentStep({
  memories,
  selectedMemoryIds,
  onToggle,
  minPages,
  maxPages,
  isLoading
}: {
  memories: Memory[]
  selectedMemoryIds: Set<string>
  onToggle: (memoryId: string) => void
  minPages: number
  maxPages: number
  isLoading: boolean
}) {
  const selectedCount = selectedMemoryIds.size
  const minRequired = Math.ceil(minPages / 2) // Rough estimate: 2 photos per page
  const maxAllowed = maxPages * 4 // Max 4 photos per page
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#406A56] mb-2">Select Your Memories</h2>
        <p className="text-[#406A56]/60">Choose the photos and memories to include in your book</p>
      </div>
      
      {/* Selection Status Bar */}
      <GlassCard variant="warm" padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl font-medium ${
              selectedCount >= minRequired 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              {selectedCount} selected
            </div>
            <div className="text-sm text-[#406A56]/60">
              {selectedCount < minRequired ? (
                <span>Select at least <strong>{minRequired - selectedCount}</strong> more</span>
              ) : selectedCount > maxAllowed ? (
                <span className="text-red-600">Too many selected (max {maxAllowed})</span>
              ) : (
                <span className="text-green-600">✓ Ready to continue</span>
              )}
            </div>
          </div>
          <div className="text-sm text-[#406A56]/50">
            Recommended: {minRequired}–{Math.ceil(maxPages / 2)} memories
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-[#406A56]/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              selectedCount >= minRequired ? 'bg-green-500' : 'bg-amber-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((selectedCount / minRequired) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </GlassCard>
      
      {/* Memory Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
        </div>
      ) : memories.length === 0 ? (
        <GlassCard variant="warm" padding="lg" className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-[#406A56]/30 mb-4" />
          <h3 className="text-lg font-semibold text-[#406A56] mb-2">No Memories Yet</h3>
          <p className="text-[#406A56]/60 mb-4">Create some memories first to build your photobook</p>
          <button
            onClick={() => window.location.href = '/dashboard/memories'}
            className="px-4 py-2 bg-[#406A56] text-white rounded-xl hover:bg-[#4a7a64] transition-colors"
          >
            Go to Memories
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {memories.map((memory) => {
            const isSelected = selectedMemoryIds.has(memory.id)
            const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
            
            return (
              <motion.div
                key={memory.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onToggle(memory.id)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all ${
                  isSelected 
                    ? 'ring-[#406A56] ring-offset-2' 
                    : 'ring-transparent hover:ring-[#406A56]/30'
                }`}
              >
                {coverMedia?.file_url ? (
                  <img
                    src={coverMedia.file_url}
                    alt={memory.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#406A56]/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-[#406A56]/30" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className={`absolute inset-0 transition-all ${
                  isSelected 
                    ? 'bg-[#406A56]/40' 
                    : 'bg-black/0 hover:bg-black/20'
                }`} />
                
                {/* Selection indicator */}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-[#406A56] text-white' 
                    : 'bg-white/80 text-transparent'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white text-xs font-medium truncate">{memory.title}</p>
                  {memory.memory_date && (
                    <p className="text-white/70 text-xs">
                      {new Date(memory.memory_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                {/* Photo count badge */}
                {memory.memory_media && memory.memory_media.length > 1 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-white text-xs">
                    {memory.memory_media.length} photos
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Step 3: Arrange Pages
function ArrangeStep({
  pages,
  setPages,
  selectedMemories,
  onAutoArrange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveHistory
}: {
  pages: PageData[]
  setPages: (pages: PageData[]) => void
  selectedMemories: Memory[]
  onAutoArrange: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  saveHistory: (pages: PageData[]) => void
}) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null)
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)
  const [layoutPickerMode, setLayoutPickerMode] = useState<'add' | 'change'>('add')
  const [showQRPicker, setShowQRPicker] = useState(false)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [activeTextSlotId, setActiveTextSlotId] = useState<string | null>(null)

  // Bulk page selection state
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  // Crop/Zoom UI state
  const [cropZoomSlotId, setCropZoomSlotId] = useState<string | null>(null)
  const [cropZoomValues, setCropZoomValues] = useState<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cropZoomSlotStart, setCropZoomSlotStart] = useState({ offsetX: 0, offsetY: 0 })
  
  // Track the last used text style to persist font selection across pages
  const [lastTextStyle, setLastTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE)
  
  // Get current text style for active slot - uses slot data from pages, falling back to last used style
  const getTextStyle = (pageId: string, slotId: string): TextStyle => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.textStyle || lastTextStyle
  }
  
  // Update text style - updates both the page data and the last used style
  const updateTextStyle = (pageId: string, slotId: string, updates: Partial<TextStyle>) => {
    const currentStyle = getTextStyle(pageId, slotId)
    const newStyle = { ...currentStyle, ...updates }
    
    // Update last used style so new text slots inherit this
    setLastTextStyle(newStyle)
    
    // Sync to page slot data
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      const existingSlot = p.slots.find(s => s.slotId === slotId)
      if (existingSlot) {
        return {
          ...p,
          slots: p.slots.map(s => s.slotId === slotId ? { ...s, textStyle: newStyle } : s)
        }
      } else {
        // Create new text slot with style
        return {
          ...p,
          slots: [...p.slots, { slotId, type: 'text' as const, textStyle: newStyle }]
        }
      }
    }))
  }
  
  // Get/set text content - stored directly in page slots
  const getTextContent = (pageId: string, slotId: string): string => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.text || ''
  }

  const setTextContent = (pageId: string, slotId: string, content: string) => {
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      const existingSlot = p.slots.find(s => s.slotId === slotId)
      if (existingSlot) {
        return {
          ...p,
          slots: p.slots.map(s => s.slotId === slotId ? { ...s, text: content } : s)
        }
      } else {
        // Create new text slot with last used style for consistency
        return {
          ...p,
          slots: [...p.slots, { slotId, type: 'text' as const, text: content, textStyle: { ...lastTextStyle } }]
        }
      }
    }))
  }

  // Bulk page selection handlers
  const handlePageSelect = (pageId: string, index: number, isCtrlClick: boolean, isShiftClick: boolean) => {
    if (isShiftClick && lastSelectedIndex !== null) {
      // Range select
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelection = new Set(selectedPageIds)
      for (let i = start; i <= end; i++) {
        newSelection.add(pages[i].id)
      }
      setSelectedPageIds(newSelection)
    } else if (isCtrlClick) {
      // Toggle selection
      const newSelection = new Set(selectedPageIds)
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId)
      } else {
        newSelection.add(pageId)
      }
      setSelectedPageIds(newSelection)
      setLastSelectedIndex(index)
    } else {
      // Single select
      setSelectedPageIds(new Set([pageId]))
      setLastSelectedIndex(index)
      setSelectedPageId(pageId)
    }
  }

  const selectAllPages = () => {
    setSelectedPageIds(new Set(pages.map(p => p.id)))
  }

  const deselectAllPages = () => {
    setSelectedPageIds(new Set())
  }

  const deleteSelectedPages = () => {
    if (selectedPageIds.size === 0) return
    const newPages = pages.filter(p => !selectedPageIds.has(p.id))
    // Renumber pages
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageIds(new Set())
    if (selectedPageId && selectedPageIds.has(selectedPageId)) {
      setSelectedPageId(newPages[0]?.id || null)
    }
  }

  const duplicateSelectedPages = () => {
    if (selectedPageIds.size === 0) return
    const pagesToDuplicate = pages.filter(p => selectedPageIds.has(p.id))
    const duplicatedPages = pagesToDuplicate.map(p => ({
      ...p,
      id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pageNumber: 0 // Will be set below
    }))
    const newPages = [...pages, ...duplicatedPages]
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageIds(new Set())
  }

  // Crop/Zoom handlers
  const getCropZoom = (pageId: string, slotId: string): CropZoomData => {
    const page = pages.find(p => p.id === pageId)
    const slot = page?.slots.find(s => s.slotId === slotId)
    return slot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
  }

  const updateCropZoom = (pageId: string, slotId: string, updates: Partial<CropZoomData>) => {
    const currentZoom = getCropZoom(pageId, slotId)
    const newZoom = { ...currentZoom, ...updates }

    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      return {
        ...p,
        slots: p.slots.map(s =>
          s.slotId === slotId ? { ...s, cropZoom: newZoom } : s
        )
      }
    }))
    setCropZoomValues(newZoom)
  }

  const startCropZoom = (pageId: string, slotId: string) => {
    const currentZoom = getCropZoom(pageId, slotId)
    setCropZoomSlotId(slotId)
    setCropZoomValues(currentZoom)
  }

  const closeCropZoom = () => {
    if (cropZoomSlotId) {
      saveHistory(pages)
    }
    setCropZoomSlotId(null)
    setIsDragging(false)
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if (!cropZoomSlotId) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setCropZoomSlotStart({ offsetX: cropZoomValues.offsetX, offsetY: cropZoomValues.offsetY })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedPageId || !cropZoomSlotId) return

    const deltaX = ((e.clientX - dragStart.x) / 300) * 100 // Convert to percentage
    const deltaY = ((e.clientY - dragStart.y) / 300) * 100

    updateCropZoom(selectedPageId, cropZoomSlotId, {
      offsetX: Math.max(-50, Math.min(50, cropZoomSlotStart.offsetX + deltaX)),
      offsetY: Math.max(-50, Math.min(50, cropZoomSlotStart.offsetY + deltaY))
    })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  // Current style for active text slot
  const activeStyle = selectedPageId && activeTextSlotId 
    ? getTextStyle(selectedPageId, activeTextSlotId) 
    : null
  
  const selectedPage = pages.find(p => p.id === selectedPageId)
  const selectedTemplate = selectedPage ? getTemplateById(selectedPage.layoutId) : null
  
  // Get all available photos from selected memories
  const availablePhotos = useMemo(() => {
    const photos: { memoryId: string; mediaId: string; fileUrl: string; memoryTitle: string }[] = []
    selectedMemories.forEach(memory => {
      memory.memory_media?.forEach(media => {
        if (media.file_type?.startsWith('image')) {
          photos.push({
            memoryId: memory.id,
            mediaId: media.id,
            fileUrl: media.file_url,
            memoryTitle: memory.title
          })
        }
      })
    })
    return photos
  }, [selectedMemories])
  
  // Get photos already used on pages
  const usedMediaIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.mediaId) used.add(slot.mediaId)
      })
    })
    return used
  }, [pages])
  
  // Get memory IDs used on pages (for saving project)
  const usedMemoryIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.memoryId) used.add(slot.memoryId)
        if (slot.qrMemoryId) used.add(slot.qrMemoryId)
      })
    })
    return used
  }, [pages])
  
  const addPage = (layoutId: string = 'full-photo') => {
    const template = getTemplateById(layoutId)
    // Initialize text slots with the last used text style for consistency
    const initialSlots: SlotData[] = []
    if (template) {
      template.slots.forEach(slot => {
        if (slot.type === 'text') {
          initialSlots.push({
            slotId: slot.id,
            type: 'text',
            textStyle: { ...lastTextStyle },
            text: ''
          })
        }
      })
    }
    
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      pageNumber: pages.length + 1,
      layoutId,
      slots: initialSlots
    }
    const newPages = [...pages, newPage]
    setPages(newPages)
    saveHistory(newPages)
    setSelectedPageId(newPage.id)
    setShowLayoutPicker(false)
  }
  
  const removePage = (pageId: string) => {
    const newPages = pages.filter(p => p.id !== pageId)
    // Renumber pages
    newPages.forEach((p, i) => p.pageNumber = i + 1)
    setPages(newPages)
    saveHistory(newPages)
    if (selectedPageId === pageId) {
      setSelectedPageId(newPages[0]?.id || null)
    }
  }
  
  const updatePageLayout = (pageId: string, layoutId: string) => {
    const newTemplate = getTemplateById(layoutId)
    
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p
      
      // Get existing photo slots to preserve content
      const existingPhotoSlots = p.slots.filter(s => s.type === 'photo' && s.fileUrl)
      const existingTextSlots = p.slots.filter(s => s.type === 'text')
      const existingQrSlots = p.slots.filter(s => s.type === 'qr')
      
      // Get new template's slots
      const newPhotoSlots = newTemplate?.slots.filter(s => s.type === 'photo') || []
      const newTextSlots = newTemplate?.slots.filter(s => s.type === 'text') || []
      const newQrSlots = newTemplate?.slots.filter(s => s.type === 'qr') || []
      
      // Map existing content to new slots
      const mappedSlots: SlotData[] = []
      
      // Map photos to new slots (preserve as many as possible)
      newPhotoSlots.forEach((newSlot, i) => {
        if (existingPhotoSlots[i]) {
          mappedSlots.push({
            ...existingPhotoSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      // Map text to new slots - preserve both content AND style
      newTextSlots.forEach((newSlot, i) => {
        if (existingTextSlots[i]) {
          mappedSlots.push({
            ...existingTextSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      // Map QR to new slots
      newQrSlots.forEach((newSlot, i) => {
        if (existingQrSlots[i]) {
          mappedSlots.push({
            ...existingQrSlots[i],
            slotId: newSlot.id,
          })
        }
      })
      
      return { ...p, layoutId, slots: mappedSlots }
    })
    
    setPages(newPages)
    saveHistory(newPages)
  }

  const updatePageBackground = (pageId: string, background: string) => {
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, background } : p
    )
    setPages(newPages)
    saveHistory(newPages)
  }
  
  const assignPhotoToSlot = (pageId: string, slotId: string, photo: typeof availablePhotos[0] | null) => {
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p

      const existingSlotIndex = p.slots.findIndex(s => s.slotId === slotId)
      const newSlot = photo ? {
        slotId,
        type: 'photo' as const,
        memoryId: photo.memoryId,
        mediaId: photo.mediaId,
        fileUrl: photo.fileUrl,
        cropZoom: { scale: 1, offsetX: 0, offsetY: 0 }
      } : null

      if (existingSlotIndex >= 0) {
        if (newSlot) {
          const newSlots = [...p.slots]
          newSlots[existingSlotIndex] = newSlot
          return { ...p, slots: newSlots }
        } else {
          return { ...p, slots: p.slots.filter((_, i) => i !== existingSlotIndex) }
        }
      } else if (newSlot) {
        return { ...p, slots: [...p.slots, newSlot] }
      }
      return p
    })
    setPages(newPages)
    saveHistory(newPages)
  }
  
  const addQRToPage = (pageId: string, memoryId: string) => {
    setPages(pages.map(p => {
      if (p.id !== pageId) return p
      return {
        ...p,
        slots: [...p.slots.filter(s => s.type !== 'qr'), {
          slotId: 'qr-code',
          type: 'qr' as const,
          qrMemoryId: memoryId
        }]
      }
    }))
    setShowQRPicker(false)
  }
  
  return (
    <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
      {/* Left Sidebar - Page Thumbnails */}
      <div className="w-48 flex-shrink-0 bg-[#F2F1E5]/50 rounded-2xl p-4 overflow-y-auto">
        {/* Header with select all/none */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[#406A56] text-sm">Pages</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllPages}
              className="text-xs text-[#406A56]/60 hover:text-[#406A56]"
              title="Select All"
            >
              All
            </button>
            <span className="text-[#406A56]/30">|</span>
            <button
              onClick={deselectAllPages}
              className="text-xs text-[#406A56]/60 hover:text-[#406A56]"
              title="Deselect All"
            >
              None
            </button>
            <span className="text-xs text-[#406A56]/50 ml-1">{pages.length}</span>
          </div>
        </div>

        {/* Bulk action buttons */}
        {selectedPageIds.size > 0 && (
          <div className="flex gap-1 mb-3">
            <button
              onClick={duplicateSelectedPages}
              className="flex-1 py-1.5 px-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-lg text-[#406A56] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              title="Duplicate Selected"
            >
              <Copy className="w-3 h-3" />
              Dup
            </button>
            <button
              onClick={deleteSelectedPages}
              className="flex-1 py-1.5 px-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="w-3 h-3" />
              Del
            </button>
          </div>
        )}

        <Reorder.Group
          axis="y"
          values={pages}
          onReorder={(newPages) => {
            newPages.forEach((p, i) => p.pageNumber = i + 1)
            setPages(newPages)
            saveHistory(newPages)
          }}
          className="space-y-3"
        >
          {pages.map((page, index) => {
            const template = getTemplateById(page.layoutId)
            const firstPhoto = page.slots.find(s => s.type === 'photo')
            const isSelected = selectedPageIds.has(page.id)

            return (
              <Reorder.Item
                key={page.id}
                value={page}
                className={`group relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPageId === page.id && !isSelected
                    ? 'border-[#406A56] ring-1 ring-[#406A56]/20'
                    : isSelected
                    ? 'border-[#406A56] ring-2 ring-[#406A56]/30'
                    : 'border-[#406A56]/10 hover:border-[#406A56]/30'
                }`}
                onClick={(e) => {
                  const isCtrlClick = e.ctrlKey || e.metaKey
                  const isShiftClick = e.shiftKey
                  handlePageSelect(page.id, index, isCtrlClick, isShiftClick)
                }}
              >
                {/* Checkbox overlay */}
                <div className="absolute top-1 left-1 z-10">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#406A56] border-[#406A56]'
                        : 'bg-white/90 border-[#406A56]/30 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div 
                  className="aspect-square"
                  style={{ background: page.background || template?.background || '#ffffff' }}
                >
                  {firstPhoto?.fileUrl ? (
                    <img
                      src={firstPhoto.fileUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#406A56]/30">
                      <span className="text-2xl font-bold">{page.pageNumber}</span>
                      <span className="text-xs">{template?.name || 'Empty'}</span>
                    </div>
                  )}
                </div>

                {/* Drag handle */}
                <div className="absolute top-1 left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                </div>

                {/* Page number */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 rounded text-white text-xs">
                  {page.pageNumber}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePage(page.id) }}
                  className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500 rounded text-white hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* QR indicator */}
                {page.slots.some(s => s.type === 'qr') && (
                  <div className="absolute bottom-1 left-1 p-1 bg-[#406A56] rounded">
                    <QrCode className="w-3 h-3 text-white" />
                  </div>
                )}
              </Reorder.Item>
            )
          })}
        </Reorder.Group>

        {/* Add Page Button */}
        <button
          onClick={() => {
            setLayoutPickerMode('add')
            setShowLayoutPicker(true)
          }}
          className="w-full mt-4 aspect-square rounded-lg border-2 border-dashed border-[#406A56]/30 hover:border-[#406A56]/50 hover:bg-[#406A56]/5 flex flex-col items-center justify-center text-[#406A56]/50 hover:text-[#406A56] transition-all"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs mt-1">Add Page</span>
        </button>

        {/* Auto-Arrange Button */}
        <button
          onClick={onAutoArrange}
          className="w-full mt-3 py-2 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 text-[#406A56] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Wand2 className="w-4 h-4" />
          Auto-Arrange
        </button>
      </div>
      
      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLayoutPickerMode('change')
                setShowLayoutPicker(true)
              }}
              className="px-3 py-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-lg text-[#406A56] text-sm font-medium flex items-center gap-2"
            >
              <Layout className="w-4 h-4" />
              Change Layout
            </button>
            <button
              onClick={() => setShowQRPicker(true)}
              className="px-3 py-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-lg text-[#406A56] text-sm font-medium flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Add QR Code
            </button>
            
            {/* Page Background Picker */}
            <div className="relative">
              <button
                onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
                className="px-3 py-2 bg-[#406A56]/10 hover:bg-[#406A56]/20 rounded-lg text-[#406A56] text-sm font-medium flex items-center gap-2"
              >
                <div 
                  className="w-4 h-4 rounded border border-[#406A56]/30"
                  style={{ 
                    background: selectedPage?.background || '#ffffff',
                  }}
                />
                Background
              </button>
              
              {/* Background Color Dropdown */}
              {showBackgroundPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-[#406A56]/10 z-50 w-64">
                  <h4 className="text-xs font-semibold text-[#406A56] uppercase mb-2">Page Background</h4>
                  <div className="grid grid-cols-6 gap-1.5">
                    {BACKGROUND_COLORS.map(bg => (
                      <button
                        key={bg.value}
                        onClick={() => {
                          if (selectedPageId) {
                            updatePageBackground(selectedPageId, bg.value)
                          }
                          setShowBackgroundPicker(false)
                        }}
                        className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                          selectedPage?.background === bg.value 
                            ? 'border-[#406A56] ring-2 ring-[#406A56]/30' 
                            : 'border-transparent hover:border-[#406A56]/30'
                        }`}
                        style={{ background: bg.value }}
                        title={bg.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setShowBackgroundPicker(false)}
                    className="mt-2 w-full text-xs text-[#406A56]/60 hover:text-[#406A56]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[#406A56]/20">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="px-2 py-2 rounded-lg text-[#406A56] hover:bg-[#406A56]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-xs">Undo</span>
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="px-2 py-2 rounded-lg text-[#406A56] hover:bg-[#406A56]/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
                <span className="text-xs">Redo</span>
              </button>
            </div>
          </div>
          <div className="text-sm text-[#406A56]/60">
            {availablePhotos.length - usedMediaIds.size} photos available
          </div>
        </div>
        
        {/* Text Formatting Toolbar */}
        {activeTextSlotId && selectedPageId && activeStyle && (
          <div 
            className="text-toolbar flex items-center gap-2 mb-4 p-3 bg-white rounded-xl shadow-sm border border-[#406A56]/10 flex-wrap"
          >
            {/* Font Family */}
            <select
              value={activeStyle.fontFamily}
              onChange={(e) => updateTextStyle(selectedPageId!, activeTextSlotId!, { fontFamily: e.target.value })}
              className="px-2 py-1.5 bg-[#F2F1E5] border border-[#406A56]/20 rounded-lg text-sm text-[#406A56] focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 cursor-pointer"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
              ))}
            </select>
            
            {/* Font Size */}
            <select
              value={activeStyle.fontSize}
              onChange={(e) => updateTextStyle(selectedPageId!, activeTextSlotId!, { fontSize: e.target.value })}
              className="px-2 py-1.5 bg-[#F2F1E5] border border-[#406A56]/20 rounded-lg text-sm text-[#406A56] focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 cursor-pointer"
            >
              {FONT_SIZES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Bold */}
            <button
              onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { 
                fontWeight: activeStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
              })}
              className={`p-1.5 rounded-lg transition-colors ${
                activeStyle.fontWeight === 'bold' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-[#F2F1E5] text-[#406A56] hover:bg-[#406A56]/10'
              }`}
              title="Bold"
            >
              <span className="font-bold text-sm w-5 h-5 flex items-center justify-center">B</span>
            </button>
            
            {/* Italic */}
            <button
              onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { 
                fontStyle: activeStyle.fontStyle === 'italic' ? 'normal' : 'italic' 
              })}
              className={`p-1.5 rounded-lg transition-colors ${
                activeStyle.fontStyle === 'italic' 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-[#F2F1E5] text-[#406A56] hover:bg-[#406A56]/10'
              }`}
              title="Italic"
            >
              <span className="italic text-sm w-5 h-5 flex items-center justify-center">I</span>
            </button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Alignment */}
            <div className="flex bg-[#F2F1E5] rounded-lg p-0.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { textAlign: align })}
                  className={`p-1.5 rounded transition-colors ${
                    activeStyle.textAlign === align 
                      ? 'bg-[#406A56] text-white' 
                      : 'text-[#406A56] hover:bg-[#406A56]/10'
                  }`}
                  title={`Align ${align}`}
                >
                  <span className="text-xs w-5 h-5 flex items-center justify-center">
                    {align === 'left' ? '⫷' : align === 'center' ? '☰' : '⫸'}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#406A56]/20" />
            
            {/* Text Color */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#406A56]/60">Color:</span>
              <div className="flex gap-1">
                {TEXT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateTextStyle(selectedPageId, activeTextSlotId, { color })}
                    className={`w-5 h-5 rounded border-2 transition-all ${
                      activeStyle.color === color 
                        ? 'border-[#406A56] scale-110' 
                        : 'border-transparent hover:border-[#406A56]/30'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Page Canvas */}
        <div className="flex-1 bg-[#406A56]/5 rounded-2xl p-8 flex items-center justify-center">
          {selectedPage && selectedTemplate ? (
            <div 
              className="relative shadow-2xl"
              style={{ 
                width: '100%',
                maxWidth: 500,
                aspectRatio: '1/1',
                background: selectedPage.background || selectedTemplate.background || '#ffffff',
              }}
            >
              {/* Render slots */}
              {selectedTemplate.slots.map((slot) => {
                const pageSlot = selectedPage.slots.find(s => s.slotId === slot.id)
                const style: React.CSSProperties = {
                  position: 'absolute',
                  left: `${slot.position.x}%`,
                  top: `${slot.position.y}%`,
                  width: `${slot.position.width}%`,
                  height: `${slot.position.height}%`,
                }
                
                if (slot.type === 'photo') {
                  const cropZoom = pageSlot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
                  const isCropZoomActive = cropZoomSlotId === slot.id

                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className={`bg-[#f0f0f0] cursor-pointer hover:ring-2 hover:ring-[#406A56] transition-all overflow-hidden group relative ${
                        isCropZoomActive ? 'ring-2 ring-[#406A56]' : ''
                      }`}
                      onClick={() => {
                        if (!pageSlot?.fileUrl) {
                          // Open photo picker for this slot
                          setActiveSlotId(slot.id)
                          setShowPhotoPicker(true)
                        }
                      }}
                    >
                      {pageSlot?.fileUrl ? (
                        <>
                          {/* Photo with crop/zoom transforms */}
                          <div
                            className="w-full h-full relative"
                            onMouseDown={(e) => {
                              if (cropZoomSlotId === slot.id) {
                                handleDragStart(e)
                              }
                            }}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                          >
                            <img
                              src={pageSlot.fileUrl}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-100"
                              style={{
                                transform: `scale(${cropZoom.scale}) translate(${cropZoom.offsetX}%, ${cropZoom.offsetY}%)`,
                                transformOrigin: 'center center',
                                cursor: cropZoomSlotId === slot.id ? (isDragging ? 'grabbing' : 'grab') : 'pointer'
                              }}
                              draggable={false}
                            />
                          </div>

                          {/* Auto QR Code - bottom right corner */}
                          {pageSlot.memoryId && (
                            <div className="absolute bottom-2 right-2 bg-white p-1 rounded shadow-lg">
                              <QrCode className="w-8 h-8 text-[#406A56]" />
                            </div>
                          )}

                          {/* Photo controls overlay */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Crop/Zoom button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (cropZoomSlotId === slot.id) {
                                  closeCropZoom()
                                } else {
                                  startCropZoom(selectedPage.id, slot.id)
                                }
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                cropZoomSlotId === slot.id
                                  ? 'bg-[#406A56] text-white'
                                  : 'bg-white/90 text-[#406A56] hover:bg-white'
                              }`}
                              title="Crop & Zoom"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>

                            {/* Remove photo button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                assignPhotoToSlot(selectedPage.id, slot.id, null)
                                if (cropZoomSlotId === slot.id) {
                                  setCropZoomSlotId(null)
                                }
                              }}
                              className="p-1.5 bg-white/90 rounded text-red-500 hover:bg-white hover:text-red-600 transition-colors"
                              title="Remove Photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Crop/Zoom Controls Panel */}
                          {isCropZoomActive && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 border-t border-[#406A56]/20">
                              <div className="space-y-2">
                                {/* Zoom slider */}
                                <div className="flex items-center gap-2">
                                  <ZoomOut className="w-3 h-3 text-[#406A56]" />
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.05"
                                    value={cropZoomValues.scale}
                                    onChange={(e) => {
                                      const newScale = parseFloat(e.target.value)
                                      updateCropZoom(selectedPage.id, slot.id, { scale: newScale })
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 h-1.5 bg-[#406A56]/20 rounded-lg appearance-none cursor-pointer accent-[#406A56]"
                                  />
                                  <ZoomIn className="w-3 h-3 text-[#406A56]" />
                                  <span className="text-xs text-[#406A56] w-10 text-right">
                                    {cropZoomValues.scale.toFixed(1)}x
                                  </span>
                                </div>

                                {/* Position info */}
                                <div className="flex items-center justify-between text-xs text-[#406A56]/60">
                                  <span className="flex items-center gap-1">
                                    <Move className="w-3 h-3" />
                                    Drag to reposition
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateCropZoom(selectedPage.id, slot.id, { scale: 1, offsetX: 0, offsetY: 0 })
                                    }}
                                    className="text-[#406A56] hover:underline"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#406A56]/40">
                          <Plus className="w-8 h-8" />
                          <span className="text-xs mt-1">Click to add</span>
                        </div>
                      )}
                    </div>
                  )
                }
                
                if (slot.type === 'text') {
                  const textStyle = getTextStyle(selectedPage.id, slot.id)
                  const isActive = activeTextSlotId === slot.id
                  
                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className={`flex items-center justify-center p-2 transition-all ${
                        isActive ? 'ring-2 ring-[#406A56] ring-offset-2 bg-white/50' : ''
                      }`}
                    >
                      <textarea
                        value={getTextContent(selectedPage.id, slot.id)}
                        onChange={(e) => setTextContent(selectedPage.id, slot.id, e.target.value)}
                        onFocus={() => setActiveTextSlotId(slot.id)}
                        onBlur={(e) => {
                          // Check if focus moved to toolbar element - if so, don't close
                          const relatedTarget = e.relatedTarget as HTMLElement
                          const isToolbarClick = relatedTarget?.closest('.text-toolbar')
                          
                          if (!isToolbarClick) {
                            // Keep toolbar visible longer to allow dropdown interaction
                            setTimeout(() => {
                              setActiveTextSlotId(prev => prev === slot.id ? null : prev)
                            }, 500)
                          }
                        }}
                        placeholder={slot.placeholder || 'Click to add text...'}
                        className="w-full h-full resize-none bg-transparent focus:outline-none cursor-text"
                        style={{
                          fontFamily: textStyle.fontFamily,
                          fontSize: `${getFontSizePx(textStyle.fontSize)}px`,
                          fontWeight: textStyle.fontWeight,
                          fontStyle: textStyle.fontStyle,
                          textAlign: textStyle.textAlign,
                          color: textStyle.color,
                          lineHeight: 1.4,
                        }}
                      />
                    </div>
                  )
                }
                
                if (slot.type === 'qr') {
                  const qrSlot = selectedPage.slots.find(s => s.type === 'qr')
                  return (
                    <div
                      key={slot.id}
                      style={style}
                      className="flex items-center justify-center bg-[#f0f0f0]"
                    >
                      {qrSlot ? (
                        <div className="text-center">
                          <QrCode className="w-16 h-16 text-[#406A56] mx-auto" />
                          <span className="text-xs text-[#406A56]/60 mt-2 block">QR Code</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowQRPicker(true)}
                          className="text-[#406A56]/40 hover:text-[#406A56]"
                        >
                          <QrCode className="w-12 h-12" />
                        </button>
                      )}
                    </div>
                  )
                }
                
                return null
              })}
            </div>
          ) : (
            <div className="text-center text-[#406A56]/40">
              <Layout className="w-16 h-16 mx-auto mb-4" />
              <p>Select a page to edit</p>
            </div>
          )}
        </div>
        
      </div>
      
      {/* Right Sidebar - Photo Library */}
      <div className="w-56 flex-shrink-0 bg-[#F2F1E5]/50 rounded-2xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#406A56] text-sm">Photos</h3>
          <span className="text-xs text-[#406A56]/60">
            {availablePhotos.filter(p => !usedMediaIds.has(p.mediaId)).length} available
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {availablePhotos.map((photo) => {
            const isUsed = usedMediaIds.has(photo.mediaId)
            return (
              <div
                key={photo.mediaId}
                onClick={() => {
                  if (!isUsed && selectedPage) {
                    // Find first empty photo slot
                    const template = getTemplateById(selectedPage.layoutId)
                    const photoSlots = template?.slots.filter(s => s.type === 'photo') || []
                    const emptySlot = photoSlots.find(slot => 
                      !selectedPage.slots.find(s => s.slotId === slot.id && s.fileUrl)
                    )
                    if (emptySlot) {
                      assignPhotoToSlot(selectedPage.id, emptySlot.id, photo)
                    } else {
                      setActiveSlotId(photoSlots[0]?.id || null)
                      setShowPhotoPicker(true)
                    }
                  }
                }}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                  isUsed 
                    ? 'opacity-40 ring-2 ring-[#406A56]/30' 
                    : 'hover:ring-2 hover:ring-[#406A56]'
                }`}
                title={photo.memoryTitle}
              >
                <img
                  src={photo.fileUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isUsed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {availablePhotos.length === 0 && (
          <div className="text-center py-8 text-[#406A56]/40">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">No photos yet</p>
          </div>
        )}
      </div>
      
      {/* Layout Picker Modal */}
      <AnimatePresence>
        {showLayoutPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLayoutPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F2F1E5] rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#406A56]">Choose Layout</h3>
                <button
                  onClick={() => setShowLayoutPicker(false)}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>
              
              {Object.entries(TEMPLATES_BY_CATEGORY).map(([category, templates]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-semibold text-[#406A56]/70 uppercase tracking-wide mb-3">
                    {category === 'single' ? 'Single Photo' : 
                     category === 'multi' ? 'Multiple Photos' : 'Special'}
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          if (layoutPickerMode === 'change' && selectedPage) {
                            updatePageLayout(selectedPage.id, template.id)
                          } else {
                            addPage(template.id)
                          }
                          setShowLayoutPicker(false)
                        }}
                        className="aspect-square bg-white rounded-xl p-3 hover:ring-2 hover:ring-[#406A56] transition-all group"
                      >
                        {/* Mini layout preview */}
                        <div className="w-full h-full relative bg-[#f5f5f5] rounded">
                          {template.slots.filter(s => s.type === 'photo').slice(0, 4).map((slot, i) => (
                            <div
                              key={i}
                              className="absolute bg-[#406A56]/20 rounded-sm"
                              style={{
                                left: `${slot.position.x}%`,
                                top: `${slot.position.y}%`,
                                width: `${slot.position.width}%`,
                                height: `${slot.position.height}%`,
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-[#406A56] mt-2 text-center group-hover:font-medium">
                          {template.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* QR Memory Picker Modal */}
      <AnimatePresence>
        {showQRPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQRPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F2F1E5] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]">Add QR Code</h3>
                  <p className="text-sm text-[#406A56]/60">Link to a memory's digital content</p>
                </div>
                <button
                  onClick={() => setShowQRPicker(false)}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedMemories.map((memory) => {
                  const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
                  
                  return (
                    <button
                      key={memory.id}
                      onClick={() => selectedPage && addQRToPage(selectedPage.id, memory.id)}
                      className="text-left bg-white rounded-xl overflow-hidden hover:ring-2 hover:ring-[#406A56] transition-all"
                    >
                      <div className="aspect-video bg-[#406A56]/10">
                        {coverMedia?.file_url ? (
                          <img
                            src={coverMedia.file_url}
                            alt={memory.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-[#406A56]/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-[#406A56] text-sm truncate">{memory.title}</p>
                        <p className="text-xs text-[#406A56]/50">
                          {memory.memory_media?.length || 0} photos
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Photo Picker Modal */}
      <AnimatePresence>
        {showPhotoPicker && activeSlotId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setShowPhotoPicker(false); setActiveSlotId(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F2F1E5] rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]">Select Photo</h3>
                  <p className="text-sm text-[#406A56]/60">Choose a photo for this slot</p>
                </div>
                <button
                  onClick={() => { setShowPhotoPicker(false); setActiveSlotId(null) }}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#406A56]" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {availablePhotos.map((photo) => {
                  const isUsed = usedMediaIds.has(photo.mediaId)
                  
                  return (
                    <button
                      key={photo.mediaId}
                      onClick={() => {
                        if (selectedPage && activeSlotId) {
                          assignPhotoToSlot(selectedPage.id, activeSlotId, photo)
                          setShowPhotoPicker(false)
                          setActiveSlotId(null)
                        }
                      }}
                      disabled={isUsed}
                      className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                        isUsed 
                          ? 'opacity-40 cursor-not-allowed' 
                          : 'hover:ring-2 hover:ring-[#406A56] cursor-pointer'
                      }`}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={photo.memoryTitle}
                        className="w-full h-full object-cover"
                      />
                      {isUsed && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Check className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs truncate">{photo.memoryTitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {availablePhotos.length === 0 && (
                <div className="text-center py-12 text-[#406A56]/50">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No photos available</p>
                  <p className="text-sm">Select memories with photos in Step 2</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Step 4: Preview
function PreviewStep({
  pages,
  selectedMemories,
  product
}: {
  pages: PageData[]
  selectedMemories: Memory[]
  product: Product
}) {
  const [currentSpread, setCurrentSpread] = useState(0)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [lowResWarnings, setLowResWarnings] = useState<{ pageNum: number; slotId: string; recommended: number; actual?: number }[]>([])
  const totalSpreads = Math.ceil(pages.length / 2)

  // Calculate print dimensions at 300 DPI
  const getPrintDimensions = () => {
    // Parse size like "8x8" or "11x8"
    const sizeMatch = product.size.match(/(\d+)\s*×\s*(\d+)/)
    if (!sizeMatch) return { width: 8, height: 8, pixelWidth: 2400, pixelHeight: 2400 }

    const widthIn = parseInt(sizeMatch[1])
    const heightIn = parseInt(sizeMatch[2])
    return {
      width: widthIn,
      height: heightIn,
      pixelWidth: widthIn * 300,
      pixelHeight: heightIn * 300
    }
  }

  // Check for low resolution images
  useEffect(() => {
    const warnings: typeof lowResWarnings = []
    const dims = getPrintDimensions()

    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.type === 'photo' && slot.fileUrl) {
          // Estimate minimum recommended size (at 300 DPI)
          const template = getTemplateById(page.layoutId)
          const slotTemplate = template?.slots.find(s => s.id === slot.slotId)
          if (slotTemplate) {
            const slotWidthPx = Math.round((slotTemplate.position.width / 100) * dims.pixelWidth)
            const slotHeightPx = Math.round((slotTemplate.position.height / 100) * dims.pixelHeight)
            const recommendedPx = Math.max(slotWidthPx, slotHeightPx)

            warnings.push({
              pageNum: page.pageNumber,
              slotId: slot.slotId,
              recommended: recommendedPx
            })
          }
        }
      })
    })

    setLowResWarnings(warnings)
  }, [pages])
  
  const leftPage = pages[currentSpread * 2]
  const rightPage = pages[currentSpread * 2 + 1]
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#406A56] mb-2">Preview Your Book</h2>
        <p className="text-[#406A56]/60">
          Spread {currentSpread + 1} of {totalSpreads}
        </p>
      </div>
      
      {/* Book Preview */}
      <div className="relative">
        {/* Navigation */}
        <button
          onClick={() => setCurrentSpread(Math.max(0, currentSpread - 1))}
          disabled={currentSpread === 0}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-3 bg-[#406A56] text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4a7a64] transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => setCurrentSpread(Math.min(totalSpreads - 1, currentSpread + 1))}
          disabled={currentSpread === totalSpreads - 1}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-3 bg-[#406A56] text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4a7a64] transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Book Spread */}
        <div className="flex justify-center gap-1 perspective-1000">
          {/* Left Page */}
          <motion.div
            key={`left-${currentSpread}`}
            initial={{ rotateY: -30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="w-[300px] aspect-square bg-white shadow-xl rounded-l-sm"
          >
            {leftPage ? (
              <PagePreview page={leftPage} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#406A56]/30">
                <BookOpen className="w-12 h-12" />
              </div>
            )}
          </motion.div>
          
          {/* Spine */}
          <div className="w-2 bg-gradient-to-r from-[#406A56]/20 to-[#406A56]/10" />
          
          {/* Right Page */}
          <motion.div
            key={`right-${currentSpread}`}
            initial={{ rotateY: 30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="w-[300px] aspect-square bg-white shadow-xl rounded-r-sm"
          >
            {rightPage ? (
              <PagePreview page={rightPage} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#406A56]/30">
                {pages.length % 2 === 1 ? (
                  <span className="text-sm">Back Cover</span>
                ) : (
                  <BookOpen className="w-12 h-12" />
                )}
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Page indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSpread(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSpread 
                  ? 'w-6 bg-[#406A56]' 
                  : 'bg-[#406A56]/30 hover:bg-[#406A56]/50'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Print Preview Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setShowPrintPreview(true)}
          className="px-6 py-3 bg-[#406A56] text-white rounded-xl hover:bg-[#4a7a64] flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print Preview (300 DPI)
        </button>
      </div>

      {/* Stats Row - Compact horizontal layout */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
        {/* Page count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl border border-[#406A56]/10">
          <BookOpen className="w-5 h-5 text-[#406A56]" />
          <span className="text-sm font-medium text-[#406A56]">{pages.length} pages</span>
          <span className="text-xs text-[#406A56]/60">• {selectedMemories.length} memories</span>
        </div>
        
        {/* Low res warning (compact) */}
        {lowResWarnings.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">{lowResWarnings.length} low-res image(s)</span>
          </div>
        )}
      </div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {showPrintPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPrintPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F2F1E5] rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#406A56]">Print Preview</h3>
                  <p className="text-sm text-[#406A56]/60">
                    Actual print size: {getPrintDimensions().width}×{getPrintDimensions().height}" at 300 DPI
                    ({getPrintDimensions().pixelWidth}×{getPrintDimensions().pixelHeight}px)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#406A56] text-white rounded-lg hover:bg-[#4a7a64] flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="p-2 hover:bg-[#406A56]/10 rounded-lg"
                  >
                    <X className="w-5 h-5 text-[#406A56]" />
                  </button>
                </div>
              </div>

              {/* All Pages Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="bg-white rounded-lg overflow-hidden shadow-md"
                  >
                    <div className="aspect-square relative">
                      <PagePreview page={page} printSize={getPrintDimensions().pixelWidth} />
                    </div>
                    <div className="p-2 bg-[#406A56]/5 text-center">
                      <span className="text-xs font-medium text-[#406A56]">Page {page.pageNumber}</span>
                    </div>
                  </div>
                ))}
              </div>

              {lowResWarnings.length > 0 && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">Quality Notice</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Some images may not meet 300 DPI print quality standards.
                        For professional printing, ensure all images are high-resolution.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// Generate QR code URL for a memory
const getQRCodeUrl = (memoryId: string) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourstruly.love'
  const viewUrl = `${baseUrl}/view/${memoryId}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(viewUrl)}&format=png&margin=1`
}

// Page Preview Component
function PagePreview({ page, printSize }: { page: PageData; printSize?: number }) {
  const template = getTemplateById(page.layoutId)

  if (!template) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#406A56]/30">
        <span className="text-sm">Unknown layout</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={{ background: page.background || template.background || '#ffffff' }}>
      {template.slots.map((slot) => {
        const pageSlot = page.slots.find(s => s.slotId === slot.id)
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${slot.position.x}%`,
          top: `${slot.position.y}%`,
          width: `${slot.position.width}%`,
          height: `${slot.position.height}%`,
        }

        if (slot.type === 'photo') {
          const cropZoom = pageSlot?.cropZoom || { scale: 1, offsetX: 0, offsetY: 0 }
          return (
            <div key={slot.id} style={style} className="overflow-hidden relative">
              {pageSlot?.fileUrl ? (
                <>
                  <img
                    src={pageSlot.fileUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${cropZoom.scale}) translate(${cropZoom.offsetX}%, ${cropZoom.offsetY}%)`,
                      transformOrigin: 'center center'
                    }}
                  />
                  {/* Auto QR Code - bottom right corner of each photo */}
                  {pageSlot.memoryId && (
                    <div className="absolute bottom-1 right-1 bg-white p-0.5 rounded shadow-sm">
                      <img
                        src={getQRCodeUrl(pageSlot.memoryId)}
                        alt="QR"
                        className="w-6 h-6"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-[#f0f0f0]" />
              )}
            </div>
          )
        }

        if (slot.type === 'text') {
          const textContent = pageSlot?.text || ''
          const textStyle = pageSlot?.textStyle || DEFAULT_TEXT_STYLE
          return (
            <div
              key={slot.id}
              style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                justifyContent: textStyle.textAlign === 'center' ? 'center' : textStyle.textAlign === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <p
                style={{
                  fontFamily: textStyle.fontFamily,
                  fontSize: `${getFontSizePx(textStyle.fontSize)}px`,
                  fontWeight: textStyle.fontWeight,
                  fontStyle: textStyle.fontStyle,
                  textAlign: textStyle.textAlign,
                  color: textStyle.color,
                  margin: 0,
                  padding: '8px',
                  wordBreak: 'break-word',
                  overflow: 'hidden'
                }}
              >
                {textContent}
              </p>
            </div>
          )
        }

        if (slot.type === 'qr') {
          const qrSlot = page.slots.find(s => s.type === 'qr')
          return (
            <div key={slot.id} style={style} className="flex items-center justify-center">
              {qrSlot?.qrMemoryId ? (
                <img
                  src={getQRCodeUrl(qrSlot.qrMemoryId)}
                  alt="QR Code"
                  className="w-16 h-16"
                />
              ) : (
                <QrCode className="w-12 h-12 text-[#406A56]/30" />
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// Step 5: Checkout
function CheckoutStep({
  product,
  pages,
  address,
  setAddress,
  onSubmit,
  isSubmitting
}: {
  product: Product
  pages: PageData[]
  address: ShippingAddress
  setAddress: (address: ShippingAddress) => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  // Calculate price with 30% markup
  const pageCount = pages.length
  const basePrice = product.basePrice
  const additionalPages = Math.max(0, pageCount - product.minPages)
  const additionalCost = additionalPages * product.pricePerPage
  const subtotal = basePrice + additionalCost
  const markup = subtotal * 0.3
  const total = subtotal + markup
  const shipping = 5.99
  const finalTotal = total + shipping
  
  const isAddressComplete = address.name && address.line1 && address.city && address.postalCode && address.country
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#406A56] mb-2">Complete Your Order</h2>
        <p className="text-[#406A56]/60">Enter your shipping details to receive your photobook</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Shipping Form */}
        <div className="lg:col-span-3">
          <GlassCard variant="warm" padding="lg">
            <h3 className="text-lg font-semibold text-[#406A56] mb-6">Shipping Address</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="123 Main Street"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={address.line2 || ''}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  placeholder="Apt 4B (optional)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="NY"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#406A56]/80 mb-1">
                    Country *
                  </label>
                  <select
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#406A56]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-[#406A56]"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-2">
          <GlassCard variant="warm" padding="lg" className="sticky top-24">
            <h3 className="text-lg font-semibold text-[#406A56] mb-6">Order Summary</h3>
            
            <div className="space-y-4">
              {/* Product */}
              <div className="flex items-center gap-4 pb-4 border-b border-[#406A56]/10">
                <div className="w-16 h-16 rounded-xl bg-[#406A56]/10 flex items-center justify-center text-[#406A56]">
                  {product.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#406A56]">{product.name}</p>
                  <p className="text-sm text-[#406A56]/60">{pageCount} pages</p>
                </div>
              </div>
              
              {/* Price breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#406A56]/70">
                  <span>Base price ({product.minPages} pages)</span>
                  <span>${(basePrice * 1.3).toFixed(2)}</span>
                </div>
                {additionalPages > 0 && (
                  <div className="flex justify-between text-[#406A56]/70">
                    <span>Additional pages ({additionalPages})</span>
                    <span>${(additionalCost * 1.3).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#406A56]/70">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-4 border-t border-[#406A56]/10 text-lg font-bold text-[#406A56]">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Pay Button */}
              <button
                onClick={onSubmit}
                disabled={!isAddressComplete || isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-[#406A56] to-[#4a7a64] text-white font-semibold rounded-xl hover:from-[#4a7a64] hover:to-[#5a8a74] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ${finalTotal.toFixed(2)}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-[#406A56]/50 mt-4">
                Secure payment powered by Stripe
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const STEPS = [
  { id: 'product', label: 'Choose Product', icon: BookOpen },
  { id: 'design', label: 'Design Pages', icon: Layout },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'checkout', label: 'Checkout', icon: CreditCard },
]

export default function CreatePhotobookPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Step state
  const [currentStep, setCurrentStep] = useState(0)
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set())
  const [pages, setPages] = useState<PageData[]>([])
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  })

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const MAX_HISTORY = 50
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Load user, memories, and products
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Load memories with media
      const { data: memoriesData } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          description,
          memory_date,
          created_at,
          memory_media (
            id,
            file_url,
            file_type,
            is_cover
          )
        `)
        .eq('user_id', user.id)
        .order('memory_date', { ascending: false })

      setMemories(memoriesData || [])
      setIsLoading(false)
      
      // Load products from database (falls back to hardcoded if table doesn't exist)
      try {
        const dbProducts = await getEnabledProducts()
        if (dbProducts.length > 0) {
          // Convert DB products to Product interface
          const convertedProducts: Product[] = dbProducts.map((p: DbProduct) => ({
            id: p.slug,
            name: p.name,
            description: p.description || '',
            size: p.size,
            basePrice: Number(p.base_price),
            pricePerPage: Number(p.price_per_page),
            minPages: p.min_pages,
            maxPages: p.max_pages,
            binding: p.binding,
            icon: p.binding === 'layflat' ? <Sparkles className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />,
            features: p.features || [],
            prodigiSku: p.prodigi_sku || undefined,
          }))
          setProducts(convertedProducts)
        } else {
          // Fallback to hardcoded PRODUCTS
          setProducts(PRODUCTS)
        }
      } catch (error) {
        console.warn('Using hardcoded products:', error)
        setProducts(PRODUCTS)
      }
      setProductsLoading(false)
    }

    loadData()
  }, [])

  // Initialize history when pages are first set
  useEffect(() => {
    if (pages.length > 0 && history.length === 0) {
      const initialHistory: HistoryState = {
        pages: JSON.parse(JSON.stringify(pages)),
        timestamp: Date.now()
      }
      setHistory([initialHistory])
      setHistoryIndex(0)
    }
  }, [pages, history.length])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when on design step
      if (currentStep !== 1) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, historyIndex, history])

  // History management functions
  const saveHistory = useCallback((newPages: PageData[]) => {
    setHistory(prev => {
      // Remove any future history after current index
      const newHistory = prev.slice(0, historyIndex + 1)

      // Add new state
      const newState: HistoryState = {
        pages: JSON.parse(JSON.stringify(newPages)),
        timestamp: Date.now()
      }

      newHistory.push(newState)

      // Limit to MAX_HISTORY states
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }

      // Update index to point to new state
      setHistoryIndex(newHistory.length - 1)

      return newHistory
    })
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setPages(JSON.parse(JSON.stringify(history[newIndex].pages)))
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setPages(JSON.parse(JSON.stringify(history[newIndex].pages)))
    }
  }, [historyIndex, history])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  
  // Get selected memories
  const selectedMemories = useMemo(() => 
    memories.filter(m => selectedMemoryIds.has(m.id)),
    [memories, selectedMemoryIds]
  )
  
  // Get memory IDs used on pages (for saving project)
  const usedMemoryIds = useMemo(() => {
    const used = new Set<string>()
    pages.forEach(page => {
      page.slots.forEach(slot => {
        if (slot.memoryId) used.add(slot.memoryId)
        if (slot.qrMemoryId) used.add(slot.qrMemoryId)
      })
    })
    return used
  }, [pages])
  
  // Toggle memory selection
  const toggleMemory = useCallback((memoryId: string) => {
    setSelectedMemoryIds(prev => {
      const next = new Set(prev)
      if (next.has(memoryId)) {
        next.delete(memoryId)
      } else {
        next.add(memoryId)
      }
      return next
    })
  }, [])
  
  // Auto-arrange pages
  const autoArrange = useCallback(() => {
    if (!selectedProduct) return
    
    // Get all photos from selected memories
    const allPhotos: { memoryId: string; mediaId: string; fileUrl: string }[] = []
    selectedMemories.forEach(memory => {
      memory.memory_media?.forEach(media => {
        if (media.file_type?.startsWith('image')) {
          allPhotos.push({
            memoryId: memory.id,
            mediaId: media.id,
            fileUrl: media.file_url
          })
        }
      })
    })
    
    // Create pages with photos
    const newPages: PageData[] = []
    let photoIndex = 0
    
    // Title page
    newPages.push({
      id: `page-${Date.now()}-0`,
      pageNumber: 1,
      layoutId: 'title-page',
      slots: allPhotos[0] ? [{
        slotId: 'photo-1',
        type: 'photo',
        memoryId: allPhotos[0].memoryId,
        mediaId: allPhotos[0].mediaId,
        fileUrl: allPhotos[0].fileUrl
      }] : []
    })
    photoIndex++
    
    // Content pages
    while (photoIndex < allPhotos.length && newPages.length < selectedProduct.maxPages) {
      const remainingPhotos = allPhotos.length - photoIndex
      
      let layoutId = 'full-photo'
      let photosForPage = 1
      
      if (remainingPhotos >= 4 && Math.random() > 0.7) {
        layoutId = 'grid-4'
        photosForPage = 4
      } else if (remainingPhotos >= 3 && Math.random() > 0.6) {
        layoutId = 'feature-2-small'
        photosForPage = 3
      } else if (remainingPhotos >= 2 && Math.random() > 0.5) {
        layoutId = 'two-horizontal'
        photosForPage = 2
      }
      
      const pageSlots: PageData['slots'] = []
      for (let i = 0; i < photosForPage && photoIndex < allPhotos.length; i++) {
        pageSlots.push({
          slotId: `photo-${i + 1}`,
          type: 'photo',
          memoryId: allPhotos[photoIndex].memoryId,
          mediaId: allPhotos[photoIndex].mediaId,
          fileUrl: allPhotos[photoIndex].fileUrl
        })
        photoIndex++
      }
      
      newPages.push({
        id: `page-${Date.now()}-${newPages.length}`,
        pageNumber: newPages.length + 1,
        layoutId,
        slots: pageSlots
      })
    }
    
    // Add QR page at the end if we have memories
    if (selectedMemories.length > 0) {
      newPages.push({
        id: `page-${Date.now()}-qr`,
        pageNumber: newPages.length + 1,
        layoutId: 'qr-page',
        slots: [{
          slotId: 'qr-code',
          type: 'qr',
          qrMemoryId: selectedMemories[0].id
        }]
      })
    }
    
    setPages(newPages)
    saveHistory(newPages)
  }, [selectedProduct, selectedMemories, saveHistory])
  
  // Save project to database
  const saveProject = useCallback(async () => {
    if (!userId || !selectedProduct) return null
    
    try {
      // Create or update project
      const projectData = {
        user_id: userId,
        title: `${selectedProduct.name} - ${new Date().toLocaleDateString()}`,
        status: 'draft',
        page_count: pages.length,
        print_config: {
          size: selectedProduct.size,
          binding: selectedProduct.binding,
          copies: 1
        },
        delivery_address: shippingAddress,
        estimated_price: calculateTotal()
      }
      
      let project
      if (projectId) {
        const { data, error } = await supabase
          .from('photobook_projects')
          .update(projectData)
          .eq('id', projectId)
          .select()
          .single()
        if (error) throw error
        project = data
      } else {
        const { data, error } = await supabase
          .from('photobook_projects')
          .insert(projectData)
          .select()
          .single()
        if (error) throw error
        project = data
        setProjectId(project.id)
      }
      
      // Save pages
      if (project) {
        // Delete existing pages
        await supabase
          .from('photobook_pages')
          .delete()
          .eq('project_id', project.id)
        
        // Insert new pages
        const pageInserts = pages.map((page, i) => ({
          project_id: project.id,
          page_number: i + 1,
          page_type: i === 0 ? 'cover' : 'content',
          layout_type: page.layoutId.split('-')[0] || 'single',
          content_json: {
            photos: page.slots.filter(s => s.type === 'photo').map(s => ({
              memory_id: s.memoryId,
              media_id: s.mediaId,
              file_url: s.fileUrl
            })),
            qr_code: page.slots.find(s => s.type === 'qr') ? {
              memory_id: page.slots.find(s => s.type === 'qr')?.qrMemoryId
            } : undefined
          }
        }))
        
        if (pageInserts.length > 0) {
          await supabase.from('photobook_pages').insert(pageInserts)
        }
        
        // Save memory selections (based on what's actually used)
        await supabase
          .from('photobook_memory_selections')
          .delete()
          .eq('project_id', project.id)
        
        const selectionInserts = Array.from(usedMemoryIds).map((memoryId, i) => ({
          project_id: project.id,
          memory_id: memoryId,
          sort_order: i
        }))
        
        if (selectionInserts.length > 0) {
          await supabase.from('photobook_memory_selections').insert(selectionInserts)
        }
      }
      
      return project
    } catch (error) {
      console.error('Error saving project:', error)
      return null
    }
  }, [userId, selectedProduct, pages, shippingAddress, projectId, usedMemoryIds])
  
  // Calculate total price
  const calculateTotal = () => {
    if (!selectedProduct) return 0
    const pageCount = pages.length
    const basePrice = selectedProduct.basePrice
    const additionalPages = Math.max(0, pageCount - selectedProduct.minPages)
    const additionalCost = additionalPages * selectedProduct.pricePerPage
    const subtotal = basePrice + additionalCost
    const markup = subtotal * 0.3
    const shipping = 5.99
    return subtotal + markup + shipping
  }
  
  // Handle checkout
  const handleCheckout = async () => {
    setIsSubmitting(true)
    
    try {
      // Save project first
      const project = await saveProject()
      if (!project) throw new Error('Failed to save project')
      
      // Create Stripe checkout session
      const response = await fetch('/api/photobook/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          productId: selectedProduct?.id,
          amount: Math.round(calculateTotal() * 100), // cents
          shippingAddress
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    setIsSubmitting(false)
  }
  
  // Step validation (updated for 4 steps)
  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedProduct !== null
      case 1: {
        // Design Pages: Need at least 1 page created
        return pages.length >= 1
      }
      case 2: return true // Preview
      case 3: return shippingAddress.name && shippingAddress.line1 && shippingAddress.city && shippingAddress.postalCode && shippingAddress.country
      default: return false
    }
  }
  
  // Navigate steps
  const goToStep = (step: number) => {
    if (step < currentStep || canProceed()) {
      // Auto-save when leaving design step
      if (currentStep === 1 && step > currentStep) {
        saveProject()
      }
      // Auto-arrange when entering design step for first time with no pages
      if (step === 1 && pages.length === 0 && memories.length > 0) {
        setTimeout(autoArrange, 100)
      }
      setCurrentStep(step)
    }
  }
  
  return (
    <div className="min-h-screen pb-24 pt-14">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#E8E4D6]/95 backdrop-blur-sm border-b border-[#406A56]/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#406A56]/70 hover:text-[#406A56]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-bold text-[#406A56]">Create Photobook</h1>
            <div className="w-32" /> {/* Spacer */}
          </div>
          
          {/* Step Progress (4 steps now) */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isComplete = index < currentStep
              const isClickable = index < currentStep || (index === currentStep + 1 && canProceed())
              
              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable && index > currentStep}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-[#406A56] text-white' 
                      : isComplete 
                        ? 'bg-[#406A56]/10 text-[#406A56]' 
                        : 'text-[#406A56]/40'
                  } ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isComplete ? 'bg-[#406A56] text-white' : ''
                  }`}>
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden md:inline font-medium">{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <ProductStep
                selectedProduct={selectedProduct}
                onSelect={setSelectedProduct}
                products={products}
                isLoading={productsLoading}
              />
            )}
            
            {currentStep === 1 && (
              <ArrangeStep
                pages={pages}
                setPages={setPages}
                selectedMemories={memories}
                onAutoArrange={autoArrange}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                saveHistory={saveHistory}
              />
            )}
            
            {currentStep === 2 && selectedProduct && (
              <PreviewStep
                pages={pages}
                selectedMemories={memories}
                product={selectedProduct}
              />
            )}
            
            {currentStep === 3 && selectedProduct && (
              <CheckoutStep
                product={selectedProduct}
                pages={pages}
                address={shippingAddress}
                setAddress={setShippingAddress}
                onSubmit={handleCheckout}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Bottom Navigation */}
      {currentStep < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#E8E4D6]/95 backdrop-blur-sm border-t border-[#406A56]/10 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="px-6 py-3 text-[#406A56] hover:bg-[#406A56]/10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            
            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canProceed()}
              className="px-8 py-3 bg-gradient-to-r from-[#406A56] to-[#4a7a64] text-white font-semibold rounded-xl hover:from-[#4a7a64] hover:to-[#5a8a74] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 2 ? 'Proceed to Checkout' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
