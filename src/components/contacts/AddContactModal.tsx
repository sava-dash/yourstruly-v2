'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

interface AddContactModalProps {
  onClose: () => void
  onSave?: () => void
}

export function AddContactModal({ onClose, onSave }: AddContactModalProps) {
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    email: '',
    phone: '',
    relationship_type: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipcode: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!form.full_name || !form.relationship_type) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      full_name: form.full_name,
      relationship_type: form.relationship_type,
      nickname: form.nickname || null,
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      zipcode: form.zipcode || null,
      notes: form.notes || null,
    }

    await supabase.from('contacts').insert(payload)
    setSaving(false)
    onSave?.()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#F5F3EE] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2d2d2d]">Add Contact</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg">
            <X size={20} className="text-[#2D5A3D]" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Full Name *</label>
            <input 
              value={form.full_name} 
              onChange={e => setForm({ ...form, full_name: e.target.value })} 
              className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" 
              placeholder="John Doe" 
            />
          </div>
          
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Relationship *</label>
            <select 
              value={form.relationship_type} 
              onChange={e => setForm({ ...form, relationship_type: e.target.value })} 
              className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
            >
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
              <input 
                value={form.nickname} 
                onChange={e => setForm({ ...form, nickname: e.target.value })} 
                className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" 
              />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Birthday</label>
              <input 
                type="date" 
                value={form.date_of_birth} 
                onChange={e => setForm({ ...form, date_of_birth: e.target.value })} 
                className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Email</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })} 
                className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" 
                placeholder="email@example.com" 
              />
            </div>
            <div>
              <label className="block text-sm text-[#666] mb-1.5">Phone</label>
              <input 
                type="tel" 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })} 
                className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" 
                placeholder="(555) 123-4567" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Address (for gift delivery)</label>
            <input 
              value={form.address} 
              onChange={e => setForm({ ...form, address: e.target.value })} 
              className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 mb-3" 
              placeholder="123 Main Street, Apt 4" 
            />
            <div className="grid grid-cols-4 gap-3">
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" placeholder="City" />
              <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" placeholder="State" />
              <input value={form.zipcode} onChange={e => setForm({ ...form, zipcode: e.target.value })} className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" placeholder="Zip" />
              <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30" placeholder="Country" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Notes</label>
            <textarea 
              value={form.notes} 
              onChange={e => setForm({ ...form, notes: e.target.value })} 
              className="w-full p-3 bg-white border border-[#2D5A3D]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 resize-none" 
              rows={2} 
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D5A3D]/10">
          <button onClick={onClose} className="px-4 py-2.5 border border-[#2D5A3D]/20 rounded-xl text-[#2D5A3D] font-medium hover:bg-[#2D5A3D]/5">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || !form.full_name || !form.relationship_type} 
            className="px-4 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#234A31] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
