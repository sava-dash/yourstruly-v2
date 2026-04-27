'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Copy, Check, Link as LinkIcon, User, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PendingInvite {
  id: string
  email?: string
  invite_link?: string
  invitee_name?: string
  created_at: string
  expires_at: string
}

interface SearchResult {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  isYTUser?: boolean // true if this is a profiles entry (real YT user)
}

interface Contact {
  id: string
  full_name: string
  email?: string
  avatar_url?: string
}

interface InviteMemberModalProps {
  circleName: string
  pendingInvites: PendingInvite[]
  onClose: () => void
  onInviteUser: (userId: string) => void
  onGenerateLink: (forContact?: { name: string; email?: string }) => void
  onCancelInvite: (inviteId: string) => void
}

export default function InviteMemberModal({
  circleName,
  pendingInvites,
  onClose,
  onInviteUser,
  onGenerateLink,
  onCancelInvite
}: InviteMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  
  const supabase = createClient()

  // Load user's contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name, email, avatar_url')
        .eq('user_id', user.id)
        .order('full_name')
      
      if (data) {
        setContacts(data)
      }
      setLoadingContacts(false)
    }
    loadContacts()
  }, [])

  // Search users and contacts
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setSearching(true)
    
    try {
      // Search profiles table for YoursTruly users first (these can be invited directly)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)
      
      const allResults: SearchResult[] = []
      const seenEmails = new Set<string>()
      
      // Add YT users first (can be invited directly)
      if (profiles) {
        for (const p of profiles) {
          if (p.email) {
            allResults.push({
              id: p.id,
              full_name: p.full_name || p.email,
              email: p.email,
              avatar_url: p.avatar_url,
              isYTUser: true
            })
            seenEmails.add(p.email.toLowerCase())
          }
        }
      }
      
      // Then add matching contacts (will need invite link)
      const matchingContacts = contacts.filter(c =>
        c.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(query.toLowerCase()))
      )
      
      for (const c of matchingContacts) {
        if (!c.email || !seenEmails.has(c.email.toLowerCase())) {
          allResults.push({
            id: c.id,
            full_name: c.full_name,
            email: c.email || 'No email',
            avatar_url: c.avatar_url,
            isYTUser: false
          })
          if (c.email) seenEmails.add(c.email.toLowerCase())
        }
      }
      
      setSearchResults(allResults.slice(0, 8))
    } catch (err) {
      console.error('Search error:', err)
    }
    
    setSearching(false)
  }, [contacts, supabase])

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopiedLink(link)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    onGenerateLink()
    setGeneratingLink(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-4 sm:my-8"
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

        <div className="px-6 sm:px-8 pt-8 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden className="inline-block rounded-full" style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)' }} />
            <span
              className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              INVITE TO {circleName.toUpperCase()}
            </span>
          </div>
          <h2
            className="text-[var(--ed-ink,#111)] leading-tight mb-6"
            style={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 'clamp(28px, 5vw, 36px)',
            }}
          >
            INVITE MEMBER
          </h2>

        {/* Search Users */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1A1F1C] mb-2">Search YoursTruly Users</label>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="form-input !pl-12"
              aria-label="Search" placeholder="Search by name or email..."
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-[#2D5A3D]/10 rounded-xl overflow-hidden">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => user.isYTUser ? onInviteUser(user.id) : onGenerateLink()}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#2D5A3D]/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#8DACAB] flex items-center justify-center text-white font-medium">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F1C]">{user.full_name}</p>
                    <p className="text-xs text-[#5A6660] truncate">{user.email}</p>
                  </div>
                  {user.isYTUser ? (
                    <span className="text-xs text-[#2D5A3D] bg-[#2D5A3D]/10 px-2 py-0.5 rounded-full">YT User</span>
                  ) : (
                    <span className="text-xs text-[#94A09A] bg-gray-100 px-2 py-0.5 rounded-full">Send Link</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p className="text-sm text-[#5A6660] mt-2">Searching...</p>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-sm text-[#5A6660] mt-2">No users found. Try generating an invite link instead.</p>
          )}

          {/* Show contacts when not searching */}
          {searchQuery.length < 2 && contacts.length > 0 && (() => {
            // Filter out contacts who already have pending invites
            const pendingEmails = new Set(pendingInvites.map(i => i.email?.toLowerCase()).filter(Boolean))
            const pendingNames = new Set(pendingInvites.map(i => i.invitee_name?.toLowerCase()).filter(Boolean))
            const availableContacts = contacts.filter(c => {
              const emailMatch = c.email && pendingEmails.has(c.email.toLowerCase())
              const nameMatch = pendingNames.has(c.full_name.toLowerCase())
              return !emailMatch && !nameMatch
            })
            
            if (availableContacts.length === 0) return null
            
            return (
              <div className="mt-3">
                <p className="text-xs text-[#94A09A] uppercase tracking-wide mb-2">Your Contacts</p>
                <div className="border border-[#2D5A3D]/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {loadingContacts ? (
                    <p className="text-sm text-[#5A6660] p-3">Loading contacts...</p>
                  ) : (
                    availableContacts.slice(0, 6).map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          // Generate invite link for this specific contact
                          onGenerateLink({ name: contact.full_name, email: contact.email })
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[#2D5A3D]/5 transition-colors text-left border-b border-[#2D5A3D]/5 last:border-b-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#8DACAB] flex items-center justify-center text-white font-medium overflow-hidden">
                          {contact.avatar_url ? (
                            <img src={contact.avatar_url}
                alt="" className="w-full h-full object-cover" />
                          ) : (
                            contact.full_name.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F1C]">{contact.full_name}</p>
                          {contact.email && (
                            <p className="text-xs text-[#5A6660] truncate">{contact.email}</p>
                          )}
                        </div>
                        <span className="text-xs text-[#94A09A] bg-gray-100 px-2 py-0.5 rounded-full">Send Link</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Generate Invite Link */}
        <div className="p-4 bg-[#2D5A3D]/5 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-[#2D5A3D]" />
              <span className="text-sm font-medium text-[#1A1F1C]">Invite Link</span>
            </div>
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="text-sm text-[#2D5A3D] hover:underline font-medium"
            >
              {generatingLink ? 'Generating...' : 'Generate New Link'}
            </button>
          </div>
          <p className="text-xs text-[#5A6660]">
            Share a link to invite anyone to this circle. Links expire after 7 days.
          </p>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#1A1F1C] mb-3 flex items-center gap-2">
              <Clock size={14} className="text-[#C4A235]" />
              Pending Invites ({pendingInvites.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingInvites.map(invite => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-white border border-[#2D5A3D]/10 rounded-xl"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar/Icon based on type */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/20 flex items-center justify-center flex-shrink-0">
                      {invite.invitee_name ? (
                        <span className="text-xs font-medium text-[#2D5A3D]">
                          {invite.invitee_name.charAt(0).toUpperCase()}
                        </span>
                      ) : invite.email ? (
                        <User size={14} className="text-[#2D5A3D]" />
                      ) : (
                        <LinkIcon size={14} className="text-[#2D5A3D]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {invite.invitee_name ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#1A1F1C] truncate">{invite.invitee_name}</p>
                          {invite.invite_link && (
                            <button
                              onClick={() => handleCopyLink(invite.invite_link!)}
                              className="p-1 hover:bg-[#2D5A3D]/10 rounded transition-colors"
                              title="Copy invite link"
                            >
                              {copiedLink === invite.invite_link ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} className="text-[#2D5A3D]" />
                              )}
                            </button>
                          )}
                        </div>
                      ) : invite.email ? (
                        <p className="text-sm text-[#1A1F1C] truncate">{invite.email}</p>
                      ) : invite.invite_link ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#1A1F1C]">Generic invite link</p>
                          <button
                            onClick={() => handleCopyLink(invite.invite_link!)}
                            className="p-1 hover:bg-[#2D5A3D]/10 rounded transition-colors"
                            title="Copy link"
                          >
                            {copiedLink === invite.invite_link ? (
                              <Check size={14} className="text-green-600" />
                            ) : (
                              <Copy size={14} className="text-[#2D5A3D]" />
                            )}
                          </button>
                        </div>
                      ) : null}
                      <p className="text-xs text-[#94A09A] mt-0.5">
                        Expires {formatDate(invite.expires_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onCancelInvite(invite.id)}
                    className="text-xs text-[#B8562E] hover:underline ml-2"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4" style={{ borderTop: '2px solid var(--ed-ink, #111)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[10px] tracking-[0.18em]"
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              background: 'var(--ed-ink, #111)',
              color: '#fff',
              border: '2px solid var(--ed-ink, #111)',
              borderRadius: 2,
            }}
          >
            DONE
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
