'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Check, Loader2, Search, X, UserPlus } from 'lucide-react'
import { RELATIONSHIP_OPTIONS } from '@/lib/relationships'

interface Contact {
  id: string
  full_name: string
  relationship_type?: string
}

interface DetectedPerson {
  name: string
  contactId: string | null
  contactName: string | null
  isNew: boolean
  /** Matched via a relation word ("father" → user's father contact).
      Card shows "Did you mean NAME?" confirmation before selecting. */
  matchedByRelation?: boolean
  /** The spoken name was a pure relation word (father/mother/etc.). */
  isRelationWord?: boolean
}

interface RelationSuggestion {
  /** The word the user said (e.g. "father") */
  spokenWord: string
  /** Existing contact to suggest */
  contactId: string
  contactName: string
}

interface PeoplePresentCardProps {
  data: {
    people?: { id: string; name: string }[]
    preselectedNames?: string[]
    /** People resolved from the memory story text via /api/voice/extract */
    detectedPeople?: DetectedPerson[]
  }
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
  // Queue of custom contact names that still need a relationship picked.
  // Populated from (a) AI-detected names with no matching contact, or
  // (b) manual "Add new contact" flow via the search bar.
  const [pendingNames, setPendingNames] = useState<string[]>([])
  const [resolvingName, setResolvingName] = useState<string | null>(null)
  // "Did you mean NAME?" suggestions for relation words we could match
  // to an existing contact. User confirms before the contact is added
  // to `selected`.
  const [suggestions, setSuggestions] = useState<RelationSuggestion[]>([])
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

  // When the memory story mentions new people (via /api/voice/extract),
  // route them through three buckets:
  //
  //   (a) Exact / first-name matches → auto-select silently
  //   (b) matchedByRelation (e.g. "father" → found Dad)
  //       → show "Did you mean NAME?" suggestion — needs confirm
  //   (c) isRelationWord with NO match → ignore entirely
  //   (d) Unmatched proper names → queue as pending custom contacts
  //
  // Runs whenever detectedPeople changes so late-arriving extractions
  // get merged in even after the card has mounted.
  useEffect(() => {
    const detected = data.detectedPeople
    if (!detected || detected.length === 0) return

    // (a) Silent auto-select for confident matches
    setSelected(prev => {
      let changed = false
      const next = new Map(prev)
      for (const p of detected) {
        if (p.matchedByRelation) continue // handled as a suggestion instead
        if (p.contactId && p.contactName && !next.has(p.contactId)) {
          next.set(p.contactId, { id: p.contactId, name: p.contactName })
          changed = true
        }
      }
      return changed ? next : prev
    })

    // (b) "Did you mean NAME?" suggestions for relation-word matches
    setSuggestions(prev => {
      const existingKeys = new Set(prev.map(s => `${s.spokenWord.toLowerCase()}|${s.contactId}`))
      const additions: RelationSuggestion[] = []
      for (const p of detected) {
        if (!p.matchedByRelation || !p.contactId || !p.contactName) continue
        const key = `${p.name.toLowerCase()}|${p.contactId}`
        if (existingKeys.has(key)) continue
        // Skip if that contact is already selected
        if (selected.has(p.contactId)) continue
        additions.push({ spokenWord: p.name, contactId: p.contactId, contactName: p.contactName })
        existingKeys.add(key)
      }
      return additions.length > 0 ? [...prev, ...additions] : prev
    })

    // (d) Queue unmatched proper names as pending custom contacts.
    //     (c) isRelationWord with no contact match is implicitly ignored
    //     here — we don't want a "new contact called Father" flow.
    setPendingNames(prev => {
      const existingLower = new Set(prev.map(n => n.toLowerCase()))
      const additions: string[] = []
      for (const p of detected) {
        if (!p.isNew || !p.name) continue
        if (p.isRelationWord) continue // never queue bare relation words
        const n = p.name.trim()
        if (!n) continue
        if (existingLower.has(n.toLowerCase())) continue
        additions.push(n)
        existingLower.add(n.toLowerCase())
      }
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [data.detectedPeople])

  // Confirm a "Did you mean NAME?" suggestion — add to selected, drop from list
  const acceptSuggestion = (s: RelationSuggestion) => {
    setSelected(prev => {
      const next = new Map(prev)
      next.set(s.contactId, { id: s.contactId, name: s.contactName })
      return next
    })
    setSuggestions(prev => prev.filter(x => !(x.spokenWord === s.spokenWord && x.contactId === s.contactId)))
  }

  // Dismiss a suggestion without selecting
  const dismissSuggestion = (s: RelationSuggestion) => {
    setSuggestions(prev => prev.filter(x => !(x.spokenWord === s.spokenWord && x.contactId === s.contactId)))
  }

  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  )
  const trimmedSearch = search.trim()
  const hasExactMatch = contacts.some(
    c => c.full_name.toLowerCase() === trimmedSearch.toLowerCase()
  )
  const canAddCustom = trimmedSearch.length > 0 && !hasExactMatch

  const toggle = (contact: Contact) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(contact.id)) next.delete(contact.id)
      else next.set(contact.id, { id: contact.id, name: contact.full_name })
      return next
    })
  }

  const beginAddCustom = () => {
    const name = search.trim()
    if (!name) return
    // Dedupe: don't queue the same name twice
    setPendingNames(prev =>
      prev.some(n => n.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]
    )
    setSearch('')
  }

  const cancelPending = (name: string) => {
    setPendingNames(prev => prev.filter(n => n !== name))
  }

  const resolvePending = async (name: string, relationshipType: string) => {
    if (resolvingName) return
    setResolvingName(name)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: inserted, error } = await supabase
        .from('contacts')
        .insert({ user_id: user.id, full_name: name, relationship_type: relationshipType })
        .select('id, full_name, relationship_type')
        .single()
      if (error || !inserted) {
        console.error('[PeoplePresent] Failed to add contact:', error?.message, error?.details, error?.hint, error)
        return
      }
      setContacts(prev => [...prev, inserted].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setSelected(prev => {
        const next = new Map(prev)
        next.set(inserted.id, { id: inserted.id, name: inserted.full_name })
        return next
      })
      setPendingNames(prev => prev.filter(n => n !== name))
    } finally {
      setResolvingName(null)
    }
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim() && !hasExactMatch) {
              e.preventDefault()
              beginAddCustom()
            }
          }}
          placeholder="Search or add a new contact..."
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
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* "Did you mean NAME?" suggestions from relation-word matches */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#2D5A3D] font-semibold flex items-center gap-1.5">
              <Check size={11} /> Suggested from your story
            </p>
            {suggestions.map((s) => (
              <div
                key={`${s.spokenWord}-${s.contactId}`}
                className="rounded-xl border border-[#2D5A3D]/25 bg-[#F5FAF6] p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.contactName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-[#94A09A] font-semibold">
                    You said &ldquo;{s.spokenWord}&rdquo;
                  </p>
                  <p className="text-sm text-[#1A1F1C] leading-tight">
                    Did you mean <span className="font-semibold">{s.contactName}</span>?
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => acceptSuggestion(s)}
                    className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] text-white text-[11px] font-semibold hover:bg-[#234A31] transition-colors flex items-center gap-1"
                    aria-label={`Confirm ${s.contactName}`}
                  >
                    <Check size={11} /> Yes
                  </button>
                  <button
                    onClick={() => dismissSuggestion(s)}
                    className="w-7 h-7 rounded-lg bg-white border border-[#DDE3DF] text-[#94A09A] hover:text-[#B8562E] hover:border-[#B8562E]/40 transition-colors flex items-center justify-center"
                    aria-label="Dismiss suggestion"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending custom contacts queue — one picker per unresolved name.
            Save is blocked until all are resolved or removed. */}
        {pendingNames.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#B8562E] font-semibold flex items-center gap-1.5">
              <UserPlus size={11} />
              {pendingNames.length === 1
                ? 'Pick a relationship to save this new contact'
                : `Pick a relationship for ${pendingNames.length} new contacts`}
            </p>
            {pendingNames.map((name) => {
              const isResolving = resolvingName === name
              return (
                <div
                  key={name}
                  className="rounded-xl border border-dashed border-[#B8562E]/50 bg-[#FBF0EB] p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#B8562E]/80 font-semibold">
                        New contact — needs relationship
                      </p>
                      <p className="text-sm font-semibold text-[#1A1F1C] truncate">{name}</p>
                    </div>
                    <button
                      onClick={() => cancelPending(name)}
                      disabled={isResolving}
                      className="p-1 text-[#94A09A] hover:text-[#B8562E] disabled:opacity-40"
                      aria-label={`Remove ${name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#5A6660] mb-2">How do you know them?</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {RELATIONSHIP_OPTIONS.map(group => (
                      <div key={group.category}>
                        <p className="text-[9px] uppercase tracking-wider text-[#94A09A] font-semibold mb-1">{group.category}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.options.map(r => (
                            <button
                              key={r.id}
                              onClick={() => resolvePending(name, r.id)}
                              disabled={isResolving}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-[#2D5A3D]/20 text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white hover:border-[#2D5A3D] transition-colors disabled:opacity-40"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isResolving && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#5A6660]">
                      <Loader2 size={11} className="animate-spin" /> Saving…
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {canAddCustom && (
          <button
            onClick={beginAddCustom}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border border-dashed border-[#2D5A3D]/30 bg-[#F5FAF6] hover:bg-[#E6F0EA] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center flex-shrink-0">
              <UserPlus size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#2D5A3D] font-medium truncate">
                Add &ldquo;{trimmedSearch}&rdquo;
              </p>
              <p className="text-[10px] text-[#5A6660]">New contact</p>
            </div>
          </button>
        )}
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

      {/* Save — only blocked while pending custom contacts need a relationship */}
      {pendingNames.length > 0 && (
        <p className="text-[11px] text-[#B8562E] text-center px-2">
          Pick a relationship for {pendingNames.length === 1 ? 'the new contact' : `all ${pendingNames.length} new contacts`} above before saving.
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving || pendingNames.length > 0}
        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-all active:scale-[0.96]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : (
          selected.size > 0
            ? <><Check size={14} /> Save ({selected.size})</>
            : <><Check size={14} /> No one — save anyway</>
        )}
      </button>
    </div>
  )
}
