'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X, Sparkles, Mic, Send, RotateCcw, UserPlus, Search, Square, Loader2, Bookmark, Video, Play } from 'lucide-react'
import { TYPE_CONFIG, isContactPrompt, PHOTO_TAGGING_TYPES } from '../constants'
import { createClient } from '@/lib/supabase/client'

// Helper to detect video URLs
function isVideoUrl(url?: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return /\.(mp4|mov|webm|avi|mkv)(\?|$)/.test(lower) || lower.includes('video/')
}

// Types that should NOT get AI follow-ups
const NO_FOLLOWUP_TYPES = ['postscript']

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
  currentIndex: number
  onCurrentIndexChange: (index: number) => void
  onCardDismiss: (promptId: string) => void
  onCardAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => Promise<void>
  onNeedMorePrompts: () => void
  getPromptText: (prompt: Prompt) => string
}

export function SwipeableCardStack({
  prompts,
  currentIndex,
  onCurrentIndexChange,
  onCardDismiss,
  onCardAnswer,
  onNeedMorePrompts,
  getPromptText,
}: SwipeableCardStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Track navigation direction for slide animation: 1 = forward, -1 = back
  const [direction, setDirection] = useState(0)

  // Clamp index when prompts array changes (e.g. after answer removes a prompt)
  useEffect(() => {
    if (prompts.length > 0 && currentIndex >= prompts.length) {
      onCurrentIndexChange(prompts.length - 1)
    }
  }, [prompts.length, currentIndex])

  // Request more prompts when near the end
  useEffect(() => {
    const remaining = prompts.length - currentIndex
    if (remaining < 5 && prompts.length > 0) {
      onNeedMorePrompts()
    }
  }, [currentIndex, prompts.length, onNeedMorePrompts])

  const currentPrompt = prompts.length > 0 ? prompts[currentIndex] : null
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < prompts.length - 1

  // Navigate forward (skip without dismissing — just move carousel)
  const goForward = useCallback(() => {
    if (currentIndex < prompts.length - 1) {
      setDirection(1)
      onCurrentIndexChange(currentIndex + 1)
    }
  }, [currentIndex, prompts.length])

  // Navigate backward
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      onCurrentIndexChange(currentIndex - 1)
    }
  }, [currentIndex])

  // Dismiss = actually answered/completed — removes from array via parent
  const handleAnsweredDismiss = useCallback((id: string) => {
    onCardDismiss(id)
    // After dismiss, the prompts array shrinks. currentIndex will be clamped by the effect above.
  }, [onCardDismiss])

  // Auto-focus on mount for keyboard navigation
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPrompt) return
      
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPrompt, goForward, goBack])

  if (!currentPrompt) {
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
    <div ref={containerRef} className="card-stack-container relative h-[600px] w-full mx-auto focus:outline-none" tabIndex={0}>
      {/* Carousel position indicator */}
      <div className="card-stack-indicator" style={{
        position: 'absolute',
        top: '-28px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: '#888',
        fontWeight: 500,
      }}>
        {currentIndex + 1} / {prompts.length}
      </div>

      {/* Left Arrow — Go Back */}
      <button
        className="card-nav-arrow card-nav-left"
        onClick={goBack}
        disabled={!canGoBack}
        style={{
          position: 'absolute',
          left: '-52px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 30,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: canGoBack ? 'rgba(64,106,86,0.12)' : 'rgba(0,0,0,0.04)',
          border: 'none',
          cursor: canGoBack ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: canGoBack ? '#406A56' : '#ccc',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { if (canGoBack) e.currentTarget.style.background = 'rgba(64,106,86,0.2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = canGoBack ? 'rgba(64,106,86,0.12)' : 'rgba(0,0,0,0.04)' }}
        title="Previous prompt"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Right Arrow — Next (skip forward without dismissing) */}
      <button
        className="card-nav-arrow card-nav-right"
        onClick={goForward}
        disabled={!canGoForward}
        style={{
          position: 'absolute',
          right: '-52px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 30,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: canGoForward ? 'rgba(64,106,86,0.12)' : 'rgba(0,0,0,0.04)',
          border: 'none',
          cursor: canGoForward ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: canGoForward ? '#406A56' : '#ccc',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { if (canGoForward) e.currentTarget.style.background = 'rgba(64,106,86,0.2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = canGoForward ? 'rgba(64,106,86,0.12)' : 'rgba(0,0,0,0.04)' }}
        title="Next prompt"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="relative h-full">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentPrompt.id}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir === 0 ? 0 : dir > 0 ? 300 : -300,
                opacity: 0,
                scale: 0.92,
              }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (dir: number) => ({
                x: dir > 0 ? -300 : 300,
                opacity: 0,
                scale: 0.92,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 350, damping: 32, mass: 0.8 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <FlippableCard
              prompt={currentPrompt}
              index={0}
              totalVisible={1}
              onDismiss={() => handleAnsweredDismiss(currentPrompt.id)}
              onGoBack={goBack}
              onGoForward={goForward}
              onAnswer={onCardAnswer}
              getPromptText={getPromptText}
            />
          </motion.div>
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
  onGoBack?: () => void
  onGoForward?: () => void
  onAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => Promise<void>
  getPromptText: (prompt: Prompt) => string
}

function FlippableCard({
  prompt,
  index,
  totalVisible,
  onDismiss,
  onGoBack,
  onGoForward,
  onAnswer,
  getPromptText,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Conversation follow-up state
  const [exchanges, setExchanges] = useState<{ question: string; response: string }[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Live transcription state (Web Speech API)
  const [interimText, setInterimText] = useState('')
  const speechRecRef = useRef<any>(null)
  
  // Video recording state
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  
  // Video playback state (for photo cards)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  
  const MAX_FOLLOW_UPS = 3
  
  // Whether this type gets AI follow-ups
  const hasAiFollowUp = !NO_FOLLOWUP_TYPES.includes(prompt.type)
  
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
  const [backstoryText, setBackstoryText] = useState('')
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
    if (!prompt.photoId || (!locationInput.trim() && !dateInput.trim() && !backstoryText.trim())) return
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
      
      // Build answer text
      const parts: string[] = []
      if (locationInput.trim()) parts.push(`Location: ${locationInput}`)
      if (dateInput.trim()) parts.push(`Date: ${dateInput}`)
      if (backstoryText.trim()) parts.push(`Story: ${backstoryText}`)
      
      await onAnswer(prompt.id, { type: 'text', text: parts.join('\n') })
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
  const photoIsVideo = isVideoUrl(prompt.photoUrl)

  // Connect video stream to preview element when both are ready
  useEffect(() => {
    if (videoStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = videoStream
      videoPreviewRef.current.play().catch(() => {})
    }
  }, [videoStream, isVideoRecording])

  const handleDragStart = () => {
    isDragging.current = true
    dragStartX.current = x.get()
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isFlipped) return // Don't navigate while flipped
    
    const threshold = 40 // Low threshold — container is narrow
    const velocity = Math.abs(info.velocity.x)
    const offset = info.offset.x
    const absOffset = Math.abs(offset)
    
    if (absOffset > threshold || (velocity > 300 && absOffset > 15)) {
      if (offset > 0 && onGoForward) {
        // Swiped RIGHT → next prompt (carousel forward)
        onGoForward()
      } else if (offset < 0 && onGoBack) {
        // Swiped LEFT → previous prompt (carousel back)
        onGoBack()
      }
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
    } else if (showVideoPlayer) {
      setShowVideoPlayer(false)
    } else if (isFlipped) {
      setIsFlipped(false)
      setResponseText('')
      setTagPosition(null)
      setShowContactPicker(false)
    } else {
      onDismiss()
    }
  }

  // Fetch a follow-up question from the API
  const fetchFollowUp = async (updatedExchanges: { question: string; response: string }[]) => {
    setIsLoadingFollowUp(true)
    try {
      const res = await fetch('/api/conversation/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchanges: updatedExchanges,
          promptType: prompt.type,
          originalPrompt: getPromptText(prompt),
        }),
      })
      const data = await res.json()
      if (data.followUpQuestion) {
        setCurrentQuestion(data.followUpQuestion)
      } else {
        setCurrentQuestion('Tell me more about this memory.')
      }
    } catch {
      setCurrentQuestion('Tell me more about this memory.')
    }
    setIsLoadingFollowUp(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Submit response and get follow-up
  const handleSubmit = async () => {
    if (!responseText.trim() || isSubmitting) return
    
    const currentQ = currentQuestion || getPromptText(prompt)
    const newExchange = { question: currentQ, response: responseText.trim() }
    const updatedExchanges = [...exchanges, newExchange]
    
    setExchanges(updatedExchanges)
    setResponseText('')
    setInterimText('')
    setCurrentQuestion('')
    setIsSubmitting(true)
    
    try {
      // After MAX_FOLLOW_UPS exchanges, show save prompt
      if (updatedExchanges.length >= MAX_FOLLOW_UPS) {
        setShowSavePrompt(true)
      } else if (hasAiFollowUp) {
        // Auto-fetch follow-up for conversation types
        await fetchFollowUp(updatedExchanges)
      }
    } catch (err) {
      console.error('Follow-up fetch failed:', err)
    }
    
    setIsSubmitting(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }
  
  // Save the full conversation as a memory
  const handleSaveMemory = async () => {
    setIsSubmitting(true)
    try {
      const fullText = exchanges.map(e => `Q: ${e.question}\nA: ${e.response}`).join('\n\n')
      await onAnswer(prompt.id, { type: 'text', text: fullText, videoUrl: videoUrl || undefined })
      setIsFlipped(false)
      setResponseText('')
      setExchanges([])
      setCurrentQuestion('')
      setShowSavePrompt(false)
      setVideoUrl(null)
      onDismiss()
    } catch (err) {
      console.error('Failed to save:', err)
    }
    setIsSubmitting(false)
  }
  
  // Continue adding more after save prompt
  const handleAddMore = () => {
    setShowSavePrompt(false)
    setCurrentQuestion('')
    fetchFollowUp(exchanges)
  }
  
  // Voice recording with live transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        // Stop live transcription
        if (speechRecRef.current) {
          try { speechRecRef.current.stop() } catch {}
          speechRecRef.current = null
        }
        setInterimText('')
        
        // Transcribe via API for final accurate text
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          const transcribedText = data.transcription || data.text || ''
          if (transcribedText) {
            setResponseText(prev => prev ? `${prev} ${transcribedText}` : transcribedText)
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        }
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      
      // Start Web Speech API for live interim transcription
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'
          
          recognition.onresult = (event: any) => {
            let interim = ''
            let final = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                final += transcript
              } else {
                interim += transcript
              }
            }
            if (final) {
              setResponseText(prev => prev ? `${prev} ${final}` : final)
              setInterimText('')
            } else {
              setInterimText(interim)
            }
          }
          
          recognition.onerror = () => {
            // Silently fail — we still have MediaRecorder as backup
          }
          
          recognition.start()
          speechRecRef.current = recognition
        }
      } catch {
        // Web Speech API not available — graceful fallback
      }
    } catch (err) {
      console.error('Mic access failed:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (speechRecRef.current) {
      try { speechRecRef.current.stop() } catch {}
      speechRecRef.current = null
    }
    setInterimText('')
    setIsRecording(false)
  }
  
  // Video recording
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
        
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        
        // Upload to Supabase storage
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          
          const fileName = `video-responses/${user.id}/${Date.now()}.webm`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('memories')
            .upload(fileName, videoBlob, { contentType: 'video/webm' })
          
          if (uploadError) {
            console.error('Video upload failed:', uploadError)
          } else {
            const { data: urlData } = supabase.storage
              .from('memories')
              .getPublicUrl(fileName)
            setVideoUrl(urlData.publicUrl)
          }
        } catch (err) {
          console.error('Video upload error:', err)
        }
        
        // Transcribe the audio track
        const formData = new FormData()
        formData.append('audio', videoBlob, 'video-recording.webm')
        
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          const transcribedText = data.transcription || data.text || ''
          if (transcribedText) {
            setResponseText(prev => prev ? `${prev} ${transcribedText}` : transcribedText)
          }
        } catch (err) {
          console.error('Video transcription failed:', err)
        }
      }
      
      recorder.start()
      videoRecorderRef.current = recorder
      setIsVideoRecording(true)
    } catch (err) {
      console.error('Camera access failed:', err)
    }
  }
  
  const stopVideoRecording = () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop()
    }
    setIsVideoRecording(false)
  }
  
  // "Keep Going" - fetch a follow-up question to continue the conversation
  const handleKeepGoing = async () => {
    // If there's text in the input, submit it first
    if (responseText.trim()) {
      await handleSubmit()
      return
    }
    // Otherwise just fetch a new follow-up based on current exchanges
    fetchFollowUp(exchanges.length > 0 ? exchanges : [{ question: getPromptText(prompt), response: '(thinking...)' }])
  }

  return (
    <div
      className="absolute inset-0"
      style={{ 
        zIndex: 1,
        perspective: 1000,
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
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.7}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={index === 0 ? handleClick : undefined}
      >
        {/* Front of card */}
        <div 
          className={`
            absolute inset-0 rounded-3xl overflow-hidden
            shadow-xl
            ${index === 0 && !isFlipped ? 'cursor-grab active:cursor-grabbing' : ''}
          `}
          style={{ background: 'linear-gradient(135deg, #fafaf8, #f5f0eb)', backfaceVisibility: 'hidden' }}
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
            {/* Top: Photo or gradient — 55% */}
            {hasPhoto ? (
              <div className="relative h-[55%] bg-gray-100">
                {photoIsVideo ? (
                  <>
                    <video
                      src={prompt.photoUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      onLoadedData={(e) => { e.currentTarget.currentTime = 0.1 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Play size={28} className="text-white ml-1" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ) : (
              <div className={`relative h-[55%] ${
                config.color === 'yellow' ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500' :
                config.color === 'green' ? 'bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-600' :
                config.color === 'red' ? 'bg-gradient-to-br from-rose-300 via-rose-400 to-red-600' :
                config.color === 'blue' ? 'bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-600' :
                'bg-gradient-to-br from-violet-300 via-purple-400 to-purple-700'
              }`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles size={72} className="text-white/25" />
                </div>
                {/* Category badge */}
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

            {/* Bottom: Content — 45% */}
            <div className="flex-1 p-6 flex flex-col justify-center">
              {isContact && prompt.contactName && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] flex items-center justify-center text-white font-medium text-lg">
                    {prompt.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{prompt.contactName}</p>
                    {prompt.missingField && (
                      <p className="text-sm text-gray-500">Add {prompt.missingField.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-2xl font-bold text-[#2d3b36] leading-snug flex-1 flex items-center">
                {getPromptText(prompt)}
              </p>

              {/* Interaction hints */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '12px',
                fontSize: '12px',
                color: '#999',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {config.inputHint}
                </span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#ccc' }} />
                <span>{config.timeHint}</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#ccc' }} />
                <span>Tap to start</span>
              </div>
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
                {photoIsVideo ? (
                  <>
                    <video
                      src={prompt.photoUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                      onLoadedData={(e) => { e.currentTarget.currentTime = 0.1 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                        <Play size={24} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    ref={imageRef}
                    src={prompt.photoUrl}
                    alt=""
                    onClick={handlePhotoClick}
                    className="w-full h-full object-contain cursor-crosshair"
                    draggable={false}
                  />
                )}

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
            /* Photo Backstory: photo/video thumbnail + location & date fields + story text */
            <div className="h-full flex flex-col">
              {/* Photo/video thumbnail at top — smaller to make room for story text */}
              <div className="h-[30%] bg-black flex items-center justify-center overflow-hidden relative" style={{ marginTop: 56 }}>
                {photoIsVideo ? (
                  <>
                    {showVideoPlayer ? (
                      <video
                        src={prompt.photoUrl}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <>
                        <video
                          src={prompt.photoUrl}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-contain"
                          onLoadedData={(e) => { e.currentTarget.currentTime = 0.1 }}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowVideoPlayer(true) }}
                          className="absolute inset-0 flex items-center justify-center bg-black/20"
                        >
                          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <Play size={24} className="text-white ml-0.5" />
                          </div>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <img src={prompt.photoUrl} alt="" className="w-full h-full object-contain" draggable={false} />
                )}
              </div>

              {/* Location + Date fields + Story text */}
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
                {/* Location with autocomplete */}
                <div className="relative">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    📍 Where was this?
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="City, place, or address..."
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]"
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
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    📅 When was this taken?
                  </label>
                  <input
                    type="text"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    placeholder="e.g. Summer 2019, March 2020..."
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56]"
                  />
                </div>

                {/* Story text area */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    📝 The story behind this
                  </label>
                  <textarea
                    value={backstoryText}
                    onChange={(e) => setBackstoryText(e.target.value)}
                    placeholder="What's the story? Who was there?"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 focus:border-[#406A56] resize-none"
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={handleSaveBackstory}
                  disabled={(!locationInput.trim() && !dateInput.trim() && !backstoryText.trim()) || isSavingBackstory}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#406A56] text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4a7a64] transition-colors"
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
          ) : (prompt.type === 'personality' || prompt.type === 'religion' || prompt.type === 'skills' || prompt.type === 'languages') ? (
            /* Pill selection back-side for profile completion cards */
            <PillSelectionBack
              prompt={prompt}
              config={config}
              onAnswer={onAnswer}
              onDismiss={onDismiss}
              getPromptText={getPromptText}
            />
          ) : (isContact && prompt.missingField) ? (
            /* Contact field input (phone, email, address, dob) */
            <ContactFieldBack
              prompt={prompt}
              config={config}
              onAnswer={onAnswer}
              onDismiss={onDismiss}
            />
          ) : prompt.type === 'recipe' ? (
            /* Recipe card — multi-section form */
            <RecipeCardBack
              prompt={prompt}
              config={config}
              onAnswer={onAnswer}
              onDismiss={onDismiss}
              getPromptText={getPromptText}
            />
          ) : (prompt.type === 'favorite_books' || prompt.type === 'favorite_movies' || prompt.type === 'favorite_music' || prompt.type === 'favorite_foods') ? (
            /* Favorites list with custom input + suggestions */
            <FavoritesListBack
              prompt={prompt}
              config={config}
              onAnswer={onAnswer}
              onDismiss={onDismiss}
              getPromptText={getPromptText}
            />
          ) : prompt.type === 'binary_choice' ? (
            /* Binary choice: Two big tap targets */
            <BinaryChoiceBack
              prompt={prompt}
              config={config}
              onAnswer={onAnswer}
              onDismiss={onDismiss}
              getPromptText={getPromptText}
            />
          ) : (
            /* Default conversation back-side: Text + Mic + Video + AI follow-ups */
            <div className="h-full flex flex-col pt-14">
              {/* Conversation thread */}
              <div className="flex-1 overflow-y-auto px-5 pb-2">
                {/* Original question (if no exchanges yet) */}
                {exchanges.length === 0 && !showSavePrompt && (
                  <div className="mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium inline-block mb-1.5 ${
                      config.color === 'yellow' ? 'bg-amber-100 text-amber-700' :
                      config.color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                      config.color === 'red' ? 'bg-rose-100 text-rose-700' :
                      config.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {config.label}
                    </span>
                    <p className="text-[#406A56] font-semibold text-base">{getPromptText(prompt)}</p>
                  </div>
                )}

                {/* Past exchanges */}
                {exchanges.map((ex, i) => (
                  <div key={i} className="mb-3">
                    <div className="bg-[#406A56]/5 rounded-2xl rounded-bl-sm px-3.5 py-2.5 mb-1.5">
                      <p className="text-sm text-[#406A56] font-medium">{ex.question}</p>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-br-sm px-3.5 py-2.5 ml-6">
                      <p className="text-sm text-gray-800">{ex.response}</p>
                    </div>
                  </div>
                ))}

                {/* Current follow-up question */}
                {currentQuestion && !showSavePrompt && (
                  <div className="bg-[#406A56]/5 rounded-2xl rounded-bl-sm px-3.5 py-2.5 mb-2">
                    <p className="text-sm text-[#406A56] font-medium">{currentQuestion}</p>
                  </div>
                )}

                {/* Loading follow-up */}
                {isLoadingFollowUp && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm px-2 py-2">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking...
                  </div>
                )}

                {/* Save prompt after MAX_FOLLOW_UPS exchanges */}
                {showSavePrompt && (
                  <div className="bg-amber-50 rounded-2xl p-4 text-center">
                    <Bookmark size={24} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-sm font-medium text-gray-800 mb-3">
                      Would you like to save this memory or add more?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddMore}
                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Add More
                      </button>
                      <button
                        onClick={handleSaveMemory}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#406A56] text-white text-sm font-medium hover:bg-[#4a7a64] disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : '✨ Save Memory'}
                      </button>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Video preview overlay */}
              {isVideoRecording && (
                <div className="absolute bottom-28 right-4 z-30">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-24 h-32 rounded-2xl object-cover shadow-lg border-2 border-red-400"
                  />
                  <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </div>
              )}

              {/* Video URL indicator */}
              {videoUrl && !isVideoRecording && (
                <div className="mx-5 mb-1 flex items-center gap-1.5 text-xs text-emerald-600">
                  <Video size={12} />
                  <span>Video attached</span>
                </div>
              )}

              {/* Input area (hidden when showing save prompt) */}
              {!showSavePrompt && (
                <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                  {/* Textarea row */}
                  <div className="relative mb-2">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                      placeholder="Share your thoughts..."
                      rows={2}
                      className="w-full p-3 bg-gray-50 rounded-2xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-gray-800 text-sm placeholder-gray-400"
                      style={interimText ? { color: 'transparent', caretColor: '#1f2937' } : undefined}
                      autoFocus={isFlipped}
                    />
                    {/* Interim transcription overlay */}
                    {interimText && (
                      <div className="absolute inset-0 p-3 pointer-events-none text-sm">
                        <span className="text-gray-800">{responseText}</span>
                        <span className="text-gray-400 italic">{interimText}</span>
                      </div>
                    )}
                  </div>
                  {/* Button row: Mic | Video | Save Memory / Keep Going | Send */}
                  <div className="flex items-center gap-2">
                    {/* Mic button */}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isVideoRecording}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                        isRecording 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40'
                      }`}
                    >
                      {isRecording ? <Square size={16} /> : <Mic size={18} />}
                    </button>
                    {/* Video button */}
                    <button
                      onClick={isVideoRecording ? stopVideoRecording : startVideoRecording}
                      disabled={isRecording}
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                        isVideoRecording 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40'
                      }`}
                    >
                      {isVideoRecording ? <Square size={16} /> : <Video size={18} />}
                    </button>
                    {/* Save Memory button (after 1+ exchanges) */}
                    {exchanges.length >= 1 && (
                      <button
                        onClick={handleSaveMemory}
                        disabled={isSubmitting}
                        className="flex-1 h-11 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <><Loader2 size={14} className="animate-spin" /> Saving...</>
                        ) : (
                          <><Bookmark size={14} /> Save Memory</>
                        )}
                      </button>
                    )}
                    {/* Send button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!responseText.trim() || isSubmitting}
                      className="w-11 h-11 rounded-full bg-[#406A56] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a7a64] transition-colors flex-shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>


    </div>
  )
}

/* ─── Recipe Card Back (full recipe capture) ─── */

const CUISINE_OPTIONS = [
  'American', 'Italian', 'Mexican', 'Chinese', 'Indian', 'Japanese', 'Thai',
  'Mediterranean', 'French', 'Southern', 'Soul Food', 'Caribbean', 'Korean',
  'Middle Eastern', 'African', 'German', 'Brazilian', 'Vietnamese', 'Greek', 'Other',
]

const OCCASION_OPTIONS = [
  'Everyday', 'Holiday', 'Sunday Dinner', 'Comfort Food', 'Celebration',
  'Birthday', 'Potluck', 'Summer BBQ', 'Winter Warmer', 'Quick Weeknight',
]

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Advanced']

interface RecipeIngredient {
  name: string
  amount: string
}

function RecipeCardBack({
  prompt,
  config,
  onAnswer,
  onDismiss,
  getPromptText,
}: {
  prompt: Prompt
  config: any
  onAnswer: (id: string, r: any) => Promise<void>
  onDismiss: () => void
  getPromptText: (p: Prompt) => string
}) {
  const [recipeName, setRecipeName] = useState('')
  const [learnedFrom, setLearnedFrom] = useState('')
  const [story, setStory] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [newIngName, setNewIngName] = useState('')
  const [newIngAmount, setNewIngAmount] = useState('')
  const [directions, setDirections] = useState('')
  const [tips, setTips] = useState('')
  const [serves, setServes] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [occasion, setOccasion] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const addIngredient = () => {
    if (!newIngName.trim()) return
    setIngredients(prev => [...prev, { name: newIngName.trim(), amount: newIngAmount.trim() }])
    setNewIngName('')
    setNewIngAmount('')
  }

  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!recipeName.trim()) return
    setIsSubmitting(true)

    // Upload photo if provided
    let photoUrl: string | undefined
    if (photoFile) {
      try {
        const formData = new FormData()
        formData.append('file', photoFile)
        const res = await fetch('/api/onboarding/upload-image', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          photoUrl = data.fileUrl
        }
      } catch { /* photo upload is optional */ }
    }

    const recipeData = {
      name: recipeName.trim(),
      learnedFrom: learnedFrom.trim(),
      story: story.trim(),
      ingredients,
      directions: directions.trim(),
      tips: tips.trim(),
      serves: serves.trim(),
      prepTime: prepTime.trim(),
      cookTime: cookTime.trim(),
      cuisine,
      occasion,
      difficulty,
      photoUrl,
    }

    // Build readable text summary for the memory
    const parts: string[] = [`🍳 ${recipeName}`]
    if (learnedFrom) parts.push(`Learned from: ${learnedFrom}`)
    if (story) parts.push(`\nThe Story:\n${story}`)
    if (ingredients.length > 0) {
      parts.push(`\nIngredients (serves ${serves || '?'}):`)
      ingredients.forEach(i => parts.push(`  • ${i.amount ? `${i.amount} ` : ''}${i.name}`))
    }
    if (directions) parts.push(`\nDirections:\n${directions}`)
    if (tips) parts.push(`\n💡 Tips & Secrets:\n${tips}`)
    if (prepTime || cookTime) parts.push(`\n⏱ Prep: ${prepTime || '?'} | Cook: ${cookTime || '?'}`)

    await onAnswer(prompt.id, {
      type: 'text',
      text: parts.join('\n'),
      data: recipeData,
    } as any)
    onDismiss()
  }

  // Section navigation
  const sections = [
    { label: 'Story', icon: '💬' },
    { label: 'Ingredients', icon: '🥘' },
    { label: 'Directions', icon: '📝' },
    { label: 'Details', icon: '📋' },
  ]

  return (
    <div className="h-full flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      {/* Header with recipe name */}
      <div style={{ padding: '56px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <input
          type="text"
          value={recipeName}
          onChange={(e) => setRecipeName(e.target.value)}
          placeholder="Recipe name..."
          style={{
            width: '100%', border: 'none', outline: 'none', fontSize: '20px',
            fontWeight: 700, color: '#2d2d2d', background: 'transparent',
            padding: 0,
          }}
          autoFocus
        />

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
          {sections.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActiveSection(i)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: '10px', border: 'none',
                background: activeSection === i ? '#406A56' : 'rgba(0,0,0,0.04)',
                color: activeSection === i ? 'white' : '#888',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Section 0: Story (emotional lead) */}
        {activeSection === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                👩‍🍳 Who taught you this recipe?
              </label>
              <input
                type="text"
                value={learnedFrom}
                onChange={(e) => setLearnedFrom(e.target.value)}
                placeholder="Grandma, Mom, a friend, self-taught..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.08)', fontSize: '14px',
                  outline: 'none', background: '#fafafa',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                📖 The story behind it
              </label>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="When do you make it? What memories does it bring back? Any family traditions tied to it?"
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.08)', fontSize: '14px',
                  outline: 'none', background: '#fafafa', resize: 'none',
                }}
              />
            </div>

            {/* Photo upload */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                📸 Photo of the dish
              </label>
              {photoPreview ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={photoPreview} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    style={{
                      position: 'absolute', top: '6px', right: '6px',
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
                      fontSize: '14px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ) : (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '12px',
                    border: '2px dashed rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.02)',
                    fontSize: '14px', color: '#888', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  📷 Add a photo (optional)
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoSelect} />
            </div>
          </div>
        )}

        {/* Section 1: Ingredients */}
        {activeSection === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Serves
              </label>
              <input
                type="text"
                value={serves}
                onChange={(e) => setServes(e.target.value)}
                placeholder="4"
                style={{
                  width: '60px', padding: '6px 10px', borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.1)', fontSize: '14px',
                  outline: 'none', textAlign: 'center',
                }}
              />
            </div>

            {/* Ingredient list */}
            {ingredients.map((ing, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', background: 'rgba(64,106,86,0.06)',
                borderRadius: '10px',
              }}>
                <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>
                  {ing.amount && <span style={{ fontWeight: 600, color: '#406A56' }}>{ing.amount} </span>}
                  {ing.name}
                </span>
                <button onClick={() => removeIngredient(i)} style={{
                  background: 'none', border: 'none', color: '#ccc',
                  cursor: 'pointer', fontSize: '16px', padding: '0 4px',
                }}>×</button>
              </div>
            ))}

            {/* Add ingredient row */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newIngAmount}
                onChange={(e) => setNewIngAmount(e.target.value)}
                placeholder="Amount"
                style={{
                  width: '80px', padding: '10px', borderRadius: '10px',
                  border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', outline: 'none',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') addIngredient() }}
              />
              <input
                type="text"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                placeholder="Ingredient..."
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', outline: 'none',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') addIngredient() }}
              />
              <button onClick={addIngredient} disabled={!newIngName.trim()} style={{
                padding: '10px 14px', borderRadius: '10px', border: 'none',
                background: newIngName.trim() ? '#406A56' : 'rgba(0,0,0,0.05)',
                color: newIngName.trim() ? 'white' : '#ccc',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>+</button>
            </div>

            {ingredients.length === 0 && (
              <p style={{ fontSize: '13px', color: '#bbb', textAlign: 'center', margin: '8px 0' }}>
                Add ingredients one at a time — amounts are optional!
              </p>
            )}
          </div>
        )}

        {/* Section 2: Directions */}
        {activeSection === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                📝 Step-by-step directions
              </label>
              <textarea
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                placeholder={"1. Preheat oven to 350°F\n2. Mix dry ingredients\n3. Add wet ingredients\n4. ..."}
                rows={6}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.08)', fontSize: '14px',
                  outline: 'none', background: '#fafafa', resize: 'none',
                  lineHeight: '1.6',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                💡 Tips, secrets & tricks
              </label>
              <textarea
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="The secret ingredient is... Don't skip the resting time... Use room temperature butter..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.08)', fontSize: '14px',
                  outline: 'none', background: '#fafafa', resize: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Section 3: Details */}
        {activeSection === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Times */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                  ⏱ Prep time
                </label>
                <input type="text" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15 min"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>
                  🔥 Cook time
                </label>
                <input type="text" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="45 min"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                Difficulty
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DIFFICULTY_OPTIONS.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} style={{
                    flex: 1, padding: '8px', borderRadius: '10px',
                    border: `2px solid ${difficulty === d ? '#406A56' : 'rgba(0,0,0,0.08)'}`,
                    background: difficulty === d ? '#406A56' : 'transparent',
                    color: difficulty === d ? 'white' : '#666',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Cuisine */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                🌍 Cuisine
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CUISINE_OPTIONS.map(c => (
                  <button key={c} onClick={() => setCuisine(c)} style={{
                    padding: '6px 12px', borderRadius: '100px',
                    border: `1.5px solid ${cuisine === c ? '#406A56' : 'rgba(0,0,0,0.1)'}`,
                    background: cuisine === c ? '#406A56' : 'transparent',
                    color: cuisine === c ? 'white' : '#666',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Occasion */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                🎉 Occasion
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {OCCASION_OPTIONS.map(o => (
                  <button key={o} onClick={() => setOccasion(o)} style={{
                    padding: '6px 12px', borderRadius: '100px',
                    border: `1.5px solid ${occasion === o ? '#C35F33' : 'rgba(0,0,0,0.1)'}`,
                    background: occasion === o ? '#C35F33' : 'transparent',
                    color: occasion === o ? 'white' : '#666',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>{o}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
        <button onClick={() => onDismiss()} style={{
          flex: 1, padding: '12px', borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.1)', background: 'white',
          fontSize: '14px', fontWeight: 500, color: '#666', cursor: 'pointer',
        }}>Skip</button>

        {activeSection < 3 ? (
          <button onClick={() => setActiveSection(prev => prev + 1)} style={{
            flex: 2, padding: '12px', borderRadius: '14px', border: 'none',
            background: '#406A56', color: 'white', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
          }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave} disabled={!recipeName.trim() || isSubmitting} style={{
            flex: 2, padding: '12px', borderRadius: '14px', border: 'none',
            background: '#406A56', color: 'white', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
            opacity: (!recipeName.trim() || isSubmitting) ? 0.5 : 1,
          }}>
            {isSubmitting ? 'Saving...' : '👨‍🍳 Save Recipe (+25 XP)'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Contact Field Back (phone, email, address, dob for contacts) ─── */

const CONTACT_FIELD_CONFIG: Record<string, { label: string; type: string; placeholder: string; icon: string; dbField: string }> = {
  phone: { label: 'Phone Number', type: 'tel', placeholder: '+1 (555) 123-4567', icon: '📱', dbField: 'phone' },
  email: { label: 'Email Address', type: 'email', placeholder: 'name@example.com', icon: '📧', dbField: 'email' },
  address: { label: 'Address', type: 'text', placeholder: '123 Main St, City, State', icon: '🏠', dbField: 'address' },
  date_of_birth: { label: 'Date of Birth', type: 'date', placeholder: 'YYYY-MM-DD', icon: '🎂', dbField: 'date_of_birth' },
  birthday: { label: 'Birthday', type: 'date', placeholder: 'YYYY-MM-DD', icon: '🎂', dbField: 'date_of_birth' },
  dob: { label: 'Date of Birth', type: 'date', placeholder: 'YYYY-MM-DD', icon: '🎂', dbField: 'date_of_birth' },
}

function ContactFieldBack({
  prompt,
  config,
  onAnswer,
  onDismiss,
}: {
  prompt: Prompt
  config: any
  onAnswer: (id: string, r: any) => Promise<void>
  onDismiss: () => void
}) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fieldKey = prompt.missingField || 'phone'
  const fieldConfig = CONTACT_FIELD_CONFIG[fieldKey] || CONTACT_FIELD_CONFIG.phone

  const handleSave = async () => {
    if (!value.trim()) return
    setIsSubmitting(true)

    // Save directly to the contact record
    if (prompt.contactId) {
      try {
        const supabase = createClient()
        await supabase
          .from('contacts')
          .update({ [fieldConfig.dbField]: value.trim() })
          .eq('id', prompt.contactId)
      } catch (err) {
        console.error('Failed to update contact:', err)
      }
    }

    await onAnswer(prompt.id, { type: 'text', text: value.trim() })
    onDismiss()
  }

  return (
    <div className="h-full flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        {/* Contact avatar */}
        {prompt.contactName && (
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #406A56, #8DACAB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '28px', fontWeight: 600, marginBottom: '16px',
          }}>
            {prompt.contactName.charAt(0).toUpperCase()}
          </div>
        )}

        <p style={{ fontSize: '14px', color: '#999', margin: '0 0 4px', fontWeight: 500 }}>
          {prompt.contactName}
        </p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#2d2d2d', margin: '0 0 24px', textAlign: 'center' }}>
          {fieldConfig.icon} What's their {fieldConfig.label.toLowerCase()}?
        </p>

        <input
          type={fieldConfig.type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder={fieldConfig.placeholder}
          autoFocus
          style={{
            width: '100%', maxWidth: '320px', padding: '14px 18px',
            borderRadius: '16px', border: '2px solid rgba(0,0,0,0.1)',
            fontSize: '16px', textAlign: 'center', outline: 'none',
            background: '#fafafa',
          }}
        />
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onDismiss()}
          style={{
            flex: 1, padding: '12px', borderRadius: '14px',
            border: '1px solid rgba(0,0,0,0.1)', background: 'white',
            fontSize: '14px', fontWeight: 500, color: '#666', cursor: 'pointer',
          }}
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          disabled={!value.trim() || isSubmitting}
          style={{
            flex: 2, padding: '12px', borderRadius: '14px',
            border: 'none', background: '#406A56', color: 'white',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            opacity: (!value.trim() || isSubmitting) ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ─── Profile field mapping for pill/favorites types ─── */
const PROFILE_FIELD_MAP: Record<string, string> = {
  personality: 'personality_traits',
  religion: 'religions',
  skills: 'skills',
  languages: 'languages',
  favorite_books: 'favorite_books',
  favorite_movies: 'favorite_movies',
  favorite_music: 'favorite_music',
  favorite_foods: 'favorite_foods',
}

/* ─── Pill Selection Back (personality, religion, skills, languages) ─── */

const PILL_OPTIONS: Record<string, string[]> = {
  personality: [
    'Creative', 'Analytical', 'Empathetic', 'Adventurous', 'Organized', 'Spontaneous',
    'Introverted', 'Extroverted', 'Patient', 'Ambitious', 'Resilient', 'Curious',
    'Compassionate', 'Independent', 'Loyal', 'Optimistic', 'Practical', 'Thoughtful',
    'Humorous', 'Detail-oriented', 'Big-picture', 'Calm', 'Energetic', 'Spiritual',
  ],
  religion: [
    'Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism',
    'Spiritual but not religious', 'Agnostic', 'Atheist', 'Bahá\'í', 'Taoism',
    'Jainism', 'Shinto', 'Indigenous', 'Other',
  ],
  skills: [
    'Leadership', 'Public Speaking', 'Writing', 'Teaching', 'Problem Solving',
    'Negotiation', 'Project Management', 'Mentoring', 'Cooking', 'Gardening',
    'Photography', 'Music', 'Art', 'Coding', 'Design', 'Carpentry',
    'Financial Planning', 'First Aid', 'Driving', 'Swimming', 'Crafts',
  ],
  languages: [
    'English', 'Spanish', 'French', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese',
    'Russian', 'Japanese', 'Korean', 'German', 'Italian', 'Vietnamese', 'Thai',
    'Turkish', 'Polish', 'Dutch', 'Greek', 'Hebrew', 'Tagalog', 'Swahili',
    'Sign Language', 'Other',
  ],
}

function PillSelectionBack({
  prompt,
  config,
  onAnswer,
  onDismiss,
  getPromptText,
}: {
  prompt: Prompt
  config: any
  onAnswer: (id: string, r: any) => Promise<void>
  onDismiss: () => void
  getPromptText: (p: Prompt) => string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customValue, setCustomValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const options = PILL_OPTIONS[prompt.type] || []
  const isMulti = true // all pill types support multi-select

  const toggle = (val: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (isMulti) {
        if (next.has(val)) next.delete(val); else next.add(val)
      } else {
        next.clear(); next.add(val)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size === 0 && !customValue.trim()) return
    setIsSubmitting(true)
    const vals = Array.from(selected)
    if (customValue.trim()) vals.push(customValue.trim())

    // Save to profile directly
    const profileField = PROFILE_FIELD_MAP[prompt.type]
    if (profileField) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Merge with existing values (don't overwrite)
          const { data: existing } = await supabase
            .from('profiles')
            .select(profileField)
            .eq('id', user.id)
            .single()
          const existingVals: string[] = (existing as any)?.[profileField] || []
          const merged = [...new Set([...existingVals, ...vals])]
          await supabase.from('profiles').update({ [profileField]: merged }).eq('id', user.id)
        }
      } catch (err) {
        console.error('Failed to save to profile:', err)
      }
    }

    await onAnswer(prompt.id, { type: 'selection', text: vals.join(', '), data: { values: vals, field: prompt.type } })
    onDismiss()
  }

  return (
    <div className="h-full flex flex-col pt-14" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      <div style={{ padding: '0 20px 8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#2d2d2d', margin: '0 0 4px' }}>
          {getPromptText(prompt)}
        </p>
        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
          {isMulti ? 'Select all that apply' : 'Choose one'}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              border: `2px solid ${selected.has(opt) ? '#406A56' : 'rgba(0,0,0,0.1)'}`,
              background: selected.has(opt) ? '#406A56' : 'white',
              color: selected.has(opt) ? 'white' : '#444',
              fontSize: '14px',
              fontWeight: selected.has(opt) ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {opt}
          </button>
        ))}

        {/* Custom option */}
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="+ Add your own..."
          style={{
            padding: '8px 16px',
            borderRadius: '100px',
            border: '2px dashed rgba(0,0,0,0.15)',
            background: 'transparent',
            fontSize: '14px',
            color: '#666',
            outline: 'none',
            minWidth: '140px',
          }}
        />
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onDismiss()}
          style={{
            flex: 1, padding: '12px', borderRadius: '14px',
            border: '1px solid rgba(0,0,0,0.1)', background: 'white',
            fontSize: '14px', fontWeight: 500, color: '#666', cursor: 'pointer',
          }}
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          disabled={selected.size === 0 || isSubmitting}
          style={{
            flex: 2, padding: '12px', borderRadius: '14px',
            border: 'none', background: '#406A56', color: 'white',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            opacity: (selected.size === 0 || isSubmitting) ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Saving...' : `Save (${selected.size} selected)`}
        </button>
      </div>
    </div>
  )
}

/* ─── Favorites List Back (books, movies, music, foods) ─── */

const FAVORITES_SUGGESTIONS: Record<string, string[]> = {
  favorite_books: [
    'To Kill a Mockingbird', 'The Great Gatsby', '1984', 'Pride and Prejudice',
    'Harry Potter', 'The Lord of the Rings', 'The Alchemist', 'Sapiens',
    'The Bible', 'Don Quixote', 'Beloved', 'One Hundred Years of Solitude',
    'The Catcher in the Rye', 'Brave New World', 'The Little Prince',
  ],
  favorite_movies: [
    'The Shawshank Redemption', 'The Godfather', 'Forrest Gump', 'The Lion King',
    'Pulp Fiction', 'Inception', 'The Matrix', 'Titanic', 'Star Wars',
    'Schindler\'s List', 'Goodfellas', 'The Dark Knight', 'Fight Club',
    'The Wizard of Oz', 'Casablanca', 'Back to the Future',
  ],
  favorite_music: [
    'The Beatles', 'Michael Jackson', 'Queen', 'Bob Marley', 'Elvis Presley',
    'Beyoncé', 'Taylor Swift', 'Stevie Wonder', 'Frank Sinatra', 'Aretha Franklin',
    'Led Zeppelin', 'Nirvana', 'Kendrick Lamar', 'Adele', 'Bach', 'Mozart',
  ],
  favorite_foods: [
    'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Curry', 'Burgers', 'Ramen',
    'Pad Thai', 'Steak', 'Ice Cream', 'Chocolate', 'Biryani', 'Dim Sum',
    'Paella', 'Pho', 'BBQ Ribs', 'Fresh Bread', 'Mom\'s Cooking',
  ],
}

const FAVORITES_LABELS: Record<string, { title: string; placeholder: string; addLabel: string }> = {
  favorite_books: { title: '📚 Your Favorite Books', placeholder: 'Search or add a book...', addLabel: 'Add book' },
  favorite_movies: { title: '🎬 Your Favorite Movies', placeholder: 'Search or add a movie...', addLabel: 'Add movie' },
  favorite_music: { title: '🎵 Your Favorite Music', placeholder: 'Search or add an artist...', addLabel: 'Add artist' },
  favorite_foods: { title: '🍕 Your Favorite Foods', placeholder: 'Search or add a dish...', addLabel: 'Add food' },
}

function FavoritesListBack({
  prompt,
  config,
  onAnswer,
  onDismiss,
  getPromptText,
}: {
  prompt: Prompt
  config: any
  onAnswer: (id: string, r: any) => Promise<void>
  onDismiss: () => void
  getPromptText: (p: Prompt) => string
}) {
  const [items, setItems] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = FAVORITES_SUGGESTIONS[prompt.type] || []
  const labels = FAVORITES_LABELS[prompt.type] || { title: 'Your Favorites', placeholder: 'Add an item...', addLabel: 'Add' }

  // Filter suggestions based on input and already-added items
  const filteredSuggestions = inputValue.trim().length > 0
    ? suggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) && !items.includes(s)
      ).slice(0, 6)
    : suggestions.filter(s => !items.includes(s)).slice(0, 8)

  const addItem = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !items.includes(trimmed)) {
      setItems(prev => [...prev, trimmed])
    }
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeItem = (val: string) => {
    setItems(prev => prev.filter(i => i !== val))
  }

  const handleSave = async () => {
    if (items.length === 0) return
    setIsSubmitting(true)

    // Save to profile
    const profileField = PROFILE_FIELD_MAP[prompt.type]
    if (profileField) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existing } = await supabase
            .from('profiles')
            .select(profileField)
            .eq('id', user.id)
            .single()
          const existingVals: string[] = (existing as any)?.[profileField] || []
          const merged = [...new Set([...existingVals, ...items])]
          await supabase.from('profiles').update({ [profileField]: merged }).eq('id', user.id)
        }
      } catch (err) {
        console.error('Failed to save favorites to profile:', err)
      }
    }

    await onAnswer(prompt.id, { type: 'selection', text: items.join(', '), data: { values: items, field: prompt.type } })
    onDismiss()
  }

  return (
    <div className="h-full flex flex-col pt-14" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#2d2d2d', margin: '0 0 4px' }}>
          {labels.title}
        </p>
        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
          Type to search or pick from suggestions
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {/* Input with inline add */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault()
                  addItem(inputValue)
                }
              }}
              placeholder={labels.placeholder}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '12px',
                border: '2px solid rgba(0,0,0,0.1)', fontSize: '14px',
                outline: 'none', background: '#fafafa',
              }}
              autoFocus
            />
            {inputValue.trim() && (
              <button
                onClick={() => addItem(inputValue)}
                style={{
                  padding: '10px 16px', borderRadius: '12px', border: 'none',
                  background: '#406A56', color: 'white', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                + Add
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden',
              maxHeight: '200px', overflowY: 'auto',
            }}>
              {!inputValue.trim() && (
                <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Popular picks
                </div>
              )}
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => addItem(s)}
                  style={{
                    width: '100%', padding: '10px 14px', textAlign: 'left',
                    border: 'none', background: 'transparent', fontSize: '14px',
                    color: '#333', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '8px',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(64,106,86,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: '#406A56', fontWeight: 600 }}>+</span> {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Added items as removable chips */}
        {items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {items.map(item => (
              <div
                key={item}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '100px',
                  background: '#406A56', color: 'white',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                {item}
                <button
                  onClick={() => removeItem(item)}
                  style={{
                    background: 'rgba(255,255,255,0.3)', border: 'none',
                    width: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'white', fontSize: '12px', fontWeight: 700,
                    padding: 0, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && !showSuggestions && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: '13px', marginTop: '24px' }}>
            Start typing or pick from suggestions above
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onDismiss()}
          style={{
            flex: 1, padding: '12px', borderRadius: '14px',
            border: '1px solid rgba(0,0,0,0.1)', background: 'white',
            fontSize: '14px', fontWeight: 500, color: '#666', cursor: 'pointer',
          }}
        >
          Skip
        </button>
        <button
          onClick={handleSave}
          disabled={items.length === 0 || isSubmitting}
          style={{
            flex: 2, padding: '12px', borderRadius: '14px',
            border: 'none', background: '#406A56', color: 'white',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            opacity: (items.length === 0 || isSubmitting) ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Saving...' : `Save ${items.length} item${items.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

/* ─── Binary Choice Back (quick A/B decisions) ─── */

function BinaryChoiceBack({
  prompt,
  config,
  onAnswer,
  onDismiss,
  getPromptText,
}: {
  prompt: Prompt
  config: any
  onAnswer: (id: string, r: any) => Promise<void>
  onDismiss: () => void
  getPromptText: (p: Prompt) => string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const options = prompt.metadata?.options || ['Option A', 'Option B']

  const handleChoice = async (choice: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    await onAnswer(prompt.id, { type: 'selection', text: choice, data: { choice } })
    onDismiss()
  }

  return (
    <div className="h-full flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
      {/* Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#2d2d2d', marginBottom: '32px', lineHeight: 1.4 }}>
          {getPromptText(prompt)}
        </p>

        {/* Two big tap targets */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '360px' }}>
          {options.slice(0, 2).map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => handleChoice(opt)}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '24px 16px',
                borderRadius: '20px',
                border: 'none',
                background: i === 0
                  ? 'linear-gradient(135deg, #406A56, #5a9a7a)'
                  : 'linear-gradient(135deg, #C35F33, #e08a60)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <button
          onClick={() => onDismiss()}
          style={{
            marginTop: '20px', padding: '8px 24px', borderRadius: '10px',
            border: 'none', background: 'transparent', color: '#999',
            fontSize: '13px', cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
