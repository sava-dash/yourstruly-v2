'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, UserPlus, Check, Loader2, X, Mail, Send, RefreshCw, Clock, CheckCircle } from 'lucide-react'

interface Contact {
  id: string
  full_name: string
  email?: string
  phone?: string
  relationship_type: string
}

interface CollabInvite {
  contactId: string
  name: string
  email?: string
  status?: string
  link?: string
}

interface InviteCollaboratorCardProps {
  promptText: string
  promptId: string
  onSave: (data: { collaborators: CollabInvite[] }) => void
  saved: boolean
  data?: { collaborators?: CollabInvite[] }
}

export function InviteCollaboratorCard({ promptText, promptId, onSave, saved, data }: InviteCollaboratorCardProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, Contact>>(new Map())
  const [saving, setSaving] = useState(false)
  // Use data.collaborators as source of truth for saved state (survives remounts)
  const savedCollaborators: CollabInvite[] = data?.collaborators || []
  const [localSent, setLocalSent] = useState<CollabInvite[]>([])
  const sentCollaborators = savedCollaborators.length > 0 ? savedCollaborators : localSent
  const [resending, setResending] = useState<string | null>(null)
  const [inviteByEmail, setInviteByEmail] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, email, phone, relationship_type')
        .eq('user_id', user.id)
        .order('full_name')
      if (data) setContacts(data)
    }
    load()
  }, [])


  const filtered = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleContact = (contact: Contact) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(contact.id)) next.delete(contact.id)
      else next.set(contact.id, contact)
      return next
    })
  }

  const addEmailInvite = () => {
    if (!emailInput.trim() || !nameInput.trim()) return
    const fakeId = `email-${Date.now()}`
    setSelected(prev => {
      const next = new Map(prev)
      next.set(fakeId, { id: fakeId, full_name: nameInput.trim(), email: emailInput.trim(), relationship_type: 'other' })
      return next
    })
    setEmailInput('')
    setNameInput('')
    setInviteByEmail(false)
  }

  const handleSend = async () => {
    if (selected.size === 0) return
    setSaving(true)

    // Build the collaborator list from selected contacts
    const sent: CollabInvite[] = Array.from(selected.values()).map(c => ({
      contactId: c.id,
      name: c.full_name,
      email: c.email,
      status: 'sent',
    }))

    // Immediately update UI — don't wait for API
    setLocalSent(sent)
    onSave({ collaborators: sent })

    // Send invites in background (fire-and-forget)
    fetch('/api/collaborate/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, promptText, collaborators: sent }),
    }).catch(err => console.error('Failed to send invites:', err))

    setSaving(false)
  }

  const handleResend = async (collab: CollabInvite) => {
    setResending(collab.contactId)
    try {
      await fetch('/api/collaborate/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId,
          promptText,
          collaborators: [{ contactId: collab.contactId, name: collab.name, email: collab.email }],
        }),
      })
      // Update status
      setLocalSent(prev => prev.map(c =>
        c.contactId === collab.contactId ? { ...c, status: 'sent' } : c
      ))
    } catch {}
    setResending(null)
  }

  // ── Saved state: show collaborator status ──
  // Show saved view when saved=true OR when we just sent invites (localSent populated)
  if (sentCollaborators.length > 0) {
    return (
      <div className="h-full flex flex-col p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5 mb-4">
          <UserPlus size={12} /> Collaborators
        </h3>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {sentCollaborators.map(collab => {
            const isCompleted = collab.status === 'completed'
            const isPending = collab.status === 'pending' || collab.status === 'sent'
            return (
              <div key={collab.contactId} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAF7] border border-[#E8E2D8]">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isCompleted ? 'bg-[#2D5A3D] text-white' : 'bg-[#F5F1EA] text-[#5A6660]'
                }`}>
                  {isCompleted ? <CheckCircle size={18} /> : collab.name.charAt(0)}
                </div>

                {/* Name & status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F1C] truncate">{collab.name}</p>
                  <p className={`text-[11px] flex items-center gap-1 ${isCompleted ? 'text-[#2D5A3D]' : 'text-[#C4A235]'}`}>
                    {isCompleted ? (
                      <><Check size={10} /> Contributed</>
                    ) : (
                      <><Clock size={10} /> Waiting</>
                    )}
                  </p>
                </div>

                {/* Resend button */}
                {isPending && (
                  <button
                    onClick={() => handleResend(collab)}
                    disabled={resending === collab.contactId}
                    className="p-2 rounded-lg text-[#94A09A] hover:text-[#2D5A3D] hover:bg-[#E6F0EA] transition-colors flex-shrink-0"
                    title="Resend invite"
                  >
                    {resending === collab.contactId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-[10px] text-[#94A09A] mt-3">
          Contributions will appear in this story
        </p>
      </div>
    )
  }

  // ── Edit state: contact picker ──
  return (
    <div className="h-full flex flex-col p-5 gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
          <UserPlus size={12} /> Invite to Story
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
          {Array.from(selected.values()).map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E6F0EA] text-[#2D5A3D] rounded-full text-[11px] font-medium">
              {c.full_name}
              <button onClick={() => toggleContact(c)} className="hover:text-[#B8562E]"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Contact list — fills remaining space */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-0.5 min-h-0">
        {filtered.map(contact => {
          const isSelected = selected.has(contact.id)
          return (
            <button
              key={contact.id}
              onClick={() => toggleContact(contact)}
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
                {contact.email && <p className="text-[10px] text-[#94A09A] truncate">{contact.email}</p>}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && !inviteByEmail && (
          <div className="text-center py-3">
            <p className="text-xs text-[#94A09A]">No contacts found</p>
          </div>
        )}
      </div>

      {/* Invite by email */}
      {!inviteByEmail ? (
        <button onClick={() => setInviteByEmail(true)} className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#2D5A3D] hover:text-[#1A1F1C]">
          <Mail size={12} /> Invite by email
        </button>
      ) : (
        <div className="space-y-1.5 p-3 bg-[#FAFAF7] rounded-xl border border-[#DDE3DF]">
          <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Name" className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]" />
          <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Email" className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#DDE3DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B52]/30 placeholder-[#94A09A]" />
          <div className="flex gap-2">
            <button onClick={() => setInviteByEmail(false)} className="flex-1 py-1 text-xs text-[#94A09A]">Cancel</button>
            <button onClick={addEmailInvite} disabled={!emailInput.trim() || !nameInput.trim()} className="flex-1 py-1 text-xs bg-[#2D5A3D] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={selected.size === 0 || saving}
        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[#2D5A3D] text-white hover:bg-[#234A31] disabled:opacity-40 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send {selected.size > 0 ? `${selected.size} Invite${selected.size > 1 ? 's' : ''}` : 'Invites'}</>}
      </button>
    </div>
  )
}
