'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ChevronLeft, Camera, Heart } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import MemoryCard from './MemoryCard'

interface ContactWithMemories {
  id: string
  name: string
  photoUrl: string | null
  relationshipType: string | null
  memoryCount: number
}

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface PeopleBrowseProps {
  onSelectPerson?: (contactId: string) => void
}

export function PeopleBrowse({ onSelectPerson }: PeopleBrowseProps) {
  const [contacts, setContacts] = useState<ContactWithMemories[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<ContactWithMemories | null>(null)
  const [contactMemories, setContactMemories] = useState<Memory[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)

  const supabase = createClient()

  // Fetch contacts with memory counts
  useEffect(() => {
    const fetchContactsWithMemories = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, full_name, avatar_url, relationship_type')
        .eq('user_id', user.id)
        .order('full_name')

      if (!contactsData) {
        setLoading(false)
        return
      }

      // Get memory counts via face tags
      const { data: faceTags } = await supabase
        .from('memory_face_tags')
        .select(`
          contact_id,
          memory_media!inner(memory_id)
        `)
        .eq('user_id', user.id)
        .not('contact_id', 'is', null)

      // Count unique memories per contact
      const memoryCountMap: Record<string, Set<string>> = {}
      faceTags?.forEach((tag: any) => {
        const contactId = tag.contact_id
        const memoryId = tag.memory_media?.memory_id
        if (contactId && memoryId) {
          if (!memoryCountMap[contactId]) {
            memoryCountMap[contactId] = new Set()
          }
          memoryCountMap[contactId].add(memoryId)
        }
      })

      const contactsWithCounts: ContactWithMemories[] = contactsData.map((c: any) => ({
        id: c.id,
        name: c.full_name,
        photoUrl: c.avatar_url,
        relationshipType: c.relationship_type,
        memoryCount: memoryCountMap[c.id]?.size || 0
      }))

      // Sort by memory count (most memories first), then alphabetically
      contactsWithCounts.sort((a, b) => {
        if (b.memoryCount !== a.memoryCount) return b.memoryCount - a.memoryCount
        return a.name.localeCompare(b.name)
      })

      setContacts(contactsWithCounts)
      setLoading(false)
    }

    fetchContactsWithMemories()
  }, [supabase])

  // Fetch memories for selected contact
  const loadContactMemories = async (contact: ContactWithMemories) => {
    setLoadingMemories(true)
    setSelectedContact(contact)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get memory IDs for this contact via face tags
    const { data: faceTags } = await supabase
      .from('memory_face_tags')
      .select('memory_media!inner(memory_id)')
      .eq('user_id', user.id)
      .eq('contact_id', contact.id)

    const memoryIds = [...new Set(faceTags?.map((t: any) => t.memory_media?.memory_id).filter(Boolean))]

    if (memoryIds.length === 0) {
      setContactMemories([])
      setLoadingMemories(false)
      return
    }

    // Fetch the actual memories
    const { data: memories } = await supabase
      .from('memories')
      .select(`*, memory_media(id, file_url, file_type, is_cover)`)
      .in('id', memoryIds)
      .order('memory_date', { ascending: false })

    setContactMemories(memories || [])
    setLoadingMemories(false)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRelationshipColor = (type: string | null) => {
    const colors: Record<string, string> = {
      'spouse': 'from-pink-400 to-rose-500',
      'partner': 'from-pink-400 to-rose-500',
      'parent': 'from-green-400 to-emerald-500',
      'mother': 'from-green-400 to-emerald-500',
      'father': 'from-green-400 to-emerald-500',
      'child': 'from-blue-400 to-cyan-500',
      'sibling': 'from-purple-400 to-violet-500',
      'friend': 'from-yellow-400 to-amber-500',
      'colleague': 'from-slate-400 to-zinc-500',
    }
    return colors[type?.toLowerCase() || ''] || 'from-[#2D5A3D] to-[#5A8A72]'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading people...</div>
      </div>
    )
  }

  // Show filtered memories for selected contact
  if (selectedContact) {
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedContact(null)}
            className="page-header-back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            {selectedContact.photoUrl ? (
              <img 
                src={selectedContact.photoUrl} 
                alt={selectedContact.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRelationshipColor(selectedContact.relationshipType)} flex items-center justify-center text-white font-semibold text-lg shadow-md`}>
                {getInitials(selectedContact.name)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#2d2d2d]">
                Your story with {selectedContact.name}
              </h2>
              <p className="text-sm text-[#2D5A3D]">
                {contactMemories.length} memories together
              </p>
            </div>
          </div>
        </div>

        {/* Memories grid */}
        {loadingMemories ? (
          <div className="loading-container">
            <div className="loading-text">Loading memories...</div>
          </div>
        ) : contactMemories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Camera size={32} className="text-[#2D5A3D]/50" />
            </div>
            <h3 className="empty-state-title">No tagged memories</h3>
            <p className="empty-state-text">
              Tag {selectedContact.name} in your photos to see your story together
            </p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {contactMemories.map((memory, idx) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <MemoryCard memory={memory} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  // Show people grid
  return (
    <div>
      {contacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <User size={32} className="text-[#2D5A3D]/50" />
          </div>
          <h3 className="empty-state-title">No people in your memories yet</h3>
          <p className="empty-state-text">
            Add contacts and tag them in your photos to see your stories together
          </p>
          <Link href="/dashboard/contacts" className="btn-primary">
            Add People
          </Link>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4"
        >
          {contacts.map((contact, idx) => (
            <motion.button
              key={contact.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => loadContactMemories(contact)}
              className="group flex flex-col items-center text-center"
            >
              {/* Avatar with badge */}
              <div className="relative mb-2">
                {contact.photoUrl ? (
                  <img 
                    src={contact.photoUrl} 
                    alt={contact.name}
                    className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-lg 
                               group-hover:scale-105 group-hover:shadow-xl transition-all duration-300"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getRelationshipColor(contact.relationshipType)} 
                                   flex items-center justify-center text-white font-bold text-xl shadow-lg
                                   group-hover:scale-105 group-hover:shadow-xl transition-all duration-300`}>
                    {getInitials(contact.name)}
                  </div>
                )}
                
                {/* Memory count badge */}
                {contact.memoryCount > 0 && (
                  <div className="absolute -bottom-1 -right-1 min-w-[24px] h-6 px-1.5 
                                  bg-[#C4A235] rounded-full flex items-center justify-center
                                  text-xs font-bold text-[#2d2d2d] shadow-md
                                  group-hover:scale-110 transition-transform">
                    {contact.memoryCount}
                  </div>
                )}
              </div>

              {/* Name */}
              <span className="text-sm font-medium text-[#2d2d2d] line-clamp-1 max-w-full px-1
                               group-hover:text-[#2D5A3D] transition-colors">
                {contact.name.split(' ')[0]}
              </span>
              
              {/* Relationship type */}
              {contact.relationshipType && (
                <span className="text-xs text-[#2D5A3D]/60 capitalize">
                  {contact.relationshipType}
                </span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
