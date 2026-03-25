'use client'

import { useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'

interface PillSelectCardProps {
  label: string
  options: string[]
  data: { selected?: string[]; custom?: string }
  onSave: (data: { selected: string[]; custom?: string }) => void
  saved: boolean
}

export function PillSelectCard({ label, options, data, onSave, saved }: PillSelectCardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(data.selected || []))
  const [customInput, setCustomInput] = useState(data.custom || '')
  const [showCustom, setShowCustom] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggle = (option: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return next
    })
  }

  const handleSave = async () => {
    const sel = Array.from(selected)
    if (customInput.trim()) sel.push(customInput.trim())
    if (sel.length === 0) return
    setSaving(true)
    await onSave({ selected: sel, custom: customInput.trim() || undefined })
    setSaving(false)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8DACAB]/70">
        {label}
      </h3>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {options.map(option => (
            <button
              key={option}
              onClick={() => toggle(option)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selected.has(option)
                  ? 'bg-[#D9C61A]/20 text-[#D9C61A] border border-[#D9C61A]/40'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              {option}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/40 border border-white/10 border-dashed hover:bg-white/10 flex items-center gap-1"
          >
            <Plus size={10} /> Custom
          </button>
        </div>

        {showCustom && (
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type your own..."
            className="mt-3 w-full px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D9C61A]/30 placeholder-white/30"
            autoFocus
          />
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={(selected.size === 0 && !customInput.trim()) || saving || saved}
        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-[#406A56] text-white hover:bg-[#4a7a64] disabled:opacity-40'
        }`}
      >
        {saved ? <><Check size={14} /> Saved</> : saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
      </button>
    </div>
  )
}
