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
  onCardDismiss: (promptId: string) => void
  onCardAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => Promise<void>
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

  const goBack = useCallback(() => {
    if (dismissedIds.size > 0) {
      const ids = Array.from(dismissedIds)
      const lastId = ids[ids.length - 1]
      setDismissedIds(prev => {
        const next = new Set(prev)
        next.delete(lastId)
        return next
      })
    }
  }, [dismissedIds])

  const skipCurrent = useCallback(() => {
    if (visiblePrompts.length > 0) {
      handleDismiss(visiblePrompts[0].id)
    }
  }, [visiblePrompts, handleDismiss])

  const canGoBack = dismissedIds.size > 0

  // Auto-focus on mount for keyboard navigation
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visiblePrompts.length === 0) return
      
      const currentPrompt = visiblePrompts[0]
      
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        skipCurrent()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visiblePrompts, skipCurrent, goBack])

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
    <div ref={containerRef} className="relative h-[600px] w-full mx-auto focus:outline-none" tabIndex={0}>
      {/* Left Arrow — Go Back */}
      <button
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
        title="Go back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Right Arrow — Skip */}
      <button
        onClick={skipCurrent}
        style={{
          position: 'absolute',
          right: '-52px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 30,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(64,106,86,0.12)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#406A56',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(64,106,86,0.2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(64,106,86,0.12)' }}
        title="Skip"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="relative h-full">
        <AnimatePresence mode="popLayout">
          {visiblePrompts.slice(0, 3).map((prompt, index) => (
            <FlippableCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              totalVisible={Math.min(visiblePrompts.length, 3)}
              onDismiss={() => handleDismiss(prompt.id)}
              onGoBack={index === 0 ? goBack : undefined}
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
  onGoBack?: () => void
  onAnswer: (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => Promise<void>
  getPromptText: (prompt: Prompt) => string
}

function FlippableCard({
  prompt,
  index,
  totalVisible,
  onDismiss,
  onGoBack,
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
    if (isFlipped) return // Don't dismiss while flipped
    
    const threshold = 80
    const velocity = Math.abs(info.velocity.x)
    const offset = info.offset.x
    const absOffset = Math.abs(offset)
    
    if (absOffset > threshold || (velocity > 500 && absOffset > 30)) {
      if (offset > 0) {
        // Swiped RIGHT → skip (dismiss current)
        onDismiss()
      } else if (onGoBack) {
        // Swiped LEFT → go back to previous (don't dismiss current card)
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

              <p className="text-xs text-gray-400 text-center mt-4">
                Tap to answer • ← Go back • → Skip
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


    </motion.div>
  )
}
