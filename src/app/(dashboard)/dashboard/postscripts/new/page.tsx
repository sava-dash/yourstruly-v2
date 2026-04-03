'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, ChevronRight, User, Users, Calendar, Gift,
  MessageSquare, Send, Check, X, Search, Mail, Phone, ImagePlus, Trash2,
  Mic, Brain, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/home.css'
import { EVENT_OPTIONS } from '@/lib/postscripts/events'
import { AttachmentSelectorModal, type SelectedAttachment } from '@/components/postscripts'
import { GiftSelectionModal, type GiftSelection } from '@/components/postscripts/GiftSelectionModal'

interface Contact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  relationship_type: string | null
  avatar_url: string | null
}

interface Circle {
  id: string
  name: string
  description: string | null
  member_count: number
}

interface Attachment {
  id: string
  file: File
  preview: string
  uploading?: boolean
}

interface SelectedGift {
  id: string
  name: string
  price: number
  image_url: string
  provider: string
  giftType: 'product' | 'choice'
  flexGiftAmount?: number
}

interface FormData {
  // Recipient
  recipient_type: 'contact' | 'circle'
  recipient_contact_id: string | null
  circle_id: string | null
  recipient_name: string
  recipient_email: string
  recipient_phone: string
  // Occasion
  delivery_type: 'date' | 'event' | 'after_passing'
  delivery_date: string
  delivery_event: string
  delivery_recurring: boolean
  requires_confirmation: boolean
  // Message
  title: string
  message: string
  video_url: string
  audio_url: string
  audio_blob: Blob | null
  attachments: Attachment[]
  // Gift
  gift: SelectedGift | null
  // Memory & Wisdom Attachments
  memories: SelectedAttachment[]
  wisdom: SelectedAttachment[]
}

// EVENT_OPTIONS imported from @/lib/postscripts/events

const STEPS = [
  { id: 1, title: 'Recipient', icon: User },
  { id: 2, title: 'Occasion', icon: Calendar },
  { id: 3, title: 'Message', icon: MessageSquare },
  { id: 4, title: 'Review', icon: Check }
]

export default function NewPostScriptPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [form, setForm] = useState<FormData>({
    recipient_type: 'contact',
    recipient_contact_id: null,
    circle_id: null,
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    delivery_type: 'date',
    delivery_date: '',
    delivery_event: '',
    delivery_recurring: false,
    requires_confirmation: false,
    title: '',
    message: '',
    video_url: '',
    audio_url: '',
    audio_blob: null,
    attachments: [],
    gift: null,
    memories: [],
    wisdom: []
  })
  
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  const [showWisdomModal, setShowWisdomModal] = useState(false)
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const newAttachments: Attachment[] = []
    Array.from(files).forEach(file => {
      if (form.attachments.length + newAttachments.length >= 5) return
      const id = Math.random().toString(36).substr(2, 9)
      newAttachments.push({
        id,
        file,
        preview: URL.createObjectURL(file)
      })
    })
    
    setForm({ ...form, attachments: [...form.attachments, ...newAttachments] })
  }

  const removeAttachment = (id: string) => {
    const att = form.attachments.find(a => a.id === id)
    if (att?.preview) URL.revokeObjectURL(att.preview)
    setForm({ ...form, attachments: form.attachments.filter(a => a.id !== id) })
  }

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioPreview(audioUrl)
        setForm(f => ({ ...f, audio_blob: audioBlob }))
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      alert('Could not access microphone. Please allow microphone access.')
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  
  const removeAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview)
    setAudioPreview(null)
    setForm(f => ({ ...f, audio_blob: null, audio_url: '' }))
  }

  useEffect(() => {
    fetchContacts()
    fetchCircles()
  }, [])

  async function fetchContacts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone, relationship_type, avatar_url')
      .eq('user_id', user.id)
      .order('full_name')
    
    if (error) {
      console.error('Error fetching contacts:', error)
    }
    if (data) setContacts(data)
  }

  async function fetchCircles() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Get circles where user is a member with accepted status
    const { data, error } = await supabase
      .from('circle_members')
      .select(`
        circle:circles!inner(id, name, description),
        circle_id
      `)
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')
    
    if (error) {
      console.error('Error fetching circles:', error)
      return
    }
    
    if (data) {
      // Get member counts for each circle
      const circleIds = data.map(d => d.circle_id)
      const { data: memberCounts } = await supabase
        .from('circle_members')
        .select('circle_id')
        .in('circle_id', circleIds)
        .eq('invite_status', 'accepted')
      
      const countMap = (memberCounts || []).reduce((acc: Record<string, number>, m) => {
        acc[m.circle_id] = (acc[m.circle_id] || 0) + 1
        return acc
      }, {})
      
      const circlesWithCounts: Circle[] = data.map(d => ({
        id: (d.circle as any).id,
        name: (d.circle as any).name,
        description: (d.circle as any).description,
        member_count: countMap[d.circle_id] || 1
      }))
      
      setCircles(circlesWithCounts)
    }
  }

  function selectContact(contact: Contact) {
    setForm({
      ...form,
      recipient_type: 'contact',
      recipient_contact_id: contact.id,
      circle_id: null,
      recipient_name: contact.full_name,
      recipient_email: contact.email || '',
      recipient_phone: contact.phone || ''
    })
  }

  function selectCircle(circle: Circle) {
    setForm({
      ...form,
      recipient_type: 'circle',
      recipient_contact_id: null,
      circle_id: circle.id,
      recipient_name: circle.name,
      recipient_email: '',
      recipient_phone: ''
    })
  }

  function clearRecipient() {
    setForm({
      ...form,
      recipient_type: 'contact',
      recipient_contact_id: null,
      circle_id: null,
      recipient_name: '',
      recipient_email: '',
      recipient_phone: ''
    })
  }

  const filteredContacts = contacts.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function canProceed(): boolean {
    switch (step) {
      case 1:
        // Either have a contact/circle selected, or manual name entry
        return form.recipient_name.trim().length > 0 || form.circle_id !== null
      case 2:
        if (form.delivery_type === 'date') {
          return form.delivery_date.length > 0
        } else if (form.delivery_type === 'event') {
          return form.delivery_event.length > 0
        }
        return true
      case 3:
        return form.title.trim().length > 0 && form.message.trim().length > 0
      default:
        return true
    }
  }

  async function handleSave(status: 'draft' | 'scheduled') {
    setSaving(true)
    setError(null)

    try {
      // Upload attachments first if any
      const uploadedAttachments: Array<{ file_url: string; file_type: string; file_name: string; file_size: number }> = []
      
      for (const att of form.attachments) {
        const formData = new FormData()
        formData.append('file', att.file)
        formData.append('bucket', 'memories')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          uploadedAttachments.push({
            file_url: url,
            file_type: att.file.type,
            file_name: att.file.name,
            file_size: att.file.size
          })
        }
      }

      // Upload audio if recorded
      let audioUrl = form.audio_url
      if (form.audio_blob) {
        const audioFormData = new FormData()
        audioFormData.append('file', form.audio_blob, 'voice-message.webm')
        audioFormData.append('bucket', 'memories')
        
        const audioRes = await fetch('/api/upload', {
          method: 'POST',
          body: audioFormData
        })
        
        if (audioRes.ok) {
          const { url } = await audioRes.json()
          audioUrl = url
        }
      }

      const res = await fetch('/api/postscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_contact_id: form.recipient_contact_id,
          circle_id: form.circle_id,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          recipient_phone: form.recipient_phone,
          delivery_type: form.delivery_type,
          delivery_date: form.delivery_date,
          delivery_event: form.delivery_event,
          delivery_recurring: form.delivery_recurring,
          requires_confirmation: form.requires_confirmation,
          title: form.title,
          message: form.message,
          video_url: form.video_url,
          audio_url: audioUrl,
          attachments: uploadedAttachments,
          gift: form.gift,
          memories: form.memories.map(m => ({ id: m.id, title: m.title })),
          wisdom: form.wisdom.map(w => ({ id: w.id, title: w.title })),
          status
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      router.push('/dashboard/postscripts')
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  // Step 1: Recipient Selection
  const [recipientTab, setRecipientTab] = useState<'contacts' | 'circles'>('contacts')
  
  function renderRecipientStep() {
    const hasSelection = form.recipient_contact_id || form.circle_id
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#B8562E]/10 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-[#B8562E]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Who is this message for?</h2>
          <p className="text-gray-600 mt-1">Select a contact, circle, or enter details manually</p>
        </div>

        {/* Selected Recipient */}
        {hasSelection && (
          <div className="bg-[#B8562E]/5 border border-[#B8562E]/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium
                ${form.circle_id 
                  ? 'bg-[#8DACAB] text-white' 
                  : 'bg-[#B8562E] text-white'}`}>
                {form.circle_id ? <Users size={20} /> : form.recipient_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-900">{form.recipient_name}</p>
                <p className="text-sm text-gray-500">
                  {form.circle_id ? 'Circle' : (form.recipient_email || 'No email')}
                </p>
              </div>
            </div>
            <button onClick={clearRecipient} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        )}

        {/* Recipient Selection */}
        {!hasSelection && (
          <>
            {/* Tabs: Contacts vs Circles */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setRecipientTab('contacts')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${recipientTab === 'contacts' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <User size={16} />
                Contacts
              </button>
              <button
                onClick={() => setRecipientTab('circles')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${recipientTab === 'circles' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <Users size={16} />
                Circles
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={recipientTab === 'contacts' ? 'Search contacts...' : 'Search circles...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl 
                         focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {/* Contacts List */}
            {recipientTab === 'contacts' && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">Loading contacts...</p>
                ) : filteredContacts.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">No contacts found for "{searchQuery}"</p>
                ) : (
                  filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 
                               rounded-xl hover:border-[#B8562E] hover:bg-[#B8562E]/5 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#B8562E]/10 text-[#B8562E] flex items-center justify-center font-semibold">
                        {contact.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{contact.full_name}</p>
                        <p className="text-sm text-gray-600">{contact.relationship_type || 'Contact'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Circles List */}
            {recipientTab === 'circles' && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {circles.length === 0 ? (
                  <div className="text-center py-6">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">Create a circle first</p>
                    <p className="text-gray-400 text-xs mt-1">Circles let you send messages to groups</p>
                  </div>
                ) : (
                  circles
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(circle => (
                      <button
                        key={circle.id}
                        onClick={() => selectCircle(circle)}
                        className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 
                                 rounded-xl hover:border-[#8DACAB] hover:bg-[#8DACAB]/5 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#8DACAB]/20 text-[#8DACAB] flex items-center justify-center">
                          <Users size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{circle.name}</p>
                          <p className="text-sm text-gray-600">{circle.member_count} member{circle.member_count !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    ))
                )}
              </div>
            )}

            {/* Manual Entry (only for contacts) */}
            {recipientTab === 'contacts' && (
              <div className="border-t pt-6">
                <p className="text-sm text-gray-500 mb-4">Or enter details manually:</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.recipient_name}
                      onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                      placeholder="Enter recipient name"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl 
                               focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={form.recipient_email}
                          onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                          placeholder="email@example.com"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl 
                                   focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={form.recipient_phone}
                          onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
                          placeholder="+1234567890"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl 
                                   focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Step 2: Occasion Selection
  function renderOccasionStep() {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#C4A235]/20 flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-[#C4A235]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">When should this be delivered?</h2>
          <p className="text-gray-600 mt-1">Choose a specific date or life event</p>
        </div>

        {/* Delivery Type Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setForm({ ...form, delivery_type: 'date' })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${form.delivery_type === 'date' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Specific Date
          </button>
          <button
            onClick={() => setForm({ ...form, delivery_type: 'event' })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${form.delivery_type === 'event' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Life Event
          </button>
          <button
            onClick={() => setForm({ ...form, delivery_type: 'after_passing', requires_confirmation: true })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${form.delivery_type === 'after_passing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            After I'm Gone
          </button>
        </div>

        {/* Date Picker */}
        {form.delivery_type === 'date' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl 
                         focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={form.delivery_recurring}
                onChange={(e) => setForm({ ...form, delivery_recurring: e.target.checked })}
                className="w-5 h-5 rounded text-[#B8562E] focus:ring-[#B8562E]"
              />
              <div>
                <p className="font-medium text-gray-900">Repeat annually</p>
                <p className="text-sm text-gray-500">Send this message every year on this date</p>
              </div>
            </label>
          </div>
        )}

        {/* Event Selection */}
        {form.delivery_type === 'event' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {EVENT_OPTIONS.map(event => {
              const EventIcon = event.Icon
              return (
                <button
                  key={event.key}
                  onClick={() => setForm({ ...form, delivery_event: event.key })}
                  className={`p-4 rounded-xl border-2 text-center transition-all
                    ${form.delivery_event === event.key 
                      ? 'border-[#B8562E] bg-[#B8562E]/5' 
                      : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center
                    ${form.delivery_event === event.key 
                      ? 'bg-[#B8562E]/10 text-[#B8562E]' 
                      : 'bg-gray-100 text-gray-500'}`}>
                    <EventIcon size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{event.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* After Passing Info */}
        {form.delivery_type === 'after_passing' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> This message will be delivered after your passing. 
              You'll need to designate trusted contacts who can confirm delivery.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Step 3: Message Composition
  function renderMessageStep() {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#8DACAB]/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-[#8DACAB]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Write your message</h2>
          <p className="text-gray-600 mt-1">What do you want to say to {form.recipient_name}?</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Happy 18th Birthday!"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl 
                       focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write from the heart..."
              rows={8}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl 
                       focus:ring-2 focus:ring-[#B8562E]/20 focus:border-[#B8562E] outline-none resize-none text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Attachments Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            {/* Photos Tile */}
            <div className="h-36">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <ImagePlus size={14} className="text-[#B8562E]" />
                Attach Photos <span className="text-gray-400 font-normal">(max 5)</span>
              </label>
              
              {form.attachments.length > 0 ? (
                <div className="h-[calc(100%-28px)] rounded-xl border border-gray-200 bg-gray-50 p-2 overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto h-full items-center">
                    {form.attachments.map(att => (
                      <div key={att.id} className="relative h-full aspect-square flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        
<img src={att.preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeAttachment(att.id)}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {form.attachments.length < 5 && (
                      <label className="h-full aspect-square flex-shrink-0 rounded-lg border-2 border-dashed border-gray-300 
                                       hover:border-[#B8562E] hover:bg-[#B8562E]/5 
                                       flex flex-col items-center justify-center cursor-pointer transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <ImagePlus size={20} className="text-gray-400" />
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                <label className="h-[calc(100%-28px)] rounded-xl border-2 border-dashed border-gray-300 
                                 hover:border-[#B8562E] hover:bg-[#B8562E]/5 
                                 flex flex-col items-center justify-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <ImagePlus size={28} className="text-gray-400 mb-1" />
                  <span className="text-sm text-gray-400">Add Photos</span>
                </label>
              )}
            </div>

            {/* Gift Tile */}
            <div className="h-36">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Gift size={14} className="text-[#C4A235]" />
                Add Gift <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              
              {form.gift ? (
                <div className="relative h-[calc(100%-28px)] rounded-xl overflow-hidden bg-gradient-to-br from-[#B8562E]/10 to-[#C4A235]/10 border border-[#B8562E]/20 p-3">
                  <div className="flex items-center gap-3 h-full">
                    <img 
                      src={form.gift.image_url} 
                      alt={form.gift.name}
                      className="h-full aspect-square rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{form.gift.name}</p>
                      <p className="text-[#B8562E] font-semibold">${form.gift.price.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{form.gift.provider}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, gift: null })}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowGiftModal(true)}
                  className="w-full h-[calc(100%-28px)] rounded-xl border-2 border-dashed border-gray-300 
                           hover:border-[#B8562E] hover:bg-[#B8562E]/5 
                           flex flex-col items-center justify-center cursor-pointer transition-all"
                >
                  <Gift size={28} className="text-gray-400 mb-1" />
                  <span className="text-sm text-gray-400">Browse Gifts</span>
                </button>
              )}
            </div>

            {/* Memories Tile */}
            <div className="h-36">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#2D5A3D]" />
                Attach Memories <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              
              {form.memories.length > 0 ? (
                <div className="relative h-[calc(100%-28px)] rounded-xl overflow-hidden bg-gradient-to-br from-[#2D5A3D]/10 to-[#8DACAB]/10 border border-[#2D5A3D]/20 p-3">
                  <div className="flex flex-col h-full justify-center">
                    <p className="font-medium text-gray-900 text-sm">{form.memories.length} memor{form.memories.length === 1 ? 'y' : 'ies'} attached</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{form.memories.map(m => m.title).join(', ')}</p>
                    <button
                      onClick={() => setShowMemoryModal(true)}
                      className="mt-2 text-xs text-[#2D5A3D] hover:underline"
                    >
                      Edit selection
                    </button>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, memories: [] })}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMemoryModal(true)}
                  className="w-full h-[calc(100%-28px)] rounded-xl border-2 border-dashed border-gray-300 
                           hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 
                           flex flex-col items-center justify-center cursor-pointer transition-all"
                >
                  <Sparkles size={28} className="text-gray-400 mb-1" />
                  <span className="text-sm text-gray-400">Add Memories</span>
                </button>
              )}
            </div>

            {/* Wisdom Tile */}
            <div className="h-36">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Brain size={14} className="text-[#8DACAB]" />
                Attach Wisdom <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              
              {form.wisdom.length > 0 ? (
                <div className="relative h-[calc(100%-28px)] rounded-xl overflow-hidden bg-gradient-to-br from-[#8DACAB]/10 to-[#C4A235]/10 border border-[#8DACAB]/20 p-3">
                  <div className="flex flex-col h-full justify-center">
                    <p className="font-medium text-gray-900 text-sm">{form.wisdom.length} wisdom entr{form.wisdom.length === 1 ? 'y' : 'ies'} attached</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{form.wisdom.map(w => w.title).join(', ')}</p>
                    <button
                      onClick={() => setShowWisdomModal(true)}
                      className="mt-2 text-xs text-[#8DACAB] hover:underline"
                    >
                      Edit selection
                    </button>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, wisdom: [] })}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowWisdomModal(true)}
                  className="w-full h-[calc(100%-28px)] rounded-xl border-2 border-dashed border-gray-300 
                           hover:border-[#8DACAB] hover:bg-[#8DACAB]/5 
                           flex flex-col items-center justify-center cursor-pointer transition-all"
                >
                  <Brain size={28} className="text-gray-400 mb-1" />
                  <span className="text-sm text-gray-400">Add Wisdom</span>
                </button>
              )}
            </div>
          </div>

          {/* Audio Recording */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            
            {audioPreview ? (
              <div className="bg-[#B8562E]/5 border border-[#B8562E]/20 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <audio src={audioPreview} controls className="flex-1 h-10" />
                  <button
                    onClick={removeAudio}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all
                  ${isRecording 
                    ? 'border-red-400 bg-red-50 text-red-600' 
                    : 'border-gray-300 hover:border-[#B8562E] hover:bg-[#B8562E]/5 text-gray-500'
                  }`}
              >
                {isRecording ? (
                  <>
                    <div className="w-4 h-4 bg-red-500 rounded animate-pulse" />
                    <span className="text-sm font-medium">Recording... Click to stop</span>
                  </>
                ) : (
                  <>
                    <Mic size={24} />
                    <span className="text-sm">Record a voice message</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Review
  function renderReviewStep() {
    const eventOption = EVENT_OPTIONS.find(e => e.key === form.delivery_event)
    const eventLabel = eventOption?.label
    const EventIcon = eventOption?.Icon

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Review & Schedule</h2>
          <p className="text-gray-600 mt-1">Make sure everything looks right</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          {/* Recipient */}
          <div className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">To</p>
            <div className="flex items-center gap-2">
              {form.circle_id && <Users size={16} className="text-[#8DACAB]" />}
              <p className="font-medium text-gray-900">{form.recipient_name}</p>
            </div>
            {form.circle_id ? (
              <p className="text-sm text-[#8DACAB]">Circle • Delivers to all members</p>
            ) : form.recipient_email ? (
              <p className="text-sm text-gray-500">{form.recipient_email}</p>
            ) : null}
          </div>

          {/* Delivery */}
          <div className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Delivery</p>
            <div className="flex items-center gap-2">
              {form.delivery_type === 'event' && EventIcon && (
                <div className="w-8 h-8 rounded-full bg-[#B8562E]/10 flex items-center justify-center">
                  <EventIcon size={16} className="text-[#B8562E]" />
                </div>
              )}
              <p className="font-medium text-gray-900">
                {form.delivery_type === 'date' && form.delivery_date && 
                  new Date(form.delivery_date).toLocaleDateString('en-US', { 
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
                  })
                }
                {form.delivery_type === 'event' && eventLabel}
                {form.delivery_type === 'after_passing' && 'After I\'m gone'}
              </p>
            </div>
            {form.delivery_recurring && (
              <p className="text-sm text-[#2D5A3D] flex items-center gap-1 mt-1">
                <Calendar size={14} />
                Repeats annually
              </p>
            )}
          </div>

          {/* Message */}
          <div className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Message</p>
            <p className="font-semibold text-gray-900 mb-2">{form.title}</p>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{form.message}</p>
          </div>

          {/* Gift */}
          {form.gift && (
            <div className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Gift Included</p>
              <div className="flex items-center gap-3 bg-gradient-to-r from-[#B8562E]/5 to-[#C4A235]/5 rounded-xl p-3">
                <img 
                  src={form.gift.image_url} 
                  alt={form.gift.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div>
                  <p className="font-medium text-gray-900">{form.gift.name}</p>
                  <p className="text-[#B8562E] font-semibold">${form.gift.price.toFixed(2)}</p>
                </div>
                <Gift size={20} className="text-[#B8562E] ml-auto" />
              </div>
            </div>
          )}

          {/* Attached Memories */}
          {form.memories.length > 0 && (
            <div className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Memories Attached</p>
              <div className="flex flex-wrap gap-2">
                {form.memories.map(m => (
                  <div key={m.id} className="flex items-center gap-2 bg-[#2D5A3D]/5 border border-[#2D5A3D]/20 rounded-lg px-3 py-2">
                    <Sparkles size={14} className="text-[#2D5A3D]" />
                    <span className="text-sm text-gray-700">{m.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Wisdom */}
          {form.wisdom.length > 0 && (
            <div className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Wisdom Attached</p>
              <div className="flex flex-wrap gap-2">
                {form.wisdom.map(w => (
                  <div key={w.id} className="flex items-center gap-2 bg-[#8DACAB]/5 border border-[#8DACAB]/20 rounded-lg px-3 py-2">
                    <Brain size={14} className="text-[#8DACAB]" />
                    <span className="text-sm text-gray-700">{w.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Handle gift selection from the modal
  function handleGiftSelect(selection: GiftSelection) {
    if (selection.giftType === 'choice') {
      // Gift of Choice
      setForm({ 
        ...form, 
        gift: {
          id: 'gift-of-choice',
          name: `Gift of Choice - $${selection.flexGiftAmount}`,
          price: selection.flexGiftAmount || 50,
          image_url: 'https://assets.ongoody.com/store/gift-of-choice-card.png',
          provider: 'Goody',
          giftType: 'choice',
          flexGiftAmount: selection.flexGiftAmount,
        }
      })
    } else if (selection.product) {
      // Specific product
      setForm({ 
        ...form, 
        gift: {
          id: selection.product.id,
          name: selection.product.name,
          price: selection.product.price,
          image_url: selection.product.thumbnail,
          provider: selection.product.provider,
          giftType: 'product',
        }
      })
    }
    setShowGiftModal(false)
  }

  return (
    <div className="pb-8 relative pb-32">
      {/* Memory Attachment Modal */}
      <AttachmentSelectorModal
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        onSelect={(attachments) => setForm({ ...form, memories: attachments })}
        type="memory"
        preselectedIds={form.memories.map(m => m.id)}
        allowMultiple={true}
      />

      {/* Wisdom Attachment Modal */}
      <AttachmentSelectorModal
        isOpen={showWisdomModal}
        onClose={() => setShowWisdomModal(false)}
        onSelect={(attachments) => setForm({ ...form, wisdom: attachments })}
        type="wisdom"
        preselectedIds={form.wisdom.map(w => w.id)}
        allowMultiple={true}
      />

      {/* Gift Selection Modal */}
      <GiftSelectionModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onSelect={handleGiftSelect}
        deliveryDate={form.delivery_date}
        deliveryType={form.delivery_type}
        preselectedContactName={form.recipient_name || contacts.find(c => c.id === form.recipient_contact_id)?.full_name}
      />

      {/* Warm background */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
      </div>

      <div className="relative z-10 p-6 max-w-lg mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <Link 
            href="/dashboard/postscripts" 
            className="p-2 bg-white/80 rounded-xl hover:bg-white transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Create PostScript</h1>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
          </div>
        </header>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map(s => (
            <div 
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-colors
                ${s.id <= step ? 'bg-[#B8562E]' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
          {step === 1 && renderRecipientStep()}
          {step === 2 && renderOccasionStep()}
          {step === 3 && renderMessageStep()}
          {step === 4 && renderReviewStep()}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#FAFAF7]/98 backdrop-blur-sm border-t border-[#B8562E]/10 p-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium 
                         hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            )}
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 py-3 px-6 bg-[#B8562E] text-white rounded-xl font-medium 
                         hover:bg-[#A84E2A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium 
                           hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave('scheduled')}
                  disabled={saving}
                  className="flex-1 py-3 px-6 bg-[#B8562E] text-white rounded-xl font-medium 
                           hover:bg-[#A84E2A] transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Send size={18} />
                      Schedule
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
