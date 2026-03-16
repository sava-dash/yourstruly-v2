'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface DashboardStats {
  memories: number
  contacts: number
  photos: number
}

export interface Contact {
  id: string
  full_name: string
  avatar_url?: string
  email?: string
  phone?: string
  date_of_birth?: string
  how_met?: string
  notes?: string
}

export interface IncompleteContact extends Contact {
  missingFields: string[]
}

export interface UpcomingEvent {
  type: 'birthday' | 'anniversary'
  contactName: string
  contactId: string
  date: string
  daysUntil: number
}

export function useDashboardData(userId: string | null) {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({ memories: 0, contacts: 0, photos: 0 })
  const [userContacts, setUserContacts] = useState<Contact[]>([])
  const [incompleteContacts, setIncompleteContacts] = useState<IncompleteContact[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  const loadProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }, [userId, supabase])

  const loadStats = useCallback(async () => {
    if (!userId) return
    const [mem, con, photos] = await Promise.all([
      supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('file_type', 'image'),
    ])
    setStats({ 
      memories: mem.count || 0, 
      contacts: con.count || 0, 
      photos: photos.count || 0 
    })
  }, [userId, supabase])

  const loadContacts = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url, email, phone, date_of_birth, how_met, notes')
      .eq('user_id', userId)
      .order('full_name')
    
    if (data) {
      setUserContacts(data)
      // Find contacts with missing essential info
      const incomplete = data
        .map(c => {
          const missing: string[] = []
          if (!c.email) missing.push('email')
          if (!c.phone) missing.push('phone')
          if (!c.date_of_birth) missing.push('birthday')
          if (!c.how_met) missing.push('how_met')
          return { ...c, missingFields: missing }
        })
        .filter(c => c.missingFields.length > 0)
        .slice(0, 3)
      setIncompleteContacts(incomplete)
    }
  }, [userId, supabase])

  const loadUpcomingEvents = useCallback(async () => {
    if (!userId) return
    const today = new Date()
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, birth_date')
      .eq('user_id', userId)
      .not('birth_date', 'is', null)
    
    if (contacts) {
      const events: UpcomingEvent[] = []
      contacts.forEach(contact => {
        if (!contact.birth_date) return
        const birthDate = new Date(contact.birth_date)
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1)
        }
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntil <= 7) {
          events.push({
            type: 'birthday',
            contactName: contact.full_name,
            contactId: contact.id,
            date: contact.birth_date,
            daysUntil
          })
        }
      })
      events.sort((a, b) => a.daysUntil - b.daysUntil)
      setUpcomingEvents(events)
    }
  }, [userId, supabase])

  const refreshAll = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([
      loadProfile(),
      loadStats(),
      loadContacts(),
      loadUpcomingEvents(),
    ])
    setIsLoading(false)
  }, [loadProfile, loadStats, loadContacts, loadUpcomingEvents])

  useEffect(() => {
    if (userId) {
      refreshAll()
    } else {
      // Reset state when no user
      setProfile(null)
      setStats({ memories: 0, contacts: 0, photos: 0 })
      setUserContacts([])
      setIncompleteContacts([])
      setUpcomingEvents([])
      setIsLoading(false)
    }
  }, [userId, refreshAll])

  return {
    profile,
    stats,
    userContacts,
    incompleteContacts,
    upcomingEvents,
    isLoading,
    refreshStats: loadStats,
    refreshContacts: loadContacts,
    refreshAll,
  }
}
