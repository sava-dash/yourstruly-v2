'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Send, Check, Loader2, Sparkles, MessageSquare } from 'lucide-react'

interface CollabData {
  id: string
  contact_name: string
  prompt_text: string
  story_context: string
  inviter_name: string
  status: string
}

export default function CollaboratePage({ params }: { params: { token: string } }) {
  const [collab, setCollab] = useState<CollabData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const speechRecRef = useRef<any>(null)
  const usedWebSpeechRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/collaborate/load?token=${params.token}`)
        if (!res.ok) {
          setError('This collaboration link is invalid or has expired.')
          setLoading(false)
          return
        }
        const data = await res.json()
        setCollab(data)

        // Mark as viewed
        await fetch(`/api/collaborate/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.token }),
        })
      } catch {
        setError('Failed to load collaboration.')
      }
      setLoading(false)
    }
    load()
  }, [params.token])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      usedWebSpeechRef.current = false

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (!usedWebSpeechRef.current) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          if (speechRecRef.current) { try { speechRecRef.current.stop() } catch {} speechRecRef.current = null }
          setInterimText('')
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')
          try {
            const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
            const d = await res.json()
            if (d.transcription || d.text) setText(prev => prev ? `${prev} ${d.transcription || d.text}` : (d.transcription || d.text))
          } catch {}
        } else {
          if (speechRecRef.current) { try { speechRecRef.current.stop() } catch {} speechRecRef.current = null }
          setInterimText('')
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)

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
                setText(prev => prev ? `${prev} ${event.results[i][0].transcript}` : event.results[i][0].transcript)
                setInterimText('')
              } else interim += event.results[i][0].transcript
            }
            if (interim) setInterimText(interim)
          }
          recognition.start()
          speechRecRef.current = recognition
        }
      } catch {}
    } catch {}
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
    if (speechRecRef.current) { try { speechRecRef.current.stop() } catch {} speechRecRef.current = null }
    setInterimText('')
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await fetch('/api/collaborate/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          responseText: text.trim(),
        }),
      })
      setDone(true)
    } catch {
      setError('Failed to submit. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#2D5A3D]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-lg text-[#1A1F1C] font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-[#E6F0EA] flex items-center justify-center mx-auto mb-6">
            <Check size={32} className="text-[#2D5A3D]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1F1C] mb-2">Thank you!</h1>
          <p className="text-[#5A6660]">
            Your story has been added. {collab?.inviter_name} will see your contribution.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDE3DF] px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Sparkles size={20} className="text-[#C4A235]" />
          <span className="text-sm font-semibold text-[#1A1F1C]">YoursTruly</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Invitation context */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm text-[#94A09A] mb-2">
            {collab?.inviter_name} invited you to contribute
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#1A1F1C] leading-tight mb-4"
            style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}
          >
            {collab?.prompt_text}
          </h1>
          {collab?.story_context && (
            <div className="bg-[#F5F1EA] rounded-2xl p-5">
              <p className="text-sm text-[#5A6660] italic leading-relaxed">
                {collab.story_context}
              </p>
            </div>
          )}
        </motion.div>

        {/* Response area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-[#DDE3DF] shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-[#2D5A3D]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660]">
              Your Perspective
            </h2>
          </div>

          <div className="relative mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your perspective on this memory... What do you remember? What details would you add?"
              className="w-full min-h-[200px] px-4 py-3 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none leading-relaxed"
              style={interimText ? { color: 'transparent', caretColor: '#1A1F1C' } : undefined}
            />
            {interimText && (
              <div className="absolute inset-0 px-4 py-3 pointer-events-none text-sm leading-relaxed">
                <span className="text-[#1A1F1C]">{text}</span>
                <span className="text-[#94A09A] italic">{interimText}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                isRecording ? 'bg-[#B8562E] text-white animate-pulse' : 'bg-[#F5F3EE] text-[#5A6660] hover:bg-[#E6F0EA]'
              }`}
            >
              {isRecording ? <Square size={16} fill="white" /> : <Mic size={18} />}
            </button>
            <span className="text-xs text-[#94A09A] flex-1">
              {isRecording ? 'Recording... tap to stop' : 'Tap to speak your story'}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || saving}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 flex items-center gap-2 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Submit</>}
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-[#94A09A] mt-6">
          Your response will be added to the shared memory
        </p>
      </div>
    </div>
  )
}
