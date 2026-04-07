'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, Square, Send, Check, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PromptCategory } from '../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BackstoryCardProps {
  promptText: string
  category: PromptCategory
  data: { text?: string; messages?: Message[] }
  onSave: (data: { text: string; messages?: Message[] }) => void
  saved: boolean
}

export function BackstoryCard({ promptText, category, data, onSave, saved }: BackstoryCardProps) {
  const [messages, setMessages] = useState<Message[]>(data.messages || [])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const speechRecRef = useRef<any>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  // Start conversation — or continue if pre-seeded from concierge
  useEffect(() => {
    if (messages.length === 0 && !saved) {
      // No messages yet — start with AI's first question
      const initialMessage = category === 'photo'
        ? `Tell me about this photo! ${promptText}`
        : `I'd love to hear about this. ${promptText} Take your time — just share whatever comes to mind.`
      setMessages([{ role: 'assistant', content: initialMessage }])
    } else if (messages.length > 0 && messages[messages.length - 1].role === 'user' && !saved) {
      // Pre-seeded from concierge — user's story is first, generate AI follow-up
      generateFollowUp(messages)
    }
  }, [])

  // Generate AI follow-up for pre-seeded conversations
  const generateFollowUp = async (currentMessages: Message[]) => {
    setIsSending(true)
    try {
      const res = await fetch('/api/conversation-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
          context: `The user just shared a memory about: "${promptText}". Ask a warm, specific follow-up question to draw out more detail. Keep it to 1-2 sentences.`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const aiResponse = data.response || data.message || data.content
        if (aiResponse) {
          setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
        }
      }
    } catch {
      // Fallback follow-up
      setMessages(prev => [...prev, { role: 'assistant', content: 'That\'s wonderful. What stands out most when you think about that moment?' }])
    }
    setIsSending(false)
  }

  // TTS disabled — pending VibeVoice integration

  // Send message
  const handleSend = async () => {
    if (!input.trim() || isSending) return
    const userMessage = input.trim()
    setInput('')
    setIsSending(true)

    // Optimistically add the user message so it shows immediately
    const withUser = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(withUser)

    try {
      const res = await fetch('/api/conversation-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          // Send the PREVIOUS messages (without user) — the engine appends the user message itself
          engineState: { messages, turnCount: messages.filter(m => m.role === 'user').length },
          context: category === 'photo' ? 'photo_backstory' : 'engagement',
        }),
      })
      const data = await res.json()
      if (data.engineState?.messages) {
        // Engine returns the full conversation (prev + user + assistant) — replace local state
        setMessages(data.engineState.messages)
      } else if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'd love to hear more. Keep going!" }])
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      let usedWebSpeech = false

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (!usedWebSpeech) {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          setLiveTranscript('')
          try {
            const formData = new FormData()
            formData.append('audio', blob, 'recording.webm')
            const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
            const d = await res.json()
            if (d.transcription || d.text) setInput(prev => prev ? `${prev} ${d.transcription || d.text}` : (d.transcription || d.text))
          } catch {}
        }
        setLiveTranscript('')
        if (speechRecRef.current) { try { speechRecRef.current.stop() } catch {} speechRecRef.current = null }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)

      // Web Speech API for live transcription
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
                usedWebSpeech = true
                setInput(prev => prev ? `${prev} ${event.results[i][0].transcript}` : event.results[i][0].transcript)
                setLiveTranscript('')
              } else interim += event.results[i][0].transcript
            }
            if (interim) setLiveTranscript(interim)
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
    setLiveTranscript('')
    setIsRecording(false)
  }

  // Save the full conversation
  const handleSave = async () => {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n')
    if (!userMessages.trim()) return
    setSaving(true)
    await onSave({ text: userMessages, messages })
    setSaving(false)
  }

  const userTurnCount = messages.filter(m => m.role === 'user').length
  const canSave = userTurnCount >= 1
  const shouldNudgeToSave = userTurnCount >= 3

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
          <Sparkles size={12} /> {category === 'photo' ? 'Tell the Story' : 'Your Story'}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#E6F0EA] text-[#1A1F1C] rounded-br-md'
                : 'bg-[#FAFAF7] text-[#5A6660] rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-[#FAFAF7] px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#94A09A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#94A09A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#94A09A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!saved ? (
        <div className="px-4 pb-4 pt-2 border-t border-[#DDE3DF]">
          {/* Nudge to save — appears after 3 user responses, stays visible */}
          {shouldNudgeToSave && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 px-3 py-2 rounded-xl bg-[#E6F0EA] border border-[#2D5A3D]/15 flex items-center gap-2"
            >
              <Sparkles size={14} className="text-[#2D5A3D] flex-shrink-0" />
              <span className="text-xs text-[#2D5A3D] flex-1 leading-snug">
                You can save anytime — or keep going if there&apos;s more to share
              </span>
            </motion.div>
          )}

          {/* Live transcript preview */}
          {liveTranscript && (
            <p className="text-xs text-[#94A09A] italic mb-1 px-1">{liveTranscript}</p>
          )}

          <div className="flex items-end gap-2">
            {/* Voice */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isRecording ? 'bg-[#B8562E] text-white animate-pulse' : 'bg-[#F5F3EE] text-[#5A6660] hover:bg-[#E6F0EA]'
              }`}
            >
              {isRecording ? <Square size={14} fill="white" /> : <Mic size={16} />}
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Type your response..."
              rows={1}
              className="flex-1 px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-1 focus:ring-[#3D6B52]/30 placeholder-[#94A09A] resize-none"
              style={{ maxHeight: '80px' }}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2D5A3D] text-white disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Save button — appears after first response */}
          {canSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-all active:scale-[0.96] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save & Continue →</>}
            </button>
          )}
        </div>
      ) : (
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-center gap-2 py-3 text-[#2D5A3D] text-sm">
            <Check size={14} /> Conversation saved
          </div>
        </div>
      )}
    </div>
  )
}
