'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoOff, Camera, Loader2 } from 'lucide-react'
import { usePersonaPlexVoice, type PersonaPlexVoice } from '@/hooks/usePersonaPlexVoice'
import { useVideoRecorder } from '@/hooks/useVideoRecorder'
import { VoiceChatUI } from './VoiceChatUI'
import { createClient } from '@/lib/supabase/client'
import { extractConversationClips } from '@/lib/audio/clip-stitcher'
import type { 
  VoiceSessionType, 
  PersonaConfig,
  VoiceSessionResult,
} from '@/types/voice'
import { JOURNALIST_PERSONA, FRIEND_PERSONA, LIFE_STORY_PERSONA } from '@/types/voice'

export interface VoiceVideoChatProps {
  /** Session type */
  sessionType?: VoiceSessionType
  /** Optional topic */
  topic?: string
  /** Optional contact ID */
  contactId?: string
  /** Voice to use - defaults to 'NATF3' (warm female) */
  voice?: PersonaPlexVoice | string
  /** Persona name shorthand */
  personaName?: 'journalist' | 'friend' | 'life-story'
  /** Custom persona config */
  persona?: PersonaConfig
  /** Max questions before suggesting save */
  maxQuestions?: number
  /** Max duration in seconds */
  maxDurationSeconds?: number
  /** Enable video capture */
  enableVideo?: boolean
  /** Video quality */
  videoQuality?: 'low' | 'medium' | 'high'
  /** Auto-start the conversation immediately */
  autoStart?: boolean
  /** Called when session completes */
  onComplete?: (result: VoiceSessionResult & { videoUrl?: string }) => void
  /** Called when memory is saved */
  onMemorySaved?: (memoryId: string, videoUrl?: string) => void
  /** Called with extracted entities (people, places) after save */
  onEntitiesExtracted?: (entities: { people: string[]; places: string[] }) => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Show transcript */
  showTranscript?: boolean
  /** Additional CSS */
  className?: string
}

/**
 * VoiceVideoChat - Combined voice + video memory capture using PersonaPlex
 * 
 * Extends VoiceChat to optionally record video alongside the audio conversation.
 * Video is uploaded to Supabase storage and linked to the memory.
 */
export function VoiceVideoChat({
  sessionType = 'memory_capture',
  topic,
  contactId,
  voice = 'yourstruly-voice.mp3',
  personaName = 'journalist',
  persona,
  maxQuestions = 5,
  maxDurationSeconds = 600,
  enableVideo = false,
  videoQuality = 'medium',
  autoStart = false,
  onComplete,
  onMemorySaved,
  onEntitiesExtracted,
  onError,
  showTranscript = true,
  className = '',
}: VoiceVideoChatProps) {
  const supabase = createClient()
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(enableVideo)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)
  const savedMemoryIdRef = useRef<string | null>(null)

  // Get persona
  const selectedPersona = persona || getPersonaByName(personaName)

  // Video recorder hook
  const {
    isSupported: videoSupported,
    isActive: videoActive,
    isRecording: videoRecording,
    videoRef,
    recordedBlob,
    startCamera,
    stopCamera,
    startRecording: startVideoRecording,
    stopRecording: stopVideoRecording,
    reset: resetVideo,
  } = useVideoRecorder({
    quality: videoQuality,
    maxDurationSeconds,
    onError,
  })

  // Track session state
  const [questionCount, setQuestionCount] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // PersonaPlex hook
  const personaPlex = usePersonaPlexVoice({
    serverUrl: process.env.NEXT_PUBLIC_PERSONAPLEX_URL,
    systemPrompt: selectedPersona.systemPrompt,
    initialTopic: topic,
    voice: voice,
    enableRecording: true,
    onTranscript: (userText, aiText) => {
      if (aiText && aiText.includes('?')) {
        setQuestionCount(prev => prev + 1)
      }
    },
    onComplete: async (transcript) => {
      // Stop video if recording
      if (videoRecording) {
        stopVideoRecording()
      }
      
      onComplete?.({
        success: true,
        sessionId: Date.now().toString(),
        sessionType,
        transcript,
        durationSeconds: sessionDuration,
        questionCount,
      })
    },
    onError,
  })

  // State from PersonaPlex
  const state = personaPlex.state
  const isConnected = ['connected', 'listening', 'thinking', 'aiSpeaking'].includes(state)
  const transcript = personaPlex.transcript
  const currentUserText = personaPlex.currentUserText
  const currentAiText = personaPlex.currentAiText
  const canSave = transcript.length >= 2
  const error = personaPlex.error
  const isSupported = personaPlex.isSupported

  // Handle start - start voice and optionally video
  const handleStart = useCallback(async () => {
    // Start video first if enabled
    if (videoEnabled && videoSupported) {
      await startCamera()
      startVideoRecording()
    }
    // Then start voice
    await personaPlex.start()
  }, [videoEnabled, videoSupported, startCamera, startVideoRecording, personaPlex])

  // Handle stop
  const handleStop = useCallback(async () => {
    personaPlex.stop()
    if (videoRecording) {
      stopVideoRecording()
    }
  }, [personaPlex, videoRecording, stopVideoRecording])

  // Upload conversation audio recording to Supabase storage
  const uploadConversationAudio = async (memoryId: string, blob: Blob): Promise<string | undefined> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileName = `${user.id}/${memoryId}/conversation_${Date.now()}.webm`
      
      const { data, error: uploadError } = await supabase.storage
        .from('memory-media')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('memory-media')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (err) {
      console.error('Conversation audio upload failed:', err)
      return undefined
    }
  }

  // Background: extract clips from stereo recording and upload per-exchange audio
  const processConversationClips = useCallback(async (
    memoryId: string,
    userId: string,
    recordingBlob: Blob,
    recordingStartTime: number,
    transcriptEntries: typeof transcript,
  ) => {
    try {
      console.log('[VoiceVideoChat] Starting background clip extraction...')
      
      // Extract individual clips from stereo recording
      const result = await extractConversationClips(recordingBlob, transcriptEntries, recordingStartTime)
      
      if (result.clips.length === 0) {
        console.warn('[VoiceVideoChat] No clips extracted')
        return
      }
      
      console.log(`[VoiceVideoChat] Extracted ${result.clips.length} clips, uploading...`)
      
      // Upload the stitched full conversation audio
      const stitchedPath = `${userId}/${memoryId}/stitched_conversation.wav`
      const { error: stitchError } = await supabase.storage
        .from('memory-media')
        .upload(stitchedPath, result.fullBlob, { contentType: 'audio/wav', upsert: true })
      
      let stitchedUrl: string | undefined
      if (!stitchError) {
        const { data: urlData } = supabase.storage.from('memory-media').getPublicUrl(stitchedPath)
        stitchedUrl = urlData.publicUrl
      }
      
      // Upload individual clips and collect URLs
      const clipUrls: Array<{ exchangeIndex: number; part: 'question' | 'answer'; url: string }> = []
      
      for (const clip of result.clips) {
        const clipPath = `${userId}/${memoryId}/clip_${clip.exchangeIndex}_${clip.part}.wav`
        const { error: uploadError } = await supabase.storage
          .from('memory-media')
          .upload(clipPath, clip.blob, { contentType: 'audio/wav', upsert: true })
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('memory-media').getPublicUrl(clipPath)
          clipUrls.push({
            exchangeIndex: clip.exchangeIndex,
            part: clip.part,
            url: urlData.publicUrl,
          })
        }
      }
      
      // Build updated description with per-exchange audio URLs
      // Group clips by exchange
      const exchangeMap = new Map<number, { questionUrl?: string; answerUrl?: string }>()
      for (const c of clipUrls) {
        const existing = exchangeMap.get(c.exchangeIndex) || {}
        if (c.part === 'question') existing.questionUrl = c.url
        else existing.answerUrl = c.url
        exchangeMap.set(c.exchangeIndex, existing)
      }
      
      // Rebuild the memory description with audio links per exchange
      const exchanges: Array<{ question: string; answer: string }> = []
      for (let i = 0; i < transcriptEntries.length; i++) {
        const entry = transcriptEntries[i]
        if (entry.role === 'assistant') {
          const nextUser = transcriptEntries.slice(i + 1).find(e => e.role === 'user')
          if (nextUser) {
            exchanges.push({ question: entry.text.trim(), answer: nextUser.text.trim() })
          }
        }
      }
      
      // Format as structured Q&A with audio links
      const summary = exchanges.map(e => {
        let text = e.answer
        if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) text += '.'
        return text
      }).join(' ')
      
      const qaSection = exchanges.map((e, i) => {
        const urls = exchangeMap.get(i)
        let qa = `**Q${i + 1}:** ${e.question}\n\n**A${i + 1}:** ${e.answer}`
        // Add audio links for each part
        if (urls?.questionUrl) {
          qa += `\n\n🔊 [Question Audio](${urls.questionUrl})`
        }
        if (urls?.answerUrl) {
          qa += `\n\n🎙️ [Audio](${urls.answerUrl})`
        }
        return qa
      }).join('\n\n---\n\n')
      
      const updatedDescription = `## Summary\n\n${summary}\n\n## Conversation\n\n${qaSection}`
      
      // Update memory with stitched audio and enriched description
      await supabase
        .from('memories')
        .update({
          audio_url: stitchedUrl || null,
          description: updatedDescription,
        })
        .eq('id', memoryId)
      
      console.log('[VoiceVideoChat] Clip processing complete, memory updated')
      
    } catch (err) {
      console.error('[VoiceVideoChat] Background clip processing failed:', err)
      // Non-fatal — the memory was already saved with transcript text
    }
  }, [supabase])

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    
    try {
      // Stop recording if still going
      if (videoRecording) {
        stopVideoRecording()
      }

      // Create memory from transcript
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Call the memory creation API with transcript array
      const response = await fetch('/api/voice/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          sessionType,
          topic,
          contactId,
          durationSeconds: sessionDuration,
          questionCount,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save memory')
      }

      const { memoryId } = await response.json()
      savedMemoryIdRef.current = memoryId

      // Extract entities
      const entities = extractEntities(transcript)
      if (entities.people.length > 0 || entities.places.length > 0) {
        onEntitiesExtracted?.(entities)
      }

      // Upload video if we have one
      let videoUrl: string | undefined
      if (recordedBlob) {
        videoUrl = await uploadVideo(memoryId, recordedBlob)
      }

      // Kick off background clip extraction (don't await — runs in background)
      if (personaPlex.recordingBlob && personaPlex.recordingStartTime) {
        processConversationClips(
          memoryId,
          user.id,
          personaPlex.recordingBlob,
          personaPlex.recordingStartTime,
          transcript,
        )
      }

      onMemorySaved?.(memoryId, videoUrl)
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Save failed'))
    } finally {
      setIsSaving(false)
    }
  }, [
    videoRecording, stopVideoRecording, transcript, supabase,
    personaPlex.recordingBlob, personaPlex.recordingStartTime,
    sessionType, topic, contactId, sessionDuration, recordedBlob,
    onMemorySaved, onEntitiesExtracted, onError, processConversationClips,
  ])

  // Handle abort
  const handleAbort = useCallback(() => {
    personaPlex.abort()
    if (videoActive) {
      stopCamera()
    }
    resetVideo()
  }, [personaPlex, videoActive, stopCamera, resetVideo])

  // Handle reset
  const handleReset = useCallback(() => {
    personaPlex.abort()
    setQuestionCount(0)
    setSessionDuration(0)
    if (videoActive) {
      stopCamera()
    }
    resetVideo()
  }, [personaPlex, videoActive, stopCamera, resetVideo])

  // Toggle video
  const handleToggleVideo = useCallback(async () => {
    if (videoActive) {
      stopCamera()
      if (videoRecording) {
        stopVideoRecording()
      }
      setVideoEnabled(false)
    } else {
      await startCamera()
      if (isConnected) {
        startVideoRecording()
      }
      setVideoEnabled(true)
    }
  }, [videoActive, stopCamera, videoRecording, stopVideoRecording, startCamera, isConnected, startVideoRecording])

  // Auto-start when component mounts if autoStart is true
  useEffect(() => {
    if (autoStart && !hasAutoStarted && isSupported) {
      setHasAutoStarted(true)
      const timer = setTimeout(() => {
        handleStart()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoStart, hasAutoStarted, isSupported, handleStart])

  // Upload video to Supabase
  const uploadVideo = async (memoryId: string, blob: Blob): Promise<string | undefined> => {
    setIsUploadingVideo(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileName = `${user.id}/${memoryId}/video_${Date.now()}.webm`
      
      const { data, error: uploadError } = await supabase.storage
        .from('memory-media')
        .upload(fileName, blob, {
          contentType: 'video/webm',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('memory-media')
        .getPublicUrl(fileName)

      // Update memory with video URL
      await supabase
        .from('memories')
        .update({ video_url: urlData.publicUrl })
        .eq('id', memoryId)

      return urlData.publicUrl
    } catch (err) {
      console.error('Video upload failed:', err)
      onError?.(err instanceof Error ? err : new Error('Video upload failed'))
      return undefined
    } finally {
      setIsUploadingVideo(false)
    }
  }

  // Show loading while checking browser support
  if (isSupported === null) {
    return (
      <div className={`p-6 bg-white/80 backdrop-blur-sm border border-[#406A56]/10 rounded-2xl text-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#406A56]/20" />
          <p className="text-[#406A56]/60 mt-4">Initializing voice chat...</p>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className={`p-6 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl text-center ${className}`}>
        <p className="text-red-600 font-medium">
          Voice chat is not supported in this browser.
        </p>
        <p className="text-red-500 text-sm mt-2">
          Please use Chrome, Safari, or Firefox with WebRTC support.
        </p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Video preview overlay */}
      <AnimatePresence>
        {videoActive && showVideoPreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 right-4 z-10 rounded-xl overflow-hidden shadow-lg border-2 border-white/50"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-32 h-24 object-cover bg-black"
            />
            {videoRecording && (
              <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/90 rounded text-[10px] text-white font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                REC
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main voice chat UI */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border border-[#406A56]/10 rounded-2xl">
        {/* Video controls */}
        {videoSupported && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#406A56]/10">
            <button
              onClick={handleToggleVideo}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                videoActive
                  ? 'bg-[#406A56] text-white'
                  : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
              }`}
            >
              {videoActive ? <Camera className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              {videoActive ? 'Camera On' : 'Camera Off'}
            </button>
            
            {videoActive && (
              <button
                onClick={() => setShowVideoPreview(!showVideoPreview)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20 transition-colors"
              >
                {showVideoPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            )}

            {isUploadingVideo && (
              <div className="flex items-center gap-2 text-sm text-[#406A56]/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading video...
              </div>
            )}
          </div>
        )}

        <VoiceChatUI
          state={state}
          transcript={transcript}
          currentUserText={currentUserText}
          currentAiText={currentAiText}
          questionCount={questionCount}
          sessionDuration={sessionDuration}
          canSave={canSave}
          error={error}
          persona={selectedPersona}
          topic={topic}
          maxQuestions={maxQuestions}
          onStart={handleStart}
          onStop={handleStop}
          onSave={handleSave}
          onAbort={handleAbort}
          onReset={handleReset}
          showTranscript={showTranscript}
        />
      </div>
    </div>
  )
}

/**
 * Get persona configuration by name
 */
function getPersonaByName(name: 'journalist' | 'friend' | 'life-story'): PersonaConfig {
  switch (name) {
    case 'friend':
      return FRIEND_PERSONA
    case 'life-story':
      return LIFE_STORY_PERSONA
    case 'journalist':
    default:
      return JOURNALIST_PERSONA
  }
}

/**
 * Extract people and places from transcript (simple heuristic)
 */
function extractEntities(transcript: Array<{ role: string; text: string }>): { people: string[]; places: string[] } {
  const people = new Set<string>()
  const places = new Set<string>()
  
  // Blacklist of common false positives
  const nameBlacklist = new Set([
    'my', 'our', 'the', 'this', 'that', 'these', 'those',
    // Common cities that might appear
    'raleigh', 'charlotte', 'atlanta', 'boston', 'austin', 'dallas', 'houston',
    'chicago', 'denver', 'seattle', 'portland', 'miami', 'orlando', 'tampa',
    'phoenix', 'vegas', 'francisco', 'diego', 'angeles', 'york', 'jersey',
    // Days/months
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    // Common words
    'office', 'home', 'work', 'school', 'college', 'university', 'hospital',
  ])
  
  // More specific name patterns - only match relationship + name combos
  const namePatterns = [
    // "my/our friend John", "my brother Mike"
    /(?:my|our)\s+(?:friend|brother|sister|mother|father|mom|dad|grandmother|grandfather|grandma|grandpa|uncle|aunt|cousin|husband|wife|partner|son|daughter)\s+([A-Z][a-z]+)/gi,
    // "named John", "called Mary"
    /(?:named|called)\s+([A-Z][a-z]+)/gi,
    // "I met/know/knew Sarah"
    /(?:met|know|knew)\s+([A-Z][a-z]+)/gi,
  ]
  
  const placePatterns = [
    // "in Atlanta", "at Boston", "from Chicago"
    /(?:in|at|from|to|visited)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    // "the city of Raleigh"
    /(?:the|our)\s+(?:city|town|village|country|state)\s+(?:of\s+)?([A-Z][a-z]+)/gi,
  ]

  for (const item of transcript) {
    const text = item.text
    
    for (const pattern of namePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1]
        // Filter out blacklisted words and very short names
        if (name && name.length > 2 && !nameBlacklist.has(name.toLowerCase())) {
          people.add(name)
        }
      }
    }
    
    for (const pattern of placePatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const place = match[1]
        // Filter out blacklisted words
        if (place && place.length > 2 && !nameBlacklist.has(place.toLowerCase())) {
          places.add(place)
        }
      }
    }
  }

  return {
    people: Array.from(people),
    places: Array.from(places),
  }
}
