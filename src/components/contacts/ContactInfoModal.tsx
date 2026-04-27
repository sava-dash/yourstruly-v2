'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Calendar, MapPin, Phone, Mail, User, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// TYPES
// =============================================================================
export interface ContactTask {
  id: string
  promptText: string
  contactId?: string
  contactName?: string
  type?: string
  missingField?: string
  metadata?: {
    contact?: {
      id?: string
      name?: string
      full_name?: string
    }
  }
}

export interface ContactInfoModalProps {
  task: ContactTask
  isOpen: boolean
  onClose: () => void
  onComplete: (result: { contactId: string; updatedFields: string[]; xp: number }) => void
}

// Info types that should show the modal (structured data entry)
export type InfoType = 'birthday' | 'phone' | 'email' | 'address' | 'nickname' | 'notes' | 'multiple'

// =============================================================================
// TASK TYPE DETECTION
// =============================================================================

/**
 * Determines if a task is asking for structured info (show modal)
 * vs asking an open-ended question (should use voice chat)
 */
export function isInfoTask(task: ContactTask): boolean {
  const text = task.promptText?.toLowerCase() || ''
  
  // Open-ended question patterns (should use voice chat, NOT modal)
  const questionPatterns = [
    /^ask\s+\w+\s+about/i,          // "Ask Mom about..."
    /^interview\s+\w+/i,             // "Interview Dad..."
    /^talk\s+to\s+\w+\s+about/i,     // "Talk to John about..."
    /^find\s+out\s+.+\s+from/i,      // "Find out ... from..."
    /what\s+(does|did|would|could)\s+\w+\s+think/i,  // "What does X think..."
    /how\s+does\s+\w+\s+feel/i,      // "How does X feel..."
    /tell\s+me\s+about\s+.+childhood/i,
    /tell\s+me\s+about\s+.+career/i,
    /tell\s+me\s+about\s+.+life/i,
    /what\s+.+\s+remember/i,
    /favorite\s+(memory|story|moment)/i,
    /\?$/,                           // Ends with question mark (likely open question)
  ]
  
  // If it matches any question pattern, it's NOT an info task
  if (questionPatterns.some(pattern => pattern.test(text))) {
    return false
  }
  
  // Check if it's asking for structured info
  const infoPatterns = [
    /add\s+(birthday|birth\s*date|dob)/i,
    /add\s+(phone|phone\s*number|cell|mobile)/i,
    /add\s+(email|e-mail|email\s*address)/i,
    /add\s+(address|home\s*address|mailing\s*address)/i,
    /add\s+(nickname|nick\s*name)/i,
    /update\s+(birthday|birth\s*date|dob)/i,
    /update\s+(phone|phone\s*number|cell|mobile)/i,
    /update\s+(email|e-mail|email\s*address)/i,
    /update\s+(address|home\s*address|mailing\s*address)/i,
    /update\s+(nickname|nick\s*name)/i,
    /what\s+is\s+.+('s|s)\s+(birthday|phone|email|address)/i,
    /enter\s+(birthday|phone|email|address)/i,
    /missing\s+(birthday|phone|email|address)/i,
    /complete\s+.+\s+(info|information|profile)/i,
  ]
  
  // Check explicit missingField from task
  if (task.missingField) {
    const structuredFields = ['phone', 'email', 'date_of_birth', 'birth_date', 'birthday', 'address', 'city', 'state', 'country', 'zipcode', 'nickname']
    if (structuredFields.includes(task.missingField)) {
      return true
    }
  }
  
  return infoPatterns.some(pattern => pattern.test(text))
}

/**
 * Detects what type of info the task is asking for
 */
export function detectInfoType(task: ContactTask): InfoType {
  const text = task.promptText?.toLowerCase() || ''
  const field = task.missingField?.toLowerCase() || ''
  
  // Check explicit missingField first
  if (field.includes('birth') || field.includes('dob')) return 'birthday'
  if (field.includes('phone') || field.includes('cell') || field.includes('mobile')) return 'phone'
  if (field.includes('email')) return 'email'
  if (field.includes('address') || field.includes('city') || field.includes('state') || field.includes('zip') || field.includes('country')) return 'address'
  if (field.includes('nick')) return 'nickname'
  if (field.includes('note')) return 'notes'
  
  // Check prompt text
  if (/birthday|birth\s*date|dob|born/i.test(text)) return 'birthday'
  if (/phone|cell|mobile|call/i.test(text)) return 'phone'
  if (/email|e-?mail/i.test(text)) return 'email'
  if (/address|street|city|state|zip|country/i.test(text)) return 'address'
  if (/nickname|nick\s*name/i.test(text)) return 'nickname'
  if (/complete.+info|profile/i.test(text)) return 'multiple'
  
  return 'notes'
}

/**
 * Extracts contact name from task
 */
export function extractContactName(task: ContactTask): string {
  // Try explicit fields first
  if (task.contactName) return task.contactName
  if (task.metadata?.contact?.name) return task.metadata.contact.name
  if (task.metadata?.contact?.full_name) return task.metadata.contact.full_name
  
  // Try to extract from prompt text
  const text = task.promptText || ''
  
  // Pattern: "Add birthday for Mom"
  const forMatch = text.match(/for\s+(\w+)/i)
  if (forMatch) return forMatch[1]
  
  // Pattern: "Update John's phone"
  const possessiveMatch = text.match(/(\w+)('s|s')\s+(birthday|phone|email|address)/i)
  if (possessiveMatch) return possessiveMatch[1]
  
  // Pattern: "What is Mom's birthday"
  const whatIsMatch = text.match(/what\s+is\s+(\w+)('s|s')/i)
  if (whatIsMatch) return whatIsMatch[1]
  
  return 'Contact'
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================
export default function ContactInfoModal({ task, isOpen, onClose, onComplete }: ContactInfoModalProps) {
  const supabase = createClient()
  
  const infoType = useMemo(() => detectInfoType(task), [task])
  const contactName = useMemo(() => extractContactName(task), [task])
  
  // Form state
  const [form, setForm] = useState({
    date_of_birth: '',
    phone: '',
    email: '',
    nickname: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
    notes: '',
  })
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactId, setContactId] = useState<string | null>(task.contactId || task.metadata?.contact?.id || null)
  
  // Load existing contact data if we have an ID
  useEffect(() => {
    if (!isOpen) return
    
    const loadContact = async () => {
      if (contactId) {
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', contactId)
          .single()
        
        if (data) {
          setForm({
            date_of_birth: data.date_of_birth || '',
            phone: data.phone || '',
            email: data.email || '',
            nickname: data.nickname || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipcode: data.zipcode || '',
            country: data.country || '',
            notes: data.notes || '',
          })
        }
      } else {
        // Try to find contact by name
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const { data } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user.id)
          .ilike('full_name', `%${contactName}%`)
          .limit(1)
          .single()
        
        if (data) {
          setContactId(data.id)
          setForm({
            date_of_birth: data.date_of_birth || '',
            phone: data.phone || '',
            email: data.email || '',
            nickname: data.nickname || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zipcode: data.zipcode || '',
            country: data.country || '',
            notes: data.notes || '',
          })
        }
      }
    }
    
    loadContact()
  }, [isOpen, contactId, contactName])
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null)
      setSaving(false)
    }
  }, [isOpen])
  
  const handleSave = async () => {
    if (!contactId) {
      setError('Contact not found. Please try again.')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      // Build update payload based on what info type we're collecting
      const payload: Record<string, any> = {}
      const updatedFields: string[] = []
      
      if (infoType === 'birthday' && form.date_of_birth) {
        payload.date_of_birth = form.date_of_birth
        updatedFields.push('birthday')
      }
      if (infoType === 'phone' && form.phone) {
        payload.phone = form.phone
        updatedFields.push('phone')
      }
      if (infoType === 'email' && form.email) {
        payload.email = form.email
        updatedFields.push('email')
      }
      if (infoType === 'nickname' && form.nickname) {
        payload.nickname = form.nickname
        updatedFields.push('nickname')
      }
      if (infoType === 'address') {
        if (form.address) { payload.address = form.address; updatedFields.push('address') }
        if (form.city) { payload.city = form.city; updatedFields.push('city') }
        if (form.state) { payload.state = form.state; updatedFields.push('state') }
        if (form.zipcode) { payload.zipcode = form.zipcode; updatedFields.push('zipcode') }
        if (form.country) { payload.country = form.country; updatedFields.push('country') }
      }
      if (infoType === 'notes' && form.notes) {
        payload.notes = form.notes
        updatedFields.push('notes')
      }
      if (infoType === 'multiple') {
        // Save any non-empty fields
        if (form.date_of_birth) { payload.date_of_birth = form.date_of_birth; updatedFields.push('birthday') }
        if (form.phone) { payload.phone = form.phone; updatedFields.push('phone') }
        if (form.email) { payload.email = form.email; updatedFields.push('email') }
        if (form.nickname) { payload.nickname = form.nickname; updatedFields.push('nickname') }
        if (form.address) { payload.address = form.address; updatedFields.push('address') }
        if (form.city) { payload.city = form.city }
        if (form.state) { payload.state = form.state }
        if (form.zipcode) { payload.zipcode = form.zipcode }
        if (form.country) { payload.country = form.country }
        if (form.notes) { payload.notes = form.notes; updatedFields.push('notes') }
      }
      
      if (Object.keys(payload).length === 0) {
        setError('Please fill in at least one field')
        setSaving(false)
        return
      }
      
      const { error: updateError } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', contactId)
      
      if (updateError) throw updateError
      
      // Calculate XP based on fields updated
      const xp = updatedFields.length * 5
      
      onComplete({
        contactId,
        updatedFields,
        xp,
      })
    } catch (err) {
      console.error('Error saving contact info:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  if (!isOpen) return null
  
  // Get title based on info type
  const getTitle = () => {
    switch (infoType) {
      case 'birthday': return `Add Birthday for ${contactName}`
      case 'phone': return `Add Phone for ${contactName}`
      case 'email': return `Add Email for ${contactName}`
      case 'address': return `Add Address for ${contactName}`
      case 'nickname': return `Add Nickname for ${contactName}`
      case 'multiple': return `Complete ${contactName}'s Info`
      default: return `Update ${contactName}'s Info`
    }
  }
  
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,17,17,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--ed-cream, #F3ECDC)',
          border: '2px solid var(--ed-ink, #111)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: '2px solid var(--ed-ink, #111)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center font-bold"
              style={{
                width: 40, height: 40,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {contactName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p
                className="text-[10px] tracking-[0.22em] text-[var(--ed-muted,#6F6B61)]"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                QUICK FILL
              </p>
              <h3
                className="text-[var(--ed-ink,#111)] leading-tight"
                style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: 18 }}
              >
                {getTitle().toUpperCase()}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32,
              borderRadius: 999,
              border: '2px solid var(--ed-ink, #111)',
              background: 'var(--ed-paper, #FFFBF1)',
            }}
            aria-label="Close"
          >
            <X size={14} className="text-[var(--ed-ink,#111)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error message */}
          {error && (
            <div
              className="p-3 text-[12px]"
              style={{
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono, monospace)',
                letterSpacing: '0.1em',
              }}
            >
              {error.toUpperCase()}
            </div>
          )}
          
          {/* Birthday field */}
          {(infoType === 'birthday' || infoType === 'multiple') && (
            <div>
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                <Calendar size={14} className="text-[#2D5A3D]" />
                Birthday
              </label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] focus:outline-none editorial-input"
              />
            </div>
          )}
          
          {/* Phone field */}
          {(infoType === 'phone' || infoType === 'multiple') && (
            <div>
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                <Phone size={14} className="text-[#2D5A3D]" />
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
              />
            </div>
          )}
          
          {/* Email field */}
          {(infoType === 'email' || infoType === 'multiple') && (
            <div>
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                <Mail size={14} className="text-[#2D5A3D]" />
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
              />
            </div>
          )}
          
          {/* Nickname field */}
          {(infoType === 'nickname' || infoType === 'multiple') && (
            <div>
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                <User size={14} className="text-[#2D5A3D]" />
                Nickname
              </label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="What do you call them?"
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
              />
            </div>
          )}
          
          {/* Address fields */}
          {(infoType === 'address' || infoType === 'multiple') && (
            <div className="space-y-3">
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                <MapPin size={14} className="text-[#2D5A3D]" />
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address"
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
                />
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.zipcode}
                  onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                  placeholder="ZIP Code"
                  className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
                />
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Country"
                  className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] focus:outline-none editorial-input"
                />
              </div>
            </div>
          )}
          
          {/* Notes field */}
          {infoType === 'notes' && (
            <div>
              <label className="block text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1.5" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>NOTES</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={`Add notes about ${contactName}...`}
                rows={3}
                className="w-full px-3 py-2.5 text-sm text-[var(--ed-ink,#111)] placeholder-[var(--ed-muted,#6F6B61)] resize-none focus:outline-none editorial-input"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 p-5"
          style={{ borderTop: '2px solid var(--ed-ink, #111)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-[10px] tracking-[0.18em]"
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
            className="flex items-center gap-1.5 px-4 py-2 text-[10px] tracking-[0.18em] disabled:opacity-50"
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
            {saving ? 'SAVING…' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
