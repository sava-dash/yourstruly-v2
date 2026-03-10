'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, MapPin, Users, BookOpen, Lightbulb, ChevronLeft, ChevronRight, Edit2, UserPlus, Check, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { GalleryMediaItem as MediaItem } from '@/types/gallery'

interface FaceTag {
  id: string
  contact_id: string | null
  contact_name: string | null
  is_confirmed: boolean
  box_left?: number
  box_top?: number
  box_width?: number
  box_height?: number
}

interface Contact {
  id: string
  full_name: string
}

interface RelatedItem {
  id: string
  type: 'memory' | 'wisdom'
  title: string
  snippet: string
}

interface Props {
  media: MediaItem | null
  allMedia: MediaItem[]
  onClose: () => void
  onNavigate: (media: MediaItem) => void
  onEdit: (media: MediaItem) => void
}

export default function PhotoPreviewPanel({ media, allMedia, onClose, onNavigate, onEdit }: Props) {
  const [faces, setFaces] = useState<FaceTag[]>([])
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [taggingMode, setTaggingMode] = useState(false)
  const [tagPosition, setTagPosition] = useState<{ x: number; y: number } | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [userProfile, setUserProfile] = useState<{ id: string; full_name: string } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const supabase = createClient()

  // Find current index for navigation
  const currentIndex = media ? allMedia.findIndex(m => m.id === media.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allMedia.length - 1

  // Load contacts for tagging
  useEffect(() => {
    const loadContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load user profile (for "Me" option)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', user.id)
        .single()
      
      if (profile) setUserProfile(profile)

      // Load contacts
      const { data: contactData } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('user_id', user.id)
        .order('full_name')

      if (contactData) setContacts(contactData)
    }
    loadContacts()
  }, [supabase])

  // Load faces and related items when media changes
  useEffect(() => {
    if (!media) return
    
    // Reset tagging state when media changes
    setTaggingMode(false)
    setTagPosition(null)
    setShowContactPicker(false)

    const loadData = async () => {
      setLoading(true)
      
      // Load face tags for this media
      const { data: faceData } = await supabase
        .from('memory_face_tags')
        .select('id, contact_id, is_confirmed, box_left, box_top, box_width, box_height, contact:contacts(full_name)')
        .eq('media_id', media.id)

      if (faceData) {
        setFaces(faceData.map(f => ({
          id: f.id,
          contact_id: f.contact_id,
          contact_name: (f.contact as any)?.full_name || null,
          is_confirmed: f.is_confirmed,
          // Convert from decimal (0-1) to percentage (0-100) for display
          box_left: f.box_left ? f.box_left * 100 : undefined,
          box_top: f.box_top ? f.box_top * 100 : undefined,
          box_width: f.box_width ? f.box_width * 100 : undefined,
          box_height: f.box_height ? f.box_height * 100 : undefined
        })))
      }

      // Load related memories (same memory_id or similar location/date)
      const related: RelatedItem[] = []
      
      if (media.memory) {
        related.push({
          id: media.memory.id,
          type: 'memory',
          title: media.memory.title || 'Untitled Memory',
          snippet: media.memory.location_name || ''
        })
      }

      // Search for wisdom entries that might reference this photo's date or location
      if (media.taken_at) {
        const year = new Date(media.taken_at).getFullYear()
        const { data: wisdomData } = await supabase
          .from('knowledge_entries')
          .select('id, prompt_text, response_text')
          .ilike('response_text', `%${year}%`)
          .limit(2)

        if (wisdomData) {
          wisdomData.forEach(w => {
            related.push({
              id: w.id,
              type: 'wisdom',
              title: w.prompt_text,
              snippet: w.response_text.slice(0, 80) + '...'
            })
          })
        }
      }

      setRelatedItems(related)
      setLoading(false)
    }

    loadData()
  }, [media, supabase])

  const handlePrev = () => {
    if (hasPrev) onNavigate(allMedia[currentIndex - 1])
  }

  const handleNext = () => {
    if (hasNext) onNavigate(allMedia[currentIndex + 1])
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showContactPicker) {
        if (e.key === 'Escape') {
          setShowContactPicker(false)
          setTagPosition(null)
        }
        return
      }
      if (e.key === 'ArrowLeft' && hasPrev) handlePrev()
      if (e.key === 'ArrowRight' && hasNext) handleNext()
      if (e.key === 'Escape') {
        if (taggingMode) {
          setTaggingMode(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPrev, hasNext, currentIndex, taggingMode, showContactPicker])

  // Handle click on image to place tag
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!taggingMode || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setTagPosition({ x, y })
    setShowContactPicker(true)
    setContactSearch('')
  }

  // Save face tag
  const handleSelectContact = async (contact: { id: string; full_name: string } | 'me') => {
    if (!media || !tagPosition) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isMe = contact === 'me'
    const contactId = isMe ? null : contact.id
    const profileId = isMe ? userProfile?.id : null
    const contactName = isMe ? userProfile?.full_name || 'Me' : contact.full_name

    console.log('Saving face tag:', { contactId, profileId, contactName, tagPosition })

    // Store as decimal (0-1) not percentage (0-100) due to column precision
    const boxLeft = (tagPosition.x - 5) / 100
    const boxTop = (tagPosition.y - 5) / 100
    const boxWidth = 0.1  // 10% as decimal
    const boxHeight = 0.1

    // Create face tag
    const { data: newTag, error } = await supabase
      .from('memory_face_tags')
      .insert({
        media_id: media.id,
        user_id: user.id,
        contact_id: contactId,
        profile_id: profileId,
        box_left: boxLeft,
        box_top: boxTop,
        box_width: boxWidth,
        box_height: boxHeight,
        is_confirmed: true,
        is_auto_detected: false
      })
      .select()
      .single()

    console.log('Face tag result:', { newTag, error })

    if (error) {
      console.error('Face tag error:', error)
      alert('Failed to save tag: ' + error.message)
    } else if (newTag) {
      setFaces([...faces, {
        id: newTag.id,
        contact_id: contactId,
        contact_name: contactName,
        is_confirmed: true,
        box_left: boxLeft * 100,  // Convert back to percentage for display
        box_top: boxTop * 100,
        box_width: boxWidth * 100,
        box_height: boxHeight * 100
      }])
    }

    setShowContactPicker(false)
    setTagPosition(null)
    setTaggingMode(false)
  }

  // Filter contacts by search
  const filteredContacts = contacts.filter(c => 
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  )

  if (!media) return null

  const locationName = media.memory?.location_name || null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Navigation Arrows */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <ChevronLeft size={28} className="text-white" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 md:right-[340px]"
          >
            <ChevronRight size={28} className="text-white" />
          </button>
        )}

        {/* Close button on photo side (mobile + backup) */}
        <button
          onClick={onClose}
          className="absolute top-20 right-4 md:right-[340px] p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
        >
          <X size={24} className="text-white" />
        </button>

        {/* Tagging Mode Banner */}
        {taggingMode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-[#406A56] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            Click on a face to tag • Press ESC to cancel
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-full w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
          {/* Photo */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            <div className="relative">
              <motion.img
                ref={imageRef}
                key={media.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={media.file_url}
                alt=""
                onClick={handleImageClick}
                className={`max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl ${
                  taggingMode ? 'cursor-crosshair' : ''
                }`}
              />
              
              {/* Existing face tags */}
              {faces.filter(f => f.box_left !== undefined).map(face => (
                <div
                  key={face.id}
                  className="absolute border-2 border-[#406A56] rounded-lg pointer-events-none"
                  style={{
                    left: `${face.box_left}%`,
                    top: `${face.box_top}%`,
                    width: `${face.box_width}%`,
                    height: `${face.box_height}%`
                  }}
                >
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#406A56] text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    {face.contact_name || 'Unknown'}
                  </span>
                </div>
              ))}

              {/* Current tag position */}
              {tagPosition && (
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-amber-500 rounded-full animate-pulse"
                  style={{ left: `${tagPosition.x}%`, top: `${tagPosition.y}%` }}
                />
              )}
            </div>

            {/* Contact Picker Popup */}
            {showContactPicker && tagPosition && (
              <div 
                className="absolute z-30 bg-white rounded-xl shadow-2xl w-64 max-h-80 overflow-hidden"
                style={{ 
                  left: `calc(50% + ${tagPosition.x - 50}px)`,
                  top: `calc(50% + ${tagPosition.y}px)`
                }}
              >
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      aria-label="Search" placeholder="Search contacts..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#406A56]"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {/* Me option */}
                  {userProfile && (
                    <button
                      onClick={() => handleSelectContact('me')}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#406A56]/10 flex items-center gap-3 border-b border-gray-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#406A56] flex items-center justify-center text-white text-sm font-medium">
                        Me
                      </div>
                      <span className="font-medium text-[#1a1a1a]">{userProfile.full_name} (Me)</span>
                    </button>
                  )}
                  {/* Contacts */}
                  {filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#406A56]/10 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
                        {contact.full_name.charAt(0)}
                      </div>
                      <span className="text-[#1a1a1a]">{contact.full_name}</span>
                    </button>
                  ))}
                  {filteredContacts.length === 0 && contactSearch && (
                    <p className="px-4 py-3 text-sm text-gray-500">No contacts found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info Panel - starts below nav */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 bg-white mt-16 rounded-tl-2xl overflow-y-auto hidden md:block"
            style={{ maxHeight: 'calc(100vh - 64px)' }}
          >
            <div className="p-5">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-[#1a1a1a]">Photo Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(media)}
                    className="p-2 rounded-lg bg-[#406A56]/10 hover:bg-[#406A56]/20 transition-colors"
                    title="Edit date & location"
                  >
                    <Edit2 size={16} className="text-[#406A56]" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Close"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div className="mb-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a] mb-1">
                  <Calendar size={14} className="text-[#406A56]" />
                  Date
                </div>
                {media.taken_at ? (
                  <p className="text-[#333] ml-5">
                    {new Date(media.taken_at).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                ) : (
                  <p className="text-[#888] ml-5 italic">No date — click edit to add</p>
                )}
              </div>

              {/* Location */}
              <div className="mb-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a] mb-1">
                  <MapPin size={14} className="text-[#406A56]" />
                  Location
                </div>
                {locationName ? (
                  <p className="text-[#333] ml-5">{locationName}</p>
                ) : (
                  <p className="text-[#888] ml-5 italic">No location — click edit to add</p>
                )}
              </div>

              {/* People */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a]">
                    <Users size={14} className="text-[#406A56]" />
                    People
                  </div>
                  <button
                    onClick={() => setTaggingMode(!taggingMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      taggingMode 
                        ? 'bg-[#406A56] text-white' 
                        : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
                    }`}
                  >
                    <UserPlus size={12} />
                    {taggingMode ? 'Cancel' : 'Tag'}
                  </button>
                </div>
                {faces.length > 0 ? (
                  <div className="flex flex-wrap gap-2 ml-5">
                    {faces.map(face => (
                      <span
                        key={face.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          face.is_confirmed 
                            ? 'bg-[#406A56]/10 text-[#406A56]' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {face.contact_name || 'Unknown'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#888] ml-5 italic text-sm">No people tagged</p>
                )}
              </div>

              {/* Divider */}
              <hr className="my-5 border-gray-200" />

              {/* Related Memories & Wisdom */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#1a1a1a] mb-3">
                  <BookOpen size={14} className="text-[#406A56]" />
                  Appears In
                </div>
                
                {relatedItems.length > 0 ? (
                  <div className="space-y-2">
                    {relatedItems.map(item => (
                      <Link
                        key={item.id}
                        href={item.type === 'memory' ? `/dashboard/memories/${item.id}` : `/dashboard/wisdom/${item.id}`}
                        className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'memory' ? (
                            <BookOpen size={12} className="text-[#406A56]" />
                          ) : (
                            <Lightbulb size={12} className="text-amber-500" />
                          )}
                          <span className="text-xs font-medium text-[#666] uppercase">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[#1a1a1a] line-clamp-1">
                          {item.title}
                        </p>
                        {item.snippet && (
                          <p className="text-xs text-[#666] line-clamp-2 mt-0.5">
                            {item.snippet}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#888] text-sm italic">
                    Not linked to any memories yet
                  </p>
                )}
              </div>

              {/* Photo count */}
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-[#888]">
                  {currentIndex + 1} of {allMedia.length} photos
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
