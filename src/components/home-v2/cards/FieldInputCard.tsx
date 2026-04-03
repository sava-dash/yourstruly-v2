'use client'

import { useState } from 'react'
import { Check, Loader2, User } from 'lucide-react'

interface FieldInputCardProps {
  contactName?: string
  data: Record<string, string>
  onSave: (data: Record<string, string>) => void
  saved: boolean
}

const FIELDS = [
  { key: 'birthday', label: 'Birthday', placeholder: 'MM/DD/YYYY', icon: '🎂' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (555) 123-4567', icon: '📱' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com', icon: '✉️' },
  { key: 'address', label: 'Address', placeholder: '123 Main St, City, State', icon: '🏠' },
]

export function FieldInputCard({ contactName, data, onSave, saved }: FieldInputCardProps) {
  const [values, setValues] = useState<Record<string, string>>(data || {})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()))
    if (Object.keys(filled).length === 0) return
    setSaving(true)
    await onSave(filled)
    setSaving(false)
  }

  const hasContent = Object.values(values).some(v => v.trim())

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
        <User size={12} /> {contactName ? `${contactName}'s Info` : 'Contact Info'}
      </h3>

      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto">
        {FIELDS.map(field => (
          <div key={field.key}>
            <label className="text-[10px] text-[#94A09A] uppercase tracking-wider mb-0.5 block">
              {field.icon} {field.label}
            </label>
            <input
              type="text"
              value={values[field.key] || ''}
              onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 bg-[#FAFAF7] rounded-lg border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D]/50 placeholder-[#94A09A]"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!hasContent || saving || saved}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          saved
            ? 'bg-[#E6F0EA] text-[#2D5A3D] border border-[#2D5A3D]/30'
            : 'bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40'
        }`}
      >
        {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
      </button>
    </div>
  )
}
