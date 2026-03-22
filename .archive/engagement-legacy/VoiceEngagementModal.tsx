'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Video, VideoOff } from 'lucide-react'
import { VoiceVideoChat } from '@/components/voice'
import type { EngagementPrompt } from '@/types/engagement'
import { CompletionOverlay } from './CompletionOverlay'

interface VoiceEngagementModalProps {
  /** The engagement prompt to answer via voice */
  prompt: EngagementPrompt
  /** Expected XP reward */
  expectedXp?: number
  /** Enable video recording */
  enableVideo?: boolean
  /** Called when complete */
  onComplete: (result: {
    memoryId?: string
    xpAwarded: number
  }) => void
  /** Called to close modal */
  onClose: () => void
}

/**
 * VoiceEngagementModal - Answer engagement prompts via voice/video
 * 
 * Uses the VoiceVideoChat component to capture responses to engagement prompts
 * like photo backstories, knowledge capture, and memory prompts.
 */
export function VoiceEngagementModal({
  prompt,
  expectedXp = 25,
  enableVideo = false,
  onComplete,
  onClose,
}: VoiceEngagementModalProps) {
  const [videoEnabled, setVideoEnabled] = useState(enableVideo)
  const [completed, setCompleted] = useState(false)

  // Build topic from prompt
  const topic = prompt.metadata?.question_text || prompt.promptText

  // Choose persona based on prompt type
  const personaName = prompt.type === 'knowledge' ? 'journalist' : 'friend'

  const handleMemorySaved = useCallback((memoryId: string) => {
    setCompleted(true)
    
    // Give visual feedback before calling onComplete
    setTimeout(() => {
      onComplete({
        memoryId,
        xpAwarded: expectedXp,
      })
    }, 1500)
  }, [onComplete, expectedXp])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-gradient-to-b from-white to-[#F9F7F3] rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#406A56]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D9C61A] to-[#c4b118] flex items-center justify-center shadow-md">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#406A56]">Share Your Story</h2>
              <p className="text-sm text-[#406A56]/60">
                Answer with your voice • +{expectedXp} XP
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Video toggle */}
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-2 rounded-full transition-colors ${
                videoEnabled 
                  ? 'bg-[#406A56] text-white' 
                  : 'bg-[#406A56]/10 text-[#406A56] hover:bg-[#406A56]/20'
              }`}
              title={videoEnabled ? 'Disable video' : 'Enable video'}
            >
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-[#406A56]/60 hover:text-[#406A56] hover:bg-[#406A56]/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Prompt Display */}
        <div className="px-5 py-4 bg-[#406A56]/5 border-b border-[#406A56]/10">
          <p className="text-[#406A56] font-medium leading-relaxed">
            {prompt.promptText}
          </p>
          
          {/* Photo preview if this is a photo backstory */}
          {prompt.photoUrl && (
            <div className="mt-3 relative inline-block">
              <img
                src={prompt.photoUrl}
                alt="Photo context"
                className="w-32 h-32 object-cover rounded-lg shadow-md"
              />
            </div>
          )}
          
          {/* Contact info if about a person */}
          {prompt.contactName && (
            <p className="mt-2 text-sm text-[#406A56]/70">
              About: <span className="font-medium">{prompt.contactName}</span>
            </p>
          )}
        </div>

        {/* Voice/Video Chat */}
        <div className="p-5">
          <VoiceVideoChat
            sessionType={prompt.type === 'knowledge' ? 'memory_capture' : 'engagement'}
            topic={topic}
            contactId={prompt.contactId}
            personaName={personaName}
            enableVideo={videoEnabled}
            videoQuality="medium"
            maxQuestions={5}
            onMemorySaved={handleMemorySaved}
            onError={(error) => console.error('Voice error:', error)}
            showTranscript={true}
          />
        </div>

        {/* Success overlay */}
        <CompletionOverlay show={completed} xp={expectedXp} />
      </motion.div>
    </motion.div>
  )
}
