'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Users, Calendar, MessageSquare, Check, Send, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_OPTIONS } from '../constants'

interface PostscriptModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PostscriptModal({ isOpen, onClose }: PostscriptModalProps) {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; relationship_type: string | null; email?: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    recipient_contact_id: null as string | null,
    recipient_name: '',
    recipient_email: '',
    delivery_type: 'date' as 'date' | 'event' | 'after_passing',
    delivery_date: '',
    delivery_event: '',
    title: '',
    message: '',
  })

  useEffect(() => {
    if (isOpen) {
      loadContacts()
    }
  }, [isOpen])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, relationship_type, email')
      .eq('user_id', user.id)
      .order('full_name')
    
    setContacts(data || [])
    setLoading(false)
  }

  const filteredContacts = contacts.filter(c => 
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectContact = (contact: typeof contacts[0]) => {
    setForm({
      ...form,
      recipient_contact_id: contact.id,
      recipient_name: contact.full_name,
      recipient_email: contact.email || ''
    })
    setStep(2)
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const getAvatarColor = (name: string) => {
    const colors = ['#B8562E', '#2D5A3D', '#4A3552', '#8DACAB', '#C4A235']
    return colors[name.charCodeAt(0) % colors.length]
  }

  const canProceed = () => {
    switch (step) {
      case 1: return form.recipient_name.trim().length > 0
      case 2: return form.delivery_type === 'after_passing' || (form.delivery_type === 'date' ? form.delivery_date : form.delivery_event)
      case 3: return form.title.trim() && form.message.trim()
      default: return true
    }
  }

  const handleSave = async (status: 'draft' | 'scheduled') => {
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch('/api/postscripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_contact_id: form.recipient_contact_id,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          delivery_type: form.delivery_type,
          delivery_date: form.delivery_date,
          delivery_event: form.delivery_event,
          title: form.title,
          message: form.message,
          status
        })
      })
      if (!res.ok) throw new Error('Failed to save')
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setForm({
      recipient_contact_id: null,
      recipient_name: '',
      recipient_email: '',
      delivery_type: 'date',
      delivery_date: '',
      delivery_event: '',
      title: '',
      message: '',
    })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
          className="bg-[#F5F3EE] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={step > 1 ? () => setStep(step - 1) : handleClose} className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg">
                {step > 1 ? <ChevronRight size={20} className="text-[#2D5A3D] rotate-180" /> : <X size={20} className="text-[#2D5A3D]" />}
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-[#2d2d2d]">Create PostScript</h2>
                <p className="text-xs text-[#2D5A3D]/60">Step {step} of 4</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1,2,3,4].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-[#B8562E]' : 'bg-[#2D5A3D]/20'}`} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-5 flex-1 overflow-y-auto pb-4">
            {/* Step 1: Recipient */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-[#B8562E]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users size={24} className="text-[#B8562E]" />
                  </div>
                  <h3 className="font-semibold text-[#2d2d2d]">Who is this for?</h3>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D5A3D]/40" />
                  <input
                    type="text"
                    aria-label="Search" 
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#2D5A3D]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  />
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-6 text-[#2D5A3D]/50 text-sm">Loading...</div>
                  ) : filteredContacts.slice(0, 8).map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className="w-full flex items-center gap-2.5 p-2.5 bg-white rounded-xl hover:bg-[#2D5A3D]/5 transition-colors text-left"
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: getAvatarColor(contact.full_name) }}
                      >
                        {getInitials(contact.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#2d2d2d] truncate">{contact.full_name}</p>
                        {contact.relationship_type && (
                          <p className="text-xs text-[#2D5A3D]/60">{contact.relationship_type}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-[#2D5A3D]/30 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="border-t border-[#2D5A3D]/10 pt-3">
                  <p className="text-xs text-[#2D5A3D]/60 mb-2">Or enter manually:</p>
                  <input
                    type="text"
                    placeholder="Recipient name"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value, recipient_contact_id: null })}
                    className="w-full px-3 py-2.5 bg-white border border-[#2D5A3D]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Occasion */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-[#C4A235]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Calendar size={24} className="text-[#C4A235]" />
                  </div>
                  <h3 className="font-semibold text-[#2d2d2d]">When to deliver?</h3>
                </div>

                <div className="flex bg-white/50 rounded-xl p-1 gap-1">
                  {(['date', 'event', 'after_passing'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, delivery_type: type })}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        form.delivery_type === type ? 'bg-white shadow-sm text-[#2D5A3D]' : 'text-[#2D5A3D]/60'
                      }`}
                    >
                      {type === 'date' ? 'Date' : type === 'event' ? 'Event' : 'After'}
                    </button>
                  ))}
                </div>

                {form.delivery_type === 'date' && (
                  <input
                    type="date"
                    value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 bg-white border border-[#2D5A3D]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                  />
                )}

                {form.delivery_type === 'event' && (
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_OPTIONS.map(event => (
                      <button
                        key={event.key}
                        onClick={() => setForm({ ...form, delivery_event: event.key })}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          form.delivery_event === event.key 
                            ? 'border-[#B8562E] bg-[#B8562E]/5' 
                            : 'border-[#2D5A3D]/10 bg-white hover:border-[#2D5A3D]/30'
                        }`}
                      >
                        <span className="text-xl block">{event.icon}</span>
                        <span className="text-xs font-medium text-[#2D5A3D]">{event.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {form.delivery_type === 'after_passing' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    This message will be delivered after your passing.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Message */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-[#8DACAB]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MessageSquare size={24} className="text-[#8DACAB]" />
                  </div>
                  <h3 className="font-semibold text-[#2d2d2d]">Your message</h3>
                </div>

                <input
                  type="text"
                  placeholder="Title (e.g., Happy Birthday!)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-[#2D5A3D]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                />

                <textarea
                  placeholder="Write your heartfelt message..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2.5 bg-white border border-[#2D5A3D]/20 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h3 className="font-semibold text-[#2d2d2d]">Review & Schedule</h3>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-white rounded-xl divide-y divide-[#2D5A3D]/10">
                  <div className="p-3">
                    <p className="text-xs text-[#2D5A3D]/60 uppercase">To</p>
                    <p className="font-medium text-[#2d2d2d]">{form.recipient_name}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#2D5A3D]/60 uppercase">Delivery</p>
                    <p className="font-medium text-[#2d2d2d]">
                      {form.delivery_type === 'date' && form.delivery_date && new Date(form.delivery_date).toLocaleDateString()}
                      {form.delivery_type === 'event' && EVENT_OPTIONS.find(e => e.key === form.delivery_event)?.label}
                      {form.delivery_type === 'after_passing' && "After I'm gone"}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#2D5A3D]/60 uppercase">Message</p>
                    <p className="font-semibold text-[#2d2d2d]">{form.title}</p>
                    <p className="text-sm text-[#2D5A3D]/80 line-clamp-3">{form.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 pt-3 border-t border-[#2D5A3D]/10">
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="w-full py-3 bg-[#2D5A3D] text-white font-semibold rounded-xl hover:bg-[#234A31] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#2D5A3D]/10 text-[#2D5A3D] font-semibold rounded-xl hover:bg-[#2D5A3D]/20 transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave('scheduled')}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#B8562E] text-white font-semibold rounded-xl hover:bg-[#A84E2A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? '...' : <><Send size={16} /> Schedule</>}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
