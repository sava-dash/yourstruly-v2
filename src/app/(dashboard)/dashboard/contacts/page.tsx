'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, X, Users, MapPin, Phone, Search, Send, Check, Heart, ChevronDown } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import '@/styles/page-styles.css'
import { GoogleContactsImport } from '@/components/contacts'
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
  const [memoryCounts, setMemoryCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showPetModal, setShowPetModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  // 'all' | 'family' | 'friends' | 'professional' | 'pets' — uppercase pill labels
  // map to these lowercase keys.
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
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

  // Check if a relationship type belongs to a category (including legacy mappings).
  // Accepts either canonical capitalized labels ("Family") or lowercase keys
  // ("family") so the new editorial pill keys and the legacy callers both work.
  const relationshipMatchesCategory = (relType: string | undefined, category: string): boolean => {
    if (!relType) return false
    const cat = category.toLowerCase()
    const canonical = ({
      family: 'Family', friends: 'Friends', professional: 'Professional', other: 'Other',
    } as Record<string, string>)[cat] || category

    const categoryOptions = RELATIONSHIP_OPTIONS.find(g => g.category === canonical)?.options.map(o => o.id) || []
    if (categoryOptions.includes(relType)) return true

    const legacyCategory = LEGACY_RELATIONSHIP_MAP[relType]
    if (legacyCategory === canonical) return true

    return false
  }

  // Filter contacts based on search + category. 'all' and 'pets' both pass
  // through here (pets shows zero contacts; the unified items grid below
  // handles surfacing pets on the Pets tab).
  const filteredContacts = contacts.filter(contact => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q
      || contact.full_name.toLowerCase().includes(q)
      || contact.nickname?.toLowerCase().includes(q)
      || contact.email?.toLowerCase().includes(q)

    const matchesCategory = selectedCategory === 'all'
      || (selectedCategory !== 'pets' && relationshipMatchesCategory(contact.relationship_type, selectedCategory))

    return matchesSearch && matchesCategory
  })

  // Pets visible on the All and Pets tabs (filtered by search on name).
  const filteredPets = pets.filter(pet => {
    if (selectedCategory !== 'all' && selectedCategory !== 'pets') return false
    const q = searchQuery.toLowerCase()
    return !q || pet.name.toLowerCase().includes(q) || pet.species.toLowerCase().includes(q)
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

    // Build a map of contact_id -> memory count by aggregating memory_people
    // rows. Pets aren't tracked here, so they fall back to 0 in the UI.
    try {
      const { data: memPeople } = await supabase
        .from('memory_people')
        .select('contact_id')
        .eq('user_id', user.id)
        .not('contact_id', 'is', null)
      const counts = new Map<string, number>()
      for (const row of memPeople || []) {
        const cid = (row as any).contact_id as string | null
        if (!cid) continue
        counts.set(cid, (counts.get(cid) || 0) + 1)
      }
      setMemoryCounts(counts)
    } catch (e) {
      console.warn('[contacts] memory count fetch failed', e)
    }

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

  // Editorial pill tabs — same color palette as the my-story page so the
  // two surfaces stay visually consistent.
  const TABS: { key: string; label: string; color: string; ink: string }[] = [
    { key: 'all',          label: 'ALL',          color: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
    { key: 'family',       label: 'FAMILY',       color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
    { key: 'friends',      label: 'FRIENDS',      color: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    { key: 'professional', label: 'PROFESSIONAL', color: 'var(--ed-ink, #111)',       ink: '#fff' },
    { key: 'pets',         label: 'PETS',         color: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' },
  ]

  // Editorial flag color per relationship/species for the top-left card flag.
  const groupColor = (kind: 'contact' | 'pet', relType?: string): { bg: string; ink: string } => {
    if (kind === 'pet') return { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' }
    const family = RELATIONSHIP_OPTIONS.find(g => g.category === 'Family')?.options.map(o => o.id) || []
    const friends = RELATIONSHIP_OPTIONS.find(g => g.category === 'Friends')?.options.map(o => o.id) || []
    const professional = RELATIONSHIP_OPTIONS.find(g => g.category === 'Professional')?.options.map(o => o.id) || []
    if (relType && family.includes(relType)) return { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' }
    if (relType && friends.includes(relType)) return { bg: 'var(--ed-blue, #2A5CD3)', ink: '#fff' }
    if (relType && professional.includes(relType)) return { bg: 'var(--ed-ink, #111)', ink: '#fff' }
    if (relType && LEGACY_RELATIONSHIP_MAP[relType] === 'Family') return { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' }
    return { bg: 'var(--ed-muted, #6F6B61)', ink: '#fff' }
  }

  if (loading) {
    return (
      <div
        className="relative min-h-screen"
        style={{ background: 'var(--ed-cream, #F3ECDC)', paddingTop: 80, paddingBottom: 100, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="relative z-10 max-w-6xl mx-auto flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div
            className="w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid var(--ed-ink, #111)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: 'var(--ed-cream, #F3ECDC)',
        paddingTop: 80,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Width-locked container — matches /dashboard/my-story exactly. */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ───── Editorial header ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start mb-6">
          {/* Left: huge CONTACTS / & PETS display + subtitle */}
          <div>
            <h1
              className="text-[var(--ed-ink,#111)] leading-[0.85] tracking-[-0.02em] flex items-start gap-4"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(56px, 9vw, 116px)',
              }}
            >
              <span>
                CONTACTS<br />& PETS
              </span>
              <span
                aria-hidden
                className="shrink-0"
                style={{ width: 36, height: 36, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 12 }}
              />
            </h1>
            <p className="mt-4 text-[14px] text-[var(--ed-muted,#6F6B61)] max-w-md">
              The people and pets who are part of your story.
            </p>
          </div>

          {/* Right: action buttons (IMPORT FROM GOOGLE + + ADD CONTACT) + search */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <GoogleContactsImport onImportComplete={loadData} />
              <button
                onClick={() => { setEditingContact(null); setShowContactModal(true) }}
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <Plus size={13} strokeWidth={3} />
                ADD CONTACT
              </button>
            </div>
            {/* Search bar — editorial frame; same shape as my-story. */}
            <div
              className="flex items-stretch w-full lg:max-w-md"
              style={{ border: '2px solid var(--ed-ink, #111)', background: 'var(--ed-paper, #FFFBF1)', borderRadius: 2 }}
            >
              <div className="flex items-center flex-1 px-3 gap-2">
                <Search size={16} className="text-[var(--ed-muted,#6F6B61)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-full py-2.5 bg-transparent text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[var(--ed-muted,#6F6B61)] hover:text-[var(--ed-ink,#111)]"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ───── Filter pills (color-coded) + view toggle ───── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const isActive = selectedCategory === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setSelectedCategory(t.key)}
                  className="px-4 py-2 text-[11px] tracking-[0.18em] transition-transform hover:-translate-y-0.5"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    background: isActive ? t.color : 'var(--ed-paper, #FFFBF1)',
                    color: isActive ? t.ink : 'var(--ed-ink, #111)',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 999,
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* View toggle — visual parity with my-story. Map view is reserved
              for later; clicking it just stays on grid for now. */}
          <div
            className="flex items-stretch"
            style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2, background: 'var(--ed-paper, #FFFBF1)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: viewMode === 'grid' ? 'var(--ed-ink, #111)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--ed-ink, #111)',
              }}
              aria-label="Grid view"
            >
              <Users size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">GRID VIEW</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: viewMode === 'map' ? 'var(--ed-ink, #111)' : 'transparent',
                color: viewMode === 'map' ? '#fff' : 'var(--ed-ink, #111)',
                borderLeft: '2px solid var(--ed-ink, #111)',
              }}
              aria-label="Map view"
            >
              <MapPin size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">MAP VIEW</span>
            </button>
          </div>
        </div>

        {/* ───── Unified card grid (contacts + pets) ───── */}
        <section>
          {(() => {
            // Build the unified card list: contacts + pets, filtered by the
            // active pill. Avoids two separate sections so the layout reads
            // as one editorial grid (matches the design mock).
            type UnifiedItem =
              | { kind: 'contact'; data: Contact }
              | { kind: 'pet'; data: Pet }
            const items: UnifiedItem[] = []
            if (selectedCategory !== 'pets') {
              for (const c of filteredContacts) items.push({ kind: 'contact', data: c })
            }
            for (const p of filteredPets) items.push({ kind: 'pet', data: p })

            // Empty states.
            if (contacts.length === 0 && pets.length === 0) {
              return (
                <div
                  className="flex flex-col items-center justify-center text-center py-20 px-6"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <p
                    className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
                    style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
                  >
                    WHO MATTERS MOST?
                  </p>
                  <p className="text-sm text-[var(--ed-muted,#6F6B61)] mb-6 max-w-sm">
                    Start here. Add the people and pets in your story.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => { setEditingContact(null); setShowContactModal(true) }}
                      className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, background: 'var(--ed-red, #E23B2E)', color: '#fff', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      + ADD CONTACT
                    </button>
                    <button
                      onClick={() => { setEditingPet(null); setShowPetModal(true) }}
                      className="px-5 py-2.5 text-[11px] tracking-[0.18em]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, background: 'var(--ed-paper, #FFFBF1)', color: 'var(--ed-ink, #111)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      + ADD PET
                    </button>
                  </div>
                </div>
              )
            }
            if (items.length === 0) {
              return (
                <div
                  className="text-center py-16 px-6"
                  style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                >
                  <p
                    className="text-[11px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-3"
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    NO MATCHES
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}
                    className="text-[11px] tracking-[0.18em] underline text-[var(--ed-ink,#111)]"
                    style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                  >
                    CLEAR FILTERS
                  </button>
                </div>
              )
            }

            // Add a "+ ADD PET" trailing tile when on the Pets tab.
            const showAddPetTile = selectedCategory === 'pets'

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((it) => {
                  const isContact = it.kind === 'contact'
                  const c = isContact ? (it.data as Contact) : null
                  const p = !isContact ? (it.data as Pet) : null
                  const id = isContact ? c!.id : p!.id
                  const name = isContact ? c!.full_name : p!.name
                  const phone = isContact ? c!.phone : undefined
                  const subLabel = isContact
                    ? getRelationshipLabel(c!.relationship_type) || 'CONTACT'
                    : (p!.species + (p!.breed ? ` · ${p!.breed}` : ''))
                  const flag = groupColor(it.kind, isContact ? c!.relationship_type : undefined)
                  const memCount = isContact ? (memoryCounts.get(c!.id) || 0) : 0

                  return (
                    <div
                      key={`${it.kind}-${id}`}
                      onClick={() => {
                        if (isContact) setSelectedDetailContact(c!)
                        else window.location.href = `/dashboard/pets/${p!.id}`
                      }}
                      className="relative cursor-pointer transition-transform hover:-translate-y-0.5 group"
                      style={{
                        background: 'var(--ed-paper, #FFFBF1)',
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Top-left triangular color flag — type cue */}
                      <span
                        aria-hidden
                        className="absolute top-0 left-0"
                        style={{
                          width: 32, height: 32,
                          background: flag.bg,
                          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                          borderRight: '2px solid var(--ed-ink, #111)',
                        }}
                      />

                      {/* Hover delete X — top-right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isContact) handleDeleteContact(c!.id)
                          else handleDeletePet(p!.id)
                        }}
                        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{
                          background: 'var(--ed-paper, #FFFBF1)',
                          border: '1.5px solid var(--ed-ink, #111)',
                          borderRadius: 999,
                        }}
                        aria-label="Delete"
                      >
                        <X size={12} className="text-[var(--ed-ink,#111)]" />
                      </button>

                      <div className="p-4 sm:p-5 pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="flex items-center justify-center font-bold shrink-0"
                            style={{
                              width: 44, height: 44, borderRadius: 999,
                              background: flag.bg,
                              color: flag.ink,
                              border: '2px solid var(--ed-ink, #111)',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: 16,
                            }}
                          >
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h3
                              className="text-[15px] sm:text-[16px] text-[var(--ed-ink,#111)] truncate leading-tight"
                              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
                            >
                              {name.toUpperCase()}
                            </h3>
                            <p
                              className="text-[10px] tracking-[0.16em] text-[var(--ed-muted,#6F6B61)] truncate uppercase"
                              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                            >
                              {subLabel}
                            </p>
                          </div>
                        </div>

                        {/* Circle membership chips — small mono pills, contact-only.
                            Surfaces shared circles directly on the card so the
                            user doesn't have to open the detail to see context. */}
                        {isContact && (() => {
                          const cs = getContactCircles(c!)
                          if (cs.length === 0) return null
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {cs.slice(0, 2).map(circle => (
                                <span
                                  key={circle.circleId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-[0.14em]"
                                  style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontWeight: 700,
                                    background: 'var(--ed-cream, #F3ECDC)',
                                    color: 'var(--ed-ink, #111)',
                                    border: '1.5px solid var(--ed-ink, #111)',
                                    borderRadius: 999,
                                  }}
                                >
                                  <Users size={9} />
                                  {circle.circleName.toUpperCase()}
                                </span>
                              ))}
                              {cs.length > 2 && (
                                <span
                                  className="text-[9px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)]"
                                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                                >
                                  +{cs.length - 2}
                                </span>
                              )}
                            </div>
                          )
                        })()}

                        {phone && (
                          <p className="flex items-center gap-1.5 text-[12px] text-[var(--ed-ink,#111)] mb-2">
                            <Phone size={12} />
                            <span className="truncate">{phone}</span>
                          </p>
                        )}

                        {/* Bottom row: memory count (left) + PING dropdown (right).
                            Pets don't get PING — only people. */}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <p
                            className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                          >
                            {memCount} {memCount === 1 ? 'MEMORY' : 'MEMORIES'}
                          </p>
                          {isContact && (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              {pingSent[c!.id] ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.18em]"
                                  style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontWeight: 700,
                                    background: 'var(--ed-blue, #2A5CD3)',
                                    color: '#fff',
                                    border: '1.5px solid var(--ed-ink, #111)',
                                    borderRadius: 999,
                                  }}
                                >
                                  <Check size={11} /> SENT
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPingOpenFor(pingOpenFor === c!.id ? null : c!.id)
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-[0.18em]"
                                  style={{
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontWeight: 700,
                                    background: 'var(--ed-red, #E23B2E)',
                                    color: '#fff',
                                    border: '1.5px solid var(--ed-ink, #111)',
                                    borderRadius: 999,
                                  }}
                                  title="Send a gratitude ping"
                                >
                                  <Send size={10} /> PING
                                  <ChevronDown size={10} />
                                </button>
                              )}
                              {pingOpenFor === c!.id && (
                                <div
                                  className="absolute bottom-full right-0 mb-2 z-30 min-w-[200px]"
                                  style={{
                                    background: 'var(--ed-paper, #FFFBF1)',
                                    border: '2px solid var(--ed-ink, #111)',
                                    borderRadius: 2,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    className="px-3 py-2 text-[9px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                                    style={{
                                      fontFamily: 'var(--font-mono, monospace)',
                                      fontWeight: 700,
                                      borderBottom: '2px solid var(--ed-ink, #111)',
                                    }}
                                  >
                                    SEND TO {c!.full_name.split(' ')[0].toUpperCase()}
                                  </div>
                                  {GRATITUDE_OPTIONS.map(opt => (
                                    <button
                                      key={opt.label}
                                      onClick={() => handleSendPing(c!, opt.label)}
                                      className="w-full px-3 py-2 text-left text-[12px] text-[var(--ed-ink,#111)] hover:bg-[var(--ed-cream,#F3ECDC)] flex items-center gap-2"
                                    >
                                      <span>{opt.emoji}</span>
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {showAddPetTile && (
                  <button
                    onClick={() => { setEditingPet(null); setShowPetModal(true) }}
                    className="flex flex-col items-center justify-center min-h-[160px] text-center transition-transform hover:-translate-y-0.5"
                    style={{
                      background: 'var(--ed-paper, #FFFBF1)',
                      border: '2px dashed var(--ed-ink, #111)',
                      borderRadius: 2,
                      color: 'var(--ed-ink, #111)',
                    }}
                  >
                    <Plus size={20} strokeWidth={3} />
                    <span
                      className="mt-2 text-[11px] tracking-[0.18em]"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      ADD PET
                    </span>
                  </button>
                )}
              </div>
            )
          })()}
        </section>
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
