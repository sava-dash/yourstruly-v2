'use client'

import { useState } from 'react'
import { X, Users, Save } from 'lucide-react'

interface CreateCircleModalProps {
  onClose: () => void
  onSave: (circle: { name: string; description: string }) => void
}

export default function CreateCircleModal({ onClose, onSave }: CreateCircleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg"
        style={{
          background: 'var(--ed-cream, #F3ECDC)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: '2px solid var(--ed-ink, #111)',
            background: 'var(--ed-paper, #FFFBF1)',
          }}
          aria-label="Close"
        >
          <X size={16} className="text-[var(--ed-ink,#111)]" />
        </button>

        {/* Header */}
        <header className="px-6 sm:px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }} />
            <span
              className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              NEW CIRCLE
            </span>
          </div>
          <h2
            className="text-[var(--ed-ink,#111)] leading-tight"
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 'clamp(28px, 5vw, 36px)',
            }}
          >
            CREATE CIRCLE
          </h2>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-8">
          <div
            className="p-5 mb-4"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <div className="space-y-4">
              <div>
                <label
                  className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  CIRCLE NAME *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]"
                  placeholder="Family, Close Friends, Work…"
                  autoFocus
                  maxLength={50}
                  style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                />
              </div>
              <div>
                <label
                  className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  DESCRIPTION
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] resize-none"
                  placeholder="What is this circle about? (optional)"
                  rows={3}
                  maxLength={200}
                  style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                />
                <p className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] mt-1" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {description.length}/200
                </p>
              </div>
            </div>
          </div>

          {/* Owner notice */}
          <div
            className="p-3 mb-4 flex items-start gap-2"
            style={{
              background: 'var(--ed-yellow, #F2C84B)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <Users size={14} className="shrink-0 mt-0.5 text-[var(--ed-ink,#111)]" />
            <p className="text-[12px] text-[var(--ed-ink,#111)]">
              <strong>You'll be the owner</strong> — invite others, manage members, configure settings.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'transparent',
                color: 'var(--ed-ink, #111)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em] disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <Save size={12} />
              {saving ? 'CREATING…' : 'CREATE CIRCLE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
