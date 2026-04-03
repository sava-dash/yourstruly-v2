'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, Send, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
}

export default function VoiceInput({
  onTranscript,
  onCancel,
  placeholder = "What can I help you with?",
  className = '',
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (final) {
        setTranscript(prev => prev + final)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied')
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      if (isListening) {
        // Restart if we want to keep listening
        recognition.start()
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  const startListening = () => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    setInterimTranscript('')
    setIsListening(true)
    recognitionRef.current.start()
  }

  const stopListening = () => {
    if (!recognitionRef.current) return
    setIsListening(false)
    recognitionRef.current.stop()
  }

  const handleSubmit = () => {
    stopListening()
    if (transcript.trim()) {
      onTranscript(transcript.trim())
      setTranscript('')
    }
  }

  const handleCancel = () => {
    stopListening()
    setTranscript('')
    setInterimTranscript('')
    onCancel?.()
  }

  const displayText = transcript + interimTranscript

  return (
    <div className={`relative ${className}`}>
      {/* Main container - glassmorphism style */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-[#C4A235]/20 shadow-lg p-4">
        
        {/* Placeholder or transcript */}
        <div className="min-h-[60px] mb-4">
          {displayText ? (
            <p className="text-[#2D5A3D] text-lg leading-relaxed">
              {transcript}
              <span className="text-[#2D5A3D]/40">{interimTranscript}</span>
              {isListening && <span className="animate-pulse">|</span>}
            </p>
          ) : (
            <p className="text-[#2D5A3D]/40 text-lg">{placeholder}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Cancel button */}
          {(isListening || transcript) && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleCancel}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
            >
              <X size={20} />
            </motion.button>
          )}

          {/* Mic button */}
          <motion.button
            onClick={isListening ? stopListening : startListening}
            disabled={!!error}
            className={`
              relative w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-300
              ${isListening 
                ? 'bg-[#2D5A3D] text-white shadow-lg shadow-[#2D5A3D]/30' 
                : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
              }
              ${error ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            whileTap={{ scale: 0.95 }}
          >
            {/* Pulse animation when listening */}
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#2D5A3D]"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#2D5A3D]"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
            
            <Mic size={28} className="relative z-10" />
          </motion.button>

          {/* Submit button */}
          {transcript && !isListening && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSubmit}
              className="w-10 h-10 rounded-full bg-[#C4A235] flex items-center justify-center text-white hover:bg-[#C4A235]/90 transition-colors shadow-md"
            >
              <Send size={18} />
            </motion.button>
          )}
        </div>

        {/* Status text */}
        <AnimatePresence>
          {isListening && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center text-sm text-[#2D5A3D]/60 mt-3 flex items-center justify-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D5A3D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2D5A3D]"></span>
              </span>
              Listening...
            </motion.p>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-500 mt-3">{error}</p>
        )}
      </div>
    </div>
  )
}

// Compact version for inline use
export function VoiceInputButton({
  onTranscript,
  className = '',
}: {
  onTranscript: (text: string) => void
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`
          w-10 h-10 rounded-full bg-[#2D5A3D]/10 
          flex items-center justify-center text-[#2D5A3D]
          hover:bg-[#2D5A3D]/20 transition-colors
          ${className}
        `}
      >
        <Mic size={20} />
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <VoiceInput
                onTranscript={(text) => {
                  onTranscript(text)
                  setIsOpen(false)
                }}
                onCancel={() => setIsOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
