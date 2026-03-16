'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X, Sparkles, Mic, Send, RotateCcw, UserPlus, Search } from 'lucide-react'
import { TYPE_CONFIG, isContactPrompt, PHOTO_TAGGING_TYPES } from '../constants'
import { createClient } from '@/lib/supabase/client'

interface Prompt {
  id: string
  type: string
  promptText: string
  photoUrl?: string
  photoId?: string
  contactName?: string
  contactId?: string
  missingField?: string
  metadata?: any
}

interface SwipeableCardStackProps {
  prompts: Prompt[]
  onCardDismiss: (promptId: string) => void
  onCardAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string }) => Promise<void>
  onNeedMorePrompts: () => void
  getPromptText: (prompt: Prompt) => string
}

export function SwipeableCardStack({
  prompts,
  onCardDismiss,
  onCardAnswer,
  onNeedMorePrompts,
  getPromptText,
}: SwipeableCardStackProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter out dismissed cards
  const visiblePrompts = prompts.filter(p => !dismissedIds.has(p.id))

  // Request more prompts when running low
  useEffect(() => {
    if (visiblePrompts.length < 5 && prompts.length > 0) {
      onNeedMorePrompts()
    }
  }, [visiblePrompts.length, prompts.length, onNeedMorePrompts])

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
    onCardDismiss(id)
  }, [onCardDismiss])

  // Auto-focus on mount for keyboard navigation
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visiblePrompts.length === 0) return
      
      const currentPrompt = visiblePrompts[0]
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleDismiss(currentPrompt.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visiblePrompts, handleDismiss])

  if (visiblePrompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
          <Sparkles size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-[#406A56] mb-2">All caught up!</h3>
        <p className="text-[#406A56]/60 mb-6 max-w-sm">
          You've gone through all your prompts. Shuffle to get more.
        </p>
        <button
          onClick={onNeedMorePrompts}
          className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium"
        >
          <Sparkles size={18} />
          Get More Prompts
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-[520px] w-full max-w-md mx-auto focus:outline-none" tabIndex={0}>
      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {visiblePrompts.slice(0, 3).map((prompt, index) => (
            <FlippableCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalVisible={Math.min(visiblePrompts.length, 3)}
              onDismiss={() => handleDismiss(prompt.id)}
              onAnswer={onCardAnswer}
              getPromptText={getPromptText}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

interface FlippableCardProps {
  prompt: Prompt
  index: number
  totalVisible: number
  onDismiss: () => void
  onAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string }) => Promise<void>
  getPromptText: (prompt: Prompt) => string
}

function FlippableCard({
  prompt,
  index,
  totalVisible,
  onDismiss,
  onAnswer,
  getPromptText,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Tag person state
  const isTagType = PHOTO_TAGGING_TYPES.includes(prompt.type)
  const [tagPosition, setTagPosition] = useState<{ x: number; y: number } | null>(null)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<{ id: string; full_name: string }[]>([])
  const [taggedFaces, setTaggedFaces] = useState<{ id: string; name: string; x: number; y: number }[]>([])
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Photo backstory state (location + date)
  const isBackstoryType = prompt.type === 'photo_backstory'
  const [locationInput, setLocationInput] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<{ place_name: string; id: string }[]>([])
  const [dateInput, setDateInput] = useState('')
  const [isSavingBackstory, setIsSavingBackstory] = useState(false)
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setLocationSuggestions([]); return }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&types=place,locality,neighborhood,address`
      )
      const data = await res.json()
      setLocationSuggestions(data.features?.map((f: any) => ({ place_name: f.place_name, id: f.id })) || [])
    } catch { setLocationSuggestions([]) }
  }, [])

  const handleLocationChange = (val: string) => {
    setLocationInput(val)
    if (locationDebounce.current) clearTimeout(locationDebounce.current)
    locationDebounce.current = setTimeout(() => fetchLocationSuggestions(val), 300)
  }

  const handleSaveBackstory = async () => {
    if (!prompt.photoId || (!locationInput.trim() && !dateInput.trim())) return
    setIsSavingBackstory(true)
    try {
      const supabase = createClient()
      const updates: Record<string, any> = {}
      if (locationInput.trim()) updates.location_name = locationInput.trim()
      if (dateInput.trim()) updates.taken_at = dateInput.trim()
      
      await supabase
        .from('memory_media')
        .update(updates)
        .eq('id', prompt.photoId)
      
      // Also answer the prompt
      await onAnswer(prompt.id, { type: 'text', text: `Location: ${locationInput}, Date: ${dateInput}` })
      onDismiss()
    } catch (err) {
      console.error('Failed to save backstory:', err)
    }
    setIsSavingBackstory(false)
  }
  
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])
  
  const isDragging = useRef(false)
  const dragStartX = useRef(0)

  const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
  const isContact = isContactPrompt(prompt.type)
  const hasPhoto = prompt.photoUrl && (prompt.type === 'photo_backstory' || prompt.type === 'tag_person')

  const handleDragStart = () => {
    isDragging.current = true
    dragStartX.current = x.get()
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isFlipped) return // Don't dismiss while flipped
    
    const threshold = 80
    const velocity = Math.abs(info.velocity.x)
    const offset = Math.abs(info.offset.x)
    
    if (offset > threshold || (velocity > 500 && offset > 30)) {
      onDismiss()
    }
    
    setTimeout(() => {
      isDragging.current = false
    }, 50)
  }

  const handleClick = () => {
    if (isFlipped) return
    if (!isDragging.current && Math.abs(x.get() - dragStartX.current) < 10) {
      setIsFlipped(true)
      // Load contacts when flipping a tag card
      if (isTagType) {
        loadContacts()
      }
    }
  }

  const loadContacts = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('user_id', user.id)
      .order('full_name')
    if (data) setContacts(data)
  }

  const handlePhotoClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setTagPosition({ x, y })
    setShowContactPicker(true)
    setContactSearch('')
  }

  const handleSelectContact = async (contact: { id: string; full_name: string }) => {
    if (!prompt.photoId || !tagPosition) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newTag } = await supabase
      .from('memory_face_tags')
      .insert({
        media_id: prompt.photoId,
        user_id: user.id,
        contact_id: contact.id,
        box_left: (tagPosition.x - 5) / 100,
        box_top: (tagPosition.y - 5) / 100,
        box_width: 0.1,
        box_height: 0.1,
        is_confirmed: true,
        is_auto_detected: false,
      })
      .select()
      .single()

    if (newTag) {
      setTaggedFaces(prev => [...prev, {
        id: newTag.id,
        name: contact.full_name,
        x: tagPosition.x,
        y: tagPosition.y,
      }])
    }

    setShowContactPicker(false)
    setTagPosition(null)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showContactPicker) {
      setShowContactPicker(false)
      setTagPosition(null)
    } else if (isFlipped) {
      setIsFlipped(false)
      setResponseText('')
      setTagPosition(null)
      setShowContactPicker(false)
    } else {
      onDismiss()
    }
  }

  const handleSubmit = async () => {
    if (!responseText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onAnswer(prompt.id, { type: 'text', text: responseText })
      setIsFlipped(false)
      setResponseText('')
      onDismiss()
    } catch (err) {
      console.error('Failed to submit:', err)
    }
    setIsSubmitting(false)
  }

  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <motion.div
      className="absolute inset-0"
      style={{ 
        zIndex: totalVisible - index,
        perspective: 1000,
      }}
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{
        scale: stackScale,
        opacity: 1,
        y: stackOffset,
      }}
      exit={{
        x: x.get() >= 0 ? 400 : -400,
        opacity: 0,
        rotate: x.get() >= 0 ? 15 : -15,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8,
      }}
    >
      <motion.div
        className="h-full w-full"
        style={{ 
          x: isFlipped ? 0 : x, 
          rotate: isFlipped ? 0 : rotate, 
          opacity,
          transformStyle: 'preserve-3d',
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        drag={index === 0 && !isFlipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={index === 0 ? handleClick : undefined}
      >
        {/* Front of card */}
        <div 
          className={`
            absolute inset-0 rounded-3xl overflow-hidden
            bg-white shadow-xl
            ${index === 0 && !isFlipped ? 'cursor-grab active:cursor-grabbing' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Close/Skip button */}
          {index === 0 && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors"
            >
              <X size={20} />
            </button>
          )}

          <div className="h-full flex flex-col">
            {/* Photo or gradient header — 60% of card */}
            {hasPhoto ? (
              <div className="relative h-[60%] bg-gray-100">
                <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ) : (
              <div className={`relative h-[60%] bg-gradient-to-br ${
                config.color === 'yellow' ? 'from-amber-400 to-orange-500' :
                config.color === 'green' ? 'from-emerald-400 to-teal-500' :
                config.color === 'red' ? 'from-rose-400 to-red-500' :
                config.color === 'blue' ? 'from-blue-400 to-indigo-500' :
                'from-purple-400 to-violet-500'
              }`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={64} className="text-white/30" />
                </div>
                {/* Category badge on gradient */}
                <div className="absolute bottom-4 left-5 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
                    {config.label}
                  </span>
                  {config.xp > 0 && (
                    <span className="flex items-center gap-1 text-xs text-white/80 font-medium">
                      <Sparkles size={12} />+{config.xp} XP
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Content — 40% of card */}
            <div className="flex-1 p-5 flex flex-col justify-center">
              {isContact && prompt.contactName && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] flex items-center justify-center text-white font-medium">
                    {prompt.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{prompt.contactName}</p>
                    {prompt.missingField && (
                      <p className="text-xs text-gray-500">Add {prompt.missingField.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xl font-semibold text-[#406A56] leading-snug flex-1 flex items-center">
                {getPromptText(prompt)}
              </p>

              <p className="text-xs text-gray-400 text-center mt-3">
                Tap to answer • Swipe or ← → to skip
              </p>
            </div>
          </div>
        </div>

        {/* Back of card (response UI) */}
        <div 
          className="absolute inset-0 rounded-3xl overflow-hidden bg-white shadow-xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Back button */}
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw size={18} />
          </button>

          {/* Tag Person: photo fills card, tap to place tag */}
          {isTagType && prompt.photoUrl ? (
            <div className="h-full flex flex-col relative">
              {/* Photo fills the card */}
              <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center" style={{ marginTop: 56 }}>
                <img
                  ref={imageRef}
                  src={prompt.photoUrl}
                  alt=""
                  onClick={handlePhotoClick}
                  className="w-full h-full object-contain cursor-crosshair"
                  draggable={false}
                />

                {/* Tagged faces */}
                {taggedFaces.map(face => (
                  <div
                    key={face.id}
                    className="absolute pointer-events-none"
                    style={{ left: `${face.x}%`, top: `${face.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-[#406A56] bg-[#406A56]/20" />
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-[#406A56] text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                      {face.name}
                    </span>
                  </div>
                ))}

                {/* Current tap pin */}
                {tagPosition && (
                  <div
                    className="absolute animate-pulse"
                    style={{ left: `${tagPosition.x}%`, top: `${tagPosition.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/20" />
                  </div>
                )}

                {/* Contact picker popup ON the photo */}
                {showContactPicker && tagPosition && (
                  <div
                    className="absolute z-30 bg-white rounded-xl shadow-2xl overflow-hidden"
                    style={{
                      width: 220,
                      maxHeight: 260,
                      left: `${Math.min(Math.max(tagPosition.x, 30), 70)}%`,
                      top: `${Math.min(tagPosition.y + 8, 65)}%`,
                      transform: 'translateX(-50%)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#406A56] text-gray-800"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto">
                      {contacts
                        .filter(c => c.full_name.toLowerCase().includes(contactSearch.toLowerCase()))
                        .map(contact => (
                          <button
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className="w-full px-3 py-2 text-left hover:bg-[#406A56]/10 flex items-center gap-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
                              {contact.full_name.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-800 truncate">{contact.full_name}</span>
                          </button>
                        ))}
                      {contacts.filter(c => c.full_name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-500">No contacts found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar */}
              <div className="p-3 text-center bg-white flex items-center justify-between">
                <span className="text-xs text-gray-500">Tap on faces to tag</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss() }}
                  className="px-4 py-1.5 bg-[#406A56] text-white rounded-full text-sm font-medium"
                >
                  {taggedFaces.length > 0 ? `Done · ${taggedFaces.length} tagged` : 'Skip'}
                </button>
              </div>
            </div>
          ) : isBackstoryType && prompt.photoUrl ? (
            /* Photo Backstory: photo + location & date fields */
            <div className="h-full flex flex-col">
              {/* Photo at top */}
              <div className="h-[45%] bg-black flex items-center justify-center overflow-hidden" style={{ marginTop: 56 }}>
                <img src={prompt.photoUrl} alt="" className="w-full h-full object-contain" draggable={false} />
              </div>

              {/* Location + Date fields */}
              <div className="flex-1 p-5 flex flex-col gap-4">
                {/* Location with autocomplete */}
                <div className="relative">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    📍 Where was this?
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="City, place, or address..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]"
                    autoFocus={isFlipped && isBackstoryType}
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                      {locationSuggestions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setLocationInput(s.place_name)
                            setLocationSuggestions([])
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-[#406A56]/10 flex items-center gap-2"
                        >
                          <span className="text-gray-400">📍</span>
                          {s.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date field */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    📅 When was this taken?
                  </label>
                  <input
                    type="text"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    placeholder="e.g. Summer 2019, March 2020, Dec 25 2015..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleSaveBackstory}
                  disabled={(!locationInput.trim() && !dateInput.trim()) || isSavingBackstory}
                  className="mt-auto flex items-center justify-center gap-2 w-full py-3 bg-[#406A56] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a7a64] transition-colors"
                >
                  <Send size={16} />
                  {isSavingBackstory ? 'Saving...' : 'Save Details'}
                </button>

                <div className="text-center">
                  <span className="text-xs text-amber-600 font-medium">
                    <Sparkles size={12} className="inline mr-1" />
                    Earn +{config.xp} XP
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col p-6 pt-16">
              {/* Question recap */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block mb-2 ${
                  config.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                  config.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                  config.color === 'red' ? 'bg-rose-100 text-rose-700' :
                  config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {config.label}
                </span>
                <p className="text-gray-800 font-medium">{getPromptText(prompt)}</p>
              </div>

              {/* Photo thumbnail if exists */}
              {hasPhoto && (
                <div className="w-20 h-20 rounded-xl overflow-hidden mb-4">
                  <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Response input */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="flex-1 w-full p-4 bg-gray-50 rounded-2xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-gray-800 placeholder-gray-400"
                  autoFocus={isFlipped}
                />
                
                <div className="flex items-center justify-between mt-4">
                  <button className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <Mic size={20} />
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!responseText.trim() || isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-[#406A56] text-white rounded-full hover:bg-[#4a7a64] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                    {isSubmitting ? 'Saving...' : 'Save Memory'}
                  </button>
                </div>
              </div>

              {/* XP indicator */}
              <div className="text-center mt-4">
                <span className="text-xs text-amber-600 font-medium">
                  <Sparkles size={12} className="inline mr-1" />
                  Earn +{config.xp} XP
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>


    </motion.div>
  )
}
