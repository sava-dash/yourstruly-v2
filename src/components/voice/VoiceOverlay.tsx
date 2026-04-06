'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, X, MapPin, Loader2, Check, Send } from 'lucide-react'
import { useVoice } from './VoiceContext'

export default function VoiceOverlay() {
  const voice = useVoice()
  const [followUpText, setFollowUpText] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [isFollowUpRecording, setIsFollowUpRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevState = useRef(voice.state)

  // Focus input in follow-up mode
  useEffect(() => {
    if (voice.state === 'follow-up' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [voice.state])

  // Flash "Done" briefly when transitioning from processing → idle
  useEffect(() => {
    if (prevState.current === 'processing' && voice.state === 'idle') {
      setShowDone(true)
      const t = setTimeout(() => setShowDone(false), 1200)
      return () => clearTimeout(t)
    }
    prevState.current = voice.state
  }, [voice.state])

  // Handle follow-up location submission
  const handleFollowUpSubmit = async () => {
    if (!followUpText.trim()) return
    await voice.resolveFollowUp(followUpText.trim())
    setFollowUpText('')
  }

  // Toggle follow-up voice recording via Web Speech API
  const handleFollowUpMic = () => {
    if (isFollowUpRecording) {
      setIsFollowUpRecording(false)
      return
    }

    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null

    if (!SpeechRecognitionAPI) return

    setIsFollowUpRecording(true)
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript ?? ''
      if (text) {
        void voice.resolveFollowUp(text)
      }
      setIsFollowUpRecording(false)
    }

    recognition.onerror = () => {
      setIsFollowUpRecording(false)
    }

    recognition.onend = () => {
      setIsFollowUpRecording(false)
    }

    recognition.start()
  }

  const [selectedRelationship, setSelectedRelationship] = useState('')

  const isVisible = voice.isListening || voice.isProcessing || voice.state === 'follow-up' || voice.state === 'people-follow-up' || showDone

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden border"
            style={{
              background: 'rgba(255, 248, 240, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderColor: 'rgba(45, 90, 61, 0.13)',
            }}
          >

            {/* ---- Listening ---- */}
            {voice.isListening && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                      <Mic size={18} className="text-white" />
                    </div>
                    <div className="absolute inset-0 w-10 h-10 rounded-full bg-red-500/30 animate-ping" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D5A3D]" style={{ fontFamily: '"DM Serif Display", serif' }}>Listening...</p>
                    {voice.currentTranscript ? (
                      <p className="text-sm text-[#5A6660] truncate mt-0.5 italic">
                        &ldquo;{voice.currentTranscript}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs text-[#94A09A] mt-0.5">Speak naturally — I&apos;ll understand</p>
                    )}
                  </div>
                  <button
                    onClick={voice.dismiss}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} className="text-[#5A6660]" />
                  </button>
                </div>
              </div>
            )}

            {/* ---- Processing ---- */}
            {voice.isProcessing && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                    <Loader2 size={18} className="text-[#2D5A3D] animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2D5A3D]" style={{ fontFamily: '"DM Serif Display", serif' }}>Understanding...</p>
                    <p className="text-xs text-[#94A09A] mt-0.5">Extracting details from your words</p>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Follow-up: location clarification ---- */}
            {voice.state === 'follow-up' && voice.followUpLocationText && (
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#C4A235]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-[#C4A235]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2D5A3D]" style={{ fontFamily: '"DM Serif Display", serif' }}>
                      Where is &ldquo;{voice.followUpLocationText}&rdquo;?
                    </p>
                    <p className="text-xs text-[#94A09A] mt-0.5">
                      City, town, or address — I&apos;ll remember for next time
                    </p>
                  </div>
                  <button
                    onClick={voice.dismiss}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Skip"
                  >
                    <X size={16} className="text-[#94A09A]" />
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleFollowUpSubmit() }} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="e.g. Fuquay-Varina, NC"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[#F5F0EA] border border-[#E8E2D8] text-sm text-[#1A1F1C] placeholder-[#94A09A] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]"
                  />
                  <button
                    type="button"
                    onClick={handleFollowUpMic}
                    aria-label={isFollowUpRecording ? 'Stop recording' : 'Record location'}
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isFollowUpRecording ? '#D94040' : 'rgba(45, 90, 61, 0.08)',
                      color: isFollowUpRecording ? '#fff' : '#2D5A3D',
                    }}
                  >
                    {isFollowUpRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    type="submit"
                    disabled={!followUpText.trim()}
                    className="px-3 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#234A31] transition-colors flex items-center gap-1.5"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* ---- People follow-up: ask about new person ---- */}
            {voice.state === 'people-follow-up' && voice.currentNewPerson && (
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">👤</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1A1F1C]">
                      Who is &ldquo;{voice.currentNewPerson.name}&rdquo;?
                    </p>
                    <p className="text-xs text-[#94A09A] mt-0.5">
                      I&apos;ll add them to your contacts
                    </p>
                  </div>
                  <button
                    onClick={voice.skipPersonFollowUp}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Skip"
                  >
                    <X size={16} className="text-[#94A09A]" />
                  </button>
                </div>

                {/* Relationship quick picks */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { id: 'spouse', label: 'Spouse' },
                    { id: 'son', label: 'Son' },
                    { id: 'daughter', label: 'Daughter' },
                    { id: 'mother', label: 'Mother' },
                    { id: 'father', label: 'Father' },
                    { id: 'brother', label: 'Brother' },
                    { id: 'sister', label: 'Sister' },
                    { id: 'grandmother', label: 'Grandma' },
                    { id: 'grandfather', label: 'Grandpa' },
                    { id: 'friend', label: 'Friend' },
                    { id: 'other', label: 'Other' },
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRelationship(r.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedRelationship === r.id
                          ? 'bg-[#2D5A3D] text-white'
                          : 'bg-[#F5F0EA] text-[#5A6660] hover:bg-[#E8E2D8]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (selectedRelationship) {
                      voice.resolvePersonFollowUp(voice.currentNewPerson!.name, selectedRelationship)
                      setSelectedRelationship('')
                    }
                  }}
                  disabled={!selectedRelationship}
                  className="w-full py-2.5 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#234A31] transition-colors"
                >
                  Add {voice.currentNewPerson.name} as Contact
                </button>
              </div>
            )}

            {/* ---- Done flash ---- */}
            {showDone && !voice.isListening && !voice.isProcessing && voice.state === 'idle' && (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                    <Check size={18} className="text-[#2D5A3D]" />
                  </div>
                  <p className="text-sm font-medium text-[#2D5A3D]">Got it!</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { VoiceOverlay }
