'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, RotateCcw } from 'lucide-react'

interface AiDraftHelperProps {
  recipientName: string
  relationship?: string
  occasion?: string
  deliveryType: string
  onDraftGenerated: (draft: string, title: string) => void
}

const TONES = [
  { id: 'heartfelt', label: 'Heartfelt', desc: 'Warm and sincere' },
  { id: 'funny', label: 'Light & Warm', desc: 'Gentle humor' },
  { id: 'wise', label: 'Wise', desc: 'Life lessons' },
  { id: 'encouraging', label: 'Encouraging', desc: 'Uplifting' },
]

export default function AiDraftHelper({
  recipientName,
  relationship,
  occasion,
  deliveryType,
  onDraftGenerated,
}: AiDraftHelperProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tone, setTone] = useState('heartfelt')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/postscripts/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          relationship,
          occasion,
          deliveryType,
          tone,
          context,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.draft) {
          onDraftGenerated(data.draft, data.suggestedTitle || '')
          setGenerated(true)
          setTimeout(() => setIsOpen(false), 1500)
        }
      }
    } catch (err) {
      console.error('AI draft generation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2D5A3D]/10 to-[#C4A235]/10 border border-[#2D5A3D]/15 text-[#2D5A3D] text-sm font-medium hover:from-[#2D5A3D]/15 hover:to-[#C4A235]/15 transition-all"
      >
        <Sparkles size={16} />
        Help me write this
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[#2D5A3D]/15 bg-gradient-to-br from-[#F5F3EE] to-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#1A1F1C] flex items-center gap-2">
          <Sparkles size={14} className="text-[#C4A235]" />
          AI Writing Assistant
        </h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Choose a tone and add any details you'd like included. We'll use your memories to make it personal.
      </p>

      {/* Tone selector */}
      <div className="flex flex-wrap gap-2">
        {TONES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTone(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tone === t.id
                ? 'bg-[#2D5A3D] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2D5A3D]/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Optional context */}
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder={`Anything specific you'd like to mention? e.g. "our camping trips", "how proud I am of their career"...`}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]"
        rows={2}
        maxLength={300}
      />

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !recipientName}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium hover:bg-[#244B32] disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Writing...</>
        ) : generated ? (
          <><Check size={14} /> Draft applied</>
        ) : (
          <><Sparkles size={14} /> Generate Draft</>
        )}
      </button>

      {generated && (
        <button
          onClick={() => { setGenerated(false); handleGenerate() }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-[#2D5A3D] transition-colors"
        >
          <RotateCcw size={12} /> Try a different version
        </button>
      )}
    </div>
  )
}
