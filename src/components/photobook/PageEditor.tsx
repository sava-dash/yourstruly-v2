'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  Image as ImageIcon, 
  Type, 
  Trash2, 
  Move,
  QrCode,
  X,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PhotobookPage, PhotobookMemorySelection } from './types'
import { 
  TEMPLATES_BY_ID, 
  getPhotoSlots, 
  getTextSlots,
  LayoutTemplate,
  LayoutSlot,
  LAYOUT_TEMPLATES as RICH_TEMPLATES
} from '@/lib/photobook/templates'

interface PageEditorProps {
  page: PhotobookPage
  availableMemories: PhotobookMemorySelection[]
  onUpdate: (pageId: string, updates: Partial<PhotobookPage>) => Promise<void>
}

// Font options - uses CSS variables from next/font
const FONT_FAMILIES = [
  { value: 'Georgia, serif', label: 'Georgia (Serif)' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica (Sans)' },
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

// Background options
const BACKGROUND_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#faf9f6', label: 'Cream' },
  { value: '#f5f5f5', label: 'Light Gray' },
  { value: '#1a1a1a', label: 'Black' },
  { value: '#2c3e50', label: 'Dark Blue' },
  { value: '#8b4513', label: 'Saddle Brown' },
]

const BACKGROUND_GRADIENTS = [
  { value: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)', label: 'Warm Cream' },
  { value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', label: 'Cool Blue' },
  { value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', label: 'Sunset' },
  { value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Purple Dream' },
  { value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', label: 'Soft Pastel' },
]

// Generate QR code URL
const getQRCodeUrl = (memoryId: string, size: number = 80) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourstruly.love'
  const viewUrl = `${baseUrl}/view/${memoryId}`
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(viewUrl)}&format=png&margin=2`
}

// Map old layout types to new template IDs
const LAYOUT_ID_MAP: Record<string, string> = {
  'single': 'full-photo',
  'full-bleed': 'full-photo',
  'two-horizontal': 'two-horizontal',
  'two-vertical': 'two-vertical',
  'three-top-heavy': 'feature-2-small',
  'three-bottom-heavy': 'feature-2-small',
  'grid-2x2': 'grid-4',
  'collage-5': 'collage-3', // Closest match
  'hero-left': 'feature-2-small',
  'hero-right': 'feature-2-small',
  'text-left': 'photo-with-caption',
  'text-bottom': 'photo-with-caption',
}

// Get font size in pixels
function getFontSizePx(size: string): number {
  return FONT_SIZES.find(f => f.value === size)?.px || 16
}

// Text style interface
interface TextSlotStyle {
  fontFamily: string
  fontSize: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

// Default text style
const DEFAULT_TEXT_STYLE: TextSlotStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: 'md' as const,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  color: '#333333',
}

export default function PageEditor({ page, availableMemories, onUpdate }: PageEditorProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [activeTextSlot, setActiveTextSlot] = useState<string | null>(null)
  
  // Get the rich template
  const templateId = LAYOUT_ID_MAP[page.layout_type] || page.layout_type
  const template = TEMPLATES_BY_ID[templateId] || RICH_TEMPLATES[0]
  
  // Initialize text content from page
  const [textContents, setTextContents] = useState<Record<string, string>>(() => {
    const contents: Record<string, string> = {}
    const textSlots = getTextSlots(template)
    
    // Try to get from new slots structure first
    if (page.content_json.slots) {
      for (const slot of textSlots) {
        const slotData = page.content_json.slots[slot.id]
        if (slotData?.value) {
          contents[slot.id] = slotData.value
        }
      }
    }
    
    // Fallback to old text.content structure
    if (Object.keys(contents).length === 0 && page.content_json.text?.content) {
      const firstTextSlot = textSlots[0]
      if (firstTextSlot) {
        contents[firstTextSlot.id] = page.content_json.text.content
      }
    }
    
    return contents
  })
  
  // Initialize text styles
  const [textStyles, setTextStyles] = useState<Record<string, TextSlotStyle>>(() => {
    const styles: Record<string, TextSlotStyle> = {}
    const textSlots = getTextSlots(template)
    
    for (const slot of textSlots) {
      // Try to get from stored page data
      const storedStyle = page.content_json.textStyles?.[slot.id]
      styles[slot.id] = storedStyle || { ...DEFAULT_TEXT_STYLE }
    }
    
    // Migrate from old text styling
    if (page.content_json.text) {
      const oldText = page.content_json.text
      const firstSlot = textSlots[0]
      if (firstSlot && !page.content_json.textStyles?.[firstSlot.id]) {
        styles[firstSlot.id] = {
          fontFamily: oldText.fontFamily || DEFAULT_TEXT_STYLE.fontFamily,
          fontSize: oldText.fontSize || DEFAULT_TEXT_STYLE.fontSize,
          fontWeight: oldText.fontWeight || DEFAULT_TEXT_STYLE.fontWeight,
          fontStyle: oldText.fontStyle || DEFAULT_TEXT_STYLE.fontStyle,
          textAlign: (oldText.alignment || oldText.textAlign || DEFAULT_TEXT_STYLE.textAlign) as 'left' | 'center' | 'right',
          color: oldText.color || DEFAULT_TEXT_STYLE.color,
        }
      }
    }
    
    return styles
  })
  
  // Initialize background
  const [background, setBackground] = useState<string>(
    page.content_json.background?.color || 
    page.content_json.background?.gradient || 
    template.background || 
    '#ffffff'
  )
  
  // Get slot data
  const photoSlots = getPhotoSlots(template)
  const textSlots = getTextSlots(template)
  const photos = page.content_json.photos || []
  
  // Update text content
  const handleTextChange = (slotId: string, value: string) => {
    setTextContents(prev => ({ ...prev, [slotId]: value }))
  }
  
  // Save text on blur
  const handleTextBlur = async (slotId: string) => {
    const newSlots = { ...(page.content_json.slots || {}) }
    newSlots[slotId] = {
      type: 'text',
      value: textContents[slotId] || '',
      style: textStyles[slotId],
    }
    
    await onUpdate(page.id, {
      content_json: {
        ...page.content_json,
        slots: newSlots,
        // Also update old text structure for backwards compatibility
        text: {
          ...page.content_json.text,
          content: textContents[textSlots[0]?.id] || '',
          ...textStyles[textSlots[0]?.id],
        } as any,
        textStyles: textStyles,
      }
    })
  }
  
  // Update text style
  const updateTextStyle = async <K extends keyof TextSlotStyle>(
    slotId: string, 
    property: K, 
    value: TextSlotStyle[K]
  ) => {
    const newStyles = {
      ...textStyles,
      [slotId]: {
        ...textStyles[slotId],
        [property]: value,
      }
    }
    setTextStyles(newStyles)
    
    // Save immediately
    const newSlots = { ...(page.content_json.slots || {}) }
    newSlots[slotId] = {
      type: 'text',
      value: textContents[slotId] || '',
      style: newStyles[slotId],
    }
    
    await onUpdate(page.id, {
      content_json: {
        ...page.content_json,
        slots: newSlots,
        textStyles: newStyles,
        // Backwards compatibility
        text: {
          ...page.content_json.text,
          content: textContents[textSlots[0]?.id] || '',
          ...newStyles[textSlots[0]?.id],
        } as any,
      }
    })
  }
  
  // Update background
  const handleBackgroundChange = async (value: string) => {
    setBackground(value)
    
    const isGradient = value.startsWith('linear-gradient')
    await onUpdate(page.id, {
      content_json: {
        ...page.content_json,
        background: isGradient 
          ? { gradient: value }
          : { color: value },
      }
    })
  }
  
  // Handle photo selection
  const handlePhotoSelect = async (
    memorySelection: PhotobookMemorySelection, 
    mediaUrl: string, 
    mediaId: string,
    slotId: string
  ) => {
    // Find slot index
    const slotIndex = photoSlots.findIndex(s => s.id === slotId)
    
    const newPhotos = [...photos]
    newPhotos[slotIndex] = {
      file_url: mediaUrl,
      media_id: mediaId,
      memory_id: memorySelection.memory_id,
      position: slotIndex,
    }
    
    // Also update slots structure
    const newSlots = { ...(page.content_json.slots || {}) }
    newSlots[slotId] = {
      type: 'photo',
      value: mediaUrl,
    }
    
    await onUpdate(page.id, {
      content_json: {
        ...page.content_json,
        photos: newPhotos,
        slots: newSlots,
      }
    })
    
    setShowPhotoPicker(false)
    setSelectedSlot(null)
  }
  
  // Handle photo removal
  const handleRemovePhoto = async (slotId: string) => {
    const slotIndex = photoSlots.findIndex(s => s.id === slotId)
    const newPhotos = photos.filter((_, i) => i !== slotIndex)
    
    const newSlots = { ...(page.content_json.slots || {}) }
    delete newSlots[slotId]
    
    await onUpdate(page.id, {
      content_json: {
        ...page.content_json,
        photos: newPhotos,
        slots: newSlots,
      }
    })
  }
  
  // Get current text style for active slot
  const currentStyle = activeTextSlot ? textStyles[activeTextSlot] : null
  
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-white/10 bg-gray-900/50 p-3 flex items-center gap-3 flex-wrap">
        {/* Background picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <Palette className="w-4 h-4 mr-2" />
              Background
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-gray-800 border-white/10 p-3">
            <div className="space-y-3">
              <div>
                <p className="text-white/60 text-xs mb-2">Solid Colors</p>
                <div className="grid grid-cols-6 gap-2">
                  {BACKGROUND_COLORS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleBackgroundChange(value)}
                      className={`w-8 h-8 rounded border-2 ${
                        background === value ? 'border-amber-500' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: value }}
                      title={label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-2">Gradients</p>
                <div className="grid grid-cols-3 gap-2">
                  {BACKGROUND_GRADIENTS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleBackgroundChange(value)}
                      className={`h-8 rounded border-2 ${
                        background === value ? 'border-amber-500' : 'border-white/20'
                      }`}
                      style={{ background: value }}
                      title={label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Divider */}
        <div className="w-px h-6 bg-white/20" />
        
        {/* Text formatting (only show when text slot is active) */}
        {activeTextSlot && currentStyle && (
          <>
            {/* Font family */}
            <Select 
              value={currentStyle.fontFamily} 
              onValueChange={(v) => updateTextStyle(activeTextSlot, 'fontFamily', v)}
            >
              <SelectTrigger className="w-40 h-8 bg-gray-700/50 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {FONT_FAMILIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-white">
                    <span style={{ fontFamily: value }}>{label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Font size */}
            <Select 
              value={currentStyle.fontSize} 
              onValueChange={(v) => updateTextStyle(activeTextSlot, 'fontSize', v)}
            >
              <SelectTrigger className="w-20 h-8 bg-gray-700/50 border-white/10 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {FONT_SIZES.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-white">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Bold */}
            <Button
              variant={currentStyle.fontWeight === 'bold' ? 'default' : 'outline'}
              size="sm"
              className={`w-8 h-8 p-0 ${
                currentStyle.fontWeight === 'bold' 
                  ? 'bg-amber-500 text-white' 
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
              onClick={() => updateTextStyle(
                activeTextSlot, 
                'fontWeight', 
                currentStyle.fontWeight === 'bold' ? 'normal' : 'bold'
              )}
            >
              <Bold className="w-4 h-4" />
            </Button>
            
            {/* Italic */}
            <Button
              variant={currentStyle.fontStyle === 'italic' ? 'default' : 'outline'}
              size="sm"
              className={`w-8 h-8 p-0 ${
                currentStyle.fontStyle === 'italic' 
                  ? 'bg-amber-500 text-white' 
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
              onClick={() => updateTextStyle(
                activeTextSlot, 
                'fontStyle', 
                currentStyle.fontStyle === 'italic' ? 'normal' : 'italic'
              )}
            >
              <Italic className="w-4 h-4" />
            </Button>
            
            {/* Divider */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Alignment */}
            <div className="flex">
              <Button
                variant={currentStyle.textAlign === 'left' ? 'default' : 'outline'}
                size="sm"
                className={`w-8 h-8 p-0 rounded-r-none ${
                  currentStyle.textAlign === 'left' 
                    ? 'bg-amber-500 text-white' 
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
                onClick={() => updateTextStyle(activeTextSlot, 'textAlign', 'left')}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant={currentStyle.textAlign === 'center' ? 'default' : 'outline'}
                size="sm"
                className={`w-8 h-8 p-0 rounded-none border-x-0 ${
                  currentStyle.textAlign === 'center' 
                    ? 'bg-amber-500 text-white' 
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
                onClick={() => updateTextStyle(activeTextSlot, 'textAlign', 'center')}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant={currentStyle.textAlign === 'right' ? 'default' : 'outline'}
                size="sm"
                className={`w-8 h-8 p-0 rounded-l-none ${
                  currentStyle.textAlign === 'right' 
                    ? 'bg-amber-500 text-white' 
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
                onClick={() => updateTextStyle(activeTextSlot, 'textAlign', 'right')}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Text color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-8 h-8 p-0 border-white/20"
                >
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: currentStyle.color }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 bg-gray-800 border-white/10 p-2">
                <div className="grid grid-cols-4 gap-2">
                  {['#333333', '#000000', '#ffffff', '#666666', '#8b4513', '#2c3e50', '#c0392b', '#27ae60'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateTextStyle(activeTextSlot, 'color', color)}
                      className={`w-6 h-6 rounded border-2 ${
                        currentStyle.color === color ? 'border-amber-500' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
        
        {!activeTextSlot && textSlots.length > 0 && (
          <span className="text-white/40 text-sm">Click on a text area to edit formatting</span>
        )}
      </div>
      
      {/* Page Preview */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div 
          className="relative rounded-lg shadow-2xl overflow-hidden"
          style={{ 
            width: '500px', 
            height: '625px', // 4:5 aspect ratio
            background: background,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Render all slots */}
          {template.slots.map((slot) => {
            const bounds = {
              left: `${slot.position.x}%`,
              top: `${slot.position.y}%`,
              width: `${slot.position.width}%`,
              height: `${slot.position.height}%`,
            }
            
            if (slot.type === 'photo') {
              const slotIndex = photoSlots.findIndex(s => s.id === slot.id)
              const photo = photos[slotIndex]
              
              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlot(slot.id)
                    setShowPhotoPicker(true)
                    setActiveTextSlot(null)
                  }}
                  className="absolute cursor-pointer transition-all group"
                  style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                    padding: '4px',
                  }}
                >
                  <div 
                    className={`relative w-full h-full overflow-hidden ${
                      photo ? '' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      borderRadius: slot.style?.borderRadius 
                        ? `${slot.style.borderRadius}%` 
                        : '4px',
                    }}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo.file_url}
                          alt=""
                          className="w-full h-full"
                          style={{ 
                            objectFit: slot.style?.objectFit || 'cover' 
                          }}
                        />
                        
                        {/* QR Code Overlay */}
                        {photo.memory_id && (
                          <div className="absolute bottom-2 right-2 bg-white p-1 rounded shadow-lg opacity-90">
                            <img
                              src={getQRCodeUrl(photo.memory_id)}
                              alt="QR Code"
                              className="w-10 h-10"
                            />
                          </div>
                        )}
                        
                        {/* Hover Controls */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSlot(slot.id)
                              setShowPhotoPicker(true)
                            }}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Replace
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemovePhoto(slot.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-sm">Click to add photo</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            
            if (slot.type === 'text') {
              const style = textStyles[slot.id] || DEFAULT_TEXT_STYLE
              const content = textContents[slot.id] || ''
              const isActive = activeTextSlot === slot.id
              
              return (
                <div
                  key={slot.id}
                  className={`absolute p-2 ${
                    isActive ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-transparent' : ''
                  }`}
                  style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                  }}
                >
                  <Textarea
                    value={content}
                    onChange={(e) => handleTextChange(slot.id, e.target.value)}
                    onFocus={() => setActiveTextSlot(slot.id)}
                    onBlur={() => handleTextBlur(slot.id)}
                    placeholder={slot.placeholder || 'Add text...'}
                    className="w-full h-full bg-transparent border-0 resize-none focus-visible:ring-0 placeholder:text-gray-400/50"
                    style={{
                      fontFamily: style.fontFamily,
                      fontSize: `${getFontSizePx(style.fontSize)}px`,
                      fontWeight: style.fontWeight,
                      fontStyle: style.fontStyle,
                      textAlign: style.textAlign,
                      color: style.color,
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              )
            }
            
            if (slot.type === 'qr') {
              // QR slot handling
              return (
                <div
                  key={slot.id}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: bounds.left,
                    top: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                  }}
                >
                  <div className="text-center text-gray-400">
                    <QrCode className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm">QR Code</p>
                  </div>
                </div>
              )
            }
            
            return null
          })}
          
          {/* Page Number */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-gray-500 text-xs">
            {page.page_number}
          </div>
        </div>
      </div>
      
      {/* Layout Info */}
      <div className="text-center py-2 border-t border-white/10">
        <span className="text-white/60 text-sm">
          Layout: <span className="text-white">{template.name}</span>
        </span>
      </div>
      
      {/* Photo Picker Modal */}
      {showPhotoPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">Select Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPhotoPicker(false)
                  setSelectedSlot(null)
                }}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableMemories.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                  <p>No memories added yet.</p>
                  <p className="text-sm mt-1">Add memories using the "Add Memories" button in the sidebar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {availableMemories.map((selection) => {
                    const memory = selection.memory as any
                    const media = memory?.memory_media || []
                    
                    return media.map((m: any) => (
                      <button
                        key={m.id}
                        onClick={() => selectedSlot && handlePhotoSelect(selection, m.file_url, m.id, selectedSlot)}
                        className="relative aspect-square rounded-lg overflow-hidden group hover:ring-2 hover:ring-amber-500"
                      >
                        <img
                          src={m.file_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{memory?.title || 'Untitled'}</p>
                        </div>
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 p-1 rounded">
                            <QrCode className="w-3 h-3 text-gray-800" />
                          </div>
                        </div>
                      </button>
                    ))
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
