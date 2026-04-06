'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  X, Mail, Phone, MessageSquare, Share2, Edit2, Save, Trash2,
  Calendar, MapPin, User, Heart, Users, Loader2, Camera, FileText,
  Video, Send, Plus
} from 'lucide-react'

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
  avatar_url?: string
}

interface MemorySummary {
  id: string
  title: string
  memory_date: string
  cover_url: string | null
}

interface CircleInfo {
  id: string
  name: string
}

interface InterviewSession {
  id: string
  title: string
  status: string
  created_at: string
}

interface PostScriptSummary {
  id: string
  title: string
  message: string | null
  delivery_date: string | null
  status: string
}

interface ContactDetailModalProps {
  contact: Contact
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

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

// ============================================
// HELPERS
// ============================================
function getRelationshipLabel(id: string): string {
  for (const group of RELATIONSHIP_OPTIONS) {
    const found = group.options.find(o => o.id === id)
    if (found) return found.label
  }
  return id || 'Unknown'
}

function getRelationshipCategory(id: string): string {
  for (const group of RELATIONSHIP_OPTIONS) {
    if (group.options.some(o => o.id === id)) return group.category
  }
  return 'Other'
}

function getBadgeColor(relType: string): string {
  const cat = getRelationshipCategory(relType)
  switch (cat) {
    case 'Family': return 'bg-[#2D5A3D]/10 text-[#2D5A3D] border-[#2D5A3D]/20'
    case 'Friends': return 'bg-[#3B6FA0]/10 text-[#3B6FA0] border-[#3B6FA0]/20'
    case 'Professional': return 'bg-[#C4A235]/10 text-[#8B7320] border-[#C4A235]/20'
    default: return 'bg-[#7B5EA0]/10 text-[#7B5EA0] border-[#7B5EA0]/20'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDateDisplay(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const [, year, month, day] = match
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`
}

// ============================================
// COMPONENT
// ============================================
export default function ContactDetailModal({
  contact,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ContactDetailModalProps) {
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for edit mode
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    email: '',
    phone: '',
    relationship_type: '',
    relationship_details: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
    notes: '',
  })

  // Connected content
  const [memories, setMemories] = useState<MemorySummary[]>([])
  const [circles, setCircles] = useState<CircleInfo[]>([])
  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [postscripts, setPostscripts] = useState<PostScriptSummary[]>([])
  const [loadingConnected, setLoadingConnected] = useState(false)

  // Initialize form from contact
  useEffect(() => {
    if (isOpen && contact) {
      setForm({
        full_name: contact.full_name || '',
        nickname: contact.nickname || '',
        email: contact.email || '',
        phone: contact.phone || '',
        relationship_type: contact.relationship_type || '',
        relationship_details: contact.relationship_details || '',
        date_of_birth: contact.date_of_birth || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        country: contact.country || '',
        zipcode: contact.zipcode || '',
        notes: contact.notes || '',
      })
      setEditing(false)
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [isOpen, contact])

  // Load connected content (memories + circles)
  const loadConnectedContent = useCallback(async () => {
    if (!contact?.id) return
    setLoadingConnected(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch memories via face tags
      const { data: faceTags } = await supabase
        .from('memory_face_tags')
        .select('memory_media!inner(memory_id)')
        .eq('contact_id', contact.id)
        .eq('user_id', user.id)

      const memoryIds = [...new Set(
        (faceTags || [])
          .map((t: any) => t.memory_media?.memory_id)
          .filter(Boolean)
      )]

      if (memoryIds.length > 0) {
        const { data: memoriesData } = await supabase
          .from('memories')
          .select(`
            id, title, memory_date,
            memory_media(file_url, is_cover, file_type)
          `)
          .in('id', memoryIds.slice(0, 6))
          .order('memory_date', { ascending: false })

        const mapped: MemorySummary[] = (memoriesData || []).map((m: any) => {
          const cover = m.memory_media?.find((mm: any) => mm.is_cover)
            || m.memory_media?.find((mm: any) => mm.file_type?.startsWith('image'))
          return {
            id: m.id,
            title: m.title || 'Untitled memory',
            memory_date: m.memory_date,
            cover_url: cover?.file_url || null,
          }
        })
        setMemories(mapped)
      } else {
        setMemories([])
      }

      // Fetch circles this contact is in (via email match)
      if (contact.email) {
        const { data: circleMembers } = await supabase
          .from('circle_members')
          .select('circle_id, circles(id, name), profiles(email)')
          .eq('invite_status', 'accepted')

        const matchedCircles: CircleInfo[] = []
        const seen = new Set<string>()
        for (const member of circleMembers || []) {
          const profiles = member.profiles as any
          const profile = Array.isArray(profiles) ? profiles[0] : profiles
          const email = profile?.email?.toLowerCase()
          if (email === contact.email.toLowerCase()) {
            const circleData = member.circles as any
            const circle = Array.isArray(circleData) ? circleData[0] : circleData
            if (circle && !seen.has(circle.id)) {
              seen.add(circle.id)
              matchedCircles.push({ id: circle.id, name: circle.name })
            }
          }
        }
        setCircles(matchedCircles)
      } else {
        setCircles([])
      }

      // Fetch interview sessions for this contact
      const { data: interviewData } = await supabase
        .from('interview_sessions')
        .select('id, title, status, created_at')
        .eq('contact_id', contact.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      setInterviews(interviewData || [])

      // Fetch postscripts for this contact
      const { data: postscriptData } = await supabase
        .from('postscripts')
        .select('id, title, message, delivery_date, status')
        .eq('recipient_contact_id', contact.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      setPostscripts(postscriptData || [])
    } catch (err) {
      console.error('Error loading connected content:', err)
    } finally {
      setLoadingConnected(false)
    }
  }, [contact, supabase])

  useEffect(() => {
    if (isOpen && contact?.id) {
      loadConnectedContent()
    }
  }, [isOpen, contact?.id, loadConnectedContent])

  // Save handler
  const handleSave = async () => {
    if (!form.full_name || !form.relationship_type) {
      setError('Name and relationship are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = {
        full_name: form.full_name,
        nickname: form.nickname || null,
        email: form.email || null,
        phone: form.phone || null,
        relationship_type: form.relationship_type,
        relationship_details: form.relationship_details || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        zipcode: form.zipcode || null,
        notes: form.notes || null,
      }

      const { error: updateError } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', contact.id)

      if (updateError) throw updateError

      setEditing(false)
      onSave()
    } catch (err) {
      console.error('Error saving contact:', err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Delete handler
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)

      if (deleteError) throw deleteError

      onDelete()
      onClose()
    } catch (err) {
      console.error('Error deleting contact:', err)
      setError('Failed to delete contact.')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  const hasAddress = contact.address || contact.city || contact.state || contact.country || contact.zipcode
  const addressParts = [contact.address, contact.city, contact.state, contact.zipcode, contact.country].filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ CLOSE BUTTON ============ */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ============ TWO-COLUMN TOP SECTION ============ */}
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-6 p-6">
          {/* LEFT COLUMN: Avatar, Name, Badge, Quick Actions */}
          <div className="sm:w-[40%] flex-shrink-0 flex flex-col items-center sm:items-start text-center sm:text-left mb-6 sm:mb-0">
            {/* Avatar */}
            {contact.avatar_url ? (
              <img
                src={contact.avatar_url}
                alt={contact.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#DDE3DF] mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5a8a6e] flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0 mb-3">
                {getInitials(contact.full_name)}
              </div>
            )}

            <h2
              className="text-2xl font-bold text-[#1A1F1C] truncate max-w-full"
              style={{ fontFamily: 'var(--font-dm-serif, "DM Serif Display", serif)' }}
            >
              {contact.full_name}
            </h2>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center sm:justify-start">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(contact.relationship_type)}`}>
                {getRelationshipLabel(contact.relationship_type)}
              </span>
              {contact.nickname && (
                <span className="text-sm text-gray-400">({contact.nickname})</span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-xl transition-colors"
                  title={`Email ${contact.email}`}
                >
                  <Mail size={15} />
                  <span>Email</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-xl transition-colors"
                  title={`Call ${contact.phone}`}
                >
                  <Phone size={15} />
                  <span>Call</span>
                </a>
              )}
              <Link
                href="/dashboard/messages"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-xl transition-colors"
              >
                <MessageSquare size={15} />
                <span>Message</span>
              </Link>
              <Link
                href="/dashboard/my-story"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-xl transition-colors"
              >
                <Share2 size={15} />
                <span>Share</span>
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Details with edit toggle */}
          <div className="sm:w-[60%] min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#94A09A] uppercase tracking-wider">Details</h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/5 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(false)
                    setError(null)
                    // Reset form to original contact data
                    setForm({
                      full_name: contact.full_name || '',
                      nickname: contact.nickname || '',
                      email: contact.email || '',
                      phone: contact.phone || '',
                      relationship_type: contact.relationship_type || '',
                      relationship_details: contact.relationship_details || '',
                      date_of_birth: contact.date_of_birth || '',
                      address: contact.address || '',
                      city: contact.city || '',
                      state: contact.state || '',
                      country: contact.country || '',
                      zipcode: contact.zipcode || '',
                      notes: contact.notes || '',
                    })
                  }}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[#2D5A3D] hover:bg-[#234A31] rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {editing ? (
            /* ---- EDIT MODE ---- */
            <div className="space-y-4">
              {/* Personal */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Personal</legend>
                <div>
                  <label className="block text-sm text-[#666] mb-1">Full Name *</label>
                  <input
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Nickname</label>
                    <input
                      value={form.nickname}
                      onChange={e => setForm({ ...form, nickname: e.target.value })}
                      className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Birthday</label>
                    <input
                      type="date"
                      value={form.date_of_birth}
                      onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                      className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1">Relationship *</label>
                  <select
                    value={form.relationship_type}
                    onChange={e => setForm({ ...form, relationship_type: e.target.value })}
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  >
                    <option value="">Select...</option>
                    {RELATIONSHIP_OPTIONS.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.options.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#666] mb-1">Relationship details</label>
                  <input
                    value={form.relationship_details}
                    onChange={e => setForm({ ...form, relationship_details: e.target.value })}
                    placeholder="e.g. Father-in-law on my wife's side"
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                </div>
              </fieldset>

              {/* Contact info */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Contact</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Address */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Address</legend>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address"
                  className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                />
                <div className="grid grid-cols-4 gap-2">
                  <input
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                  <input
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    placeholder="State"
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                  <input
                    value={form.zipcode}
                    onChange={e => setForm({ ...form, zipcode: e.target.value })}
                    placeholder="Zip"
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                  <input
                    value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value })}
                    placeholder="Country"
                    className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                  />
                </div>
              </fieldset>

              {/* Notes */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Notes</legend>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Personal notes about this person..."
                  rows={3}
                  className="w-full p-2.5 bg-[#2D5A3D]/5 border border-[#DDE3DF] rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 transition-all text-sm"
                />
              </fieldset>
            </div>
          ) : (
            /* ---- VIEW MODE (compact) ---- */
            <div className="space-y-2.5">
              {/* Compact info rows — only show fields that AREN'T already in the left column */}
              {contact.relationship_details && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={13} className="text-[#94A09A] flex-shrink-0" />
                  <span className="text-[#5A6660]">{contact.relationship_details}</span>
                </div>
              )}
              {contact.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={13} className="text-[#94A09A] flex-shrink-0" />
                  <span className="text-[#5A6660]">{formatDateDisplay(contact.date_of_birth)}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={13} className="text-[#94A09A] flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-[#2D5A3D] hover:underline">{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={13} className="text-[#94A09A] flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="text-[#2D5A3D] hover:underline">{contact.phone}</a>
                </div>
              )}
              {hasAddress && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={13} className="text-[#94A09A] flex-shrink-0" />
                  <span className="text-[#5A6660]">{addressParts.join(', ')}</span>
                </div>
              )}
              {contact.notes && (
                <div className="flex items-start gap-2 text-sm mt-1">
                  <FileText size={13} className="text-[#94A09A] flex-shrink-0 mt-0.5" />
                  <p className="text-[#5A6660] leading-relaxed line-clamp-3">{contact.notes}</p>
                </div>
              )}
              {/* Show placeholder if nothing to display */}
              {!contact.date_of_birth && !contact.email && !contact.phone && !hasAddress && !contact.notes && !contact.relationship_details && (
                <p className="text-sm text-[#94A09A] italic">No details added yet</p>
              )}
            </div>
          )}
          </div>{/* end right column */}
        </div>{/* end two-column container */}

        {/* ============ CONNECTED CONTENT ============ */}
        <div className="border-t border-[#DDE3DF]" />
        <div className="p-6">
          <h3 className="text-xs font-semibold text-[#94A09A] uppercase tracking-wider mb-4">Connected</h3>

          {loadingConnected ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Memories together */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera size={14} className="text-[#2D5A3D]" />
                  <span className="text-sm font-medium text-gray-700">
                    Memories together
                    {memories.length > 0 && (
                      <span className="ml-1.5 text-xs text-gray-400">({memories.length})</span>
                    )}
                  </span>
                </div>
                {memories.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {memories.map(memory => (
                      <Link
                        key={memory.id}
                        href={`/dashboard/memories/${memory.id}`}
                        className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#DDE3DF] hover:opacity-80 transition-opacity"
                        title={memory.title}
                      >
                        {memory.cover_url ? (
                          <img
                            src={memory.cover_url}
                            alt={memory.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#2D5A3D]/30">
                            <Camera size={20} />
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No tagged memories yet</p>
                )}
              </div>

              {/* Shared in circles */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-[#2D5A3D]" />
                  <span className="text-sm font-medium text-gray-700">Shared in circles</span>
                </div>
                {circles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {circles.map(circle => (
                      <Link
                        key={circle.id}
                        href={`/dashboard/circles/${circle.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-full border border-[#2D5A3D]/10 transition-colors"
                      >
                        <Users size={11} />
                        {circle.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not in any circles</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============ INTERVIEWS ============ */}
        <div className="border-t border-[#DDE3DF]" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#94A09A] uppercase tracking-wider">Interviews</h3>
            <Link
              href="/dashboard/journalist"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Start Interview
            </Link>
          </div>

          {interviews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {interviews.map(session => (
                <Link
                  key={session.id}
                  href={`/dashboard/journalist/${session.id}`}
                  className="p-3 rounded-xl border border-[#DDE3DF] hover:border-[#2D5A3D]/30 hover:bg-[#2D5A3D]/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1F1C] truncate group-hover:text-[#2D5A3D]">
                        {session.title || 'Untitled Interview'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                      session.status === 'completed' ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' :
                      session.status === 'in_progress' ? 'bg-[#C4A235]/10 text-[#8B7320]' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {session.status === 'completed' ? 'Done' :
                       session.status === 'in_progress' ? 'In Progress' :
                       session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Video size={20} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 mb-2">No interviews yet</p>
              <Link
                href="/dashboard/journalist"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
              >
                <Video size={14} />
                Start first interview
              </Link>
            </div>
          )}
        </div>

        {/* ============ POSTSCRIPTS ============ */}
        <div className="border-t border-[#DDE3DF]" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[#94A09A] uppercase tracking-wider">PostScripts</h3>
            <Link
              href="/dashboard/postscripts/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Create PostScript
            </Link>
          </div>

          {postscripts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {postscripts.map(ps => (
                <Link
                  key={ps.id}
                  href={`/dashboard/postscripts/${ps.id}`}
                  className="p-3 rounded-xl border border-[#DDE3DF] hover:border-[#2D5A3D]/30 hover:bg-[#2D5A3D]/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1F1C] truncate group-hover:text-[#2D5A3D]">
                        {ps.title || (ps.message ? ps.message.slice(0, 40) + (ps.message.length > 40 ? '...' : '') : 'Untitled')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ps.delivery_date
                          ? new Date(ps.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'No delivery date'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                      ps.status === 'sent' || ps.status === 'opened' ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' :
                      ps.status === 'scheduled' ? 'bg-[#C4A235]/10 text-[#8B7320]' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {ps.status.charAt(0).toUpperCase() + ps.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Send size={20} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 mb-2">No PostScripts yet</p>
              <Link
                href="/dashboard/postscripts/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#2D5A3D] bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
              >
                <Send size={14} />
                Create first PostScript
              </Link>
            </div>
          )}
        </div>

        {/* ============ DANGER ZONE ============ */}
        <div className="border-t border-[#DDE3DF]" />
        <div className="p-6">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
              Delete contact
            </button>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700 mb-3">
                Are you sure you want to delete <strong>{contact.full_name}</strong>? This cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Yes, delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// INFO ROW SUB-COMPONENT
// ============================================
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | undefined | null
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-[#2D5A3D]/60 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs text-gray-400">{label}</span>
        <p className={`text-sm ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
          {value || 'Not set'}
        </p>
      </div>
    </div>
  )
}
