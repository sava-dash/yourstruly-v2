'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Check, X, Sparkles, Plus, Search, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Face {
  id: string
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  age?: number
  gender?: string
  expression?: string
  tagged: boolean
  contact?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  suggestions: Array<{
    contact: {
      id: string
      full_name: string
      avatar_url?: string
    }
    confidence: number
  }>
}

interface Contact {
  id: string
  full_name: string
  avatar_url?: string
}

interface FaceTaggerProps {
  mediaId: string
  imageUrl: string
  onXPEarned?: (amount: number, action: string) => void
}

export default function FaceTagger({ mediaId, imageUrl, onXPEarned }: FaceTaggerProps) {
  const [faces, setFaces] = useState<Face[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFace, setSelectedFace] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [manualTagMode, setManualTagMode] = useState(false)
  const [manualTagPosition, setManualTagPosition] = useState<{x: number, y: number} | null>(null)
  const [isCreatingContact, setIsCreatingContact] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadFacesOrDetect()
    loadContacts()
  }, [mediaId])

  const loadFacesOrDetect = async () => {
    // First try to load existing faces (including manual tags)
    const res = await fetch(`/api/media/${mediaId}/faces`)
    if (res.ok) {
      const data = await res.json()
      if (data.faces && data.faces.length > 0) {
        setFaces(data.faces)
        setLoading(false)
        return
      }
    }
    // Only auto-detect on first visit — skip if detection was already attempted
    const detectionKey = `face-detect-${mediaId}`
    if (sessionStorage.getItem(detectionKey)) {
      // Detection was already run this session, just show manual tagging mode
      setLoading(false)
      return
    }
    sessionStorage.setItem(detectionKey, '1')
    await detectFaces()
  }

  const detectFaces = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/media/${mediaId}/detect-faces`, { method: 'POST' })
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json') && res.ok) {
        await loadFaces()
      }
    } catch (err) {
      console.error('Face detection error:', err)
    }
    setLoading(false)
  }

  const loadFaces = async () => {
    const res = await fetch(`/api/media/${mediaId}/faces`)
    if (res.ok) {
      const data = await res.json()
      setFaces(data.faces || [])
    }
    setLoading(false)
  }

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url')
      .eq('user_id', user.id)
      .order('full_name')
    setContacts(data || [])
  }

  const tagFace = async (faceId: string, contactId: string) => {
    const res = await fetch(`/api/media/${mediaId}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceId, contactId }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.xpAwarded && onXPEarned) onXPEarned(data.xpAwarded, 'Tagged a person')
      setFaces(prev => prev.map(f => {
        if (f.id === faceId) {
          const contact = contacts.find(c => c.id === contactId)
          return { ...f, tagged: true, contact: contact ? { id: contact.id, full_name: contact.full_name, avatar_url: contact.avatar_url } : f.contact, suggestions: [] }
        }
        return f
      }))
      closePicker()
    }
  }

  const untagFace = async (faceId: string) => {
    const res = await fetch(`/api/media/${mediaId}/tag`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceId }),
    })
    if (res.ok) await loadFaces()
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.face-box') || (e.target as HTMLElement).closest('.picker-popup')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setManualTagPosition({ x, y })
    setSelectedFace(null)
    setManualTagMode(true)
    setSearchQuery('')
  }

  const createManualTag = async (contactId: string) => {
    if (!manualTagPosition) return
    try {
      const res = await fetch(`/api/media/${mediaId}/faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box_left: Math.max(0, manualTagPosition.x / 100 - 0.05),
          box_top: Math.max(0, manualTagPosition.y / 100 - 0.05),
          box_width: 0.1,
          box_height: 0.1,
          contact_id: contactId,
          is_manual: true,
        }),
      })
      if (res.ok) {
        if (onXPEarned) onXPEarned(5, 'Tagged a person')
        await loadFaces()
      }
    } catch (err) {
      console.error('Error creating manual tag:', err)
    }
    closePicker()
  }

  const createContactAndTag = async (name: string, faceId?: string) => {
    if (!name.trim() || isCreatingContact) return
    setIsCreatingContact(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({ user_id: user.id, full_name: name.trim() })
        .select('id, full_name, avatar_url')
        .single()
      if (!error && newContact) {
        setContacts(prev => [...prev, newContact].sort((a, b) => a.full_name.localeCompare(b.full_name)))
        if (faceId) {
          await tagFace(faceId, newContact.id)
        } else if (manualTagMode) {
          await createManualTag(newContact.id)
        }
      }
    } catch {} finally {
      setIsCreatingContact(false)
    }
  }

  const closePicker = () => {
    setSelectedFace(null)
    setManualTagMode(false)
    setManualTagPosition(null)
    setSearchQuery('')
  }

  // Picker position — near the selected face or manual tap position
  const getPickerPosition = () => {
    if (manualTagMode && manualTagPosition) {
      return { x: manualTagPosition.x, y: manualTagPosition.y }
    }
    if (selectedFace) {
      const face = faces.find(f => f.id === selectedFace)
      if (face) {
        return {
          x: (face.boundingBox.x + face.boundingBox.width / 2) * 100,
          y: (face.boundingBox.y + face.boundingBox.height) * 100,
        }
      }
    }
    return null
  }

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const showPicker = selectedFace || (manualTagMode && manualTagPosition)
  const pickerPos = getPickerPosition()
  const activeFace = selectedFace ? faces.find(f => f.id === selectedFace) : null
  const taggedFaces = faces.filter(f => f.tagged)
  const untaggedFaces = faces.filter(f => !f.tagged)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Photo with face boxes + picker overlay */}
      <div 
        className="relative rounded-xl overflow-hidden bg-black cursor-crosshair"
        onClick={handleImageClick}
      >
        <img src={imageUrl} alt="" className="w-full" />
        
        {/* Manual tag marker */}
        {manualTagPosition && (
          <div
            className="absolute w-8 h-8 border-2 border-amber-500 rounded-full bg-amber-500/30 -translate-x-1/2 -translate-y-1/2 animate-pulse pointer-events-none"
            style={{ left: `${manualTagPosition.x}%`, top: `${manualTagPosition.y}%` }}
          />
        )}
        
        {/* Face bounding boxes */}
        {faces.map(face => (
          <div
            key={face.id}
            className={`face-box absolute border-2 rounded cursor-pointer transition-all ${
              face.tagged 
                ? 'border-green-500 bg-green-500/10' 
                : selectedFace === face.id
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'border-white/50 hover:border-amber-400'
            }`}
            style={{
              left: `${face.boundingBox.x * 100}%`,
              top: `${face.boundingBox.y * 100}%`,
              width: `${face.boundingBox.width * 100}%`,
              height: `${face.boundingBox.height * 100}%`,
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (face.tagged) return
              setManualTagMode(false)
              setManualTagPosition(null)
              setSelectedFace(face.id === selectedFace ? null : face.id)
              setSearchQuery('')
            }}
          >
            {/* Tag label + delete */}
            {face.tagged && face.contact && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1 z-10">
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                  {face.contact.full_name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); untagFace(face.id) }}
                  className="w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            )}
            
            {/* Suggestion sparkle */}
            {!face.tagged && face.suggestions?.length > 0 && (
              <div className="absolute -top-2 -right-2">
                <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                  <Sparkles size={10} className="text-white" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* === PICKER POPUP — positioned ON the photo === */}
        <AnimatePresence>
          {showPicker && pickerPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="picker-popup absolute z-30 bg-[#1e1e1e] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
              style={{
                width: 220,
                maxHeight: 300,
                left: `${Math.min(Math.max(pickerPos.x, 25), 75)}%`,
                top: `${Math.min(pickerPos.y + 5, 60)}%`,
                transform: 'translateX(-50%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with close */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                <span className="text-xs font-medium text-white/60">
                  {activeFace ? 'Who is this?' : 'Tag someone'}
                </span>
                <button
                  onClick={closePicker}
                  className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* AI Suggestions (if face has them) */}
              {activeFace && activeFace.suggestions?.length > 0 && !searchQuery && (
                <div className="px-2 py-1.5 border-b border-white/8">
                  <p className="text-[10px] text-amber-500 flex items-center gap-1 px-1 mb-1">
                    <Sparkles size={10} /> Suggested
                  </p>
                  {activeFace.suggestions.map(s => (
                    <button
                      key={s.contact.id}
                      onClick={() => tagFace(activeFace.id, s.contact.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/8 rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.contact.avatar_url ? (
                          <img src={s.contact.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={12} className="text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white text-xs truncate">{s.contact.full_name}</p>
                        <p className="text-white/40 text-[10px]">{Math.round(s.confidence)}% match</p>
                      </div>
                      <Check size={12} className="text-green-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="px-2 py-1.5">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    autoFocus
                  />
                </div>
              </div>

              {/* Contact list */}
              <div className="max-h-[160px] overflow-y-auto px-1 pb-1">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      if (activeFace) tagFace(activeFace.id, contact.id)
                      else if (manualTagMode) createManualTag(contact.id)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/8 rounded-lg transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/50 text-[10px] font-medium">{contact.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-white text-xs truncate">{contact.full_name}</span>
                  </button>
                ))}

                {/* No results — create new */}
                {filteredContacts.length === 0 && searchQuery.length >= 2 && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => createContactAndTag(searchQuery, activeFace?.id)}
                      disabled={isCreatingContact}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-[11px] hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      <UserPlus size={12} /> Add &quot;{searchQuery}&quot;
                    </button>
                  </div>
                )}
                {filteredContacts.length === 0 && searchQuery.length < 2 && (
                  <p className="text-center text-white/30 text-[11px] py-2">Type to search</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      {faces.length > 0 && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-white/40">
            {taggedFaces.length} of {faces.length} tagged
          </span>
          {untaggedFaces.length > 0 && (
            <span className="text-amber-500">+{untaggedFaces.length * 5} XP</span>
          )}
        </div>
      )}

      {/* Tagged people pills */}
      {taggedFaces.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {taggedFaces.map(face => (
            <div key={face.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/8 rounded-full group">
              <div className="w-4 h-4 rounded-full bg-green-600/30 flex items-center justify-center overflow-hidden">
                {face.contact?.avatar_url ? (
                  <img src={face.contact.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={8} className="text-green-500" />
                )}
              </div>
              <span className="text-white text-[11px]">{face.contact?.full_name}</span>
              <button
                onClick={() => untagFace(face.id)}
                className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No faces — hint */}
      {faces.length === 0 && (
        <div className="text-center py-4">
          <User size={24} className="mx-auto mb-2 text-white/20" />
          <p className="text-white/30 text-xs">Click on the photo to tag someone</p>
        </div>
      )}
    </div>
  )
}
