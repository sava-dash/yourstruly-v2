'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Check, Loader2, Search, X } from 'lucide-react'

interface Contact {
  id: string
  full_name: string
  relationship_type?: string
}

interface PeoplePresentCardProps {
  data: { people?: { id: string; name: string }[]; preselectedNames?: string[] }
  onSave: (data: { people: { id: string; name: string }[] }) => void
  saved: boolean
}

export function PeoplePresentCard({ data, onSave, saved }: PeoplePresentCardProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Map<string, { id: string; name: string }>>(
    new Map((data.people || []).map(p => [p.id, p]))
  )
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: c } = await supabase
        .from('contacts')
        .select('id, full_name, relationship_type')
        .eq('user_id', user.id)
        .order('full_name')
      if (c) {
        setContacts(c)
        // Auto-select contacts matching preselectedNames from concierge
        if (data.preselectedNames?.length && selected.size === 0) {
          const autoSelected = new Map<string, { id: string; name: string }>()
          for (const name of data.preselectedNames) {
            const nameLower = name.toLowerCase().trim()
            const match = c.find(contact => {
              const fullLower = contact.full_name.toLowerCase()
              const firstName = fullLower.split(' ')[0]
              const relType = (contact.relationship_type || '').toLowerCase().replace(/_/g, ' ')
              // Match by: full name contains, first name exact, or relationship type
              return fullLower.includes(nameLower) ||
                nameLower.includes(fullLower) ||
                firstName === nameLower ||
                relType === nameLower  // "mom" matches relationship_type "mother"
            })
            if (match) autoSelected.set(match.id, { id: match.id, name: match.full_name })
          }
          if (autoSelected.size > 0) setSelected(autoSelected)
        }
      }
    }
    load()
  }, [])

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (contact: Contact) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(contact.id)) next.delete(contact.id)
      else next.set(contact.id, { id: contact.id, name: contact.full_name })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave({ people: Array.from(selected.values()) })
    setSaving(false)
  }

  // ── Saved view ──
  if (saved && data.people?.length) {
    return (
      <div className="h-full flex flex-col p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5 mb-4">
          <Users size={12} /> People Present
        </h3>
        <div className="flex-1 flex flex-wrap content-start gap-2">
          {data.people.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E6F0EA] border border-[#2D5A3D]/10">
              <div className="w-7 h-7 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center text-xs font-bold">
                {p.name.charAt(0)}
              </div>
              <span className="text-sm text-[#1A1F1C] font-medium">{p.name}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 pt-3 text-[#2D5A3D] text-sm">
          <Check size={14} /> Saved
        </div>
      </div>
    )
  }

  // ── Edit view ──
  return (
    <div className="h-full flex flex-col p-5 gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
          <Users size={12} /> Who Was There?
        </h3>
        {selected.size > 0 && (
          <span className="text-xs text-[#2D5A3D] font-medium">{selected.size} selected</span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A09A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full pl-9 pr-3 py-2 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF] text-[#1A1F1C] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]"
        />
      </div>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(selected.values()).map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E6F0EA] text-[#2D5A3D] rounded-full text-[11px] font-medium">
              {p.name}
              <button onClick={() => toggle({ id: p.id, full_name: p.name } as Contact)} className="hover:text-[#B8562E]">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {filtered.map(contact => {
          const isSelected = selected.has(contact.id)
          return (
            <button
              key={contact.id}
              onClick={() => toggle(contact)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                isSelected ? 'bg-[#E6F0EA] border border-[#2D5A3D]/20' : 'hover:bg-[#FAFAF7] border border-transparent'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                isSelected ? 'bg-[#2D5A3D] text-white' : 'bg-[#F5F1EA] text-[#5A6660]'
              }`}>
                {isSelected ? <Check size={12} /> : contact.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[#1A1F1C] font-medium truncate">{contact.full_name}</p>
                {contact.relationship_type && (
                  <p className="text-[10px] text-[#94A09A] capitalize">{contact.relationship_type.replace(/_/g, ' ')}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={selected.size === 0 || saving}
        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-all active:scale-[0.96]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save ({selected.size})</>}
      </button>
    </div>
  )
}
