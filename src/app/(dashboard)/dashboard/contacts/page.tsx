'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, X, Users, ChevronLeft, Calendar, MapPin, Phone, Mail, Heart, Search, Cake, Sparkles, Send, Check } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import '@/styles/page-styles.css'
import '@/styles/engagement.css'
import '@/styles/home.css'
import { getCategoryIcon } from '@/lib/dashboard/icons'
import { GoogleContactsImport } from '@/components/contacts'
import { TornEdgeFilterPill } from '@/components/ui/TornEdgeFilter'
import ContactDetailModal from '@/components/contacts/ContactDetailModal'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format a date string (YYYY-MM-DD) for display without timezone conversion.
 * Dates should display exactly as stored - if user enters May 15, show May 15.
 */
function formatDateNoTimezone(dateStr: string | undefined | null, pattern: 'short' | 'long' = 'short'): string {
  if (!dateStr) return ''
  
  // Parse YYYY-MM-DD directly without creating a Date object
  // This avoids any timezone conversion issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  
  const [, year, month, day] = match
  const monthNum = parseInt(month, 10)
  const dayNum = parseInt(day, 10)
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  if (pattern === 'long') {
    return `${monthFullNames[monthNum - 1]} ${dayNum}, ${year}`
  }
  
  return `${monthNames[monthNum - 1]} ${dayNum}`
}

// ============================================
// TYPES
// ============================================
interface Contact {
  id: string
  full_name: string
  nickname?: string
  email?: string
  phone?: string
  relationship_type: string
  relationship_details?: string
  date_of_birth?: string
  address?: string
  city?: string
  state?: string
  country?: string
  zipcode?: string
  notes?: string
}

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  date_of_birth?: string
  adoption_date?: string
  color?: string
  personality?: string
  favorite_things?: string[]
  medical_notes?: string
  is_deceased: boolean
  date_of_passing?: string
}

interface CircleMembership {
  circleId: string
  circleName: string
}

// Map of lowercase email -> circle memberships
type ContactCircleMap = Map<string, CircleMembership[]>

// ============================================
// CONSTANTS
// ============================================
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

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Guinea Pig', 'Turtle', 'Snake', 'Lizard', 'Horse', 'Other']

// ============================================
// MAIN PAGE
// ============================================
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [contactCircles, setContactCircles] = useState<ContactCircleMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showPetModal, setShowPetModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDetailContact, setSelectedDetailContact] = useState<Contact | null>(null)
  const [pingOpenFor, setPingOpenFor] = useState<string | null>(null) // contact id with open dropdown
  const [pingSent, setPingSent] = useState<Record<string, string>>({}) // contact id -> sent message
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()

  const GRATITUDE_OPTIONS = [
    { emoji: '💛', label: 'Thinking of you' },
    { emoji: '🌟', label: 'Proud of you' },
    { emoji: '💜', label: 'Miss you' },
    { emoji: '❤️', label: 'Love you' },
    { emoji: '🙏', label: 'Thank you' },
  ]

  const handleSendPing = async (contact: Contact, message: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get sender name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const senderName = profile?.full_name || 'Someone'

      // Store the gratitude ping
      await supabase.from('gratitude_pings').insert({
        sender_id: user.id,
        recipient_contact_id: contact.id,
        recipient_email: contact.email || null,
        message,
        sender_name: senderName,
        recipient_name: contact.full_name,
      })

      // Send email notification if contact has email
      if (contact.email) {
        await fetch('/api/gratitude-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: contact.email,
            recipientName: contact.full_name,
            senderName,
            message,
          }),
        }).catch(() => {}) // Don't block on email failure
      }

      // Show sent confirmation
      setPingSent(prev => ({ ...prev, [contact.id]: message }))
      setPingOpenFor(null)
      // Clear confirmation after 3s
      setTimeout(() => setPingSent(prev => { const next = { ...prev }; delete next[contact.id]; return next }), 3000)
    } catch (err) {
      console.error('Failed to send gratitude ping:', err)
    }
  }

  // Handle edit query parameter from contact detail page
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && contacts.length > 0) {
      const contactToEdit = contacts.find(c => c.id === editId)
      if (contactToEdit) {
        setEditingContact(contactToEdit)
        setShowContactModal(true)
      }
    }
  }, [searchParams, contacts])

  // Close modal and clear edit query param from URL
  const handleCloseContactModal = () => {
    setShowContactModal(false)
    setEditingContact(null)
    // Clear the edit query param from URL to prevent modal reopening
    if (searchParams.get('edit')) {
      router.replace('/dashboard/contacts', { scroll: false })
    }
  }

  // Close gratitude ping dropdown when clicking elsewhere
  useEffect(() => {
    if (!pingOpenFor) return
    const close = () => setPingOpenFor(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [pingOpenFor])

  // Legacy relationship type mapping (for contacts created with old generic values)
  const LEGACY_RELATIONSHIP_MAP: Record<string, string> = {
    'parent': 'Family',
    'child': 'Family',
    'sibling': 'Family',
    'grandparent': 'Family',
    'grandchild': 'Family',
    'aunt_uncle': 'Family',
    'niece_nephew': 'Family',
    'step_family': 'Family',
  }

  // Check if a relationship type belongs to a category (including legacy mappings)
  const relationshipMatchesCategory = (relType: string | undefined, category: string): boolean => {
    if (!relType) return false
    
    // Direct match with current options
    const categoryOptions = RELATIONSHIP_OPTIONS.find(g => g.category === category)?.options.map(o => o.id) || []
    if (categoryOptions.includes(relType)) return true
    
    // Check legacy mapping
    const legacyCategory = LEGACY_RELATIONSHIP_MAP[relType]
    if (legacyCategory === category) return true
    
    return false
  }

  // Filter contacts based on search and category
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchQuery || 
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || 
      relationshipMatchesCategory(contact.relationship_type, selectedCategory)
    
    return matchesSearch && matchesCategory
  })

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Reset state when no user to prevent data leakage
      setContacts([])
      setPets([])
      setContactCircles(new Map())
      setLoading(false)
      return
    }

    const [contactsRes, petsRes] = await Promise.all([
      supabase.from('contacts').select('*').eq('user_id', user.id).order('full_name'),
      supabase.from('pets').select('*').eq('user_id', user.id).order('name'),
    ])

    setContacts(contactsRes.data || [])
    setPets(petsRes.data || [])

    // Fetch circles the user is a member of
    const { data: userCircleMemberships } = await supabase
      .from('circle_members')
      .select('circle_id, circles(id, name)')
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')

    const circleMap: ContactCircleMap = new Map()
    
    if (userCircleMemberships && userCircleMemberships.length > 0) {
      // Get circle IDs - circles join can return single object or array
      const circleIds = userCircleMemberships
        .map(m => {
          const circles = m.circles as { id: string; name?: string } | { id: string; name?: string }[] | null
          if (Array.isArray(circles)) return circles[0]?.id
          return circles?.id
        })
        .filter((id): id is string => !!id)
      
      if (circleIds.length > 0) {
        // Fetch all members of these circles with their profile emails
        const { data: allMembers } = await supabase
          .from('circle_members')
          .select('circle_id, user_id, profiles(email)')
          .in('circle_id', circleIds)
          .eq('invite_status', 'accepted')
        
        // Build lookup of circle id -> name
        const circleNames: Record<string, string> = {}
        for (const m of userCircleMemberships) {
          const circles = m.circles as { id: string; name: string } | { id: string; name: string }[] | null
          const circle = Array.isArray(circles) ? circles[0] : circles
          if (circle) circleNames[circle.id] = circle.name
        }
        
        // Build map of email -> circle memberships
        if (allMembers) {
          for (const member of allMembers) {
            const profiles = member.profiles as { email: string } | { email: string }[] | null
            const profile = Array.isArray(profiles) ? profiles[0] : profiles
            const email = profile?.email?.toLowerCase()
            if (!email) continue
            
            const circleName = circleNames[member.circle_id]
            if (!circleName) continue
            
            const existing = circleMap.get(email) || []
            // Avoid duplicates
            if (!existing.some(c => c.circleId === member.circle_id)) {
              existing.push({ circleId: member.circle_id, circleName })
              circleMap.set(email, existing)
            }
          }
        }
      }
    }
    
    setContactCircles(circleMap)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(contacts.filter(c => c.id !== id))
  }

  const handleDeletePet = async (id: string) => {
    if (!confirm('Delete this pet?')) return
    await supabase.from('pets').delete().eq('id', id)
    setPets(pets.filter(p => p.id !== id))
  }

  const getRelationshipLabel = (id: string) => {
    for (const group of RELATIONSHIP_OPTIONS) {
      const found = group.options.find(o => o.id === id)
      if (found) return found.label
    }
    return id
  }

  // Get color for relationship type (for torn edge labels)
  const getRelationshipColor = (id: string): 'green' | 'blue' | 'yellow' | 'purple' => {
    const familyIds = RELATIONSHIP_OPTIONS.find(g => g.category === 'Family')?.options.map(o => o.id) || []
    const friendIds = RELATIONSHIP_OPTIONS.find(g => g.category === 'Friends')?.options.map(o => o.id) || []
    const professionalIds = RELATIONSHIP_OPTIONS.find(g => g.category === 'Professional')?.options.map(o => o.id) || []
    
    if (familyIds.includes(id)) return 'green'
    if (friendIds.includes(id)) return 'blue'
    if (professionalIds.includes(id)) return 'yellow'
    return 'purple'
  }

  // Get circles a contact belongs to (matched by email)
  const getContactCircles = (contact: Contact): CircleMembership[] => {
    if (!contact.email) return []
    return contactCircles.get(contact.email.toLowerCase()) || []
  }

  // Contacts with birthdays in the next 30 days
  const upcomingBirthdays = contacts.filter(c => {
    if (!c.date_of_birth) return false
    const match = c.date_of_birth.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return false
    const [, , month, day] = match
    const now = new Date()
    const thisYear = now.getFullYear()
    // Build this year's birthday
    let bday = new Date(thisYear, parseInt(month, 10) - 1, parseInt(day, 10))
    // If already passed this year, check next year
    if (bday < now) {
      bday = new Date(thisYear + 1, parseInt(month, 10) - 1, parseInt(day, 10))
    }
    const diffMs = bday.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 30
  }).sort((a, b) => {
    // Sort by upcoming date
    const getNextBday = (d: string) => {
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)!
      const now = new Date()
      let bd = new Date(now.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
      if (bd < now) bd = new Date(now.getFullYear() + 1, parseInt(m[2], 10) - 1, parseInt(m[3], 10))
      return bd.getTime()
    }
    return getNextBday(a.date_of_birth!) - getNextBday(b.date_of_birth!)
  })

  // Calculate days until birthday
  const daysUntilBirthday = (dateStr: string): number => {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return 999
    const [, , month, day] = match
    const now = new Date()
    let bday = new Date(now.getFullYear(), parseInt(month, 10) - 1, parseInt(day, 10))
    if (bday < now) bday = new Date(now.getFullYear() + 1, parseInt(month, 10) - 1, parseInt(day, 10))
    return Math.ceil((bday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-background">
          <div className="page-blob page-blob-1" />
          <div className="page-blob page-blob-2" />
          <div className="page-blob page-blob-3" />
        </div>
        <div className="relative z-10 loading-container">
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="page-header">
          <Link href="/dashboard" className="page-header-back">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="page-header-title" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>Contacts & Pets</h1>
            <p className="page-header-subtitle">People and companions in your life</p>
          </div>
        </div>

        {/* Contacts Section */}
        <section className="mb-10">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-icon bg-[#2D5A3D]/10">
                <Users size={18} className="text-[#2D5A3D]" />
              </div>
              <div>
                <span className="text-[#2d2d2d]">People</span>
                <span className="text-[#2D5A3D]/60 text-sm font-normal ml-2">({filteredContacts.length} of {contacts.length})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GoogleContactsImport onImportComplete={loadData} />
              <button
                onClick={() => { setEditingContact(null); setShowContactModal(true) }}
                className="btn-primary"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50" />
              <input
                type="text"
                aria-label="Search" placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input !pl-12"
              />
            </div>

            {/* Category Filter Buttons - Torn Edge Style */}
            <TornEdgeFilterPill
              options={RELATIONSHIP_OPTIONS.map(g => g.category)}
              value={selectedCategory}
              onChange={setSelectedCategory}
              allLabel="All"
            />
          </div>

          {/* Upcoming Birthdays */}
          {upcomingBirthdays.length > 0 && (
            <div className="mb-6 bg-white border border-[#DDE3DF] rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Cake size={16} className="text-[#C4A235]" />
                <h3 className="text-sm font-semibold text-[#2d2d2d]">Upcoming Birthdays</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {upcomingBirthdays.map(c => {
                  const days = daysUntilBirthday(c.date_of_birth!)
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2 bg-[#C4A235]/10 rounded-lg cursor-pointer hover:bg-[#C4A235]/20 transition-colors"
                      onClick={() => setSelectedDetailContact(c)}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a6e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {c.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[#2d2d2d]">{c.full_name}</span>
                        <span className="text-xs text-[#666] ml-1.5">
                          {formatDateNoTimezone(c.date_of_birth, 'short')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-[#C4A235] ml-1">
                        {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                
<img src={getCategoryIcon('contact')} alt="" className="w-12 h-12 opacity-50" />
              </div>
              <h3 className="empty-state-title mb-2">Who matters most to you?</h3>
              <p className="empty-state-text mb-4">Start here. Add the people in your story.</p>
              <button
                onClick={() => { setEditingContact(null); setShowContactModal(true) }}
                className="btn-primary"
              >
                <Plus size={16} />
                Add Your First Contact
              </button>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} className="text-[#2D5A3D]/50" />
              </div>
              <p className="empty-state-text mb-2">No contacts match your search</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(null) }}
                className="text-[#2D5A3D] hover:text-[#234A31] text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="contacts-grid">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="bg-white border border-[#DDE3DF] rounded-xl shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => setSelectedDetailContact(contact)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="contact-avatar">
                          {contact.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="contact-name">{contact.full_name}</h3>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <span className={`contact-badge contact-badge-${getRelationshipColor(contact.relationship_type)}`}>
                              {getRelationshipLabel(contact.relationship_type)}
                            </span>
                            {getContactCircles(contact).map(circle => (
                              <span
                                key={circle.circleId}
                                className="contact-circle-badge"
                                title={`Member of ${circle.circleName} circle`}
                              >
                                <Users size={11} />
                                {circle.circleName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingContact(contact); setShowContactModal(true) }} className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDeleteContact(contact.id)} className="p-2 text-[#2D5A3D]/50 hover:text-[#B8562E] hover:bg-[#B8562E]/10 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="contact-details">
                      {contact.date_of_birth && (
                        <div className="contact-detail-row">
                          <Calendar size={14} className="text-[#2D5A3D]" />
                          <span>{formatDateNoTimezone(contact.date_of_birth, 'short')}</span>
                        </div>
                      )}
                      {(contact.city || contact.country) && (
                        <div className="contact-detail-row">
                          <MapPin size={14} className="text-[#2D5A3D]" />
                          <span>{[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    {/* Quick action icons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#DDE3DF]" onClick={(e) => e.stopPropagation()}>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                          title={contact.email}
                        >
                          <Mail size={13} />
                          <span className="hidden sm:inline truncate max-w-[120px]">{contact.email}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                          title={contact.phone}
                        >
                          <Phone size={13} />
                          <span className="hidden sm:inline">{contact.phone}</span>
                        </a>
                      )}
                      {/* Gratitude ping */}
                      <div className="relative ml-auto">
                        {pingSent[contact.id] ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#2D5A3D] bg-[#2D5A3D]/10 rounded-lg">
                            <Check size={13} /> Sent
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPingOpenFor(pingOpenFor === contact.id ? null : contact.id) }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#C4A235] bg-[#C4A235]/10 hover:bg-[#C4A235]/20 rounded-lg transition-colors"
                            title="Send a gratitude ping"
                          >
                            <Sparkles size={13} />
                            <span className="hidden sm:inline">Ping</span>
                          </button>
                        )}
                        {/* Dropdown */}
                        {pingOpenFor === contact.id && (
                          <div
                            className="absolute bottom-full right-0 mb-2 bg-white border border-[#DDE3DF] rounded-xl shadow-lg z-20 py-1 min-w-[180px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#94A09A] font-semibold">
                              Send to {contact.full_name.split(' ')[0]}
                            </div>
                            {GRATITUDE_OPTIONS.map(opt => (
                              <button
                                key={opt.label}
                                onClick={() => handleSendPing(contact, opt.label)}
                                className="w-full px-3 py-2 text-left text-sm text-[#2d2d2d] hover:bg-[#F5F1EA] transition-colors flex items-center gap-2"
                              >
                                <span>{opt.emoji}</span>
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pets Section - Only show in "All" category view */}
        {!selectedCategory && (
          <section>
            <div className="section-header">
              <div className="section-title">
                <div className="section-title-icon bg-[#B8562E]/10">
                  <Heart size={18} className="text-[#B8562E]" />
                </div>
                <div>
                  <span className="text-[#2d2d2d]">Pets</span>
                  <span className="text-[#2D5A3D]/60 text-sm font-normal ml-2">({pets.length})</span>
                </div>
              </div>
              <button
                onClick={() => { setEditingPet(null); setShowPetModal(true) }}
                className="btn-accent"
              >
                <Plus size={16} />
                Add Pet
              </button>
            </div>

            {pets.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text mb-4">No pets yet</p>
                <button
                  onClick={() => { setEditingPet(null); setShowPetModal(true) }}
                  className="btn-accent"
                >
                  Add Your First Pet
                </button>
              </div>
            ) : (
              <div className="cards-grid">
                {pets.map(pet => (
                  <div
                    key={pet.id}
                    className={`bubble-tile glass-card group cursor-pointer ${pet.is_deceased ? 'opacity-70' : ''}`}
                    onClick={() => window.location.href = `/dashboard/pets/${pet.id}`}
                  >
                    <div className="bubble-content">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#B8562E] to-[#D87A55] flex items-center justify-center text-white font-semibold">
                            {pet.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-[#2d2d2d] font-semibold">{pet.name}</h3>
                            <p className="text-[#B8562E] text-sm">{pet.species}{pet.breed ? ` - ${pet.breed}` : ''}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setEditingPet(pet); setShowPetModal(true) }} className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeletePet(pet.id)} className="p-2 text-[#2D5A3D]/50 hover:text-[#B8562E] hover:bg-[#B8562E]/10 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {pet.color && <p className="text-[#666]">Color: {pet.color}</p>}
                        {pet.personality && <p className="text-[#666] line-clamp-1">{pet.personality}</p>}
                        {pet.is_deceased && (
                          <p className="text-[#888] italic">
                            🌈 Rainbow Bridge {pet.date_of_passing ? `· ${formatDateNoTimezone(pet.date_of_passing, 'long')}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Contact Detail Modal */}
      {selectedDetailContact && (
        <ContactDetailModal
          contact={selectedDetailContact}
          isOpen={!!selectedDetailContact}
          onClose={() => setSelectedDetailContact(null)}
          onSave={() => {
            setSelectedDetailContact(null)
            loadData()
          }}
          onDelete={() => {
            setSelectedDetailContact(null)
            loadData()
          }}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          contact={editingContact}
          onClose={handleCloseContactModal}
          onSave={() => { handleCloseContactModal(); loadData() }}
        />
      )}

      {/* Pet Modal */}
      {showPetModal && (
        <PetModal
          pet={editingPet}
          onClose={() => setShowPetModal(false)}
          onSave={() => { setShowPetModal(false); loadData() }}
        />
      )}
    </div>
  )
}

// ============================================
// CONTACT MODAL
// ============================================
function ContactModal({ contact, onClose, onSave }: { contact: Contact | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    full_name: contact?.full_name || '',
    nickname: contact?.nickname || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    relationship_type: contact?.relationship_type || '',
    relationship_details: contact?.relationship_details || '',
    date_of_birth: contact?.date_of_birth || '',
    address: contact?.address || '',
    city: contact?.city || '',
    state: contact?.state || '',
    country: contact?.country || '',
    zipcode: contact?.zipcode || '',
    notes: contact?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.full_name || !form.relationship_type) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      full_name: form.full_name,
      relationship_type: form.relationship_type,
      nickname: form.nickname || null,
      email: form.email || null,
      phone: form.phone || null,
      relationship_details: form.relationship_details || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      zipcode: form.zipcode || null,
      notes: form.notes || null,
    }

    if (contact) {
      await supabase.from('contacts').update(payload).eq('id', contact.id)
    } else {
      await supabase.from('contacts').insert({ ...payload, user_id: user.id })
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="modal-overlay-page">
      <div className="modal-content-page">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Full Name *</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="form-input" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Relationship *</label>
            <select value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })} className="form-select">
              <option value="">Select...</option>
              {RELATIONSHIP_OPTIONS.map(group => (
                <optgroup key={group.category} label={group.category}>
                  {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Nickname</label>
              <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Birthday</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="form-input" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Address (for gift delivery)</label>
            <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="form-input mb-3" placeholder="123 Main Street, Apt 4" />
            <div className="grid grid-cols-4 gap-3">
              <input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} className="form-input" placeholder="City" />
              <input value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} className="form-input" placeholder="State" />
              <input value={form.zipcode || ''} onChange={e => setForm({ ...form, zipcode: e.target.value })} className="form-input" placeholder="Zip" />
              <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} className="form-input" placeholder="Country" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-textarea" rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D5A3D]/10">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.full_name || !form.relationship_type} className="btn-primary">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PET MODAL
// ============================================
function PetModal({ pet, onClose, onSave }: { pet: Pet | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: pet?.name || '',
    species: pet?.species || '',
    breed: pet?.breed || '',
    date_of_birth: pet?.date_of_birth || '',
    adoption_date: pet?.adoption_date || '',
    color: pet?.color || '',
    personality: pet?.personality || '',
    medical_notes: pet?.medical_notes || '',
    emergency_caretaker: (pet as any)?.emergency_caretaker || '',
    emergency_caretaker_phone: (pet as any)?.emergency_caretaker_phone || '',
    is_deceased: pet?.is_deceased || false,
    date_of_passing: pet?.date_of_passing || '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.name || !form.species) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      date_of_birth: form.date_of_birth || null,
      adoption_date: form.adoption_date || null,
      color: form.color || null,
      personality: form.personality || null,
      medical_notes: form.medical_notes || null,
      emergency_caretaker: form.emergency_caretaker || null,
      emergency_caretaker_phone: form.emergency_caretaker_phone || null,
      is_deceased: form.is_deceased,
      date_of_passing: form.is_deceased ? (form.date_of_passing || null) : null,
    }

    if (pet) {
      await supabase.from('pets').update(payload).eq('id', pet.id)
    } else {
      await supabase.from('pets').insert({ ...payload, user_id: user.id })
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="modal-overlay-page">
      <div className="modal-content-page">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#2d2d2d]">{pet ? 'Edit Pet' : 'Add Pet'}</h2>
          <button onClick={onClose} className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="Buddy" />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Species *</label>
              <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })} className="form-select">
                <option value="">Select...</option>
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Breed</label>
              <input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} className="form-input" placeholder="Golden Retriever" />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Color</label>
              <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Adoption Date</label>
              <input type="date" value={form.adoption_date} onChange={e => setForm({ ...form, adoption_date: e.target.value })} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Personality</label>
            <textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} className="form-textarea" rows={2} placeholder="Playful, loves belly rubs..." />
          </div>
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Medical Notes</label>
            <textarea value={form.medical_notes} onChange={e => setForm({ ...form, medical_notes: e.target.value })} className="form-textarea" rows={2} placeholder="Allergies, medications, vet info..." />
          </div>
          <div className="p-4 bg-[#2D5A3D]/10 rounded-xl space-y-3">
            <h4 className="text-sm font-medium text-[#2D5A3D]">Emergency Caretaker</h4>
            <p className="text-xs text-gray-500">Who should take care of this pet if something happens to you?</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Name</label>
                <input value={form.emergency_caretaker} onChange={e => setForm({ ...form, emergency_caretaker: e.target.value })} className="form-input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-sm text-[#666] mb-1.5">Phone</label>
                <input type="tel" value={form.emergency_caretaker_phone} onChange={e => setForm({ ...form, emergency_caretaker_phone: e.target.value })} className="form-input" placeholder="(555) 123-4567" />
              </div>
            </div>
          </div>
          <div className="p-4 bg-[#4A3552]/5 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_deceased} onChange={e => setForm({ ...form, is_deceased: e.target.checked })} className="w-5 h-5 rounded border-[#2D5A3D]/20 bg-white text-[#2D5A3D] focus:ring-[#2D5A3D]" />
              <span className="text-[#666]">This pet has passed away</span>
            </label>
            {form.is_deceased && (
              <div className="mt-3">
                <label className="block text-sm text-[#666] mb-1.5">Date of Passing</label>
                <input type="date" value={form.date_of_passing} onChange={e => setForm({ ...form, date_of_passing: e.target.value })} className="form-input" />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D5A3D]/10">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.species} className="btn-accent">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
