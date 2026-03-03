'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  X, 
  Check, 
  User, 
  Mail, 
  Phone, 
  AlertCircle,
  Loader2,
  Search,
  Users,
  CheckCircle2
} from 'lucide-react'

interface GoogleContact {
  sourceId: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  avatarUrl?: string
  address?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  birthDate?: string
  organization?: string
  jobTitle?: string
  notes?: string
  isDuplicate?: boolean
}

interface ImportResult {
  success: boolean
  imported: number
  contacts?: Array<{ id: string; full_name: string; email: string | null }>
}

type ImportStep = 'idle' | 'auth' | 'fetching' | 'selecting' | 'saving' | 'complete' | 'error'

interface GoogleContactsImportProps {
  onImportComplete?: () => void
}

const RELATIONSHIP_OPTIONS = [
  { category: 'Family', options: [
    { id: 'mother', label: 'Mother' },
    { id: 'father', label: 'Father' },
    { id: 'spouse', label: 'Spouse' },
    { id: 'partner', label: 'Partner' },
    { id: 'son', label: 'Son' },
    { id: 'daughter', label: 'Daughter' },
    { id: 'brother', label: 'Brother' },
    { id: 'sister', label: 'Sister' },
    { id: 'grandmother', label: 'Grandmother' },
    { id: 'grandfather', label: 'Grandfather' },
    { id: 'grandson', label: 'Grandson' },
    { id: 'granddaughter', label: 'Granddaughter' },
    { id: 'aunt', label: 'Aunt' },
    { id: 'uncle', label: 'Uncle' },
    { id: 'cousin', label: 'Cousin' },
    { id: 'niece', label: 'Niece' },
    { id: 'nephew', label: 'Nephew' },
    { id: 'in_law', label: 'In-Law' },
  ]},
  { category: 'Friends', options: [
    { id: 'best_friend', label: 'Best Friend' },
    { id: 'close_friend', label: 'Close Friend' },
    { id: 'friend', label: 'Friend' },
    { id: 'childhood_friend', label: 'Childhood Friend' },
  ]},
  { category: 'Professional', options: [
    { id: 'colleague', label: 'Colleague' },
    { id: 'boss', label: 'Boss' },
    { id: 'mentor', label: 'Mentor' },
    { id: 'business_partner', label: 'Business Partner' },
  ]},
  { category: 'Other', options: [
    { id: 'neighbor', label: 'Neighbor' },
    { id: 'other', label: 'Other' },
  ]},
]

export function GoogleContactsImport({ onImportComplete }: GoogleContactsImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<GoogleContact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [defaultRelationship, setDefaultRelationship] = useState('other')
  const [searchQuery, setSearchQuery] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)

  // Handle OAuth callback from popup
  const handleAuthCallback = useCallback(async (code: string, state: string) => {
    setStep('fetching')
    setError(null)

    try {
      // Retrieve code verifier from localStorage
      const codeVerifier = localStorage.getItem('google_oauth_verifier')
      
      if (!codeVerifier) {
        throw new Error('Authentication session expired. Please try again.')
      }

      const response = await fetch(
        `/api/contacts/import/google?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&code_verifier=${encodeURIComponent(codeVerifier)}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to import contacts')
      }

      const data = await response.json()

      if (data.setupRequired) {
        throw new Error('Google OAuth is not configured. Please contact support.')
      }

      setContacts(data.contacts || [])
      // Auto-select non-duplicate contacts
      const nonDuplicates = new Set<string>(
        data.contacts
          ?.filter((c: GoogleContact) => !c.isDuplicate)
          .map((c: GoogleContact) => c.sourceId) || []
      )
      setSelectedContacts(nonDuplicates)
      setStep('selecting')

      // Clean up localStorage
      localStorage.removeItem('google_oauth_verifier')
      localStorage.removeItem('google_oauth_state')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStep('error')
    }
  }, [])

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return

      if (event.data?.type === 'GOOGLE_OAUTH_CALLBACK') {
        const { code, state } = event.data
        handleAuthCallback(code, state)
      }

      if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        setError(event.data.error || 'Authentication failed')
        setStep('error')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleAuthCallback])

  // Check for OAuth callback on mount (for redirect flow)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const oauthError = urlParams.get('error')

    if (oauthError) {
      setError(`Authentication error: ${oauthError}`)
      setStep('error')
      setIsOpen(true)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (code && state) {
      setIsOpen(true)
      handleAuthCallback(code, state)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [handleAuthCallback])

  const startOAuthFlow = async () => {
    setStep('auth')
    setError(null)

    try {
      // Check if crypto is available (required for PKCE)
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Your browser does not support secure authentication. Please use a modern browser.')
      }

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier()
      const state = generateState()
      const codeChallenge = await generateCodeChallenge(codeVerifier)

      // Store for callback verification
      localStorage.setItem('google_oauth_verifier', codeVerifier)
      localStorage.setItem('google_oauth_state', state)

      // Get auth URL from API with code_challenge and state
      const response = await fetch(`/api/contacts/import/google?code_challenge=${encodeURIComponent(codeChallenge)}&state=${encodeURIComponent(state)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to get authorization URL')
      }
      
      const data = await response.json()

      if (data.setupRequired) {
        throw new Error('Google OAuth is not configured. Please contact support.')
      }

      if (!data.authUrl) {
        throw new Error('Failed to get authorization URL from server')
      }

      if (data.authUrl) {
        // Open popup for OAuth
        const width = 500
        const height = 600
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2

        const popup = window.open(
          data.authUrl,
          'google_oauth',
          `width=${width},height=${height},left=${left},top=${top},popup=1`
        )

        if (!popup || popup.closed) {
          // Fallback to redirect if popup blocked
          console.log('[Google Import] Popup blocked, falling back to redirect')
          window.location.href = data.authUrl
        }
      }
    } catch (err) {
      console.error('[Google Import] Start OAuth error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start authentication')
      setStep('error')
    }
  }

  const handleSave = async () => {
    if (selectedContacts.size === 0) return

    setStep('saving')
    setError(null)

    try {
      const contactsToSave = contacts.filter(c => selectedContacts.has(c.sourceId))

      const response = await fetch('/api/contacts/import/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: contactsToSave,
          defaultRelationship,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save contacts')
      }

      const result = await response.json()
      setImportResult(result)
      setStep('complete')
      onImportComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contacts')
      setStep('error')
    }
  }

  const toggleContact = (sourceId: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(sourceId)) {
        next.delete(sourceId)
      } else {
        next.add(sourceId)
      }
      return next
    })
  }

  const toggleAll = () => {
    const visibleContacts = filteredContacts
    const allSelected = visibleContacts.every(c => selectedContacts.has(c.sourceId))
    
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (allSelected) {
        visibleContacts.forEach(c => next.delete(c.sourceId))
      } else {
        visibleContacts.forEach(c => next.add(c.sourceId))
      }
      return next
    })
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery ||
      contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)
    
    const matchesDuplicateFilter = showDuplicates || !contact.isDuplicate
    
    return matchesSearch && matchesDuplicateFilter
  })

  const duplicateCount = contacts.filter(c => c.isDuplicate).length
  const selectedCount = selectedContacts.size

  const reset = () => {
    setStep('idle')
    setError(null)
    setContacts([])
    setSelectedContacts(new Set())
    setImportResult(null)
    setSearchQuery('')
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset after animation
    setTimeout(reset, 300)
  }

  return (
    <>
      {/* Import Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary inline-flex items-center gap-2"
      >
        <Upload size={16} />
        Import from Google
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F2F1E5] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#406A56]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <img 
                      src="https://www.google.com/favicon.ico" 
                      alt="Google" 
                      className="w-5 h-5"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#2d2d2d]">
                      Import from Google Contacts
                    </h2>
                    <p className="text-sm text-[#666]">
                      {step === 'idle' && 'Connect your Google account to import contacts'}
                      {step === 'auth' && 'Opening Google sign-in...'}
                      {step === 'fetching' && 'Fetching your contacts...'}
                      {step === 'selecting' && `${contacts.length} contacts found`}
                      {step === 'saving' && 'Saving contacts...'}
                      {step === 'complete' && `${importResult?.imported} contacts imported`}
                      {step === 'error' && 'Something went wrong'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-[#406A56]/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-[#406A56]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Error State */}
                {error && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">
                      Import Failed
                    </h3>
                    <p className="text-[#666] max-w-sm mb-6">{error}</p>
                    <button onClick={reset} className="btn-primary">
                      Try Again
                    </button>
                  </div>
                )}

                {/* Idle State - Start Import */}
                {step === 'idle' && !error && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                      <Users size={40} className="text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#2d2d2d] mb-3">
                      Import Your Google Contacts
                    </h3>
                    <p className="text-[#666] max-w-md mb-6">
                      Connect your Google account to quickly import contacts. We&apos;ll only access
                      your contacts list and won&apos;t modify anything in your Google account.
                    </p>
                    <div className="space-y-3">
                      <button onClick={startOAuthFlow} className="btn-primary inline-flex items-center gap-2">
                        <img 
                          src="https://www.google.com/favicon.ico" 
                          alt="" 
                          className="w-4 h-4"
                        />
                        Connect Google Account
                      </button>
                      <p className="text-xs text-[#888]">
                        You&apos;ll be redirected to Google to authorize access
                      </p>
                    </div>
                  </div>
                )}

                {/* Auth/Fetching States */}
                {(step === 'auth' || step === 'fetching' || step === 'saving') && !error && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 size={48} className="text-[#406A56] animate-spin mb-4" />
                    <p className="text-[#666]">
                      {step === 'auth' && 'Waiting for Google authorization...'}
                      {step === 'fetching' && 'Fetching your contacts from Google...'}
                      {step === 'saving' && `Saving ${selectedCount} contacts...`}
                    </p>
                  </div>
                )}

                {/* Contact Selection State */}
                {step === 'selecting' && !error && (
                  <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-xl p-4 border border-[#406A56]/10">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md w-full">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#406A56]/50" />
                        <input
                          type="text"
                          aria-label="Search" placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-[#F2F1E5] border border-[#406A56]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                        />
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-2 text-sm text-[#666] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showDuplicates}
                            onChange={(e) => setShowDuplicates(e.target.checked)}
                            className="rounded border-[#406A56]/20"
                          />
                          Show duplicates ({duplicateCount})
                        </label>
                        <div className="h-4 w-px bg-[#406A56]/20" />
                        <button
                          onClick={toggleAll}
                          className="text-sm text-[#406A56] hover:text-[#4a7a64] font-medium"
                        >
                          {filteredContacts.every(c => selectedContacts.has(c.sourceId)) 
                            ? 'Deselect All' 
                            : 'Select All'}
                        </button>
                      </div>
                    </div>

                    {/* Default Relationship */}
                    <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                      <span className="text-sm text-[#666]">Default relationship for imported contacts:</span>
                      <select
                        value={defaultRelationship}
                        onChange={(e) => setDefaultRelationship(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-[#406A56]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                      >
                        {RELATIONSHIP_OPTIONS.map(group => (
                          <optgroup key={group.category} label={group.category}>
                            {group.options.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Contacts List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {filteredContacts.length === 0 ? (
                        <div className="text-center py-8 text-[#666]">
                          {contacts.length === 0 
                            ? 'No contacts found in your Google account'
                            : 'No contacts match your search'}
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <div
                            key={contact.sourceId}
                            onClick={() => toggleContact(contact.sourceId)}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedContacts.has(contact.sourceId)
                                ? 'bg-[#406A56]/5 border-[#406A56]/30'
                                : 'bg-white border-[#406A56]/10 hover:border-[#406A56]/20'
                            } ${contact.isDuplicate ? 'opacity-60' : ''}`}
                          >
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              selectedContacts.has(contact.sourceId)
                                ? 'bg-[#406A56] border-[#406A56]'
                                : 'border-[#406A56]/30'
                            }`}>
                              {selectedContacts.has(contact.sourceId) && (
                                <Check size={14} className="text-white" />
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-[#406A56]/10 flex items-center justify-center flex-shrink-0">
                              {contact.avatarUrl ? (
                                <img 
                                  src={contact.avatarUrl} 
                                  alt="" 
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User size={20} className="text-[#406A56]" />
                              )}
                            </div>

                            {/* Contact Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#2d2d2d] truncate">
                                  {contact.fullName}
                                </span>
                                {contact.isDuplicate && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-[#666]">
                                {contact.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail size={12} />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={12} />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Organization */}
                            {contact.organization && (
                              <div className="text-sm text-[#888] hidden sm:block">
                                {contact.organization}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Complete State */}
                {step === 'complete' && !error && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} className="text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#2d2d2d] mb-2">
                      Import Complete!
                    </h3>
                    <p className="text-[#666] mb-6">
                      Successfully imported {importResult?.imported} contacts from Google.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={handleClose} className="btn-primary">
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === 'selecting' && !error && (
                <div className="flex items-center justify-between p-6 border-t border-[#406A56]/10 bg-white">
                  <div className="text-sm text-[#666]">
                    <span className="font-medium text-[#406A56]">{selectedCount}</span> of {filteredContacts.length} selected
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleClose} className="btn-secondary">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={selectedCount === 0}
                      className="btn-primary disabled:opacity-50"
                    >
                      Import {selectedCount > 0 && `(${selectedCount})`}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// PKCE Helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  // For S256 method, we need to hash the verifier
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(digest))
}

function base64URLEncode(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export default GoogleContactsImport
