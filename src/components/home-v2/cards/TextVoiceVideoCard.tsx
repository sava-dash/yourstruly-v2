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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660]">
        {label}
      </h3>

      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full min-h-[100px] px-3 py-2.5 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 focus:border-[#3D6B52]/50 placeholder-[#94A09A] resize-none"
          style={interimText ? { color: 'transparent', caretColor: '#1A1F1C' } : undefined}
        />
        {interimText && (
          <div className="absolute inset-0 px-3 py-2.5 pointer-events-none text-sm">
            <span className="text-[#1A1F1C]">{text}</span>
            <span className="text-[#94A09A] italic">{interimText}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isVideoRecording}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            isRecording ? 'bg-[#B8562E] text-white animate-pulse' : 'bg-[#F5F3EE] text-[#5A6660] hover:bg-[#E6F0EA] disabled:opacity-40'
          }`}
        >
          {isRecording ? <Square size={14} fill="white" /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => {/* TODO: video recording */}}
          disabled={isRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F3EE] text-[#5A6660] hover:bg-[#E6F0EA] disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <Video size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!text.trim() || saving || saved}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            saved
              ? 'bg-[#E6F0EA] text-[#2D5A3D] border border-[#2D5A3D]/30'
              : 'bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40'
          }`}
        >
          {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Save</>}
        </button>
      </div>
    </div>
  )
}
