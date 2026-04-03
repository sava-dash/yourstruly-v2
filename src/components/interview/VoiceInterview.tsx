'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Video, VideoOff, Sparkles, ChevronRight } from 'lucide-react'
import { VoiceVideoChat } from '@/components/voice'
import { LIFE_STORY_PERSONA } from '@/types/voice'

interface VoiceInterviewProps {
  /** Session ID for the interview */
  sessionId: string
  /** Access token for the interview */
  accessToken: string
  /** User ID who created the interview */
  userId: string
  /** The question being answered */
  question: {
    id: string
    question_text: string
    status: string
  }
  /** Name of the person being interviewed about */
  contactName: string
  /** Enable video recording */
  enableVideo?: boolean
  /** Called when interview is complete */
  onComplete: () => void
  /** Called to close without saving */
  onClose: () => void
}

/**
 * VoiceInterview - OpenAI Realtime voice interview component
 * 
 * Uses the natural conversation flow of VoiceVideoChat for life story interviews.
 * After ~5 exchanges, the AI will offer to save the interview response.
 */
export function VoiceInterview({
  sessionId,
  accessToken,
  userId,
  question,
  contactName,
  enableVideo = false,
  onComplete,
  onClose,
}: VoiceInterviewProps) {
  const [videoEnabled, setVideoEnabled] = useState(enableVideo)
  const [completed, setCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Custom persona for interviews
  const interviewPersona = {
    ...LIFE_STORY_PERSONA,
    name: 'Life Story Guide',
    systemPrompt: `You are conducting a warm, thoughtful interview to help someone share their memories about ${contactName}. You're gathering stories and insights that will become part of ${contactName}'s legacy.

The question being explored: "${question.question_text}"

Key behaviors:
- Ask one follow-up at a time, conversationally
- Dig for specific details: names, dates, places, feelings
- Acknowledge what they share before asking more
- Use phrases like "Tell me more about..." or "What was that moment like?"
- After gathering good content (~5 exchanges), offer to save or continue

Be warm and encouraging. This is about preserving precious memories.`,
  }

  const handleMemorySaved = useCallback(async (memoryId: string) => {
    setIsSaving(true)
    
    try {
      // Mark the interview question as answered
      await fetch('/api/interviews/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          memoryId,
          accessToken,
        }),
      })
      
      setCompleted(true)
      
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (error) {
      console.error('Failed to save interview answer:', error)
    } finally {
      setIsSaving(false)
    }
  }, [sessionId, question.id, accessToken, onComplete])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F9F7F3] to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 border-b border-[#2D5A3D]/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#234A31] flex items-center justify-center shadow-md">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-[#2D5A3D]">
                  Interview about {contactName}
                </h1>
                <p className="text-sm text-[#2D5A3D]/60">
                  Share your memories through voice
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Video toggle */}
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`p-2 rounded-full transition-colors ${
                  videoEnabled 
                    ? 'bg-[#2D5A3D] text-white' 
                    : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
                }`}
                title={videoEnabled ? 'Disable video' : 'Enable video'}
              >
                {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-[#2D5A3D]/60 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-5 bg-white rounded-2xl shadow-md border border-[#2D5A3D]/10"
        >
          <div className="flex items-center gap-2 text-sm text-[#2D5A3D]/60 mb-2">
            <ChevronRight size={14} />
            <span>Question</span>
          </div>
          <p className="text-[#2D5A3D] font-medium text-lg leading-relaxed">
            {question.question_text}
          </p>
        </motion.div>

        {/* Voice/Video Chat */}
        <VoiceVideoChat
          sessionType="life_interview"
          topic={question.question_text}
          persona={interviewPersona}
          enableVideo={videoEnabled}
          videoQuality="medium"
          maxQuestions={5}
          onMemorySaved={handleMemorySaved}
          onComplete={(result) => {
            console.log('Interview complete:', result)
          }}
          onError={(error) => console.error('Interview error:', error)}
          showTranscript={true}
        />

        {/* Tips */}
        <div className="mt-8 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#2D5A3D]/10">
          <h3 className="text-sm font-semibold text-[#2D5A3D] mb-3 uppercase tracking-wide">
            Tips for Your Interview
          </h3>
          <ul className="space-y-2 text-sm text-[#2D5A3D]/70">
            <li className="flex items-start gap-2">
              <span className="text-[#C4A235]">•</span>
              Share specific memories and stories
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C4A235]">•</span>
              Include details about when and where things happened
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C4A235]">•</span>
              Describe how moments made you feel
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C4A235]">•</span>
              The AI will guide you with follow-up questions
            </li>
          </ul>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sparkles size={36} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#2D5A3D]">Response saved</h3>
              <p className="text-[#2D5A3D]/70 mt-2">
                Thank you for sharing about {contactName}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
