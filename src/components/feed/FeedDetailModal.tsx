'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Calendar, Users, Camera, Mic, Tag, Edit2, Trash2, ChevronLeft, ChevronRight, Play, Pause, Upload, Check, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Lazy load map to avoid SSR issues
const MiniMap = dynamic(() => import('./MiniMap'), { ssr: false })

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  thumbnail?: string
  audio_url?: string
  link: string
  metadata?: {
    location?: string
    lat?: number
    lng?: number
    category?: string
    contactName?: string
    recipient_name?: string
    delivery_date?: string
    memoryId?: string
    wisdomId?: string
  }
}

interface FeedDetailModalProps {
  activity: ActivityItem | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: (activity: ActivityItem) => void
}

// Brand colors
const BRAND_COLORS = {
  green: '#406A56',
  yellow: '#D9C61A',
  blue: '#8DACAB',
  red: '#C35F33',
  purple: '#4A3552',
  offWhite: '#F2F1E5',
}

const TYPE_COLORS: Record<string, string> = {
  memory_created: BRAND_COLORS.red,
  memory_shared: BRAND_COLORS.red,
  wisdom_created: BRAND_COLORS.purple,
  wisdom_shared: BRAND_COLORS.purple,
  interview_response: BRAND_COLORS.blue,
  photos_uploaded: BRAND_COLORS.yellow,
  postscript_created: BRAND_COLORS.green,
  contact_added: BRAND_COLORS.green,
}

export function FeedDetailModal({ activity, isOpen, onClose, onUpdate }: FeedDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedDate, setEditedDate] = useState('')
  const [editedLocation, setEditedLocation] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [mediaItems, setMediaItems] = useState<any[]>([])
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [taggedPeople, setTaggedPeople] = useState<any[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const accentColor = activity ? (TYPE_COLORS[activity.type] || BRAND_COLORS.green) : BRAND_COLORS.green

  // Load full details when modal opens
  useEffect(() => {
    if (isOpen && activity) {
      setEditedTitle(activity.title || '')
      setEditedDescription(activity.description || '')
      setEditedDate(activity.timestamp?.split('T')[0] || '')
      setEditedLocation(activity.metadata?.location || '')
      loadFullDetails()
      loadContacts()
    }
  }, [isOpen, activity])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const loadFullDetails = async () => {
    if (!activity) return
    
    // Load media for memories
    if (activity.type === 'memory_created' && activity.metadata?.memoryId) {
      try {
        const res = await fetch(`/api/memories/${activity.metadata.memoryId}`)
        if (res.ok) {
          const data = await res.json()
          setMediaItems(data.media || [])
          setTaggedPeople(data.tagged_contacts || [])
        }
      } catch (err) {
        console.error('Error loading memory details:', err)
      }
    }
  }

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts?limit=100')
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts || [])
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
    }
  }

  const handleSave = async () => {
    if (!activity) return
    setIsSaving(true)
    
    try {
      const endpoint = activity.type.includes('wisdom') 
        ? `/api/wisdom/${activity.metadata?.wisdomId}`
        : `/api/memories/${activity.metadata?.memoryId}`
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          description: editedDescription,
          date: editedDate,
          location_name: editedLocation,
        }),
      })

      if (res.ok) {
        setIsEditing(false)
        if (onUpdate) {
          onUpdate({
            ...activity,
            title: editedTitle,
            description: editedDescription,
            timestamp: editedDate,
            metadata: {
              ...activity.metadata,
              location: editedLocation,
            },
          })
        }
      }
    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !activity?.metadata?.memoryId) return

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    formData.append('memoryId', activity.metadata.memoryId)

    try {
      const res = await fetch('/api/memories/upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        loadFullDetails() // Reload media
      }
    } catch (err) {
      console.error('Error uploading:', err)
    }
  }

  const handleTagPerson = async (contactId: string) => {
    if (!activity?.metadata?.memoryId) return
    
    try {
      const res = await fetch(`/api/memories/${activity.metadata.memoryId}/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      })
      if (res.ok) {
        loadFullDetails()
      }
    } catch (err) {
      console.error('Error tagging:', err)
    }
  }

  const toggleAudio = () => {
    if (!audioRef.current) {
      if (activity?.audio_url) {
        audioRef.current = new Audio(activity.audio_url)
        audioRef.current.onended = () => setIsPlaying(false)
      }
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  if (!isOpen || !activity) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '24px',
            border: '4px solid #fff',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: accentColor,
            }}>
              {activity.type.includes('memory') && '📖 Memory'}
              {activity.type.includes('wisdom') && '🧠 Wisdom'}
              {activity.type.includes('interview') && '💬 Interview'}
              {activity.type.includes('photo') && '📷 Photos'}
              {activity.type.includes('postscript') && '🎁 PostScript'}
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#f5f5f5',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Image Gallery */}
            {(activity.thumbnail || mediaItems.length > 0) && (
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#000',
                }}>
                  <img
                    src={mediaItems[currentMediaIndex]?.file_url || activity.thumbnail}
                    alt={activity.title}
                    style={{
                      width: '100%',
                      height: '300px',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                
                {/* Gallery Navigation */}
                {mediaItems.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentMediaIndex(i => Math.max(0, i - 1))}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        opacity: currentMediaIndex === 0 ? 0.5 : 1,
                      }}
                      disabled={currentMediaIndex === 0}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setCurrentMediaIndex(i => Math.min(mediaItems.length - 1, i + 1))}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        opacity: currentMediaIndex === mediaItems.length - 1 ? 0.5 : 1,
                      }}
                      disabled={currentMediaIndex === mediaItems.length - 1}
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {currentMediaIndex + 1} / {mediaItems.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Title & Description */}
            <div style={{ marginBottom: '20px' }}>
              {isEditing ? (
                <>
                  <input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '20px',
                      fontWeight: '700',
                      border: '2px solid #eee',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                    }}
                    placeholder="Title"
                  />
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      border: '2px solid #eee',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                    placeholder="Description"
                  />
                </>
              ) : (
                <>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1a1a1a',
                    margin: '0 0 8px 0',
                  }}>
                    {activity.title}
                  </h2>
                  {activity.description && (
                    <p style={{
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.5',
                      margin: 0,
                    }}>
                      {activity.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Category Badge */}
            {activity.metadata?.category && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: accentColor,
                background: `${accentColor}15`,
                padding: '6px 12px',
                borderRadius: '8px',
                marginBottom: '16px',
                textTransform: 'capitalize',
              }}>
                {activity.metadata.category.replace(/_/g, ' ')}
              </div>
            )}

            {/* Audio Player */}
            {activity.audio_url && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f8f8',
                borderRadius: '12px',
                marginBottom: '16px',
              }}>
                <button
                  onClick={toggleAudio}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: accentColor,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>Voice Recording</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>Tap to {isPlaying ? 'pause' : 'play'}</div>
                </div>
                <Mic size={18} color={accentColor} />
              </div>
            )}

            {/* Date & Location */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {/* Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Calendar size={16} color="#888" />
                {isEditing ? (
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    style={{
                      border: '2px solid #eee',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '13px',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {format(new Date(activity.timestamp), 'MMMM d, yyyy')}
                  </span>
                )}
              </div>

              {/* Location */}
              {(activity.metadata?.location || isEditing) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <MapPin size={16} color="#888" style={{ marginTop: '2px' }} />
                  {isEditing ? (
                    <input
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      placeholder="Location"
                      style={{
                        flex: 1,
                        border: '2px solid #eee',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '13px',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {activity.metadata?.location}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Mini Map */}
            {activity.metadata?.lat && activity.metadata?.lng && !isEditing && (
              <div style={{
                borderRadius: '12px',
                overflow: 'hidden',
                height: '150px',
                marginBottom: '16px',
                border: '1px solid #eee',
              }}>
                <MiniMap
                  lat={activity.metadata.lat}
                  lng={activity.metadata.lng}
                  location={activity.metadata.location || ''}
                />
              </div>
            )}

            {/* Tagged People */}
            {taggedPeople.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Tagged People
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {taggedPeople.map((person: any) => (
                    <div
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: '#f5f5f5',
                        borderRadius: '20px',
                        fontSize: '13px',
                      }}
                    >
                      <Users size={14} color="#666" />
                      {person.full_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 20px',
            borderTop: '1px solid #eee',
            background: '#fafafa',
          }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: accentColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#555',
                  }}
                >
                  <Camera size={14} />
                  Photo
                </button>
                <button
                  onClick={() => {/* Open tag modal */}}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#555',
                  }}
                >
                  <Tag size={14} />
                  Tag
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: accentColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
