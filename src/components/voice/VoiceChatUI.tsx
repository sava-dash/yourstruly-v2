'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Loader2,
  Volume2,
  Radio,
  User,
  Bot,
  Save,
  RotateCcw,
  Clock,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import type { VoiceChatState, TranscriptEntry, PersonaConfig } from '@/types/voice'

interface VoiceChatUIProps {
  state: VoiceChatState
  transcript: TranscriptEntry[]
  currentUserText: string
  currentAiText: string
  questionCount: number
  sessionDuration: number
  canSave: boolean
  error: Error | null
  persona?: PersonaConfig
  topic?: string
  maxQuestions?: number
  onStart: () => void
  onStop: () => void
  onSave: () => void
  onAbort: () => void
  onReset: () => void
  showTranscript?: boolean
  className?: string
  /** Auto-start with countdown (default: true) */
  autoStartWithCountdown?: boolean
}

/**
 * VoiceChatUI - Enhanced styled UI for voice memory capture
 * 
 * Features:
 * - Persona-aware styling and messaging
 * - Save button when memory is ready
 * - Question counter and duration display
 * - Enhanced transcript panel
 * - Beautiful animations and transitions
 */
export function VoiceChatUI({
  state,
  transcript,
  currentUserText,
  currentAiText,
  questionCount,
  sessionDuration,
  canSave,
  error,
  persona,
  topic,
  maxQuestions = 5,
  onStart,
  onStop,
  onSave,
  onAbort,
  onReset,
  showTranscript = true,
  className = '',
  autoStartWithCountdown = true,
}: VoiceChatUIProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  // Auto-start with countdown when component mounts (if enabled)
  useEffect(() => {
    if (autoStartWithCountdown && state === 'idle' && !hasAutoStarted && countdown === null) {
      setCountdown(3)
      setHasAutoStarted(true)
    }
  }, [autoStartWithCountdown, state, hasAutoStarted, countdown])

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      // Countdown finished, start the session
      setCountdown(null)
      onStart()
    }
  }, [countdown, onStart])

  // Cancel countdown
  const cancelCountdown = useCallback(() => {
    setCountdown(null)
    onAbort()
  }, [onAbort])

  const isActive = state !== 'idle' && state !== 'error' && state !== 'completed'
  const isListening = state === 'listening'
  const isThinking = state === 'thinking'
  const isCountingDown = countdown !== null
  const isAiSpeaking = state === 'aiSpeaking'
  const isConnecting = state === 'connecting' || state === 'requesting'
  const isSaving = state === 'saving'
  const isCompleted = state === 'completed'

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Simplified countdown view
  if (isCountingDown) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-[#2D5A3D]/10 shadow-lg p-6 text-center">
          {/* Countdown number */}
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center"
          >
            <span className="text-4xl font-bold">{countdown}</span>
          </motion.div>
          
          {/* Topic */}
          <p className="text-[#2D5A3D] font-medium mb-2">
            {topic ? `"${topic}"` : 'Starting...'}
          </p>
          <p className="text-sm text-[#2D5A3D]/60 mb-4">Get ready to share</p>
          
          {/* Cancel */}
          <button
            onClick={cancelCountdown}
            className="text-sm text-[#2D5A3D]/50 hover:text-[#2D5A3D] underline"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Voice Chat Container */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[#2D5A3D]/10 shadow-lg overflow-hidden">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D5A3D]/10 bg-gradient-to-r from-[#2D5A3D]/5 to-transparent">
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className={`
              w-2.5 h-2.5 rounded-full transition-all duration-300
              ${isActive ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-gray-400'}
              ${isActive && 'animate-pulse'}
            `} />
            
            <span className="text-sm font-medium text-[#2D5A3D]">
              {isCompleted && 'Memory Saved'}
              {isSaving && 'Saving...'}
              {state === 'idle' && 'Ready'}
              {state === 'requesting' && 'Starting...'}
              {state === 'connecting' && 'Connecting...'}
              {state === 'connected' && 'Connected'}
              {state === 'listening' && 'Listening...'}
              {state === 'thinking' && 'Thinking...'}
              {state === 'aiSpeaking' && 'Speaking...'}
              {state === 'error' && 'Error'}
            </span>
          </div>

          {/* Stats when active - compact */}
          {isActive && (
            <div className="flex items-center gap-3 text-xs text-[#2D5A3D]/70">
              <div className="flex items-center gap-1" title="Duration">
                <Clock size={12} />
                <span>{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex items-center gap-1" title="Questions">
                <MessageSquare size={12} />
                <span>{questionCount}</span>
              </div>
            </div>
          )}

          {/* End button when active */}
          {isActive && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
            >
              <PhoneOff size={12} />
              End
            </button>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-3 bg-red-50 border-b border-red-100"
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error.message}</p>
                  <button
                    onClick={onAbort}
                    className="text-xs text-red-500 hover:text-red-700 underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area - Compact */}
        <div className="p-5 flex flex-col items-center">
          
          {/* Status Icon / Microphone Button */}
          <div className="relative mb-4">
            {/* Animated rings when listening */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-[#2D5A3D]"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    className="absolute inset-0 rounded-full bg-[#2D5A3D]"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.2 }}
                    animate={{ scale: 2.6, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                    className="absolute inset-0 rounded-full bg-[#2D5A3D]"
                  />
                </>
              )}
            </AnimatePresence>

            {/* Main Button - smaller */}
            <motion.button
              onClick={state === 'idle' ? onStart : isCompleted ? onReset : onStop}
              disabled={isConnecting || isSaving}
              className={`
                relative w-20 h-20 rounded-full flex items-center justify-center
                transition-all duration-300 shadow-xl
                ${isConnecting || isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : isListening
                    ? 'bg-[#2D5A3D] text-white shadow-[#2D5A3D]/40'
                    : isAiSpeaking
                      ? 'bg-[#C4A235] text-white shadow-[#C4A235]/40'
                      : isActive
                        ? 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
                        : isCompleted
                          ? 'bg-green-500 text-white shadow-green-500/40'
                          : 'bg-[#2D5A3D] text-white hover:bg-[#234A31] hover:scale-105'
                }
              `}
              whileTap={{ scale: 0.95 }}
            >
              {isConnecting ? (
                <Loader2 size={28} className="animate-spin" />
              ) : isSaving ? (
                <Loader2 size={28} className="animate-spin" />
              ) : isListening ? (
                <Mic size={28} />
              ) : isAiSpeaking ? (
                <Volume2 size={28} />
              ) : isActive ? (
                <Radio size={28} />
              ) : isCompleted ? (
                <Sparkles size={28} />
              ) : (
                <Mic size={28} />
              )}
            </motion.button>

            {/* Recording indicator */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Text - compact */}
          <div className="text-center mb-4">
            <AnimatePresence mode="wait">
              {isConnecting ? (
                <motion.p
                  key="connecting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[#2D5A3D]/70"
                >
                  Connecting to your AI biographer...
                </motion.p>
              ) : isSaving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 justify-center"
                >
                  <Loader2 size={18} className="animate-spin text-[#2D5A3D]" />
                  <span className="text-[#2D5A3D] font-medium">Saving your memory...</span>
                </motion.div>
              ) : isListening ? (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-[#2D5A3D] font-semibold text-lg">Listening...</p>
                  <p className="text-[#2D5A3D]/60 text-sm mt-1">Speak naturally, I'm here to listen</p>
                </motion.div>
              ) : isThinking ? (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 justify-center"
                >
                  <Loader2 size={18} className="animate-spin text-[#2D5A3D]" />
                  <span className="text-[#2D5A3D] font-medium">Thinking about what you shared...</span>
                </motion.div>
              ) : isAiSpeaking ? (
                <motion.div
                  key="speaking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3"
                >
                  <span className="text-[#C4A235] font-semibold">Speaking...</span>
                  {/* Audio wave visualization */}
                  <div className="flex items-end gap-1 h-10">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 bg-[#C4A235] rounded-full"
                        animate={{
                          height: [12, 32, 16, 40, 20],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : isActive ? (
                <motion.p
                  key="connected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[#2D5A3D]/70"
                >
                  {questionCount > 0 
                    ? "I'm listening whenever you're ready to share more"
                    : "Connected - waiting for you to begin"}
                </motion.p>
              ) : isCompleted ? (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <p className="text-green-600 font-semibold text-lg">Memory saved</p>
                  <p className="text-[#2D5A3D]/70 text-sm mt-1">
                    Thank you for sharing your story
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center"
                >
                  <p className="text-[#2D5A3D] font-medium">
                    {topic 
                      ? `Let's talk about "${topic}"`
                      : "What's on your mind?"}
                  </p>
                  <p className="text-[#2D5A3D]/60 text-sm mt-1">
                    Click the microphone to start sharing your story
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Text Display */}
          <AnimatePresence>
            {(currentUserText || currentAiText) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-lg space-y-3"
              >
                {/* User text */}
                {currentUserText && (
                  <div className="flex items-start gap-3 p-4 bg-[#2D5A3D]/5 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center shrink-0">
                      <User size={14} className="text-[#2D5A3D]" />
                    </div>
                    <p className="text-[#2D5A3D] leading-relaxed">{currentUserText}</p>
                  </div>
                )}
                
                {/* AI text */}
                {currentAiText && (
                  <div className="flex items-start gap-3 p-4 bg-[#C4A235]/10 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-[#C4A235]/30 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-[#C4A235]" />
                    </div>
                    <p className="text-[#2D5A3D] leading-relaxed">{currentAiText}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button - shown when memory is ready */}
          <AnimatePresence>
            {canSave && !isSaving && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6"
              >
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2D5A3D] to-[#234A31] text-white font-medium rounded-full shadow-lg shadow-[#2D5A3D]/25 hover:shadow-xl hover:shadow-[#2D5A3D]/30 transition-all hover:scale-105"
                >
                  <Save size={18} />
                  Save This Memory
                </button>
                <p className="text-xs text-center text-[#2D5A3D]/50 mt-2">
                  Or say "save it" to save
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset button for completed state */}
          <AnimatePresence>
            {isCompleted && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onClick={onReset}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 text-[#2D5A3D] bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/15 rounded-full transition-colors font-medium"
              >
                <RotateCcw size={16} />
                Start New Memory
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Transcript Panel (Collapsible) */}
        {showTranscript && transcript.length > 0 && (
          <div className="border-t border-[#2D5A3D]/10">
            <button
              onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm text-[#2D5A3D]/70 hover:bg-[#2D5A3D]/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span>Conversation ({transcript.length} messages)</span>
              </div>
              {isTranscriptOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence>
              {isTranscriptOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-72 overflow-y-auto p-5 space-y-4">
                    {transcript.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: entry.role === 'user' ? -10 : 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`
                          flex gap-3 p-4 rounded-2xl
                          ${entry.role === 'user' 
                            ? 'bg-[#2D5A3D]/5 ml-8' 
                            : 'bg-[#C4A235]/10 mr-8'
                          }
                        `}
                      >
                        <div className="shrink-0">
                          {entry.role === 'user' ? (
                            <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/20 flex items-center justify-center">
                              <User size={14} className="text-[#2D5A3D]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#C4A235]/30 flex items-center justify-center">
                              <Bot size={14} className="text-[#C4A235]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#2D5A3D]/50 mb-1 font-medium">
                            {entry.role === 'user' ? 'You' : persona?.name || 'AI Biographer'}
                          </p>
                          <p className="text-sm text-[#2D5A3D] leading-relaxed">{entry.text}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Footer hint */}
        {isActive && (
          <div className="px-5 py-3 bg-[#2D5A3D]/5 text-center">
            <p className="text-xs text-[#2D5A3D]/50">
              {questionCount >= maxQuestions - 1 
                ? "Say 'save it' when you're ready to save, or keep sharing"
                : "Speak naturally - I'll detect when you finish and respond"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
