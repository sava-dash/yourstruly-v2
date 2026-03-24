'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Sparkles, Mic, Send, RotateCcw, Loader2, Square, Bookmark } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface OnboardingPrompt {
  id: string
  type: string
  promptText: string
  photoUrl?: string
  contactName?: string
  contactId?: string
  metadata?: any
}

interface OnboardingCardsProps {
  name: string
  places: string[]
  contacts: { name: string; relationship: string }[]
  interests: string[]
  uploadedPhotos: { id: string; preview: string; fileUrl?: string; locationName?: string | null }[]
  onComplete: (answeredCount: number) => void
  onSkip: () => void
}

// ============================================================================
// Prompt Generator — builds 5 personalized prompts from collected data
// ============================================================================

function generateOnboardingPrompts(
  name: string,
  places: string[],
  contacts: { name: string; relationship: string }[],
  interests: string[],
  photos: { id: string; preview: string; fileUrl?: string; locationName?: string | null }[],
): OnboardingPrompt[] {
  const prompts: OnboardingPrompt[] = []
  let id = 0

  // 1. Funny story about someone (memory_prompt type)
  if (contacts.length > 0) {
    const person = contacts[Math.floor(Math.random() * contacts.length)]
    prompts.push({
      id: `onb-${id++}`,
      type: 'memory_prompt',
      promptText: `${name}, what's the funniest story you have about ${person.name}? The kind that makes everyone laugh at family dinners.`,
      contactName: person.name,
      metadata: { question_text: `Funniest story about ${person.name}` },
    })
  } else {
    prompts.push({
      id: `onb-${id++}`,
      type: 'memory_prompt',
      promptText: `${name}, what's the funniest thing that's ever happened to you? The kind of story you always tell at parties.`,
      metadata: { question_text: 'Funniest personal story' },
    })
  }

  // 2. Contact information — DOB, email, phone, address (missing_info type)
  if (contacts.length > 0) {
    // Pick a contact that would naturally have info to fill
    const person = contacts.find(c =>
      ['mom', 'dad', 'mother', 'father', 'spouse', 'wife', 'husband', 'partner', 'sister', 'brother'].includes(c.relationship.toLowerCase())
    ) || contacts[0]
    prompts.push({
      id: `onb-${id++}`,
      type: 'missing_info',
      promptText: `Do you know ${person.name}'s birthday, email, or phone number? Fill in what you can.`,
      contactName: person.name,
      metadata: {
        missing_field: 'contact_info',
        contact_name: person.name,
      },
    })
  } else {
    // No contacts — ask about a loved one instead
    prompts.push({
      id: `onb-${id++}`,
      type: 'missing_info',
      promptText: `Think of someone important to you. What's their birthday, phone, or email? Add their info so we can help you remember.`,
      metadata: { missing_field: 'contact_info' },
    })
  }

  // 3. Question about a move — how they felt at that age (memory_prompt type)
  if (places.length > 1) {
    const fromPlace = places[0]
    const toPlace = places[1]
    prompts.push({
      id: `onb-${id++}`,
      type: 'memory_prompt',
      promptText: `When you moved from ${fromPlace} to ${toPlace}, how did it feel? Were you excited, nervous, sad? What do you remember most about that transition?`,
      metadata: { question_text: `Moving from ${fromPlace} to ${toPlace}` },
    })
  } else if (places.length === 1) {
    prompts.push({
      id: `onb-${id++}`,
      type: 'memory_prompt',
      promptText: `You've been in ${places[0]} — what made you stay? Was there ever a moment you almost left, or a reason you knew this was home?`,
      metadata: { question_text: `Life in ${places[0]}` },
    })
  } else {
    prompts.push({
      id: `onb-${id++}`,
      type: 'memory_prompt',
      promptText: `${name}, where did you grow up? What's a smell, sound, or feeling from that place that instantly takes you back?`,
      metadata: { question_text: 'Growing up memories' },
    })
  }

  // 4. Photo backstory (if they uploaded photos)
  if (photos.length > 0) {
    const photo = photos[Math.floor(Math.random() * photos.length)]
    prompts.push({
      id: `onb-${id++}`,
      type: 'photo_backstory',
      promptText: photo.locationName
        ? `Tell us about this photo from ${photo.locationName}. What was happening that day?`
        : `What's the story behind this photo? Who's in it, and what were you doing?`,
      photoUrl: photo.fileUrl || photo.preview,
      metadata: { photo_id: photo.id },
    })
  } else {
    // No photos — ask a favorites question instead
    prompts.push({
      id: `onb-${id++}`,
      type: 'favorites_firsts',
      promptText: `${name}, what's a meal that takes you back to childhood? Who made it, and what made it special?`,
      metadata: { question_text: 'Childhood meal memory' },
    })
  }

  // 5. Interest or wisdom card
  if (interests.length > 0) {
    const interest = interests[Math.floor(Math.random() * interests.length)]
    prompts.push({
      id: `onb-${id++}`,
      type: 'knowledge',
      promptText: `You're into ${interest}. If you could give one piece of advice to someone just starting out, what would it be?`,
      metadata: { question_text: `Advice about ${interest}` },
    })
  } else {
    prompts.push({
      id: `onb-${id++}`,
      type: 'knowledge',
      promptText: `${name}, what's one piece of advice you wish someone had given you 10 years ago?`,
      metadata: { question_text: 'Life advice' },
    })
  }

  return prompts
}

// ============================================================================
// Type config (subset matching dashboard)
// ============================================================================

const TYPE_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  memory_prompt: { bg: '#F3E8F9', accent: '#4A3552', label: 'Remember When' },
  missing_info: { bg: '#E8F2ED', accent: '#406A56', label: 'Quick Info' },
  photo_backstory: { bg: '#FDF9E3', accent: '#B8A61A', label: 'Photo Story' },
  favorites_firsts: { bg: '#FCE8E8', accent: '#C35F33', label: 'Your Favorites' },
  knowledge: { bg: '#FCE8E8', accent: '#C35F33', label: 'Share Wisdom' },
}

// ============================================================================
// Main Component
// ============================================================================

export function OnboardingCards({
  name,
  places,
  contacts,
  interests,
  uploadedPhotos,
  onComplete,
  onSkip,
}: OnboardingCardsProps) {
  const prompts = useMemo(
    () => generateOnboardingPrompts(name, places, contacts, interests, uploadedPhotos),
    [name, places, contacts, interests, uploadedPhotos]
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  const [direction, setDirection] = useState(0)

  const currentPrompt = prompts[currentIndex % prompts.length] // loop
  const colors = TYPE_COLORS[currentPrompt.type] || TYPE_COLORS.memory_prompt

  const goForward = useCallback(() => {
    setDirection(1)
    setCurrentIndex(prev => (prev + 1) % prompts.length)
  }, [prompts.length])

  const goBack = useCallback(() => {
    setDirection(-1)
    setCurrentIndex(prev => (prev - 1 + prompts.length) % prompts.length)
  }, [prompts.length])

  const handleAnswered = useCallback((promptId: string) => {
    setAnsweredIds(prev => new Set([...prev, promptId]))
    goForward()
  }, [goForward])

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] mb-3">
          <Sparkles size={20} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-[#2d2d2d] font-playfair">
          Try It Out
        </h2>
        <p className="text-gray-500 text-xs mt-1">
          Tap a card to answer • Swipe to skip • Answer as many as you like
        </p>
      </div>

      {/* Card counter */}
      <div className="text-center text-xs text-gray-400 mb-3">
        {currentIndex % prompts.length + 1} / {prompts.length}
        {answeredIds.size > 0 && (
          <span className="ml-2 text-[#406A56] font-medium">
            ✓ {answeredIds.size} answered
          </span>
        )}
      </div>

      {/* Card area */}
      <div className="relative h-[420px] mx-auto" style={{ maxWidth: '380px' }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <OnboardingFlippableCard
            key={currentPrompt.id + '-' + currentIndex}
            prompt={currentPrompt}
            colors={colors}
            onGoForward={goForward}
            onGoBack={goBack}
            onAnswered={handleAnswered}
          />
        </AnimatePresence>
      </div>

      {/* Continue button */}
      <div className="text-center mt-6">
        <button
          onClick={() => onComplete(answeredIds.size)}
          className="px-8 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors"
        >
          {answeredIds.size > 0 ? 'Continue →' : 'Skip for now →'}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Flippable Card (simplified from dashboard version)
// ============================================================================

function OnboardingFlippableCard({
  prompt,
  colors,
  onGoForward,
  onGoBack,
  onAnswered,
}: {
  prompt: OnboardingPrompt
  colors: { bg: string; accent: string; label: string }
  onGoForward: () => void
  onGoBack: () => void
  onAnswered: (id: string) => void
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [responseText, setResponseText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [exchanges, setExchanges] = useState<{ question: string; response: string }[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const speechRecRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const usedWebSpeechRef = useRef(false) // track if Web Speech API captured text

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5])

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (isFlipped) return

    const threshold = 30 // smaller threshold for onboarding
    const velocity = Math.abs(info.velocity.x)
    const offset = info.offset.x
    const absOffset = Math.abs(offset)

    if (absOffset > threshold || (velocity > 250 && absOffset > 10)) {
      if (offset > 0) {
        onGoForward() // swipe right = dismiss/next
      } else {
        onGoBack()    // swipe left = back
      }
    }

    setTimeout(() => { isDragging.current = false }, 50)
  }

  const handleClick = () => {
    if (isDragging.current) return
    if (!isFlipped) {
      setIsFlipped(true)
      setTimeout(() => textareaRef.current?.focus(), 400)
    }
  }

  const flipBack = () => {
    if (isRecording) stopRecording()
    setIsFlipped(false)
    setResponseText('')
    setInterimText('')
  }

  const MAX_FOLLOW_UPS = 3

  // Fetch AI follow-up question
  const fetchFollowUp = async (currentExchanges: { question: string; response: string }[]) => {
    setIsLoadingFollowUp(true)
    try {
      const res = await fetch('/api/conversation/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: prompt.type,
          originalPrompt: prompt.promptText,
          exchanges: currentExchanges,
        }),
      })
      const data = await res.json()
      if (data.followUpQuestion) {
        setCurrentQuestion(data.followUpQuestion)
      } else if (data.shouldEnd) {
        setShowSavePrompt(true)
      }
    } catch {
      // No follow-up — that's fine
    }
    setIsLoadingFollowUp(false)
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      usedWebSpeechRef.current = false

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())

        // Only use API transcription if Web Speech didn't capture anything
        if (!usedWebSpeechRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          if (speechRecRef.current) {
            try { speechRecRef.current.stop() } catch {}
            speechRecRef.current = null
          }
          setInterimText('')

          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')
          try {
            const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
            const data = await res.json()
            const text = data.transcription || data.text || ''
            if (text) setResponseText(prev => prev ? `${prev} ${text}` : text)
          } catch {}
        } else {
          // Web Speech already captured — just clean up
          if (speechRecRef.current) {
            try { speechRecRef.current.stop() } catch {}
            speechRecRef.current = null
          }
          setInterimText('')
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      // Live interim transcription via Web Speech API
      try {
        const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        if (SR) {
          const recognition = new SR()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.onresult = (event: any) => {
            let interim = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                usedWebSpeechRef.current = true
                setResponseText(prev => prev ? `${prev} ${event.results[i][0].transcript}` : event.results[i][0].transcript)
                setInterimText('')
              } else {
                interim += event.results[i][0].transcript
              }
            }
            if (interim) setInterimText(interim)
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (speechRecRef.current) {
      try { speechRecRef.current.stop() } catch {}
      speechRecRef.current = null
    }
    setInterimText('')
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    if (isRecording) stopRecording()
    const text = responseText.trim()
    if (!text || isSubmitting) return

    const questionText = currentQuestion || prompt.promptText
    const newExchange = { question: questionText, response: text }
    const updatedExchanges = [...exchanges, newExchange]
    setExchanges(updatedExchanges)
    setResponseText('')
    setInterimText('')
    setCurrentQuestion('')

    // After MAX_FOLLOW_UPS exchanges, show save prompt
    if (updatedExchanges.length >= MAX_FOLLOW_UPS) {
      setShowSavePrompt(true)
    } else {
      // Fetch follow-up question
      await fetchFollowUp(updatedExchanges)
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSaveMemory = async () => {
    if (isRecording) stopRecording()
    setIsSubmitting(true)
    try {
      const fullText = exchanges.map(e => `Q: ${e.question}\nA: ${e.response}`).join('\n\n')
      const summary = exchanges.map(e => e.response).join(' ')

      await fetch('/api/conversation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: prompt.type,
          exchanges,
          summary,
          expectedXp: 15,
        }),
      })
    } catch (err) {
      console.error('Save failed:', err)
    }
    setIsSubmitting(false)
    setIsFlipped(false)
    setResponseText('')
    setExchanges([])
    setCurrentQuestion('')
    setShowSavePrompt(false)
    onAnswered(prompt.id)
  }

  const handleAddMore = () => {
    setShowSavePrompt(false)
    setCurrentQuestion('')
    fetchFollowUp(exchanges)
  }

  return (
    <motion.div
      style={{ x, rotate, opacity, position: 'absolute', inset: 0 }}
      drag={isFlipped ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragStart={() => { isDragging.current = true }}
      onDragEnd={handleDragEnd}
      onClick={isFlipped ? undefined : handleClick}
      className="cursor-pointer"
    >
      <div
        className="w-full h-full"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
        >
          {/* FRONT */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              borderRadius: '24px',
              overflow: 'hidden',
              background: colors.bg,
              border: `2px solid ${colors.accent}20`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {/* Photo preview */}
              {prompt.photoUrl && (
                <div className="mb-4 w-32 h-32 rounded-xl overflow-hidden shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={prompt.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Type label */}
              <span
                className="text-xs font-semibold uppercase tracking-wider mb-3 px-3 py-1 rounded-full"
                style={{ color: colors.accent, background: `${colors.accent}15` }}
              >
                {colors.label}
              </span>

              {/* Prompt text */}
              <p className="text-lg font-medium text-[#2d2d2d] leading-relaxed max-w-xs">
                {prompt.promptText}
              </p>

              {/* Contact name */}
              {prompt.contactName && (
                <p className="text-sm text-gray-500 mt-2">
                  About: <span className="font-medium">{prompt.contactName}</span>
                </p>
              )}

              {/* Tap hint */}
              <p className="text-xs text-gray-400 mt-6">
                Tap to answer • Swipe to skip
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              borderRadius: '24px',
              overflow: 'hidden',
              background: '#ffffff',
              border: `2px solid ${colors.accent}20`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex flex-col h-full">
              {/* Back header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: colors.accent, background: `${colors.accent}15` }}
                >
                  {colors.label}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); flipBack() }}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Conversation thread */}
              <div className="flex-1 overflow-y-auto px-4 pb-2">
                {/* Original question (when no exchanges yet) */}
                {exchanges.length === 0 && !showSavePrompt && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-[#406A56] leading-relaxed">
                      {prompt.promptText}
                    </p>
                  </div>
                )}

                {/* Past exchanges */}
                {exchanges.map((ex, i) => (
                  <div key={i} className="mb-3">
                    <div className="bg-[#406A56]/5 rounded-2xl rounded-bl-sm px-3 py-2 mb-1.5">
                      <p className="text-xs text-[#406A56] font-medium">{ex.question}</p>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-br-sm px-3 py-2 ml-4">
                      <p className="text-xs text-gray-800">{ex.response}</p>
                    </div>
                  </div>
                ))}

                {/* Current follow-up question */}
                {currentQuestion && !showSavePrompt && (
                  <div className="bg-[#406A56]/5 rounded-2xl rounded-bl-sm px-3 py-2 mb-2">
                    <p className="text-xs text-[#406A56] font-medium">{currentQuestion}</p>
                  </div>
                )}

                {/* Loading follow-up */}
                {isLoadingFollowUp && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs px-2 py-2">
                    <Loader2 size={12} className="animate-spin" />
                    Thinking...
                  </div>
                )}

                {/* Save prompt after MAX_FOLLOW_UPS */}
                {showSavePrompt && (
                  <div className="bg-amber-50 rounded-2xl p-4 text-center">
                    <p className="text-sm font-medium text-gray-800 mb-3">
                      Great story! Save this memory or keep going?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddMore() }}
                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Keep Going
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveMemory() }}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#406A56] text-white text-xs font-medium hover:bg-[#4a7a64] disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : '✨ Save Memory'}
                      </button>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input area (hidden when save prompt is showing) */}
              {!showSavePrompt && (
                <div className="px-3 pb-3 pt-2 border-t border-gray-100">
                  <div className="relative mb-2">
                    <textarea
                      ref={textareaRef}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder={prompt.type === 'missing_info'
                        ? 'Enter their info (birthday, phone, email...)'
                        : 'Share your thoughts...'
                      }
                      rows={2}
                      className="w-full p-3 bg-gray-50 rounded-2xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30 text-gray-800 text-sm placeholder-gray-400"
                      style={interimText ? { color: 'transparent', caretColor: '#1f2937' } : undefined}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                    />
                    {interimText && (
                      <div className="absolute inset-0 p-3 pointer-events-none text-sm">
                        <span className="text-gray-800">{responseText}</span>
                        <span className="text-gray-400 italic">{interimText}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        isRecording ? stopRecording() : startRecording()
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                        isRecording
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isRecording ? <Square size={14} fill="white" /> : <Mic size={16} />}
                    </button>
                    {/* Save Memory button (after 1+ exchanges) */}
                    {exchanges.length >= 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveMemory() }}
                        disabled={isSubmitting}
                        className="flex-1 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : '✨ Save Memory'}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSubmit() }}
                      disabled={!responseText.trim() || isSubmitting}
                      className="w-10 h-10 rounded-full bg-[#406A56] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a7a64] transition-colors flex-shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
