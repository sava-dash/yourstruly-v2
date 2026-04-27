'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  X, Mail, Phone, MessageSquare, Edit2, Save, Trash2,
  Calendar, MapPin, User, Heart, Users, Loader2, Camera, FileText,
  Video, Send, Plus, ChevronDown, Check
} from 'lucide-react'
import { RELATIONSHIP_OPTIONS, getRelationshipLabel } from '@/lib/relationships'

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
// HELPERS
// ============================================
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

// Editorial palette mapping per relationship category — used by the title
// pill, avatar bg, and sidebar card accents so the whole modal stays
// color-keyed to the contact's group (matches the my-story / contacts grid).
function categoryAccent(relType?: string): { bg: string; ink: string } {
  if (!relType) return { bg: 'var(--ed-muted, #6F6B61)', ink: '#fff' }
  const cat = getRelationshipCategory(relType)
  switch (cat) {
    case 'Family':       return { bg: 'var(--ed-yellow, #F2C84B)', ink: 'var(--ed-ink, #111)' }
    case 'Friends':      return { bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' }
    case 'Professional': return { bg: 'var(--ed-ink, #111)',       ink: '#fff' }
    default:             return { bg: 'var(--ed-muted, #6F6B61)',  ink: '#fff' }
  }
}

// Editorial sidebar tile — same shape used in StoryDetailModal so the two
// detail surfaces feel like one system.
function SidebarCard({
  label,
  accent,
  icon,
  children,
}: {
  label: string
  accent: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--ed-paper, #FFFBF1)',
        border: '2px solid var(--ed-ink, #111)',
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          aria-hidden
          className="flex items-center justify-center"
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: accent,
            color: accent === 'var(--ed-yellow, #F2C84B)' ? 'var(--ed-ink, #111)' : '#fff',
            border: '1.5px solid var(--ed-ink, #111)',
          }}
        >
          {icon}
        </span>
        <span
          className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  )
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
  // Gratitude PING — local to the detail modal so it carries its own
  // dropdown + sent-confirmation state without plumbing through the parent.
  const [pingOpen, setPingOpen] = useState(false)
  const [pingSent, setPingSent] = useState<string | null>(null)
  const [pingSending, setPingSending] = useState(false)

  const GRATITUDE_OPTIONS = [
    { emoji: '💛', label: 'Thinking of you' },
    { emoji: '🌟', label: 'Proud of you' },
    { emoji: '💜', label: 'Miss you' },
    { emoji: '❤️', label: 'Love you' },
    { emoji: '🙏', label: 'Thank you' },
  ]

  const handleSendPing = async (message: string) => {
    if (pingSending) return
    setPingSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const senderName = profile?.full_name || 'Someone'

      await supabase.from('gratitude_pings').insert({
        sender_id: user.id,
        recipient_contact_id: contact.id,
        recipient_email: contact.email || null,
        message,
        sender_name: senderName,
        recipient_name: contact.full_name,
      })

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
        }).catch(() => {})
      }

      setPingSent(message)
      setPingOpen(false)
      setTimeout(() => setPingSent(null), 3000)
    } catch (err) {
      console.error('Failed to send gratitude ping:', err)
    } finally {
      setPingSending(false)
    }
  }

  // Close ping dropdown when clicking outside
  useEffect(() => {
    if (!pingOpen) return
    const close = () => setPingOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [pingOpen])

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
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl my-4 sm:my-8"
        style={{
          background: 'var(--ed-cream, #F3ECDC)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right action toolbar: EDIT, DELETE, PING dropdown, CLOSE.
            Editorial pills + a circular close button. Hidden on the edit
            pane (the form has its own SAVE/CANCEL controls). */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-red, #E23B2E)',
                  color: '#fff',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
                aria-label="Edit contact"
              >
                <Edit2 size={11} /> EDIT
              </button>
              <button
                onClick={() => setShowDeleteConfirm(s => !s)}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  background: 'var(--ed-paper, #FFFBF1)',
                  color: 'var(--ed-ink, #111)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
                aria-label="Delete contact"
              >
                <Trash2 size={11} /> DELETE
              </button>
              <div
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                {pingSent ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: 'var(--ed-blue, #2A5CD3)',
                      color: '#fff',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    <Check size={11} /> SENT
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPingOpen(o => !o)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: 'var(--ed-yellow, #F2C84B)',
                      color: 'var(--ed-ink, #111)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                    aria-label="Send gratitude ping"
                  >
                    <Send size={11} /> PING <ChevronDown size={11} />
                  </button>
                )}
                {pingOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 min-w-[220px]"
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
                      SEND TO {contact.full_name.split(' ')[0].toUpperCase()}
                    </div>
                    {GRATITUDE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => handleSendPing(opt.label)}
                        disabled={pingSending}
                        className="w-full px-3 py-2 text-left text-[12px] text-[var(--ed-ink,#111)] hover:bg-[var(--ed-cream,#F3ECDC)] flex items-center gap-2 disabled:opacity-50"
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center"
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
        </div>

        {/* ───── HEADER: type pill + display name + red dot accent ─────
            Padding-top accommodates the absolute action toolbar above. */}
        <header className="px-6 sm:px-10 pt-20 sm:pt-24 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              aria-hidden
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: categoryAccent(contact.relationship_type).bg }}
            />
            <span
              className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              CONTACT · {(getRelationshipLabel(contact.relationship_type) || 'OTHER').toUpperCase()}
            </span>
          </div>
          <div className="flex items-start gap-4 sm:gap-6">
            <h1
              className="flex-1 leading-[1.05] text-[var(--ed-ink,#111)]"
              style={{
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 'clamp(28px, 4.5vw, 44px)',
              }}
            >
              {contact.full_name.toUpperCase()}
            </h1>
            <span
              aria-hidden
              className="shrink-0"
              style={{ width: 28, height: 28, background: 'var(--ed-red, #E23B2E)', borderRadius: 999, marginTop: 8 }}
            />
          </div>
          {contact.nickname && (
            <p className="text-[12px] text-[var(--ed-muted,#6F6B61)] mt-2 italic">
              also &ldquo;{contact.nickname}&rdquo;
            </p>
          )}
        </header>

        {error && (
          <div
            className="mx-6 sm:mx-10 mb-4 px-4 py-2 text-[12px]"
            style={{
              border: '2px solid var(--ed-ink, #111)',
              background: 'var(--ed-red, #E23B2E)',
              color: '#fff',
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.1em',
            }}
          >
            {error.toUpperCase()}
          </div>
        )}

        {editing ? (
          /* ───── EDIT MODE ───── */
          <div className="px-6 sm:px-10 pb-8">
            <div
              className="p-5 sm:p-6"
              style={{
                background: 'var(--ed-paper, #FFFBF1)',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  EDIT DETAILS
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(false)
                      setError(null)
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
                    className="px-3 py-1.5 text-[10px] tracking-[0.18em]"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: 'transparent',
                      color: 'var(--ed-ink, #111)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.18em] disabled:opacity-50"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: 'var(--ed-red, #E23B2E)',
                      color: '#fff',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    SAVE
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <fieldset className="space-y-3">
                  <legend className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>PERSONAL</legend>
                  <div>
                    <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Full name *</label>
                    <input
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)]"
                      style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Nickname</label>
                      <input
                        value={form.nickname}
                        onChange={e => setForm({ ...form, nickname: e.target.value })}
                        className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)]"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Birthday</label>
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                        className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)]"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Relationship *</label>
                    <select
                      value={form.relationship_type}
                      onChange={e => setForm({ ...form, relationship_type: e.target.value })}
                      className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)]"
                      style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    >
                      <option value="">Select…</option>
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
                    <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Relationship details</label>
                    <input
                      value={form.relationship_details}
                      onChange={e => setForm({ ...form, relationship_details: e.target.value })}
                      placeholder="e.g. Father-in-law on my wife's side"
                      className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]"
                      style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                    />
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>CONTACT</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--ed-muted,#6F6B61)] mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>ADDRESS</legend>
                  <input
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="Street address"
                    className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]"
                    style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]" style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                    <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]" style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                    <input value={form.zipcode} onChange={e => setForm({ ...form, zipcode: e.target.value })} placeholder="Zip" className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]" style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                    <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)]" style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }} />
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>NOTES</legend>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Personal notes about this person…"
                    rows={3}
                    className="w-full p-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] resize-none"
                    style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                  />
                </fieldset>
              </div>
            </div>
          </div>
        ) : (
          /* ───── VIEW MODE — editorial 2-column layout ───── */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-6 sm:px-10 pb-8">
              {/* LEFT — about + memories together + actions */}
              <div className="flex flex-col gap-6 min-w-0">
                {(contact.notes || contact.relationship_details) && (
                  <section
                    className="p-5 sm:p-6"
                    style={{
                      background: 'var(--ed-paper, #FFFBF1)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    <h3
                      className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)] mb-4"
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                    >
                      ABOUT
                    </h3>
                    {contact.relationship_details && (
                      <p className="text-[14px] text-[var(--ed-ink,#111)] mb-3">
                        {contact.relationship_details}
                      </p>
                    )}
                    {contact.notes && (
                      <p className="text-[15px] text-[var(--ed-ink,#111)] leading-[1.65] whitespace-pre-wrap">
                        {contact.notes}
                      </p>
                    )}
                  </section>
                )}

                <section
                  className="p-5 sm:p-6"
                  style={{
                    background: 'var(--ed-paper, #FFFBF1)',
                    border: '2px solid var(--ed-ink, #111)',
                    borderRadius: 2,
                  }}
                >
                  <h3
                    className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)] mb-4"
                    style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                  >
                    MEMORIES TOGETHER {memories.length > 0 && `· ${memories.length}`}
                  </h3>
                  {loadingConnected ? (
                    <p className="text-[12px] text-[var(--ed-muted,#6F6B61)] flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                      <Loader2 size={12} className="animate-spin" /> LOADING…
                    </p>
                  ) : memories.length === 0 ? (
                    <p className="text-[12px] text-[var(--ed-muted,#6F6B61)]">
                      No tagged memories yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {memories.map(m => (
                        <Link
                          key={m.id}
                          href={`/dashboard/memories/${m.id}`}
                          className="block relative aspect-square overflow-hidden"
                          style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
                          title={m.title}
                        >
                          {m.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--ed-cream, #F3ECDC)' }}>
                              <Camera size={20} className="text-[var(--ed-muted,#6F6B61)]" />
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {/* EDIT and DELETE moved to the top-right toolbar; the
                    inline confirm panel still surfaces here when the
                    DELETE button (now in the header) is clicked. */}

                {showDeleteConfirm && (
                  <div
                    className="p-4"
                    style={{
                      background: 'var(--ed-red, #E23B2E)',
                      color: '#fff',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    <p className="text-[13px] mb-3">
                      Delete <strong>{contact.full_name}</strong>? This cannot be undone.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-[0.18em] disabled:opacity-60"
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          background: 'var(--ed-ink, #111)',
                          color: '#fff',
                          border: '2px solid #fff',
                          borderRadius: 2,
                        }}
                      >
                        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        YES, DELETE
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 text-[11px] tracking-[0.18em]"
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontWeight: 700,
                          background: 'transparent',
                          color: '#fff',
                          border: '2px solid #fff',
                          borderRadius: 2,
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT — sidebar tiles */}
              <aside className="flex flex-col gap-3 min-w-0">
                <SidebarCard
                  label="RELATIONSHIP"
                  accent={categoryAccent(contact.relationship_type).bg}
                  icon={<User size={13} />}
                >
                  <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold">
                    {getRelationshipLabel(contact.relationship_type) || 'Other'}
                  </p>
                  {contact.relationship_details && (
                    <p className="text-[12px] text-[var(--ed-muted,#6F6B61)] mt-1">{contact.relationship_details}</p>
                  )}
                </SidebarCard>

                {contact.date_of_birth && (
                  <SidebarCard label="BIRTHDAY" accent="var(--ed-blue, #2A5CD3)" icon={<Calendar size={13} />}>
                    <p className="text-[15px] text-[var(--ed-ink,#111)] font-semibold">
                      {formatDateDisplay(contact.date_of_birth) || contact.date_of_birth}
                    </p>
                  </SidebarCard>
                )}

                {contact.email && (
                  <SidebarCard label="EMAIL" accent="var(--ed-yellow, #F2C84B)" icon={<Mail size={13} />}>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-[14px] text-[var(--ed-ink,#111)] hover:underline break-all"
                    >
                      {contact.email}
                    </a>
                  </SidebarCard>
                )}

                {contact.phone && (
                  <SidebarCard label="PHONE" accent="var(--ed-ink, #111)" icon={<Phone size={13} />}>
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-[14px] text-[var(--ed-ink,#111)] hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </SidebarCard>
                )}

                {hasAddress && (
                  <SidebarCard label="LOCATION" accent="var(--ed-red, #E23B2E)" icon={<MapPin size={13} />}>
                    <p className="text-[14px] text-[var(--ed-ink,#111)] leading-snug">
                      {addressParts.join(', ')}
                    </p>
                  </SidebarCard>
                )}

                {circles.length > 0 && (
                  <SidebarCard label="IN CIRCLES" accent="var(--ed-ink, #111)" icon={<Users size={13} />}>
                    <div className="flex flex-wrap gap-1.5">
                      {circles.map(circle => (
                        <Link
                          key={circle.id}
                          href={`/dashboard/circles/${circle.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] tracking-[0.14em]"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: 'var(--ed-cream, #F3ECDC)',
                            color: 'var(--ed-ink, #111)',
                            border: '1.5px solid var(--ed-ink, #111)',
                            borderRadius: 999,
                          }}
                        >
                          <Users size={10} />
                          {circle.name.toUpperCase()}
                        </Link>
                      ))}
                    </div>
                  </SidebarCard>
                )}

                {/* Quick actions row — Email / Call / Message */}
                <div className="flex flex-wrap gap-2">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        background: 'var(--ed-paper, #FFFBF1)',
                        color: 'var(--ed-ink, #111)',
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    >
                      <Mail size={11} /> EMAIL
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        background: 'var(--ed-paper, #FFFBF1)',
                        color: 'var(--ed-ink, #111)',
                        border: '2px solid var(--ed-ink, #111)',
                        borderRadius: 2,
                      }}
                    >
                      <Phone size={11} /> CALL
                    </a>
                  )}
                  <Link
                    href="/dashboard/messages"
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-[0.18em]"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      background: 'var(--ed-paper, #FFFBF1)',
                      color: 'var(--ed-ink, #111)',
                      border: '2px solid var(--ed-ink, #111)',
                      borderRadius: 2,
                    }}
                  >
                    <MessageSquare size={11} /> MESSAGE
                  </Link>
                </div>
              </aside>
            </div>

            {/* INTERVIEWS + POSTSCRIPTS — 2-col below the main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 sm:px-10 pb-8">
              <section
                className="p-5"
                style={{
                  background: 'var(--ed-paper, #FFFBF1)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                    INTERVIEWS {interviews.length > 0 && `· ${interviews.length}`}
                  </h3>
                  <Link
                    href="/dashboard/journalist"
                    className="flex items-center gap-1 text-[10px] tracking-[0.18em]"
                    style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--ed-red, #E23B2E)' }}
                  >
                    <Plus size={11} /> START
                  </Link>
                </div>
                {interviews.length === 0 ? (
                  <p className="text-[12px] text-[var(--ed-muted,#6F6B61)]">No interviews yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {interviews.map(s => (
                      <Link
                        key={s.id}
                        href={`/dashboard/journalist/${s.id}`}
                        className="flex items-start justify-between gap-3 p-3"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-[var(--ed-ink,#111)] truncate font-semibold">
                            {s.title || 'Untitled interview'}
                          </p>
                          <p className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] mt-0.5" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                          </p>
                        </div>
                        <span
                          className="text-[9px] tracking-[0.16em] px-2 py-0.5 shrink-0"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: s.status === 'completed' ? 'var(--ed-blue, #2A5CD3)' : s.status === 'in_progress' ? 'var(--ed-yellow, #F2C84B)' : 'var(--ed-paper, #FFFBF1)',
                            color: s.status === 'in_progress' ? 'var(--ed-ink, #111)' : (s.status === 'completed' ? '#fff' : 'var(--ed-ink, #111)'),
                            border: '1.5px solid var(--ed-ink, #111)',
                            borderRadius: 2,
                          }}
                        >
                          {s.status === 'completed' ? 'DONE' : s.status === 'in_progress' ? 'ACTIVE' : s.status.toUpperCase()}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="p-5"
                style={{
                  background: 'var(--ed-paper, #FFFBF1)',
                  border: '2px solid var(--ed-ink, #111)',
                  borderRadius: 2,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] tracking-[0.22em] text-[var(--ed-ink,#111)]" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                    POSTSCRIPTS {postscripts.length > 0 && `· ${postscripts.length}`}
                  </h3>
                  <Link
                    href="/dashboard/postscripts/new"
                    className="flex items-center gap-1 text-[10px] tracking-[0.18em]"
                    style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--ed-red, #E23B2E)' }}
                  >
                    <Plus size={11} /> NEW
                  </Link>
                </div>
                {postscripts.length === 0 ? (
                  <p className="text-[12px] text-[var(--ed-muted,#6F6B61)]">No postscripts yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {postscripts.map(p => (
                      <Link
                        key={p.id}
                        href={`/dashboard/postscripts/${p.id}`}
                        className="flex items-start justify-between gap-3 p-3"
                        style={{ background: 'var(--ed-cream, #F3ECDC)', border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2 }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-[var(--ed-ink,#111)] truncate font-semibold">
                            {p.title || (p.message ? p.message.slice(0, 40) + (p.message.length > 40 ? '…' : '') : 'Untitled')}
                          </p>
                          <p className="text-[10px] tracking-[0.14em] text-[var(--ed-muted,#6F6B61)] mt-0.5" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                            {p.delivery_date
                              ? new Date(p.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                              : 'NO DELIVERY DATE'}
                          </p>
                        </div>
                        <span
                          className="text-[9px] tracking-[0.16em] px-2 py-0.5 shrink-0"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            background: (p.status === 'sent' || p.status === 'opened') ? 'var(--ed-blue, #2A5CD3)' : p.status === 'scheduled' ? 'var(--ed-yellow, #F2C84B)' : 'var(--ed-paper, #FFFBF1)',
                            color: p.status === 'scheduled' ? 'var(--ed-ink, #111)' : ((p.status === 'sent' || p.status === 'opened') ? '#fff' : 'var(--ed-ink, #111)'),
                            border: '1.5px solid var(--ed-ink, #111)',
                            borderRadius: 2,
                          }}
                        >
                          {p.status.toUpperCase()}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* FOOTER — mono caps */}
            <div className="px-6 sm:px-10 pb-6">
              <div
                className="pt-4 text-center"
                style={{ borderTop: '2px solid var(--ed-ink, #111)' }}
              >
                <p
                  className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  CONTACT IN YOUR STORY
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
