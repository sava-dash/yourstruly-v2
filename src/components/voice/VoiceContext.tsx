'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useVoiceRecording } from './useVoiceRecording'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResolvedPerson {
  name: string
  contactId: string | null
  contactName: string | null
  relationship: string | null
  isNew: boolean
}

export interface VoiceExtraction {
  location?: string
  date?: string
  description?: string
  people?: string[]
  resolvedPeople?: ResolvedPerson[]
  hasNewPeople?: boolean
  mood?: string
  personalPlace?: {
    id: string
    name: string
    lat: number
    lng: number
  } | null
  needsLocationClarification?: boolean
  rawLocationText?: string
  rawTranscript: string
}

export interface VoiceHandler {
  /** Routing key, e.g. 'when-where', 'backstory', 'my-story', 'default' */
  context: string
  /** Callback invoked with the structured extraction */
  onResult: (extracted: VoiceExtraction) => void
  /** Additional hint passed to the AI extraction endpoint */
  extractionHint?: string
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'follow-up' | 'people-follow-up'

export interface VoiceContextValue {
  registerHandler: (id: string, handler: VoiceHandler) => void
  unregisterHandler: (id: string) => void
  startListening: () => void
  stopListening: () => void
  isListening: boolean
  isProcessing: boolean
  state: VoiceState
  activeHandlerId: string | null
  setActiveHandler: (id: string | null) => void
  /** Live / final transcript text for display */
  currentTranscript: string | null
  /** Raw location text when follow-up is needed */
  followUpLocationText: string | null
  /** New people that need relationship info */
  newPeople: ResolvedPerson[]
  /** Current new person being asked about */
  currentNewPerson: ResolvedPerson | null
  /** Resolve a location follow-up */
  resolveFollowUp: (locationText: string) => Promise<void>
  /** Resolve a person follow-up (add as contact with relationship) */
  resolvePersonFollowUp: (name: string, relationship: string) => Promise<void>
  /** Skip a person follow-up */
  skipPersonFollowUp: () => void
  /** Dismiss the overlay / cancel follow-up */
  dismiss: () => void
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const handlers = useRef<Map<string, VoiceHandler>>(new Map())
  const [activeHandlerId, setActiveHandlerId] = useState<string | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [currentTranscript, setCurrentTranscript] = useState<string | null>(null)
  const [followUpLocationText, setFollowUpLocationText] = useState<string | null>(null)
  const [newPeople, setNewPeople] = useState<ResolvedPerson[]>([])
  const [currentNewPersonIdx, setCurrentNewPersonIdx] = useState(0)

  // Stash the pending extraction during follow-up so we can complete it later
  const pendingExtractionRef = useRef<VoiceExtraction | null>(null)
  const pendingHandlerRef = useRef<VoiceHandler | null>(null)

  const {
    startRecording,
    stopRecording,
    isRecording,
    audioBlob,
    transcript: speechTranscript,
  } = useVoiceRecording()

  // Keep currentTranscript in sync with live speech API transcript
  React.useEffect(() => {
    if (speechTranscript) {
      setCurrentTranscript(speechTranscript)
    }
  }, [speechTranscript])

  // -----------------------------------------------------------------------
  // Handler registry
  // -----------------------------------------------------------------------

  const registerHandler = useCallback((id: string, handler: VoiceHandler) => {
    handlers.current.set(id, handler)
  }, [])

  const unregisterHandler = useCallback((id: string) => {
    handlers.current.delete(id)
  }, [])

  const setActiveHandler = useCallback((id: string | null) => {
    setActiveHandlerId(id)
  }, [])

  // -----------------------------------------------------------------------
  // Transcription helpers
  // -----------------------------------------------------------------------

  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')

    const res = await fetch('/api/deepgram/transcribe', { method: 'POST', body: formData })

    if (!res.ok) {
      throw new Error('Transcription failed')
    }

    const data = (await res.json()) as { transcript?: string }
    return data.transcript ?? ''
  }, [])

  const extractFromTranscript = useCallback(
    async (rawTranscript: string, handler: VoiceHandler): Promise<VoiceExtraction> => {
      const res = await fetch('/api/voice/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: rawTranscript,
          context: handler.context,
          hint: handler.extractionHint,
        }),
      })

      if (!res.ok) {
        // Fallback: return raw transcript only
        return { rawTranscript }
      }

      const data = (await res.json()) as VoiceExtraction
      return { ...data, rawTranscript }
    },
    []
  )

  // -----------------------------------------------------------------------
  // Core flow
  // -----------------------------------------------------------------------

  const processAudio = useCallback(
    async (blob: Blob) => {
      const handler = activeHandlerId ? handlers.current.get(activeHandlerId) : null
      if (!handler) return

      setVoiceState('processing')

      try {
        const rawTranscript = await transcribeAudio(blob)
        setCurrentTranscript(rawTranscript)

        const extraction = await extractFromTranscript(rawTranscript, handler)

        if (extraction.needsLocationClarification) {
          pendingExtractionRef.current = extraction
          pendingHandlerRef.current = handler
          setFollowUpLocationText(extraction.rawLocationText ?? null)
          setVoiceState('follow-up')
          return
        }

        // Check for new people that need to be added as contacts
        const unresolved = (extraction.resolvedPeople || []).filter(p => p.isNew)
        if (unresolved.length > 0) {
          pendingExtractionRef.current = extraction
          pendingHandlerRef.current = handler
          setNewPeople(unresolved)
          setCurrentNewPersonIdx(0)
          setVoiceState('people-follow-up')
          return
        }

        handler.onResult(extraction)
        setVoiceState('idle')
        setCurrentTranscript(null)
      } catch {
        // On error, reset to idle silently
        setVoiceState('idle')
        setCurrentTranscript(null)
      }
    },
    [activeHandlerId, transcribeAudio, extractFromTranscript]
  )

  // Process when we get a speech-API transcript (no blob) while recording finishes
  const processSpeechTranscript = useCallback(
    async (text: string) => {
      const handler = activeHandlerId ? handlers.current.get(activeHandlerId) : null
      if (!handler) return

      setVoiceState('processing')

      try {
        const extraction = await extractFromTranscript(text, handler)

        if (extraction.needsLocationClarification) {
          pendingExtractionRef.current = extraction
          pendingHandlerRef.current = handler
          setFollowUpLocationText(extraction.rawLocationText ?? null)
          setVoiceState('follow-up')
          return
        }

        // Check for new people
        const unresolved = (extraction.resolvedPeople || []).filter(p => p.isNew)
        if (unresolved.length > 0) {
          pendingExtractionRef.current = extraction
          pendingHandlerRef.current = handler
          setNewPeople(unresolved)
          setCurrentNewPersonIdx(0)
          setVoiceState('people-follow-up')
          return
        }

        handler.onResult(extraction)
        setVoiceState('idle')
        setCurrentTranscript(null)
      } catch {
        setVoiceState('idle')
        setCurrentTranscript(null)
      }
    },
    [activeHandlerId, extractFromTranscript]
  )

  // When audioBlob becomes available, process it
  React.useEffect(() => {
    if (audioBlob && voiceState === 'listening') {
      processAudio(audioBlob)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob])

  // When speech transcript finalises (recording stops but no blob), process it
  React.useEffect(() => {
    if (!isRecording && speechTranscript && !audioBlob && voiceState === 'listening') {
      processSpeechTranscript(speechTranscript)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const startListening = useCallback(() => {
    setVoiceState('listening')
    setCurrentTranscript(null)
    setFollowUpLocationText(null)
    pendingExtractionRef.current = null
    pendingHandlerRef.current = null
    startRecording()
  }, [startRecording])

  const stopListening = useCallback(() => {
    stopRecording()
    // If no audio/transcript comes back within 2s, force reset to idle
    setTimeout(() => {
      setVoiceState(prev => prev === 'listening' ? 'idle' : prev)
      setCurrentTranscript(prev => prev)
    }, 2000)
  }, [stopRecording])

  // Helper: deliver extraction to handler and clean up, or start people follow-up
  const deliverOrFollowUpPeople = useCallback((extraction: VoiceExtraction, handler: VoiceHandler) => {
    const unresolved = (extraction.resolvedPeople || []).filter(p => p.isNew)
    if (unresolved.length > 0) {
      pendingExtractionRef.current = extraction
      pendingHandlerRef.current = handler
      setNewPeople(unresolved)
      setCurrentNewPersonIdx(0)
      setVoiceState('people-follow-up')
    } else {
      handler.onResult(extraction)
      pendingExtractionRef.current = null
      pendingHandlerRef.current = null
      setVoiceState('idle')
      setCurrentTranscript(null)
      setNewPeople([])
    }
  }, [])

  const resolveFollowUp = useCallback(async (locationText: string) => {
    const extraction = pendingExtractionRef.current
    const handler = pendingHandlerRef.current
    if (!extraction || !handler) return

    setVoiceState('processing')

    try {
      const res = await fetch('/api/voice/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: locationText }),
      })

      if (res.ok) {
        const place = (await res.json()) as { id: string; name: string; lat: number; lng: number }
        extraction.personalPlace = place
        extraction.location = place.name
      }

      extraction.needsLocationClarification = false
      setFollowUpLocationText(null)
      // Check for new people before delivering
      deliverOrFollowUpPeople(extraction, handler)
    } catch {
      extraction.needsLocationClarification = false
      setFollowUpLocationText(null)
      deliverOrFollowUpPeople(extraction, handler)
    }
  }, [deliverOrFollowUpPeople])

  // Add a new person as a contact and advance to the next one (or deliver results)
  const resolvePersonFollowUp = useCallback(async (name: string, relationship: string) => {
    const extraction = pendingExtractionRef.current
    const handler = pendingHandlerRef.current
    if (!extraction || !handler) return

    try {
      const res = await fetch('/api/voice/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, relationship }),
      })

      if (res.ok) {
        const { contact } = await res.json()
        // Update the resolved person in the extraction
        const resolved = extraction.resolvedPeople || []
        const idx = resolved.findIndex(p => p.name.toLowerCase() === name.toLowerCase() && p.isNew)
        if (idx >= 0) {
          resolved[idx] = { ...resolved[idx], contactId: contact.id, contactName: contact.full_name, relationship: contact.relationship_type, isNew: false }
        }
      }
    } catch (err) {
      console.error('Failed to create contact:', err)
    }

    // Advance to next new person or deliver
    const nextIdx = currentNewPersonIdx + 1
    const remaining = newPeople.slice(nextIdx)
    if (remaining.length > 0) {
      setCurrentNewPersonIdx(nextIdx)
    } else {
      extraction.hasNewPeople = false
      handler.onResult(extraction)
      pendingExtractionRef.current = null
      pendingHandlerRef.current = null
      setNewPeople([])
      setCurrentNewPersonIdx(0)
      setVoiceState('idle')
      setCurrentTranscript(null)
    }
  }, [currentNewPersonIdx, newPeople])

  // Skip adding this person and move to the next (or deliver)
  const skipPersonFollowUp = useCallback(() => {
    const extraction = pendingExtractionRef.current
    const handler = pendingHandlerRef.current
    if (!extraction || !handler) return

    const nextIdx = currentNewPersonIdx + 1
    if (nextIdx < newPeople.length) {
      setCurrentNewPersonIdx(nextIdx)
    } else {
      handler.onResult(extraction)
      pendingExtractionRef.current = null
      pendingHandlerRef.current = null
      setNewPeople([])
      setCurrentNewPersonIdx(0)
      setVoiceState('idle')
      setCurrentTranscript(null)
    }
  }, [currentNewPersonIdx, newPeople])

  const dismiss = useCallback(() => {
    stopRecording()
    // If we have a pending extraction, deliver what we have
    if (pendingExtractionRef.current && pendingHandlerRef.current) {
      pendingHandlerRef.current.onResult(pendingExtractionRef.current)
    }
    pendingExtractionRef.current = null
    pendingHandlerRef.current = null
    setVoiceState('idle')
    setCurrentTranscript(null)
    setFollowUpLocationText(null)
    setNewPeople([])
    setCurrentNewPersonIdx(0)
  }, [stopRecording])

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const currentNewPerson = newPeople[currentNewPersonIdx] ?? null

  const value = useMemo<VoiceContextValue>(
    () => ({
      registerHandler,
      unregisterHandler,
      startListening,
      stopListening,
      isListening: voiceState === 'listening',
      isProcessing: voiceState === 'processing',
      state: voiceState,
      activeHandlerId,
      setActiveHandler,
      currentTranscript,
      followUpLocationText,
      newPeople,
      currentNewPerson,
      resolveFollowUp,
      resolvePersonFollowUp,
      skipPersonFollowUp,
      dismiss,
    }),
    [
      registerHandler,
      unregisterHandler,
      startListening,
      stopListening,
      voiceState,
      activeHandlerId,
      setActiveHandler,
      currentTranscript,
      followUpLocationText,
      newPeople,
      currentNewPerson,
      resolveFollowUp,
      resolvePersonFollowUp,
      skipPersonFollowUp,
      dismiss,
    ]
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// No-op fallback for when useVoice is called outside VoiceProvider (e.g. TopNav in server layout)
const NOOP_VOICE: VoiceContextValue = {
  registerHandler: () => {},
  unregisterHandler: () => {},
  startListening: () => {},
  stopListening: () => {},
  isListening: false,
  isProcessing: false,
  state: 'idle',
  activeHandlerId: null,
  setActiveHandler: () => {},
  currentTranscript: null,
  followUpLocationText: null,
  newPeople: [],
  currentNewPerson: null,
  resolveFollowUp: async () => {},
  resolvePersonFollowUp: async () => {},
  skipPersonFollowUp: () => {},
  dismiss: () => {},
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext)
  return ctx ?? NOOP_VOICE
}
