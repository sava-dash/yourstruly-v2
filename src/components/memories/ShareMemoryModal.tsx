'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, Users, ChevronDown, Trash2, UserPlus, Check, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ShareMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  memoryId: string
  memoryTitle?: string
  contentType?: 'memory' | 'wisdom'
}

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  relationship_type?: string
}

interface Share {
  id: string
  contact_id: string
  can_comment: boolean
  can_add_media: boolean
  contact: Contact
  created_at?: string
}

export default function ShareMemoryModal({ isOpen, onClose, memoryId, memoryTitle, contentType = 'memory' }: ShareMemoryModalProps) {
  const apiBase = contentType === 'wisdom' ? `/api/wisdom/${memoryId}` : `/api/memories/${memoryId}`
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [shares, setShares] = useState<Share[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<'contributor'>('contributor')
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false)
  const [addingUser, setAddingUser] = useState<string | null>(null)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load shares and contacts when modal opens
  useEffect(() => {
    if (isOpen && memoryId) {
      loadShares()
      loadContacts()
    }
  }, [isOpen, memoryId])

  const loadShares = async () => {
    setLoadingShares(true)
    try {
      const res = await fetch(`${apiBase}/share`)
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares || [])
      }
    } catch (err) {
      console.error('Failed to load shares:', err)
    } finally {
      setLoadingShares(false)
    }
  }

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setAllContacts(data.contacts || [])
      }
    } catch (err) {
      console.error('Failed to load contacts:', err)
    }
  }

  // Search contacts
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      // Filter contacts that match query and aren't already shared
      const sharedContactIds = shares.map(s => s.contact_id)
      const results = allContacts.filter(
        c => !sharedContactIds.includes(c.id) && (
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery)
        )
      )
      setSearchResults(results)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, shares, allContacts])

  const handleAddContact = useCallback(async (contact: Contact) => {
    setAddingUser(contact.id)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const res = await fetch(`${apiBase}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_ids: [contact.id],
          can_comment: true,
          can_add_media: selectedPermission === 'contributor',
        }),
      })

      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Failed to share memory. Please try again.')
        setAddingUser(null)
        return
      }

      // Success! Reload shares and show feedback
      await loadShares()
      setSuccessMessage(`Shared with ${contact.name}!`)
      setSearchQuery('')
      setSearchResults([])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to share:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setAddingUser(null)
    }
  }, [memoryId, selectedPermission])

  const handleRemoveShare = useCallback(async (contactId: string) => {
    try {
      const res = await fetch(`${apiBase}/share?contact_id=${contactId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShares(prev => prev.filter(s => s.contact_id !== contactId))
      }
    } catch (err) {
      console.error('Failed to remove share:', err)
    }
  }, [memoryId])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (!isOpen) return null

  const modal = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-[#2d2d2d]">Share Memory</h3>
            {memoryTitle && (
              <p className="text-sm text-gray-500 mt-0.5">{memoryTitle}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Search YT Users */}
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              <Users size={14} className="inline mr-1.5" />
              Search YoursTruly Contacts
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search" placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-3 bg-[#F5F3EE] border border-gray-200 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D] transition-all"
              />
              {isSearching && (
                <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D5A3D] animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                {searchResults.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleAddContact(contact)}
                    disabled={addingUser === contact.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#F5F3EE] transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center text-white text-sm font-medium">
                      {getInitials(contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#2d2d2d] font-medium truncate">{contact.name}</div>
                      <div className="text-gray-500 text-sm truncate">{contact.email || contact.phone}</div>
                    </div>
                    {contact.relationship_type && (
                      <span className="px-2 py-1 bg-[#2D5A3D]/10 text-[#2D5A3D] text-xs rounded-full">
                        {contact.relationship_type}
                      </span>
                    )}
                    {addingUser === contact.id ? (
                      <Loader2 size={18} className="text-[#2D5A3D] animate-spin" />
                    ) : (
                      <UserPlus size={18} className="text-[#2D5A3D]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p className="text-sm">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <CheckCircle size={18} className="flex-shrink-0" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
              Permission Level
            </label>
            <div className="relative">
              <button
                onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#F5F3EE] border border-gray-200 rounded-xl text-[#2d2d2d] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D] transition-all"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium capitalize">{selectedPermission}</span>
                  <span className="text-gray-500 text-sm">
                    — Can add photos, comments, moments
                  </span>
                </span>
                <ChevronDown size={18} className={`text-gray-500 transition-transform ${showPermissionDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showPermissionDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
                  <button
                    onClick={() => { setSelectedPermission('contributor'); setShowPermissionDropdown(false); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#F5F3EE] transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="text-[#2d2d2d] font-medium">Contributor</div>
                      <div className="text-gray-500 text-sm">Can add photos, comments, moments, and quotes</div>
                    </div>
                    {selectedPermission === 'contributor' && <Check size={18} className="text-[#2D5A3D]" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Current Shares */}
          {loadingShares ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-[#2D5A3D] animate-spin" />
            </div>
          ) : shares.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-[#2d2d2d] mb-3">
                Shared With ({shares.length})
              </label>
              <div className="space-y-2">
                {shares.map(share => (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C4A235] to-[#B8562E] flex items-center justify-center text-white text-sm font-medium">
                      {getInitials(share.contact.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#2d2d2d] font-medium truncate">
                        {share.contact.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {share.contact.relationship_type && (
                          <span className="text-[#2D5A3D]">{share.contact.relationship_type}</span>
                        )}
                        {share.can_add_media && (
                          <span className="px-2 py-0.5 bg-[#C4A235]/20 text-[#8a7c08] text-xs rounded-full">
                            Contributor
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.contact_id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No one has access yet</p>
              <p className="text-xs">Search your contacts above to share this memory</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#2D5A3D] hover:bg-[#234A31] text-white rounded-xl font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
