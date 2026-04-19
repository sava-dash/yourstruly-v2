'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Square, X, Send, Loader2, MapPin, Calendar, Users, Music,
  Sparkles, BookOpen, Heart, ChevronRight, Check, MessageSquare, Keyboard
} from 'lucide-react'
import { useChat, type ChatMode } from '@/hooks/useChat'
import { useRouter } from 'next/navigation'

// ─── Types ───
interface ExtractedEntity {
  type: 'location' | 'date' | 'person' | 'mood' | 'topic'
  value: string
  confidence?: number
}

interface SourceCard {
  type: string
  id: string
  title: string
}

type ConciergeMode = 'listening' | 'processing' | 'chat' | 'creating'

// ─── Entity display config ───
const ENTITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  location: { icon: MapPin, color: '#2D5A3D', bg: '#E6F0EA', label: 'Location' },
  date: { icon: Calendar, color: '#C4A235', bg: '#FAF5E4', label: 'When' },
  person: { icon: Users, color: '#B8562E', bg: '#FBF0EB', label: 'People' },
  mood: { icon: Heart, color: '#6B5B95', bg: '#EFEAF5', label: 'Mood' },
  topic: { icon: BookOpen, color: '#2D5A3D', bg: '#E6F0EA', label: 'Topic' },
}

// ─── Component ───
interface ConciergeProps {
  isOpen: boolean
  onClose: () => void
  onCreateMemory?: (draft: {
    title: string; description: string; location?: string; date?: string; people?: string[]; mood?: string
  }) => void
}

interface AvatarPersonaListItem {
  kind: 'self' | 'contact'
  subjectContactId: string | null
  displayName: string
  relationship: string | null
  avatarUrl: string | null
  synthesized: boolean
  sourceCount: number
  transcriptCount: number | null
}

export default function AIConcierge({ isOpen, onClose, onCreateMemory }: ConciergeProps) {
  const router = useRouter()
  // Mode toggle: 'concierge' (talks ABOUT your life + helps with the app)
  // vs 'avatar' (talks AS you, in first person, using your synthesized
  // Persona Card). Switching modes resets the chat thread because each
  // mode owns its own conversation in chat_sessions.
  const [chatMode, setChatMode] = useState<ChatMode>('concierge')
  // When mode='avatar': null = self avatar, non-null = chat with that
  // contact's loved-one avatar.
  const [subjectContactId, setSubjectContactId] = useState<string | null>(null)
  // Lazy-loaded list of personas the user can talk to. Fetched the first
  // time the user enters Avatar mode and refreshed when re-entered.
  const [personas, setPersonas] = useState<AvatarPersonaListItem[] | null>(null)
  const [personasLoading, setPersonasLoading] = useState(false)
  const { messages, isLoading, sendMessage, clearChat } = useChat({
    mode: chatMode,
    subjectContactId,
  })

  // Fetch the persona list whenever Avatar mode is entered (and the modal
  // is open). The endpoint is cheap — single roundtrip, no LLM calls.
  useEffect(() => {
    if (!isOpen || chatMode !== 'avatar') return
    let cancelled = false
    setPersonasLoading(true)
    fetch('/api/avatar/personas')
      .then(async (r) => (r.ok ? r.json() : { personas: [] }))
      .then((data) => { if (!cancelled) setPersonas(data?.personas || []) })
      .catch(() => { if (!cancelled) setPersonas([]) })
      .finally(() => { if (!cancelled) setPersonasLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, chatMode])

  const activePersona: AvatarPersonaListItem | null =
    chatMode === 'avatar'
      ? (personas || []).find((p) =>
          subjectContactId ? p.subjectContactId === subjectContactId : p.kind === 'self'
        ) || null
      : null

  // Voice state
  const [mode, setMode] = useState<ConciergeMode>('listening')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [textInput, setTextInput] = useState('')
  const [useTextMode, setUseTextMode] = useState(false)

  // Extraction state
  const [entities, setEntities] = useState<ExtractedEntity[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [memoryDraft, setMemoryDraft] = useState<{
    title: string; description: string; location?: string; date?: string; people?: string[]; mood?: string
  } | null>(null)
  const [savingMemory, setSavingMemory] = useState(false)
  const [memorySaved, setMemorySaved] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const speechRecRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when closed — don't auto-start mic (requires user gesture on mobile)
  useEffect(() => {
    if (!isOpen) {
      stopListening()
      setMode('listening')
      setTranscript('')
      setInterimText('')
      setTextInput('')
      setEntities([])
      setMemoryDraft(null)
      setMemorySaved(false)
      clearChat()
    }
  }, [isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Voice Recording (Web Speech API) ───
  const [micError, setMicError] = useState<string | null>(null)

  const startListening = useCallback(async () => {
    setMicError(null)

    // First request microphone permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Got permission — stop the stream immediately (we just needed the permission grant)
      stream.getTracks().forEach(t => t.stop())
    } catch (err: any) {
      console.error('Mic permission denied:', err)
      setMicError('Microphone access denied. Please allow microphone in your browser settings.')
      setUseTextMode(true)
      return
    }

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) {
      setMicError('Speech recognition not supported in this browser. Using text input.')
      setUseTextMode(true)
      return
    }

    // Stop any existing recognition first
    if (speechRecRef.current) {
      try { speechRecRef.current.abort() } catch {}
      speechRecRef.current = null
    }

    try {
      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' '
          } else {
            interim += event.results[i][0].transcript
          }
        }
        if (final) setTranscript(prev => (prev + ' ' + final).trim())
        setInterimText(interim)
      }

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error)
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setMicError('Microphone access denied.')
        } else if (e.error === 'no-speech') {
          // Silence timeout — restart
          return
        } else if (e.error === 'network') {
          setMicError('Network error — speech recognition requires an internet connection.')
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        // If we're still supposed to be recording, restart (handles silence timeouts)
        if (isRecording && speechRecRef.current === recognition) {
          try { recognition.start() } catch { setIsRecording(false) }
        } else {
          setIsRecording(false)
        }
      }

      recognition.start()
      speechRecRef.current = recognition
      setIsRecording(true)
      setMode('listening')
    } catch (err) {
      console.error('Failed to start speech recognition:', err)
      setMicError('Failed to start speech recognition.')
      setUseTextMode(true)
    }
  }, [isRecording])

  const stopListening = useCallback(() => {
    if (speechRecRef.current) {
      try { speechRecRef.current.stop() } catch {}
      speechRecRef.current = null
    }
    setIsRecording(false)
    setInterimText('')
  }, [])

  // ─── Process input (voice or text) ───
  const processInput = useCallback(async (input: string) => {
    if (!input.trim()) return
    stopListening()

    // Determine intent: is this a question/search or a memory creation?
    const isQuestion = /^(tell|what|when|where|who|how|why|show|find|remember|do i|did i|have i)/i.test(input.trim())
    const isCommand = /^(add|create|new|save|go to|open|navigate)/i.test(input.trim())

    if (isQuestion) {
      // ─── RAG Search mode ───
      setMode('chat')
      await sendMessage(input)
    } else if (isCommand) {
      // ─── Command mode ───
      setMode('chat')
      await sendMessage(input)
    } else {
      // ─── Memory creation mode — extract entities ───
      setMode('creating')
      setIsExtracting(true)
      await extractEntities(input)
    }
  }, [sendMessage, stopListening])

  // ─── Basic regex extraction (fallback when AI unavailable) ───
  const basicExtract = useCallback((text: string) => {
    const entities: ExtractedEntity[] = []

    // Date patterns
    const datePatterns = [
      /(?:in |during |around |back in )?((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})/i,
      /(?:in |during |around |back in )?((?:spring|summer|fall|autumn|winter)\s+(?:of\s+)?\d{4})/i,
      /(?:in |during |around |back in )?(\d{4})/,
      /(?:last |this )?(christmas|thanksgiving|easter|new year'?s?|halloween)/i,
      /(?:last |this )?(summer|winter|spring|fall|weekend|month|year)/i,
    ]
    for (const pat of datePatterns) {
      const m = text.match(pat)
      if (m) { entities.push({ type: 'date', value: m[1] || m[0] }); break }
    }

    // Location patterns — case-insensitive, stop at prepositions/years/punctuation
    const stopWords = /\b(?:in|on|at|to|from|with|and|for|the|during|around|back|last|this|was|were|it|we|i|my|our|is|\d{4})\b/i
    const locPatterns = [
      // "in Mexico City, Mexico" or "in Paris, France" — stop before next preposition or year
      /(?:^|\b)(?:in |at |to |from |near |visiting |went to )([a-z][\w]+(?:\s+[a-z][\w]+){0,3})/i,
      // Common place types
      /(?:at |the )(\w+ (?:beach|lake|park|cabin|restaurant|house|hotel|resort|church|school|airport|hospital|farm|ranch))/i,
      /(?:at |the )(beach|lake|mountains?|park|cabin|restaurant|church|school|hospital|airport)/i,
    ]
    for (const pat of locPatterns) {
      const m = text.match(pat)
      if (m && m[1].trim().length > 2) {
        // Trim trailing stop words: "Ibiza in" → "Ibiza"
        let loc = m[1].trim()
        loc = loc.replace(/\s+(?:in|on|at|to|from|with|and|for|the|during|around|back|last|this|was|were|it|we|i|my|our|is)$/i, '').trim()
        // Capitalize
        loc = loc.replace(/\b\w/g, c => c.toUpperCase())
        if (loc.length > 2) {
          entities.push({ type: 'location', value: loc })
          break
        }
      }
    }

    // People patterns — broad matching, case-insensitive
    const peopleMatches: string[] = []
    const skipWords = new Set(['the', 'our', 'some', 'few', 'all', 'them', 'her', 'him', 'his', 'its', 'that', 'this', 'was', 'were', 'really', 'very', 'just', 'also', 'too', 'there', 'here', 'then', 'when', 'where', 'what', 'how', 'about', 'from'])

    // "with Sarah", "with John and Sarah", "with my friend Mike"
    const withPatterns = text.matchAll(/(?:with |and |,\s*)([A-Z][a-z]{2,})/g)
    for (const m of withPatterns) {
      if (!skipWords.has(m[1].toLowerCase())) peopleMatches.push(m[1])
    }

    // Also try case-insensitive: "with sarah"
    if (peopleMatches.length === 0) {
      const withMatch = text.match(/with\s+([\w]+(?:\s+and\s+[\w]+)*)/i)
      if (withMatch) {
        const names = withMatch[1].split(/\s+and\s+/i).map(n => n.trim()).filter(n => n.length > 2)
        names.forEach(n => { if (!skipWords.has(n.toLowerCase())) peopleMatches.push(n) })
      }
    }

    // Relationship words: "my mom", "my brother", etc.
    const relMatches = text.matchAll(/\bmy\s+(mom|dad|mother|father|brother|sister|wife|husband|son|daughter|grandma|grandpa|grandmother|grandfather|aunt|uncle|cousin|friend|partner|boyfriend|girlfriend|fianc[eé]e?)\b/gi)
    for (const m of relMatches) {
      peopleMatches.push(m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase())
    }

    // Named references: "Sarah and I", "John was there"
    const namedRefs = text.matchAll(/\b([A-Z][a-z]{2,})\s+(?:and I|was|were|came|went|loved|said|told|asked)\b/g)
    for (const m of namedRefs) {
      if (!skipWords.has(m[1].toLowerCase())) peopleMatches.push(m[1])
    }

    // Deduplicate
    const uniquePeople = [...new Set(peopleMatches.map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()))]
    uniquePeople.forEach(name => entities.push({ type: 'person', value: name }))

    return entities
  }, [])

  // ─── Extract entities from transcript ───
  const extractEntities = useCallback(async (text: string) => {
    // Always start with basic regex extraction for immediate feedback
    const basicEntities = basicExtract(text)
    setEntities(basicEntities)

    // Generate a meaningful title from entities and text
    const generateTitle = (ents: ExtractedEntity[], rawText: string): string => {
      const loc = ents.find(e => e.type === 'location')?.value
      const date = ents.find(e => e.type === 'date')?.value
      const topic = ents.find(e => e.type === 'topic')?.value
      const people = ents.filter(e => e.type === 'person').map(e => e.value)

      // Build title from entities: "Mexico with Sarah" or "Summer at the Beach" or "Trip to Paris, 2019"
      const parts: string[] = []
      if (topic) parts.push(topic)
      if (loc) parts.push(parts.length ? `in ${loc}` : loc)
      if (people.length) parts.push(`with ${people.slice(0, 2).join(' & ')}`)
      if (date && parts.length < 3) parts.push(parts.length ? `(${date})` : date)

      if (parts.length > 0) return parts.join(' ')

      // Fallback: extract first meaningful sentence
      const firstSentence = rawText.split(/[.!?]/)[0]?.trim()
      if (firstSentence && firstSentence.length <= 60) return firstSentence
      return rawText.slice(0, 50).trim() + '...'
    }

    // Build initial draft with whatever we have
    const buildDraft = (ents: ExtractedEntity[]) => ({
      title: generateTitle(ents, text),
      description: text,
      location: ents.find(e => e.type === 'location')?.value,
      date: ents.find(e => e.type === 'date')?.value,
      people: ents.filter(e => e.type === 'person').map(e => e.value),
      mood: ents.find(e => e.type === 'mood')?.value,
    })

    setMemoryDraft(buildDraft(basicEntities))

    // Try AI extraction for richer results
    try {
      const res = await fetch('/api/concierge/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.entities?.length > 0) {
          setEntities(data.entities)
          setMemoryDraft({
            ...buildDraft(data.entities),
            title: data.title || buildDraft(data.entities).title,
          })
        }
      }
    } catch {
      // Basic extraction already set — no action needed
    }
    setIsExtracting(false)
  }, [basicExtract])

  // ─── Save memory ───
  const saveMemory = useCallback(async () => {
    if (!memoryDraft) return
    setSavingMemory(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: memoryDraft.title,
          description: memoryDraft.description,
          location_name: memoryDraft.location,
          memory_date: memoryDraft.date,
          mood: memoryDraft.mood,
          memory_type: 'personal',
          source: 'concierge',
        }),
      })

      if (res.ok) {
        setMemorySaved(true)
        setTimeout(() => onClose(), 2000)
      }
    } catch (err) {
      console.error('Failed to save memory:', err)
    }
    setSavingMemory(false)
  }, [memoryDraft, onClose])

  // ─── Handle submit (voice done or text enter) ───
  const handleSubmit = useCallback(() => {
    const input = useTextMode ? textInput : transcript
    if (!input.trim()) return
    processInput(input)
    setTextInput('')
    setTranscript('')
  }, [useTextMode, textInput, transcript, processInput])

  // ─── Navigate to source ───
  const handleSourceClick = (source: SourceCard) => {
    onClose()
    if (source.type === 'memory') router.push('/dashboard/my-story')
    else if (source.type === 'contact') router.push('/dashboard/contacts')
    else if (source.type === 'postscript') router.push('/dashboard/postscripts')
  }

  if (!isOpen) return null

  const fullTranscript = (transcript + ' ' + interimText).trim()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-[#1A1F1C]/95 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2D5A3D] flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">YoursTruly</h2>
              <p className="text-white/40 text-xs">
                {chatMode === 'avatar'
                  ? activePersona
                    ? `Talking as ${activePersona.displayName}`
                    : 'Avatar mode'
                  : 'Your memory companion'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Mode toggle: Concierge vs Avatar. Switching clears the in-memory
            chat so the user starts a fresh thread in the new mode (the old
            session row stays in the DB and is reachable from history). */}
        <div className="px-6 pb-3">
          <div
            role="tablist"
            aria-label="AI mode"
            className="inline-flex p-1 rounded-full bg-white/5 border border-white/10"
          >
            {(['concierge', 'avatar'] as const).map((m) => {
              const active = chatMode === m
              const label = m === 'concierge' ? 'Concierge' : 'Avatar (you)'
              const hint = m === 'concierge' ? 'Helps with your life + the app' : 'Speaks as you, in first person'
              return (
                <button
                  key={m}
                  role="tab"
                  aria-selected={active}
                  title={hint}
                  onClick={() => {
                    if (chatMode === m) return
                    setChatMode(m)
                    clearChat()
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#2D5A3D] text-white shadow-sm'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {chatMode === 'avatar' && (
            <>
              {/* Subject picker: scroll row of avatars the user can chat
                  with — themselves first, then any contact who has at
                  least one transcribed interview answer on record. */}
              <div className="mt-3">
                {personasLoading && (
                  <p className="text-[11px] text-white/40">Loading avatars…</p>
                )}
                {!personasLoading && (personas || []).length === 0 && (
                  <p className="text-[11px] text-white/40">
                    No avatars yet. Add some memories or send an interview to a contact to populate avatars.
                  </p>
                )}
                {!personasLoading && (personas || []).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {(personas || []).map((p) => {
                      const active = subjectContactId === p.subjectContactId
                      const subtitle =
                        p.kind === 'self'
                          ? p.synthesized ? `${p.sourceCount} memories` : 'Tap to set up'
                          : p.transcriptCount
                            ? `${p.transcriptCount} answer${p.transcriptCount === 1 ? '' : 's'}`
                            : 'No answers yet'
                      return (
                        <button
                          key={p.subjectContactId ?? 'self'}
                          onClick={() => {
                            if (subjectContactId === p.subjectContactId) return
                            setSubjectContactId(p.subjectContactId)
                            clearChat()
                          }}
                          title={p.relationship ? `${p.displayName} — ${p.relationship}` : p.displayName}
                          className={`shrink-0 px-3 py-2 rounded-lg text-left transition-all ${
                            active
                              ? 'bg-[#2D5A3D]/30 border border-[#2D5A3D] text-white'
                              : 'bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="text-xs font-medium leading-tight">{p.displayName}</div>
                          <div className="text-[10px] text-white/40 leading-tight">{subtitle}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-white/40 max-w-md">
                Avatar speaks as the chosen person, drawing on their interview answers (or your memories, for your own avatar). First reply may take a moment while we synthesize.
              </p>
            </>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto px-6 pb-32" style={{ height: 'calc(100vh - 180px)' }}>

          {/* ─── Listening state ─── */}
          {mode === 'listening' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-12">
              {/* Mic animation */}
              <div className="relative mb-8">
                <motion.div
                  animate={isRecording ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 w-24 h-24 rounded-full bg-[#2D5A3D]/20 -m-2"
                />
                <button
                  onClick={isRecording ? () => { stopListening(); if (fullTranscript) handleSubmit() } : startListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-[#2D5A3D] shadow-lg shadow-[#2D5A3D]/30'
                  }`}
                >
                  {isRecording ? <Square size={24} className="text-white" fill="white" /> : <Mic size={28} className="text-white" />}
                </button>
              </div>

              <p className="text-white/80 text-lg font-medium mb-2">
                {isRecording ? 'Listening...' : 'Tap the mic to speak'}
              </p>
              <p className="text-white/40 text-sm text-center max-w-xs mb-6">
                {isRecording ? 'Speak naturally — I\'ll understand' : 'Tell me a memory, ask about your life, or say what you need'}
              </p>

              {/* Live transcript */}
              {fullTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md p-5 rounded-2xl bg-white/5 border border-white/10"
                >
                  <p className="text-white/90 text-sm leading-relaxed">
                    {transcript}
                    {interimText && <span className="text-white/40 italic"> {interimText}</span>}
                  </p>
                </motion.div>
              )}

              {/* Error message */}
              {micError && (
                <div className="w-full max-w-md p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <p className="text-red-400 text-sm text-center">{micError}</p>
                </div>
              )}

              {/* Text mode toggle */}
              <button
                onClick={() => { setUseTextMode(true); stopListening(); setMode('chat'); setTimeout(() => inputRef.current?.focus(), 100) }}
                className="mt-6 flex items-center gap-2 text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                <Keyboard size={14} /> Switch to typing
              </button>

              {/* Send button when transcript exists */}
              {fullTranscript && !isRecording && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleSubmit}
                  className="mt-4 px-8 py-3 rounded-xl bg-[#2D5A3D] text-white font-medium flex items-center gap-2 hover:bg-[#234A31] transition-colors"
                >
                  <Send size={16} /> Process
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ─── Chat / Search results ─── */}
          {mode === 'chat' && (
            <div className="space-y-4 pt-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-white/10 text-white/90 border border-white/5'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Source cards */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {msg.sources.map((source, si) => (
                          <button
                            key={si}
                            onClick={() => handleSourceClick(source)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                              {source.type === 'memory' ? <Heart size={14} className="text-[#C4A235]" /> :
                               source.type === 'contact' ? <Users size={14} className="text-[#8DACAB]" /> :
                               <BookOpen size={14} className="text-[#B8562E]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/80 font-medium truncate">{source.title}</p>
                              <p className="text-[10px] text-white/40 capitalize">{source.type}</p>
                            </div>
                            <ChevronRight size={14} className="text-white/30 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <Loader2 size={14} className="animate-spin" /> Thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ─── Memory creation — entity extraction ─── */}
          {mode === 'creating' && (
            <div className="pt-4 space-y-6">
              {/* Original transcript */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">What you said</p>
                <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{transcript || textInput}&rdquo;</p>
              </div>

              {/* Extracting spinner */}
              {isExtracting && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 size={20} className="animate-spin text-[#C4A235]" />
                  <p className="text-white/50 text-sm">Extracting details...</p>
                </div>
              )}

              {/* Extracted entities — live cards */}
              {entities.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Captured</p>
                  {entities.map((entity, i) => {
                    const config = ENTITY_CONFIG[entity.type] || ENTITY_CONFIG.topic
                    const Icon = config.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: `${config.bg}15`, border: `1px solid ${config.color}20` }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${config.bg}30` }}>
                          <Icon size={16} style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: `${config.color}90` }}>{config.label}</p>
                          <p className="text-white/90 text-sm font-medium">{entity.value}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Memory draft preview — editable */}
              {memoryDraft && !isExtracting && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Your Memory</p>
                      <p className="text-[10px] text-[#C4A235]/70">Tap to edit before continuing</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 border border-white/15 overflow-hidden">
                      {/* Editable title */}
                      <input
                        value={memoryDraft.title}
                        onChange={(e) => setMemoryDraft(prev => prev ? { ...prev, title: e.target.value } : null)}
                        className="w-full bg-white/5 text-white text-lg font-bold outline-none placeholder-white/20 px-5 pt-4 pb-2 border-b border-white/5"
                        style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
                        placeholder="Memory title..."
                      />
                      {/* Editable story */}
                      <textarea
                        value={memoryDraft.description}
                        onChange={(e) => setMemoryDraft(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full bg-transparent text-white/80 text-sm outline-none placeholder-white/20 resize-none leading-relaxed px-5 py-3"
                        rows={4}
                        placeholder="Your story..."
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setMode('listening'); setEntities([]); setMemoryDraft(null); setTranscript(''); setTextInput('') }}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={() => {
                        if (memoryDraft && onCreateMemory) {
                          onCreateMemory(memoryDraft)
                          onClose()
                        }
                      }}
                      className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-[#2D5A3D] text-white hover:bg-[#234A31] transition-colors flex items-center justify-center gap-2"
                    >
                      Complete Memory <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* ─── Bottom input bar (always visible in chat mode) ─── */}
        {(mode === 'chat' || useTextMode) && (
          <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#1A1F1C] via-[#1A1F1C] to-transparent pt-8">
            <div className="max-w-lg mx-auto flex items-center gap-3">
              {/* Mic toggle */}
              <button
                onClick={() => {
                  if (useTextMode) {
                    setUseTextMode(false)
                    setMode('listening')
                    startListening()
                  } else {
                    setUseTextMode(true)
                    stopListening()
                    setTimeout(() => inputRef.current?.focus(), 100)
                  }
                }}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  !useTextMode ? 'bg-red-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <Mic size={18} />
              </button>

              {/* Text input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && textInput.trim()) { processInput(textInput); setTextInput('') } }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-white/10 rounded-xl text-white text-sm border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/30"
                />
              </div>

              {/* Send */}
              <button
                onClick={() => { if (textInput.trim()) { processInput(textInput); setTextInput('') } }}
                disabled={!textInput.trim() || isLoading}
                className="w-11 h-11 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#234A31] transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
