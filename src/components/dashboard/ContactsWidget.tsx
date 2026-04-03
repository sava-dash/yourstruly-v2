'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCache, setCache, invalidateCache, CACHE_KEYS } from '@/lib/cache'
import Modal from '@/components/ui/Modal'

interface Contact {
  id: string
  full_name: string
  relationship_type: string
  email: string
  phone: string
}

// Hardcoded relationship types for quick widget use
const RELATIONSHIP_OPTIONS = [
  { category: 'Family', options: ['Mother', 'Father', 'Spouse', 'Partner', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Cousin'] },
  { category: 'Friends', options: ['Best Friend', 'Close Friend', 'Friend', 'Childhood Friend'] },
  { category: 'Professional', options: ['Colleague', 'Boss', 'Mentor', 'Business Partner'] },
  { category: 'Other', options: ['Neighbor', 'Other'] },
]

export default function ContactsWidget() {
  const [contacts, setContacts] = useState<Contact[]>(() => getCache<Contact[]>(CACHE_KEYS.CONTACTS) || [])
  const [count, setCount] = useState(() => getCache<number>(CACHE_KEYS.CONTACTS_COUNT) || 0)
  const [showModal, setShowModal] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ full_name: '', relationship_type: '', email: '', phone: '' })
  const supabase = createClient()

  useEffect(() => {
    // Only fetch if cache is empty
    const cachedContacts = getCache<Contact[]>(CACHE_KEYS.CONTACTS)
    if (!cachedContacts) {
      loadContacts()
    }
  }, [])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, count: fetchedCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const contactsList = data || []
    const contactsCount = fetchedCount || 0
    
    // Update state
    setContacts(contactsList)
    setCount(contactsCount)
    
    // Update cache
    setCache(CACHE_KEYS.CONTACTS, contactsList)
    setCache(CACHE_KEYS.CONTACTS_COUNT, contactsCount)
  }

  const addContact = async () => {
    if (!newContact.full_name.trim() || !newContact.relationship_type) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('contacts').insert({
      user_id: user.id,
      full_name: newContact.full_name,
      relationship_type: newContact.relationship_type,
      email: newContact.email || null,
      phone: newContact.phone || null,
    })

    if (error) {
      console.error('Error saving contact:', error)
      return
    }

    setNewContact({ full_name: '', relationship_type: '', email: '', phone: '' })
    setShowAddForm(false)
    
    // Invalidate cache and reload
    invalidateCache(CACHE_KEYS.CONTACTS)
    invalidateCache(CACHE_KEYS.CONTACTS_COUNT)
    loadContacts()
  }

  const deleteContact = async (id: string) => {
    await supabase.from('contacts').delete().eq('id', id)
    
    // Invalidate cache and reload
    invalidateCache(CACHE_KEYS.CONTACTS)
    invalidateCache(CACHE_KEYS.CONTACTS_COUNT)
    loadContacts()
  }

  return (
    <>
      <div 
        className="bg-gray-900/90 rounded-2xl border border-white/10 p-4 cursor-pointer transition-colors"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/70" />
            <span className="text-white font-medium text-sm">Contacts</span>
          </div>
          <Plus size={16} className="text-white/50" />
        </div>

        {contacts.length > 0 ? (
          <div className="flex items-center gap-1 mb-3">
            {contacts.slice(0, 4).map((contact, i) => (
              <div 
                key={contact.id}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-medium border-2 border-gray-900"
                style={{ marginLeft: i > 0 ? '-8px' : 0 }}
                title={contact.full_name}
              >
                {contact.full_name.charAt(0)}
              </div>
            ))}
            {count > 4 && (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-medium border-2 border-gray-900" style={{ marginLeft: '-8px' }}>
                +{count - 4}
              </div>
            )}
          </div>
        ) : (
          <p className="text-white/40 text-sm mb-3">You have no contacts yet</p>
        )}

        <div className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900/80 rounded-lg text-white/70 text-sm">
          <span className="text-lg">🔗</span>
          Import Google contacts
          <span className="ml-auto text-white/30">›</span>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Contacts" showDone={false}>
        {/* Add Contact Form */}
        {showAddForm ? (
          <div className="mb-5 p-4 bg-gray-900/50 rounded-xl">
            <div className="space-y-3">
              <input
                type="text"
                value={newContact.full_name}
                onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                placeholder="Name *"
                className="w-full px-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <select
                value={newContact.relationship_type}
                onChange={(e) => setNewContact({ ...newContact, relationship_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select relationship *</option>
                {RELATIONSHIP_OPTIONS.map(group => (
                  <optgroup key={group.category} label={group.category}>
                    {group.options.map(opt => (
                      <option key={opt} value={opt.toLowerCase().replace(' ', '_')}>{opt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="Email"
                  className="px-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="Phone"
                  className="px-4 py-2.5 bg-gray-900/80 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-400">Cancel</button>
              <button onClick={addContact} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">Add Contact</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full mb-5 py-3 border border-dashed border-gray-600 rounded-xl text-gray-400 flex items-center justify-center gap-2 hover:border-gray-500 hover:text-gray-300 transition-colors"
          >
            <Plus size={18} />
            Add Contact
          </button>
        )}

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-medium">
                  {contact.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{contact.full_name}</p>
                  {contact.relationship_type && <p className="text-gray-400 text-xs capitalize">{contact.relationship_type.replace('_', ' ')}</p>}
                </div>
                <button 
                  onClick={() => deleteContact(contact.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">Who matters most to you? Start here.</p>
        )}

        {/* Import Button */}
        <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900/80 rounded-xl text-gray-300 hover:bg-gray-700 transition-colors">
          <span>🔗</span>
          Import Google Contacts
        </button>
      </Modal>
    </>
  )
}
