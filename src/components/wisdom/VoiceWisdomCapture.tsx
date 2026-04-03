'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Brain, Video, VideoOff, Sparkles } from 'lucide-react'
import { VoiceVideoChat } from '@/components/voice'
import { createClient } from '@/lib/supabase/client'

interface VoiceWisdomCaptureProps {
  /** Optional category to pre-select */
  category?: string
  /** Question/prompt to answer */
  question?: string
  /** Enable video recording */
  enableVideo?: boolean
  /** Called when wisdom is saved */
  onSaved?: (wisdomId: string) => void
  /** Called to close */
  onClose: () => void
}

/**
 * VoiceWisdomCapture - Capture wisdom through voice conversation
 * 
 * A modal component for capturing life lessons, values, and wisdom
 * through natural voice conversation with an AI interviewer.
 */
export function VoiceWisdomCapture({
  category,
  question,
  enableVideo = false,
  onSaved,
  onClose,
}: VoiceWisdomCaptureProps) {
  const supabase = createClient()
  const [videoEnabled, setVideoEnabled] = useState(enableVideo)
  const [completed, setCompleted] = useState(false)

  // Build topic from question/category
  const topic = question || (category ? `your ${category.replace(/_/g, ' ')}` : undefined)

  const handleMemorySaved = useCallback(async (memoryId: string) => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No user found')
        return
      }

      // Get the created memory to extract transcript
      const { data: memory } = await supabase
        .from('memories')
        .select('title, description, ai_labels')
        .eq('id', memoryId)
        .single()

      // Update memory type to 'wisdom'
      await supabase
        .from('memories')
        .update({ 
          memory_type: 'wisdom',
          ai_category: category || null,
        })
        .eq('id', memoryId)

      // Extract audio URL from ai_labels if available
      const aiLabels = memory?.ai_labels as Record<string, unknown> | null
      const transcript = aiLabels?.transcript as Array<{ role: string; text: string }> | undefined

      // Create knowledge_entry for the wisdom page
      const { data: knowledgeEntry, error: keError } = await supabase
        .from('knowledge_entries')
        .insert({
          user_id: user.id,
          category: category || 'life_lessons',
          prompt_text: question || memory?.title || 'Voice Wisdom',
          response_text: memory?.description || '',
          audio_url: null, // Will be updated if audio is available
          memory_id: memoryId,
          tags: category ? [category.replace(/_/g, ' ')] : [],
        })
        .select()
        .single()

      if (keError) {
        console.error('Failed to create knowledge entry:', keError)
      }

      setCompleted(true)
      
      setTimeout(() => {
        onSaved?.(knowledgeEntry?.id || memoryId)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error saving wisdom:', err)
      setCompleted(true)
      setTimeout(() => {
        onSaved?.(memoryId)
        onClose()
      }, 1500)
    }
  }, [supabase, category, question, onSaved, onClose])

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
        <div className="flex items-center justify-between p-5 border-b border-[#4A3552]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A3552] to-[#6b4d7a] flex items-center justify-center shadow-md">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#4A3552]">Share Your Wisdom</h2>
              <p className="text-sm text-[#4A3552]/60">
                {category ? category.replace(/_/g, ' ') : 'Life lessons & insights'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Video toggle */}
            <button
              onClick={() => setVideoEnabled(!videoEnabled)}
              className={`p-2 rounded-full transition-colors ${
                videoEnabled 
                  ? 'bg-[#4A3552] text-white' 
                  : 'bg-[#4A3552]/10 text-[#4A3552] hover:bg-[#4A3552]/20'
              }`}
              title={videoEnabled ? 'Disable video' : 'Enable video'}
            >
              {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-[#4A3552]/60 hover:text-[#4A3552] hover:bg-[#4A3552]/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Question Display */}
        {question && (
          <div className="px-5 py-4 bg-[#4A3552]/5 border-b border-[#4A3552]/10">
            <p className="text-[#4A3552] font-medium leading-relaxed">
              {question}
            </p>
          </div>
        )}

        {/* Voice/Video Chat */}
        <div className="p-5">
          <VoiceVideoChat
            sessionType="memory_capture"
            topic={topic}
            personaName="journalist"
            enableVideo={videoEnabled}
            videoQuality="medium"
            maxQuestions={5}
            onMemorySaved={handleMemorySaved}
            onError={(error) => console.error('Voice error:', error)}
            showTranscript={true}
          />
        </div>

        {/* Success overlay */}
        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#4A3552] flex items-center justify-center shadow-lg shadow-[#4A3552]/30">
                  <Sparkles size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#4A3552]">Wisdom saved</h3>
                <p className="text-[#4A3552]/70 mt-2">Your insight has been captured</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
