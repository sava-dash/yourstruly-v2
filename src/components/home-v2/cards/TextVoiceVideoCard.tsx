'use client'

import { useState, useRef } from 'react'
import { Mic, Video, Square, Send, Check, Loader2 } from 'lucide-react'

interface TextVoiceVideoCardProps {
  label?: string
  placeholder?: string
  data: { text?: string; audioUrl?: string; videoUrl?: string }
  onSave: (data: { text: string; audioUrl?: string; videoUrl?: string }) => void
  saved: boolean
}

export function TextVoiceVideoCard({ label = 'Your Story', placeholder = 'Share your thoughts...', data, onSave, saved }: TextVoiceVideoCardProps) {
  const [text, setText] = useState(data.text || '')
  const [isRecording, setIsRecording] = useState(false)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [interimText, setInterimText] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const speechRecRef = useRef<any>(null)
  const usedWebSpeechRef = useRef(false)

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
          recognition.onerror = () => {}
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

  const handleSave = async () => {
    if (isRecording) stopRecording()
    if (!text.trim()) return
    setSaving(true)
    await onSave({ text: text.trim() })
    setSaving(false)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70">
        {label}
      </h3>

      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full min-h-[100px] px-3 py-2.5 bg-white/5 rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 focus:border-[#D9C61A]/50 placeholder-white/30 resize-none"
          style={interimText ? { color: 'transparent', caretColor: 'white' } : undefined}
        />
        {interimText && (
          <div className="absolute inset-0 px-3 py-2.5 pointer-events-none text-sm">
            <span className="text-white">{text}</span>
            <span className="text-white/40 italic">{interimText}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isVideoRecording}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-40'
          }`}
        >
          {isRecording ? <Square size={14} fill="white" /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => {/* TODO: video recording */}}
          disabled={isRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Video size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!text.trim() || saving || saved}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-[#406A56] text-white hover:bg-[#4a7a64] disabled:opacity-40'
          }`}
        >
          {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Save</>}
        </button>
      </div>
    </div>
  )
}
