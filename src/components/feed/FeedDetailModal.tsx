'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Calendar, Users, Camera, Mic, Tag, Edit2, Trash2, ChevronLeft, ChevronRight, Play, Pause, Upload, Check, Loader2, Square, Video, Share2, Heart } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Lazy load map and heavy components to avoid SSR issues
const MiniMap = dynamic(() => import('./MiniMap'), { ssr: false })
const ShareMemoryModal = dynamic(() => import('@/components/memories/ShareMemoryModal'), { ssr: false })
const MemoryContributions = dynamic(() => import('@/components/memories/MemoryContributions'), { ssr: false })

// Location Autocomplete Component
function LocationAutocomplete({ value, onChange, placeholder }: { 
  value: string
  onChange: (value: string) => void
  placeholder?: string 
}) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    
    setIsLoading(true)
    try {
      // Use Mapbox Geocoding API
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=place,locality,neighborhood,address&limit=5`
      )
      const data = await res.json()
      setSuggestions(data.features || [])
    } catch (err) {
      console.error('Location search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Debounce search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(newValue), 300)
    setShowSuggestions(true)
  }

  const selectSuggestion = (suggestion: any) => {
    onChange(suggestion.place_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        value={value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        style={{
          width: '100%',
          border: '2px solid #ddd',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '14px',
          color: '#1a1a1a',
          background: '#fff',
          outline: 'none',
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          marginBottom: '4px',
          background: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #eee',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => selectSuggestion(s)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#333',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
              }}
            >
              <div style={{ fontWeight: '500' }}>{s.text}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                {s.place_name}
              </div>
            </button>
          ))}
        </div>
      )}
      {isLoading && (
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          <Loader2 size={14} className="animate-spin" color="#888" />
        </div>
      )}
    </div>
  )
}

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
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [isTaggingMode, setIsTaggingMode] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<any[]>([])
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null)
  const [faceDropdownPosition, setFaceDropdownPosition] = useState<{x: number, y: number} | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Share & Social state
  const [showShareModal, setShowShareModal] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  // Voice/Video recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const speechRecRef = useRef<any>(null)
  const [interimText, setInterimText] = useState('')
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const accentColor = activity ? (TYPE_COLORS[activity.type] || BRAND_COLORS.green) : BRAND_COLORS.green

  // Load full details when modal opens
  useEffect(() => {
    if (isOpen && activity) {
      // Reset to view mode when opening
      setIsEditing(false)
      setIsTaggingMode(false)
      setIsFullscreen(false)
      setShowShareModal(false)
      setSelectedFaceIndex(null)
      setFaceDropdownPosition(null)
      
      // Set initial values for edit form
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
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
      // Arrow keys for fullscreen carousel
      if (isFullscreen && mediaItems.length > 1) {
        if (e.key === 'ArrowLeft') setCurrentMediaIndex(i => Math.max(0, i - 1))
        if (e.key === 'ArrowRight') setCurrentMediaIndex(i => Math.min(mediaItems.length - 1, i + 1))
      }
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
    
    const memoryId = activity.metadata?.memoryId
    if (!memoryId) {
      console.log('No memoryId in activity metadata')
      return
    }
    
    // Load media for all memory-related types
    if (activity.type === 'memory_created' || activity.type === 'photos_uploaded' || activity.type === 'memory_shared') {
      try {
        console.log('Loading memory details for:', memoryId)
        const res = await fetch(`/api/memories/${memoryId}`)
        
        if (res.ok) {
          const data = await res.json()
          console.log('Memory data loaded:', {
            mediaCount: data.media?.length || 0,
            taggedCount: data.tagged_contacts?.length || 0
          })
          
          setMediaItems(data.media || [])
          setTaggedPeople(data.tagged_contacts || [])
          setIsFavorite(data.is_favorite || false)
          
          // Pre-load faces for first media item (for when user clicks Tag)
          if (data.media?.[0]?.id) {
            loadFacesForMedia(data.media[0].id)
          }
        } else {
          console.error('Failed to load memory:', res.status, await res.text())
        }
      } catch (err) {
        console.error('Error loading memory details:', err)
      }
    }
  }
  
  const loadFacesForMedia = async (mediaId: string) => {
    if (!mediaId) return
    try {
      const res = await fetch(`/api/media/${mediaId}/faces`)
      if (res.ok) {
        const data = await res.json()
        console.log('Loaded faces for media:', mediaId, data.faces?.length || 0)
        setDetectedFaces(data.faces || [])
      }
    } catch (err) {
      console.error('Error loading faces:', err)
      setDetectedFaces([])
    }
  }
  
  const detectFaces = async () => {
    const media = mediaItems[currentMediaIndex]
    
    // If no media items loaded yet but we have a thumbnail, we can't detect faces
    if (!media?.id) {
      console.log('No media ID available for face detection')
      setDetectedFaces([])
      return
    }
    
    console.log('Detecting faces for media:', media.id)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout
      
      const res = await fetch(`/api/media/${media.id}/detect-faces`, { 
        method: 'POST',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const data = await res.json()
      console.log('Face detection result:', data)
      
      if (data.faces && Array.isArray(data.faces)) {
        setDetectedFaces(data.faces)
      } else {
        setDetectedFaces([])
      }
    } catch (err: any) {
      console.error('Error detecting faces:', err?.message || err)
      setDetectedFaces([])
    }
  }
  
  const handleFaceClick = (faceIndex: number, event: React.MouseEvent) => {
    if (!isTaggingMode) return
    
    const rect = imageContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setSelectedFaceIndex(faceIndex)
    setFaceDropdownPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
  }
  
  const handleTagFace = async (contactId: string) => {
    if (selectedFaceIndex === null) return
    
    const media = mediaItems[currentMediaIndex]
    const contact = contacts.find(c => c.id === contactId)
    
    // If no specific face selected (-1), create a manual tag or tag the memory
    if (selectedFaceIndex === -1) {
      if (media?.id) {
        // Create manual face tag at click position
        try {
          const clickX = faceDropdownPosition ? faceDropdownPosition.x / (imageContainerRef.current?.clientWidth || 400) : 0.5
          const clickY = faceDropdownPosition ? faceDropdownPosition.y / (imageContainerRef.current?.clientHeight || 300) : 0.5
          
          const res = await fetch(`/api/media/${media.id}/faces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactId, x: clickX, y: clickY })
          })
          
          if (res.ok) {
            // Reload faces to show the new tag
            loadFacesForMedia(media.id)
          }
        } catch (err) {
          console.error('Error creating face tag:', err)
        }
      } else if (activity?.metadata?.memoryId) {
        // Fall back to tagging the memory itself
        await handleTagPerson(contactId)
      }
      setSelectedFaceIndex(null)
      setFaceDropdownPosition(null)
      return
    }
    
    const face = detectedFaces[selectedFaceIndex]
    if (!face || !media) return
    
    try {
      // Use faceId if available, otherwise use faceIndex
      const res = await fetch(`/api/media/${media.id}/faces`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceId: face.id,
          faceIndex: selectedFaceIndex,
          contactId,
          boundingBox: face.boundingBox
        })
      })
      
      if (res.ok) {
        // Update local state
        setDetectedFaces(prev => prev.map((f, i) => 
          i === selectedFaceIndex ? { ...f, contact_id: contactId, contact_name: contact?.full_name } : f
        ))
        setSelectedFaceIndex(null)
        setFaceDropdownPosition(null)
      }
    } catch (err) {
      console.error('Error tagging face:', err)
    }
  }

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts?limit=100')
      if (res.ok) {
        const data = await res.json()
        // API returns { name } but we need { full_name } — normalize
        const normalized = (data.contacts || []).map((c: any) => ({
          ...c,
          full_name: c.full_name || c.name || 'Unknown',
        }))
        setContacts(normalized)
      }
    } catch (err) {
      console.error('Error loading contacts:', err)
    }
  }

  const toggleFavorite = async () => {
    if (!activity?.metadata?.memoryId) return
    try {
      const res = await fetch(`/api/memories/${activity.metadata.memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !isFavorite }),
      })
      if (res.ok) setIsFavorite(prev => !prev)
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  const handleSave = async () => {
    if (!activity) return
    setIsSaving(true)
    
    try {
      const endpoint = activity.type.includes('wisdom') 
        ? `/api/wisdom/${activity.metadata?.wisdomId}`
        : `/api/memories/${activity.metadata?.memoryId}`
      
      // Voice/video recordings are saved as memory_media on record,
      // so we don't need to put URLs in the memory record
      const patchBody: Record<string, any> = {
        title: editedTitle,
        description: editedDescription,
        date: editedDate,
        location_name: editedLocation,
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })

      if (res.ok) {
        setIsEditing(false)
        const updatedActivity = {
          ...activity,
          title: editedTitle,
          description: editedDescription,
          timestamp: editedDate,
          audio_url: recordedAudioUrl || activity.audio_url,
          metadata: {
            ...activity.metadata,
            location: editedLocation,
          },
        }
        if (onUpdate) onUpdate(updatedActivity)
        // Reset recorded media
        setRecordedAudioUrl(null)
        setRecordedVideoUrl(null)
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

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        
        const res = await fetch(`/api/memories/${activity.metadata.memoryId}/media`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          console.error('Upload failed:', await res.text())
        }
      }
      loadFullDetails() // Reload media
    } catch (err) {
      console.error('Error uploading:', err)
    }
  }

  // Connect video stream to preview element
  useEffect(() => {
    if (videoStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = videoStream
      videoPreviewRef.current.play().catch(() => {})
    }
  }, [videoStream, isRecordingVideo])

  // Cleanup recordings on unmount/close
  useEffect(() => {
    if (!isOpen) {
      if (voiceRecorderRef.current?.state === 'recording') voiceRecorderRef.current.stop()
      if (videoRecorderRef.current?.state === 'recording') videoRecorderRef.current.stop()
      if (speechRecRef.current) { try { speechRecRef.current.stop() } catch {} }
      if (videoStream) videoStream.getTracks().forEach(t => t.stop())
      setIsRecordingVoice(false)
      setIsRecordingVideo(false)
      setVideoStream(null)
      setInterimText('')
    }
  }, [isOpen])

  // Upload recording blob as memory_media via API
  const uploadRecordingAsMedia = async (blob: Blob, filename: string): Promise<string | null> => {
    if (!activity?.metadata?.memoryId) return null
    try {
      const formData = new FormData()
      formData.append('file', blob, filename)
      const res = await fetch(`/api/memories/${activity.metadata.memoryId}/media`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        return data.media?.file_url || null
      }
      console.error('Recording upload failed:', await res.text())
    } catch (err) {
      console.error('Recording upload error:', err)
    }
    return null
  }

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      voiceChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' })

        if (speechRecRef.current) {
          try { speechRecRef.current.stop() } catch {}
          speechRecRef.current = null
        }
        setInterimText('')
        setIsTranscribing(true)

        // Upload as memory_media (supports multiples)
        const url = await uploadRecordingAsMedia(audioBlob, `voice-${Date.now()}.webm`)
        if (url) {
          setRecordedAudioUrl(url)
          // Reload media to show the new recording
          loadFullDetails()
        }

        // Transcribe via API and append to description
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          const transcribedText = data.transcription || data.text || ''
          if (transcribedText) {
            setEditedDescription(prev => prev ? `${prev} ${transcribedText}` : transcribedText)
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      voiceRecorderRef.current = recorder
      setIsRecordingVoice(true)

      // Live interim transcription via Web Speech API
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'
          recognition.onresult = (event: any) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (!event.results[i].isFinal) interim += event.results[i][0].transcript
            }
            setInterimText(interim)
          }
          recognition.onerror = () => {}
          recognition.start()
          speechRecRef.current = recognition
        }
      } catch {}
    } catch (err) {
      console.error('Mic access failed:', err)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceRecorderRef.current?.state !== 'inactive') voiceRecorderRef.current?.stop()
    setIsRecordingVoice(false)
  }

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { max: 1280 }, height: { max: 720 } },
        audio: true,
      })
      setVideoStream(stream)

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
      videoChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setVideoStream(null)
        setIsTranscribing(true)

        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })

        // Upload as memory_media (supports multiples)
        const url = await uploadRecordingAsMedia(videoBlob, `video-${Date.now()}.webm`)
        if (url) {
          setRecordedVideoUrl(url)
          loadFullDetails()
        }

        // Transcribe audio from video
        const formData = new FormData()
        formData.append('audio', videoBlob, 'video-recording.webm')
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          const transcribedText = data.transcription || data.text || ''
          if (transcribedText) {
            setEditedDescription(prev => prev ? `${prev} ${transcribedText}` : transcribedText)
          }
        } catch (err) {
          console.error('Video transcription failed:', err)
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      videoRecorderRef.current = recorder
      setIsRecordingVideo(true)
    } catch (err) {
      console.error('Camera access failed:', err)
    }
  }

  const stopVideoRecording = () => {
    if (videoRecorderRef.current?.state !== 'inactive') videoRecorderRef.current?.stop()
    setIsRecordingVideo(false)
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Favorite */}
              {(activity.metadata?.memoryId || activity.metadata?.wisdomId) && (
                <button
                  onClick={toggleFavorite}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isFavorite ? '#C35F33' : '#ccc',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              {/* Share */}
              {(activity.metadata?.memoryId || activity.metadata?.wisdomId) && (
                <button
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: accentColor,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  <Share2 size={14} />
                  Share
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: '#333',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Image Gallery with Face Tagging */}
            {(activity.thumbnail || mediaItems.length > 0) && (
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div 
                  ref={imageContainerRef}
                  onClick={(e) => {
                    // If in tagging mode and no faces detected, show contacts on click anywhere
                    if (isTaggingMode && detectedFaces.length === 0 && !faceDropdownPosition) {
                      const rect = imageContainerRef.current?.getBoundingClientRect()
                      if (rect) {
                        setSelectedFaceIndex(-1) // -1 means "no specific face"
                        setFaceDropdownPosition({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        })
                      }
                    }
                  }}
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: isTaggingMode ? 'crosshair' : 'default',
                  }}
                >
                  <img
                    src={mediaItems[currentMediaIndex]?.file_url || activity.thumbnail}
                    alt={activity.title}
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                    }}
                  />
                  
                  {/* Face Bounding Boxes - Show in tagging mode */}
                  {isTaggingMode && detectedFaces.length > 0 && detectedFaces.map((face, idx) => {
                    // Handle AWS Rekognition format (Left/Top), stored format (left/top), and faces API (x/y)
                    const bbox = face.boundingBox || face.bounding_box || {}
                    const left = bbox.Left ?? bbox.left ?? bbox.x ?? 0
                    const top = bbox.Top ?? bbox.top ?? bbox.y ?? 0
                    const width = bbox.Width ?? bbox.width ?? 0.15
                    const height = bbox.Height ?? bbox.height ?? 0.15
                    
                    return (
                      <div
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFaceClick(idx, e)
                        }}
                        style={{
                          position: 'absolute',
                          left: `${left * 100}%`,
                          top: `${top * 100}%`,
                          width: `${width * 100}%`,
                          height: `${height * 100}%`,
                          border: (face.tagged || face.contact_id || face.contact) ? '3px solid #22c55e' : '3px solid #3b82f6',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: (face.tagged || face.contact_id || face.contact) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          transition: 'all 0.2s',
                          zIndex: 5,
                        }}
                      >
                        {(face.contact_name || face.contact?.full_name) && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-24px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#22c55e',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}>
                            {face.contact_name || face.contact?.full_name}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Tagging mode hint - click anywhere */}
                  {isTaggingMode && detectedFaces.length === 0 && !faceDropdownPosition && (
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}>
                      👆 Click anywhere on the photo to tag someone
                    </div>
                  )}
                  
                  {/* Contact picker dropdown at face position */}
                  {faceDropdownPosition && (
                    <div style={{
                      position: 'absolute',
                      left: faceDropdownPosition.x,
                      top: faceDropdownPosition.y + 10,
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      border: '1px solid #eee',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100,
                      minWidth: '180px',
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#666',
                        borderBottom: '1px solid #eee',
                        background: '#fafafa',
                      }}>
                        Who is this?
                      </div>
                      {contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleTagFace(contact.id)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#333',
                            textAlign: 'left',
                            borderBottom: '1px solid #f5f5f5',
                          }}
                        >
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: accentColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}>
                            {contact.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          {contact.full_name || 'Unknown'}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setSelectedFaceIndex(null)
                          setFaceDropdownPosition(null)
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: '#f5f5f5',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#888',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Tagging mode indicator */}
                {isTaggingMode && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: '#3b82f6',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Tag size={14} />
                    Click a face to tag
                  </div>
                )}
                
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
                
                {/* Fullscreen expand button */}
                {!isTaggingMode && (
                  <button
                    onClick={() => setIsFullscreen(true)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      zIndex: 10,
                    }}
                    title="View fullscreen"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
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
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                      color: '#1a1a1a',
                      background: '#fff',
                      outline: 'none',
                    }}
                    placeholder="Title"
                  />
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '14px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      minHeight: '100px',
                      resize: 'vertical',
                      color: '#1a1a1a',
                      background: '#fff',
                      outline: 'none',
                      lineHeight: '1.5',
                    }}
                    placeholder="Description"
                  />
                  
                  {/* Interim transcription preview */}
                  {interimText && (
                    <div style={{
                      fontSize: '13px',
                      color: '#888',
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}>
                      {interimText}...
                    </div>
                  )}

                  {/* Transcribing indicator */}
                  {isTranscribing && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#888',
                      padding: '4px 0',
                    }}>
                      <Loader2 size={12} className="animate-spin" />
                      Transcribing...
                    </div>
                  )}

                  {/* Video preview during recording */}
                  {isRecordingVideo && (
                    <div style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#000',
                      marginTop: '8px',
                    }}>
                      <video
                        ref={videoPreviewRef}
                        muted
                        playsInline
                        style={{
                          width: '100%',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)',
                        }}
                      />
                    </div>
                  )}

                  {/* Recorded media indicators */}
                  {(recordedAudioUrl || recordedVideoUrl) && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '8px',
                    }}>
                      {recordedAudioUrl && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: accentColor,
                          background: `${accentColor}15`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                        }}>
                          <Mic size={12} /> Voice recorded ✓
                        </div>
                      )}
                      {recordedVideoUrl && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: accentColor,
                          background: `${accentColor}15`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                        }}>
                          <Video size={12} /> Video recorded ✓
                        </div>
                      )}
                    </div>
                  )}

                  {/* Voice & Video recording buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '10px',
                  }}>
                    <button
                      onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                      disabled={isRecordingVideo || isTranscribing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: isRecordingVoice ? '#ef4444' : '#f5f5f5',
                        color: isRecordingVoice ? '#fff' : '#555',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isRecordingVideo || isTranscribing ? 'not-allowed' : 'pointer',
                        opacity: isRecordingVideo || isTranscribing ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isRecordingVoice ? (
                        <><Square size={12} /> Stop Recording</>
                      ) : (
                        <><Mic size={14} /> Voice</>
                      )}
                    </button>
                    <button
                      onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
                      disabled={isRecordingVoice || isTranscribing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: isRecordingVideo ? '#ef4444' : '#f5f5f5',
                        color: isRecordingVideo ? '#fff' : '#555',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isRecordingVoice || isTranscribing ? 'not-allowed' : 'pointer',
                        opacity: isRecordingVoice || isTranscribing ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isRecordingVideo ? (
                        <><Square size={12} /> Stop Video</>
                      ) : (
                        <><Video size={14} /> Video</>
                      )}
                    </button>
                  </div>
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

            {/* Audio & Video Recordings */}
            {(() => {
              const audioMedia = mediaItems.filter((m: any) => m.file_type === 'audio')
              const videoMedia = mediaItems.filter((m: any) => m.file_type === 'video')
              const hasLegacyAudio = activity.audio_url && !audioMedia.some((m: any) => m.file_url === activity.audio_url)
              const allAudio = [
                ...(hasLegacyAudio ? [{ id: 'legacy', file_url: activity.audio_url, file_type: 'audio' }] : []),
                ...audioMedia,
              ]
              return (
                <>
                  {allAudio.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Voice Recordings ({allAudio.length})
                      </div>
                      {allAudio.map((m: any, idx: number) => (
                        <div key={m.id || idx} style={{
                          marginBottom: '6px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#f8f8f8',
                          padding: '8px 12px',
                        }}>
                          <audio controls preload="metadata" style={{ width: '100%', height: '36px' }}>
                            <source src={m.file_url} type="audio/webm" />
                          </audio>
                        </div>
                      ))}
                    </div>
                  )}
                  {videoMedia.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>
                        Video Recordings ({videoMedia.length})
                      </div>
                      {videoMedia.map((m: any, idx: number) => (
                        <div key={m.id || idx} style={{
                          marginBottom: '6px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#000',
                        }}>
                          <video controls preload="metadata" style={{ width: '100%', maxHeight: '200px' }}>
                            <source src={m.file_url} type="video/webm" />
                          </video>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* Date & Location - Same row in edit mode */}
            <div style={{
              display: 'flex',
              flexDirection: isEditing ? 'row' : 'column',
              gap: '12px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}>
              {/* Date */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: isEditing ? '0 0 auto' : undefined,
              }}>
                <Calendar size={16} color="#888" />
                {isEditing ? (
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    style={{
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      background: '#fff',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    {format(new Date(activity.timestamp), 'MMMM d, yyyy')}
                  </span>
                )}
              </div>

              {/* Location with autocomplete */}
              {(activity.metadata?.location || isEditing) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flex: isEditing ? 1 : undefined,
                  position: 'relative',
                }}>
                  <MapPin size={16} color="#888" />
                  {isEditing ? (
                    <LocationAutocomplete
                      value={editedLocation}
                      onChange={setEditedLocation}
                      placeholder="Enter location"
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
            {/* Contributions (Comments, Reactions, etc.) */}
            {(activity.metadata?.memoryId || activity.metadata?.wisdomId) && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <MemoryContributions 
                  memoryId={activity.metadata.wisdomId || activity.metadata.memoryId || ''}
                  contentType={activity.type.includes('wisdom') ? 'wisdom' : 'memory'}
                  onShare={() => setShowShareModal(true)}
                />
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
                {/* Show Photo upload only for memory types, not photos_uploaded or postscripts */}
                {activity.type !== 'photos_uploaded' && activity.type !== 'postscript_created' && activity.metadata?.memoryId && (
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
                )}
                {/* Only show Tag button for memories and photos, not postscripts */}
                {activity.type !== 'postscript_created' && (activity.thumbnail || mediaItems.length > 0) && (
                  <button
                    onClick={() => {
                      if (!isTaggingMode) {
                        // Enter tagging mode immediately
                        setIsTaggingMode(true)
                        // Try to detect faces in background (non-blocking)
                        detectFaces()
                      } else {
                        // Exit tagging mode
                        setIsTaggingMode(false)
                        setSelectedFaceIndex(null)
                        setFaceDropdownPosition(null)
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: isTaggingMode ? '#3b82f6' : '#f5f5f5',
                      color: isTaggingMode ? '#fff' : '#555',
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
                    <Tag size={14} />
                    {isTaggingMode ? 'Done' : 'Tag'}
                  </button>
                )}
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

        {/* Fullscreen Image Viewer */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFullscreen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  zIndex: 110,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <X size={22} />
              </button>

              {/* Counter */}
              {mediaItems.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  fontWeight: '600',
                  zIndex: 110,
                }}>
                  {currentMediaIndex + 1} / {mediaItems.length}
                </div>
              )}

              {/* Image */}
              <motion.img
                key={currentMediaIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                src={mediaItems[currentMediaIndex]?.file_url || activity?.thumbnail}
                alt={activity?.title || ''}
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  userSelect: 'none',
                }}
              />

              {/* Prev/Next */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentMediaIndex(i => Math.max(0, i - 1))
                    }}
                    disabled={currentMediaIndex === 0}
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      opacity: currentMediaIndex === 0 ? 0.3 : 1,
                      zIndex: 110,
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentMediaIndex(i => Math.min(mediaItems.length - 1, i + 1))
                    }}
                    disabled={currentMediaIndex === mediaItems.length - 1}
                    style={{
                      position: 'absolute',
                      right: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      opacity: currentMediaIndex === mediaItems.length - 1 ? 0.3 : 1,
                      zIndex: 110,
                    }}
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Thumbnail strip */}
              {mediaItems.length > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '12px',
                    maxWidth: '80vw',
                    overflowX: 'auto',
                  }}
                >
                  {mediaItems.map((m: any, idx: number) => (
                    <img
                      key={m.id}
                      src={m.file_url}
                      alt=""
                      onClick={() => setCurrentMediaIndex(idx)}
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: idx === currentMediaIndex ? '2px solid #fff' : '2px solid transparent',
                        opacity: idx === currentMediaIndex ? 1 : 0.6,
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Share Modal (works for both memories and wisdom) */}
      {(activity?.metadata?.memoryId || activity?.metadata?.wisdomId) && showShareModal && (
        <ShareMemoryModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          memoryId={activity.metadata.wisdomId || activity.metadata.memoryId || ''}
          memoryTitle={activity.title}
          contentType={activity.type.includes('wisdom') ? 'wisdom' : 'memory'}
        />
      )}
    </AnimatePresence>
  )
}
