'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RELATIONSHIP_OPTIONS } from '@/lib/relationships'

interface AddContactModalProps {
  onClose: () => void
  onSave?: () => void
}

// Editorial input theming — reused for every field so the form reads as one
// system. Same idiom used in ContactDetailModal's edit pane.
const editorialInput = 'w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none'
const editorialInputStyle: React.CSSProperties = {
  background: 'var(--ed-cream, #F3ECDC)',
  border: '2px solid var(--ed-ink, #111)',
  borderRadius: 2,
}
const labelClass = 'block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1'
const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }

export function AddContactModal({ onClose, onSave }: AddContactModalProps) {
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    email: '',
    phone: '',
    relationship_type: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.full_name || !form.relationship_type) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      full_name: form.full_name,
      relationship_type: form.relationship_type,
      nickname: form.nickname || null,
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      zipcode: form.zipcode || null,
      notes: form.notes || null,
    }

    await supabase.from('contacts').insert(payload)
    setSaving(false)
    onSave?.()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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

        <header className="px-6 sm:px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }} />
            <span
              className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              NEW CONTACT
            </span>
          </div>
          <h2
            className="text-[var(--ed-ink,#111)] leading-tight"
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 'clamp(28px, 5vw, 36px)',
            }}
          >
            ADD CONTACT
          </h2>
        </header>

        <div className="px-6 sm:px-8 pb-8">
          <div
            className="p-5"
            style={{
              background: 'var(--ed-paper, #FFFBF1)',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={labelStyle}>FULL NAME *</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={editorialInput}
                  style={editorialInputStyle}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>RELATIONSHIP *</label>
                <select
                  value={form.relationship_type}
                  onChange={(e) => setForm({ ...form, relationship_type: e.target.value })}
                  className={editorialInput}
                  style={editorialInputStyle}
                >
                  <option value="">Select…</option>
                  {RELATIONSHIP_OPTIONS.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={labelStyle}>NICKNAME</label>
                  <input
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    className={editorialInput}
                    style={editorialInputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>BIRTHDAY</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className={editorialInput}
                    style={editorialInputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} style={labelStyle}>EMAIL</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={editorialInput}
                    style={editorialInputStyle}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>PHONE</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={editorialInput}
                    style={editorialInputStyle}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>ADDRESS (for gift delivery)</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={editorialInput + ' mb-2'}
                  style={editorialInputStyle}
                  placeholder="123 Main Street, Apt 4"
                />
                <div className="grid grid-cols-4 gap-2">
                  <input value={form.city}    onChange={(e) => setForm({ ...form, city: e.target.value })}    className={editorialInput} style={editorialInputStyle} placeholder="City" />
                  <input value={form.state}   onChange={(e) => setForm({ ...form, state: e.target.value })}   className={editorialInput} style={editorialInputStyle} placeholder="State" />
                  <input value={form.zipcode} onChange={(e) => setForm({ ...form, zipcode: e.target.value })} className={editorialInput} style={editorialInputStyle} placeholder="Zip" />
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={editorialInput} style={editorialInputStyle} placeholder="Country" />
                </div>
              </div>

              <div>
                <label className={labelClass} style={labelStyle}>NOTES</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={editorialInput + ' resize-none'}
                  style={editorialInputStyle}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
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
              onClick={handleSave}
              disabled={saving || !form.full_name || !form.relationship_type}
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
              {saving ? 'SAVING…' : 'SAVE CONTACT'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
