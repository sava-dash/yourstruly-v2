'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { RefreshCw, Sparkles, X, Send, Gift, Image, FileText, UserPlus, Search, Users, ChevronRight, Calendar, MessageSquare, Check, Mail, Phone, Mic, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ConversationView } from '@/components/conversation'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { VoiceVideoChat } from '@/components/voice'
import '@/styles/home.css'
import '@/styles/engagement.css'
import '@/styles/conversation.css'
// import CommandBar from '@/components/dashboard/CommandBar' // RAG CLI - saved for future use
import { AddContactModal } from '@/components/contacts/AddContactModal'
import PhotoUploadModal from '@/components/dashboard/PhotoUploadModal'
import ActivityFeed, { XPCompletion } from '@/components/dashboard/ActivityFeed'
import OnThisDay from '@/components/dashboard/OnThisDay'
import { StorageUsageBar } from '@/components/subscription/StorageUsageBar'
import { useSubscription } from '@/hooks/useSubscription'
import { getPromptIcon, type PromptType } from '@/lib/prompt-icons'
import { getPromptTypeColors } from '@/lib/design-tokens'
// import { PersonalityDashboard } from '@/components/personality/PersonalityDashboard' // TODO: Re-enable when analyzing real data

// Type configs with semantic design tokens (no emojis, using SVG icons from prompt-icons.tsx)
const TYPE_CONFIG: Record<string, { type: PromptType; label: string; xp: number; color: 'yellow' | 'green' | 'red' | 'blue' | 'purple' }> = {
  photo_backstory: { type: 'photo_backstory', label: 'Photo Story', xp: 15, color: 'yellow' },
  tag_person: { type: 'tag_person', label: 'Tag Person', xp: 5, color: 'blue' },
  missing_info: { type: 'missing_info', label: 'Contact', xp: 5, color: 'green' },
  quick_question: { type: 'quick_question', label: 'Contact', xp: 5, color: 'green' },
  contact_info: { type: 'contact_info', label: 'Complete Info', xp: 10, color: 'green' },
  memory_prompt: { type: 'memory_prompt', label: 'Memory', xp: 20, color: 'purple' },
  knowledge: { type: 'knowledge', label: 'Wisdom', xp: 15, color: 'red' },
  connect_dots: { type: 'connect_dots', label: 'Connect', xp: 10, color: 'blue' },
  highlight: { type: 'highlight', label: 'Highlight', xp: 5, color: 'yellow' },
  postscript: { type: 'postscript', label: 'Future', xp: 20, color: 'purple' },
  favorites_firsts: { type: 'favorites_firsts', label: 'Favorites', xp: 10, color: 'red' },
  recipes_wisdom: { type: 'recipes_wisdom', label: 'Recipes', xp: 15, color: 'yellow' },
}

// Prompt types that should use ConversationView (multi-turn voice/text)
const CONVERSATION_TYPES = [
  'photo_backstory',
  'memory_prompt', 
  'knowledge',
  'favorites_firsts',
  'recipes_wisdom',
  'postscript',
  'connect_dots',
  'highlight',
]

// Prompt types that should use simple inline input
const INLINE_INPUT_TYPES = [
  'quick_question',
  'missing_info',
  'tag_person',
  'contact_info',
]

// Fixed tile positions: 2x2 grid on left + 1 tall tile on right for photos
// Layout:  [0] [1] [4-tall]
//          [2] [3]
const TILE_POSITIONS = [
  { col: 0, row: 0 },  // top-left
  { col: 1, row: 0 },  // top-right of 2x2
  { col: 0, row: 1 },  // bottom-left
  { col: 1, row: 1 },  // bottom-right of 2x2
  { col: 2, row: 0, tall: true },  // right side, spans full height
]

// Life chapter categories with semantic color tokens
const LIFE_CHAPTERS = [
  { id: 'childhood', label: 'Childhood', color: '#60A5FA' },      // blue-400
  { id: 'teenage', label: 'Teenage', color: '#F5A524' },          // warning
  { id: 'high_school', label: 'High School', color: '#7828C8' },  // primary-500
  { id: 'college', label: 'College', color: '#F31260' },          // error
  { id: 'jobs_career', label: 'Career', color: '#006FEE' },       // info
  { id: 'relationships', label: 'Relationships', color: '#C084FC' }, // purple-400
  { id: 'travel', label: 'Travel', color: '#17C964' },            // success
  { id: 'spirituality', label: 'Spirituality', color: '#9353D3' }, // primary-400
  { id: 'wisdom_legacy', label: 'Wisdom', color: '#6020A0' },     // primary-600
  { id: 'life_moments', label: 'Life Moments', color: '#FCD34D' }, // yellow-400
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ memories: 0, contacts: 0, photos: 0 })
  const [userContacts, setUserContacts] = useState<Array<{id: string; full_name: string; avatar_url?: string}>>([])
  
  // Unified engagement modal state
  const [engagementPrompt, setEngagementPrompt] = useState<any | null>(null)
  
  // Inline input state - for quick contact updates
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [textValue, setTextValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Milestone celebration state
  const [milestone, setMilestone] = useState<{
    type: 'memories' | 'streak' | 'xp' | 'contacts' | null;
    value: number;
    message: string;
  } | null>(null)
  
  // Life chapter filter
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  
  // Upcoming events (birthdays, etc.)
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    type: 'birthday' | 'anniversary';
    contactName: string;
    contactId: string;
    date: string;
    daysUntil: number;
  }>>([])
  
  // XP and progress state
  const [totalXp, setTotalXp] = useState(0)
  const [xpAnimating, setXpAnimating] = useState(false)
  const [lastXpGain, setLastXpGain] = useState(0)
  const [tilesKey, setTilesKey] = useState(0)
  
  // Quick action modals
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showPostscriptModal, setShowPostscriptModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showQuickMemoryModal, setShowQuickMemoryModal] = useState(false)
  const [completedTiles, setCompletedTiles] = useState<Array<{
    id: string;
    type: string;
    title: string;
    xp?: number;
    photoUrl?: string;
    contactName?: string;
    contactId?: string;
    memoryId?: string;
    photoId?: string;
    knowledgeId?: string;
    resultMemoryId?: string;
    answeredAt: string;
  }>>([])
  
  const supabase = createClient()
  const { subscription } = useSubscription()
  const { prompts: rawPrompts, isLoading, shuffle, answerPrompt, skipPrompt, stats: engagementStats } = useEngagementPrompts(6, selectedChapter)
  
  // Debug: Log prompt counts
  useEffect(() => {
    if (rawPrompts.length > 0) {
      console.log('[Engagement] Raw prompts from DB:', rawPrompts.length)
    }
  }, [rawPrompts])
  
  // Track locally answered prompts (to remove from display without full refetch)
  const [answeredPromptIds, setAnsweredPromptIds] = useState<string[]>([])

  // Filter to ensure no duplicate prompts and exclude answered ones
  const contactTypes = ['quick_question', 'missing_info', 'tag_person']
  const seenTexts = new Set<string>()
  let contactCount = 0
  
  const uniquePrompts = rawPrompts.filter(prompt => {
    // Skip if already answered locally
    if (answeredPromptIds.includes(prompt.id)) return false
    // No need to filter by life_chapter - hook already does it!
    if (seenTexts.has(prompt.promptText)) return false
    seenTexts.add(prompt.promptText)
    if (contactTypes.includes(prompt.type)) {
      if (contactCount >= 2) return false
      contactCount++
    }
    return true
  })

  // Note: incompleteContactPrompts is computed below after incompleteContacts state is declared

  const prompts = uniquePrompts
  
  // Debug: Log filtered prompt count
  useEffect(() => {
    if (uniquePrompts.length > 0 || prompts.length > 0) {
      console.log('[Engagement] After filtering:', uniquePrompts.length, '→ showing:', prompts.length)
    }
  }, [uniquePrompts.length, prompts.length])

  // Track current user ID for scoped localStorage
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Get user ID first and clean up old non-scoped localStorage
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Clean up old non-scoped keys (from before user-scoping was added)
        localStorage.removeItem('yt_completed_tiles')
        localStorage.removeItem('yt_total_xp')
        setCurrentUserId(user.id)
      } else {
        // No user - reset state to prevent data leakage
        setCurrentUserId(null)
        setCompletedTiles([])
        setTotalXp(0)
      }
    }
    getUserId()
  }, [])

  // Load saved state from user-scoped localStorage
  useEffect(() => {
    if (!currentUserId) return
    
    const saved = localStorage.getItem(`yt_completed_tiles_${currentUserId}`)
    const savedXp = localStorage.getItem(`yt_total_xp_${currentUserId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const seen = new Set<string>()
          const deduped = parsed.filter((tile: any) => {
            if (seen.has(tile.id)) return false
            seen.add(tile.id)
            return true
          })
          setCompletedTiles(deduped)
        }
      } catch (e) {
        console.error('Failed to parse completed tiles:', e)
      }
    } else {
      // Reset for new user
      setCompletedTiles([])
    }
    if (savedXp) {
      setTotalXp(parseInt(savedXp, 10) || 0)
    } else {
      // Reset for new user
      setTotalXp(0)
    }
  }, [currentUserId])
  
  // Save completed tiles to user-scoped localStorage
  useEffect(() => {
    if (!currentUserId) return
    if (completedTiles.length > 0) {
      localStorage.setItem(`yt_completed_tiles_${currentUserId}`, JSON.stringify(completedTiles))
    }
  }, [completedTiles, currentUserId])

  useEffect(() => {
    // Only load data when we have a confirmed user ID
    if (currentUserId) {
      loadProfile()
      loadStats()
      loadContacts()
      loadUpcomingEvents()
    }
  }, [currentUserId])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [mem, con, photos] = await Promise.all([
      supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('file_type', 'image'),
    ])
    setStats({ memories: mem.count || 0, contacts: con.count || 0, photos: photos.count || 0 })
  }

  const [incompleteContacts, setIncompleteContacts] = useState<Array<{
    id: string
    full_name: string
    avatar_url?: string
    missingFields: string[]
  }>>([])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url, email, phone, date_of_birth, how_met, notes')
      .eq('user_id', user.id)
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
        .slice(0, 3) // Max 3 incomplete contact prompts
      setIncompleteContacts(incomplete)
    }
  }

  const loadUpcomingEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const today = new Date()
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, birth_date')
      .eq('user_id', user.id)
      .not('birth_date', 'is', null)
    
    if (contacts) {
      const events: typeof upcomingEvents = []
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
  }

  // Handle tile click - open modal immediately
  const handleTileClick = useCallback((prompt: any, event: React.MouseEvent) => {
    if (CONVERSATION_TYPES.includes(prompt.type)) {
      // Open unified engagement modal (text/voice/video)
      setEngagementPrompt(prompt)
    } else if (INLINE_INPUT_TYPES.includes(prompt.type)) {
      // Use simple inline expansion
      setExpandedId(prompt.id)
    }
  }, [])

  // Handle engagement completion (unified modal)
  const handleEngagementComplete = useCallback(async (result: {
    memoryId?: string;
    responseText?: string;
    xpAwarded: number;
  }) => {
    if (!engagementPrompt) return
    
    const config = TYPE_CONFIG[engagementPrompt.type] || TYPE_CONFIG.memory_prompt
    const xpGained = result.xpAwarded || config.xp
    
    // Add to completed tiles
    setCompletedTiles(prev => {
      if (prev.some(t => t.id === engagementPrompt.id)) return prev
      return [{
        id: engagementPrompt.id,
        type: engagementPrompt.type,
        title: engagementPrompt.promptText?.substring(0, 40) || config.label,
        xp: xpGained,
        photoUrl: engagementPrompt.photoUrl,
        contactName: engagementPrompt.contactName,
        contactId: engagementPrompt.contactId,
        memoryId: result.memoryId,
        resultMemoryId: result.memoryId,
        answeredAt: new Date().toISOString(),
      }, ...prev]
    })

    // XP animation
    if (xpGained > 0) {
      setLastXpGain(xpGained)
      setXpAnimating(true)
      setTotalXp(prev => {
        const newXp = prev + xpGained
        if (currentUserId) {
          localStorage.setItem(`yt_total_xp_${currentUserId}`, String(newXp))
        }
        return newXp
      })
      setTimeout(() => setXpAnimating(false), 1500)
    }

    // Close engagement modal
    setEngagementPrompt(null)
    
    // Mark prompt as answered locally (removes from tile grid)
    setAnsweredPromptIds(prev => [...prev, engagementPrompt.id])
    
    // Refresh stats
    loadStats()
    
    // Shuffle to get new prompts
    shuffle()
  }, [engagementPrompt, shuffle])

  // Handle inline answer (for contact prompts)
  const handleInlineAnswer = useCallback(async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (!prompt || !textValue.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await answerPrompt(promptId, { 
        type: 'text', 
        text: textValue 
      }) as { memoryId?: string; contactId?: string } | undefined

      const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
      
      // Add to completed tiles
      setCompletedTiles(prev => {
        if (prev.some(t => t.id === promptId)) return prev
        return [{
          id: promptId,
          type: prompt.type,
          title: prompt.contactName || config.label,
          xp: config.xp,
          contactName: prompt.contactName,
          contactId: prompt.contactId || result?.contactId,
          answeredAt: new Date().toISOString(),
        }, ...prev]
      })

      // XP animation
      if (config.xp > 0) {
        setLastXpGain(config.xp)
        setXpAnimating(true)
        setTotalXp(prev => {
          const newXp = prev + config.xp
          if (currentUserId) {
            localStorage.setItem(`yt_total_xp_${currentUserId}`, String(newXp))
          }
          return newXp
        })
        setTimeout(() => setXpAnimating(false), 1500)
      }

      setTextValue('')
      setExpandedId(null)
    } catch (err) {
      console.error('Error answering prompt:', err)
    }
    setIsSubmitting(false)
  }, [prompts, textValue, answerPrompt])

  // Handle shuffle - keeps current chapter selected
  const handleShuffle = () => {
    setTilesKey(prev => prev + 1)
    shuffle()
  }

  const isContactPrompt = (type: string) => type === 'quick_question' || type === 'missing_info'

  const getContactName = (prompt: any, index: number = 0) => {
    const fromPrompt = prompt.contactName 
      || prompt.contact_name
      || prompt.metadata?.contact?.name 
      || prompt.metadata?.contact?.full_name
    if (fromPrompt) return fromPrompt
    if (isContactPrompt(prompt.type) && userContacts.length > 0) {
      const contactIdx = prompt.id ? prompt.id.charCodeAt(0) % userContacts.length : index % userContacts.length
      return userContacts[contactIdx]?.full_name || null
    }
    return null
  }

  const getPromptText = (prompt: any) => {
    // Always prefer the actual prompt text from the database if it exists
    // This contains the personalized, interesting questions from prompt_templates
    if (prompt.promptText && prompt.promptText.trim()) {
      let text = prompt.promptText
      // Replace template variables
      const contactName = prompt.contactName || prompt.contact_name || prompt.metadata?.contact?.name || 'this person'
      text = text.replace(/\{\{contact_name\}\}/gi, contactName)
      text = text.replace(/\{\{occupation\}\}/gi, prompt.personalizationContext?.occupation || 'your work')
      return text
    }
    
    if (isContactPrompt(prompt.type)) {
      const contactName = prompt.contactName || prompt.metadata?.contact?.name || 'this contact'
      if (prompt.missingField) {
        const labels: Record<string, string> = { 
          phone: 'phone number', 
          email: 'email address', 
          date_of_birth: 'birthday',
          birth_date: 'birthday',
          how_met: 'story of how you met',
          relationship: 'relationship to you',
          nickname: 'nickname',
          notes: 'a story about them',
          address: 'address',
          company: 'workplace',
          job_title: 'job title',
        }
        // Use better phrasing for narrative fields
        if (prompt.missingField === 'how_met') {
          return `How did you and ${contactName} first meet?`
        }
        if (prompt.missingField === 'relationship') {
          return `How would you describe your relationship with ${contactName}?`
        }
        if (prompt.missingField === 'notes' || prompt.missingField === 'contact_story') {
          // Fallback to interesting questions if no prompt text
          const fallbackQuestions = [
            `What's your favorite memory with ${contactName}?`,
            `What makes ${contactName} special to you?`,
            `What's something ${contactName} taught you?`,
            `What would ${contactName} want to be remembered for?`,
          ]
          return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)]
        }
        return `What is ${contactName}'s ${labels[prompt.missingField] || prompt.missingField.replace(/_/g, ' ')}?`
      }
      // No missing field - this is a "quick_question" about a contact
      // Should have promptText, but fallback to something better than generic
      const genericFallbacks = [
        `What's a great memory you have with ${contactName}?`,
        `What do you admire about ${contactName}?`,
        `What's something unique about ${contactName}?`,
      ]
      return genericFallbacks[Math.floor(Math.random() * genericFallbacks.length)]
    }
    return prompt.promptText || 'Share something meaningful...'
  }

  return (
    <div className="overflow-x-hidden">
      {/* Background */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
        <div className="home-blob home-blob-4" />
      </div>

      {/* Unified Engagement Modal */}
      <AnimatePresence>
        {engagementPrompt && (
          <UnifiedEngagementModal
            prompt={engagementPrompt}
            expectedXp={TYPE_CONFIG[engagementPrompt.type]?.xp || 15}
            onComplete={handleEngagementComplete}
            onClose={() => setEngagementPrompt(null)}
          />
        )}
      </AnimatePresence>

      {/* Milestone Celebration Modal */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="milestone-overlay"
            onClick={() => setMilestone(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="milestone-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="milestone-icon">
                {milestone.type === 'memories' && '📚'}
                {milestone.type === 'xp' && '⭐'}
                {milestone.type === 'contacts' && '👥'}
              </div>
              <h2 className="milestone-title">Milestone Reached!</h2>
              <p className="milestone-message">{milestone.message}</p>
              <button onClick={() => setMilestone(null)} className="milestone-button">
                Keep Going!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================
          MAIN LAYOUT: Flexbox Row (Sidebar + Content)
          ============================================ */}
      <div className="home-layout">
        
        {/* LEFT SIDEBAR - Profile, OnThisDay, ActivityFeed */}
        <aside className="home-sidebar hidden lg:flex">
          {/* Compact Profile Card */}
          <div className="glass-card glass-card-strong p-4">
            {/* Greeting + Streak inline */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-[#406A56]">
                Hey {profile?.full_name?.split(' ')[0] || 'there'}
              </h2>
              {(engagementStats?.currentStreakDays ?? 0) > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#D9C61A]/20 to-[#C35F33]/20 rounded-full">
                  <span className="text-sm">🔥</span>
                  <span className="text-sm font-bold text-[#C35F33]">{engagementStats?.currentStreakDays}</span>
                </div>
              )}
            </div>
            
            {/* Stats Row - Compact */}
            <div className="flex items-center justify-between text-center mb-3">
              <Link href="/dashboard/memories" className="flex-1 hover:opacity-70 transition-opacity">
                <div className="text-2xl font-bold text-[#406A56]">{stats.memories}</div>
                <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">Memories</div>
              </Link>
              <Link href="/dashboard/contacts" className="flex-1 hover:opacity-70 transition-opacity border-x border-[#406A56]/10">
                <div className="text-2xl font-bold text-[#406A56]">{stats.contacts}</div>
                <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">People</div>
              </Link>
              <Link href="/dashboard/gallery" className="flex-1 hover:opacity-70 transition-opacity border-r border-[#406A56]/10">
                <div className="text-2xl font-bold text-[#406A56]">{stats.photos}</div>
                <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">Photos</div>
              </Link>
              <div className="flex-1">
                <div className={`text-2xl font-bold text-[#D9C61A] ${xpAnimating ? 'animate-pulse' : ''}`}>
                  {totalXp.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#D9C61A]/60 uppercase tracking-wide flex items-center justify-center gap-1">
                  <span>⚡</span> XP
                </div>
              </div>
            </div>

            {/* Storage Usage - Compact */}
            <div className="pt-3 border-t border-[#406A56]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#406A56]/70 uppercase tracking-wide">Storage</span>
                <span className="text-xs text-gray-500">
                  {subscription?.storage 
                    ? `${(subscription.storage.total_bytes / (1024*1024*1024)).toFixed(1)} / ${(subscription.storage.limit_bytes / (1024*1024*1024)).toFixed(0)} GB`
                    : '0 / 10 GB'
                  }
                </span>
              </div>
              <div className="h-2 bg-[#F2F1E5] rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(subscription?.storage?.percentage || 0, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ 
                    background: (subscription?.storage?.percentage || 0) >= 90 
                      ? 'linear-gradient(90deg, #C35F33, #dc2626)' 
                      : 'linear-gradient(90deg, #406A56, #8DACAB)'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* On This Day */}
          <div className="sidebar-section">
            <OnThisDay />
          </div>
          
          {/* Activity Feed - fills remaining space */}
          <div className="sidebar-section-grow">
            <ActivityFeed 
              xpCompletions={completedTiles.slice(0, 10).map(tile => ({
                id: tile.id,
                type: tile.type,
                title: tile.title,
                xp: tile.xp || 0,
                photoUrl: tile.photoUrl,
                contactName: tile.contactName,
                timestamp: tile.answeredAt,
              }))}
            />
          </div>
        </aside>

        {/* MAIN CONTENT - Engagement tiles, Quick Actions, Command Bar */}
        <main className="home-main">
          <div className="engagement-column">
          <div className="home-bubbles">
            {/* Life Chapter Category Pills - Always Visible */}
            <div className="w-full flex flex-wrap items-center justify-center gap-2 mb-6 px-4">
              <button
                onClick={() => setSelectedChapter(null)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${selectedChapter === null
                    ? 'bg-gradient-to-r from-[#7828C8] to-[#9353D3] text-white shadow-lg scale-105'
                    : 'bg-white/80 backdrop-blur-sm text-[#7828C8] border border-[#7828C8]/20 hover:bg-white hover:border-[#7828C8]/40'
                  }
                `}
              >
                All Chapters
              </button>
              {LIFE_CHAPTERS.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => setSelectedChapter(chapter.id)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${selectedChapter === chapter.id
                      ? 'text-white shadow-lg scale-105'
                      : 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-300 hover:bg-white hover:border-gray-400'
                    }
                  `}
                  style={selectedChapter === chapter.id ? {
                    background: `linear-gradient(135deg, ${chapter.color}, ${chapter.color}dd)`
                  } : {}}
                >
                  {chapter.label}
                </button>
              ))}
            </div>

            {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={28} className="text-[#F5A524]" />
              </motion.div>
              <span className="text-gray-500">Loading prompts...</span>
            </div>
          ) : prompts.length === 0 ? (
            <div className="home-empty">
              <div className="home-empty-icon">
                <Sparkles size={32} className="text-[#F5A524]" />
              </div>
              <h3>{selectedChapter ? 'No prompts for this chapter yet' : 'All caught up!'}</h3>
              <p>
                {selectedChapter 
                  ? 'Generate new prompts to get questions about this life chapter.' 
                  : "You've answered all your prompts. Generate more to keep capturing memories."}
              </p>
              <button onClick={handleShuffle} className="home-refresh-btn">
                <RefreshCw size={16} />
                Generate More
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Floating XP Counter (shows when XP earned) */}
              <AnimatePresence>
                {xpAnimating && lastXpGain > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.8 }}
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#D9C61A] to-[#C35F33] text-white font-bold shadow-2xl"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Sparkles size={18} />
                    </motion.div>
                    <span className="text-lg">+{lastXpGain} XP</span>
                    <span className="text-sm opacity-80">🎉</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Backdrop for expanded tile */}
              {expandedId && (
                <div 
                  className="tile-expanded-backdrop"
                  onClick={() => { setExpandedId(null); setTextValue(''); }}
                />
              )}

              {/* Tile grid: CSS Grid - 3 columns, photo tile spans 2 rows */}
              <div className="tiles-grid">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedChapter || 'all'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'contents' }}
                  >
                    {(() => {
                      // Reorder prompts: photo tasks go to position 4 (tall tile)
                      const sortedPrompts = [...prompts.slice(0, 5)]
                      const photoIndex = sortedPrompts.findIndex(p => 
                        p.photoUrl && (p.type === 'photo_backstory' || p.type === 'tag_person')
                      )
                      if (photoIndex !== -1 && photoIndex !== 4) {
                        // Move photo task to position 4
                        const [photoPrompt] = sortedPrompts.splice(photoIndex, 1)
                        if (sortedPrompts.length >= 4) {
                          sortedPrompts.splice(4, 0, photoPrompt)
                        } else {
                          sortedPrompts.push(photoPrompt)
                        }
                      }
                      return sortedPrompts
                    })().map((prompt, i) => {
                    const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
                    const isExpanded = expandedId === prompt.id
                    const hasPhoto = prompt.photoUrl && (prompt.type === 'photo_backstory' || prompt.type === 'tag_person')
                    const contactName = getContactName(prompt, i)
                    const isContact = isContactPrompt(prompt.type)
                    const isTall = i === 4 && hasPhoto
                    const staggerDelay = i * 0.08

                    return (
                      <motion.div
                        key={prompt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          zIndex: isExpanded ? 50 : 1,
                        }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.05,  // Stagger enter only
                          ease: [0.4, 0, 0.2, 1]  // Smoother easing
                        }}
                        onClick={(e) => !isExpanded && handleTileClick(prompt, e)}
                        className={`bubble-tile ${isTall ? 'tile-tall' : ''} ${isExpanded ? 'tile-expanded' : ''}`}
                        data-type={prompt.type}
                        style={{ cursor: isExpanded ? 'default' : 'pointer' }}
                      >
                        {/* Colored accent bar */}
                        <div className={`bubble-accent bubble-accent-${config.color}`} />

                        {/* XP badge */}
                        {!isExpanded && config.xp > 0 && (
                          <div className={`bubble-xp bubble-xp-${config.color}`}>
                            <Sparkles size={10} />
                            +{config.xp}
                          </div>
                        )}

                        {/* Close button for inline expanded */}
                        {isExpanded && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedId(null); setTextValue(''); }}
                            className="absolute top-3 right-3 p-1.5 bg-black/5 hover:bg-black/10 rounded-full z-10"
                          >
                            <X size={14} className="text-gray-500" />
                          </button>
                        )}

                        <div className="bubble-content">
                          {/* Header - category pill with torn edge */}
                          <div className="mb-3">
                            <span className={`bubble-type bubble-type-${config.color}`}>{config.label}</span>
                          </div>

                          {/* Contact card */}
                          {isContact && (
                            <div className="bubble-contact">
                              <div className="bubble-contact-avatar">
                                {(contactName || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="bubble-contact-name">{contactName || 'Unknown Contact'}</div>
                                <div className="bubble-contact-sub">
                                  {prompt.missingField 
                                    ? `Add ${prompt.missingField === 'how_met' ? 'how met' : prompt.missingField.replace(/_/g, ' ')}` 
                                    : 'Update info'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Photo */}
                          {hasPhoto && (
                            <img 
                              src={prompt.photoUrl} 
                              alt={`Photo for ${getPromptText(prompt).substring(0, 50)}`}
                              className={`bubble-photo ${isTall ? 'bubble-photo-tall' : ''}`}
                            />
                          )}

                          {/* Question text */}
                          <p className="bubble-text">{getPromptText(prompt)}</p>

                          {/* Inline input for contact prompts */}
                          {isExpanded && isContact && (
                            <div className="mt-4 space-y-3">
                              {prompt.missingField === 'birth_date' || prompt.missingField === 'date_of_birth' ? (
                                <input
                                  type="date"
                                  value={textValue}
                                  onChange={(e) => setTextValue(e.target.value)}
                                  className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 focus:outline-none focus:border-[#406A56]/30"
                                />
                              ) : prompt.missingField === 'phone' ? (
                                <input
                                  type="tel"
                                  value={textValue}
                                  onChange={(e) => setTextValue(e.target.value)}
                                  placeholder="(555) 123-4567"
                                  className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#406A56]/30"
                                />
                              ) : prompt.missingField === 'email' ? (
                                <input
                                  type="email"
                                  value={textValue}
                                  onChange={(e) => setTextValue(e.target.value)}
                                  placeholder="email@example.com"
                                  className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#406A56]/30"
                                />
                              ) : (
                                <textarea
                                  value={textValue}
                                  onChange={(e) => setTextValue(e.target.value)}
                                  placeholder={`Enter ${prompt.missingField?.replace(/_/g, ' ') || 'info'}...`}
                                  rows={2}
                                  autoFocus
                                  className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-[#406A56]/30"
                                />
                              )}
                              
                              <div className="flex justify-between">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(null); setTextValue(''); }} 
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleInlineAnswer(prompt.id); }}
                                  disabled={!textValue.trim() || isSubmitting}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#406A56] hover:bg-[#4a7a64] text-white text-sm font-medium rounded-lg disabled:opacity-50"
                                >
                                  <Send size={14} />
                                  {isSubmitting ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </motion.div>
                    )
                  })}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          )}
          </div>
          
          {/* Quick Actions */}
          <div className="quick-actions">
            <button onClick={() => shuffle()} className="quick-action-btn">
              <div className="quick-action-icon"><RefreshCw size={18} /></div>
              <span>Shuffle</span>
            </button>
            <button onClick={() => setShowPhotoUpload(true)} className="quick-action-btn">
              <div className="quick-action-icon"><Image size={18} /></div>
              <span>Add Photos</span>
            </button>
            <button onClick={() => setShowPostscriptModal(true)} className="quick-action-btn">
              <div className="quick-action-icon"><FileText size={18} /></div>
              <span>PostScript</span>
            </button>
            <button onClick={() => setShowContactModal(true)} className="quick-action-btn">
              <div className="quick-action-icon"><UserPlus size={18} /></div>
              <span>Add Contact</span>
            </button>
            <button onClick={() => setShowQuickMemoryModal(true)} className="quick-action-btn">
              <div className="quick-action-icon"><Mic size={18} /></div>
              <span>Quick Memory</span>
            </button>
          </div>
        
          {/* Command Bar - RAG CLI removed (saved for future use) */}
          {/* <CommandBar /> */}
          </div>
        </main>
      </div> {/* End home-layout */}
      
      {/* Photo Upload Modal */}
      <PhotoUploadModal 
        isOpen={showPhotoUpload} 
        onClose={() => setShowPhotoUpload(false)} 
      />
      
      {/* Postscript Modal - Step 1: Select Recipient */}
      <AnimatePresence>
        {showPostscriptModal && (
          <PostscriptRecipientModal 
            onClose={() => setShowPostscriptModal(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Quick Memory Modal */}
      <AnimatePresence>
        {showQuickMemoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQuickMemoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#406A56]">Quick Memory</h2>
                  <p className="text-sm text-[#406A56]/60">Share a story through voice</p>
                </div>
                <button
                  onClick={() => setShowQuickMemoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <VoiceVideoChat
                  sessionType="memory_capture"
                  personaName="journalist"
                  enableVideo={false}
                  maxQuestions={5}
                  onMemorySaved={(memoryId) => {
                    setShowQuickMemoryModal(false)
                    // Could show success toast or refresh data
                  }}
                  onError={(error) => console.error('Voice error:', error)}
                  showTranscript={true}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <AddContactModal 
            onClose={() => setShowContactModal(false)}
            onSave={() => {
              // Could refresh data here if needed
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// INLINE POSTSCRIPT MODAL - Complete flow in modal
// ============================================

const EVENT_OPTIONS = [
  { key: 'birthday', label: 'Birthday', icon: '🎂' },
  { key: 'wedding', label: 'Wedding', icon: '💒' },
  { key: 'graduation', label: 'Graduation', icon: '🎓' },
  { key: 'anniversary', label: 'Anniversary', icon: '💕' },
  { key: 'first_child', label: 'First Child', icon: '👶' },
  { key: '18th_birthday', label: '18th Birthday', icon: '🎉' },
  { key: 'christmas', label: 'Christmas', icon: '🎄' },
  { key: 'tough_times', label: 'Tough Times', icon: '💪' },
]

function PostscriptRecipientModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; relationship_type: string | null; email?: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
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
    loadContacts()
  }, [])

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
    const colors = ['#C35F33', '#406A56', '#4A3552', '#8DACAB', '#D9C61A']
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
        className="bg-[#F2F1E5] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={step > 1 ? () => setStep(step - 1) : onClose} className="p-2 hover:bg-[#406A56]/10 rounded-lg">
              {step > 1 ? <ChevronRight size={20} className="text-[#406A56] rotate-180" /> : <X size={20} className="text-[#406A56]" />}
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#2d2d2d]">Create PostScript</h2>
              <p className="text-xs text-[#406A56]/60">Step {step} of 4</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1,2,3,4].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-[#C35F33]' : 'bg-[#406A56]/20'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 flex-1 overflow-y-auto pb-4">
          {/* Step 1: Recipient */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-[#C35F33]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users size={24} className="text-[#C35F33]" />
                </div>
                <h3 className="font-semibold text-[#2d2d2d]">Who is this for?</h3>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#406A56]/40" />
                <input
                  type="text"
                  aria-label="Search" placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#406A56]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-6 text-[#406A56]/50 text-sm">Loading...</div>
                ) : filteredContacts.slice(0, 8).map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className="w-full flex items-center gap-2.5 p-2.5 bg-white rounded-xl hover:bg-[#406A56]/5 transition-colors text-left"
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
                        <p className="text-xs text-[#406A56]/60">{contact.relationship_type}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-[#406A56]/30 flex-shrink-0" />
                  </button>
                ))}
              </div>

              <div className="border-t border-[#406A56]/10 pt-3">
                <p className="text-xs text-[#406A56]/60 mb-2">Or enter manually:</p>
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value, recipient_contact_id: null })}
                  className="w-full px-3 py-2.5 bg-white border border-[#406A56]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                />
              </div>
            </div>
          )}

          {/* Step 2: Occasion */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-[#D9C61A]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Calendar size={24} className="text-[#D9C61A]" />
                </div>
                <h3 className="font-semibold text-[#2d2d2d]">When to deliver?</h3>
              </div>

              <div className="flex bg-white/50 rounded-xl p-1 gap-1">
                {(['date', 'event', 'after_passing'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, delivery_type: type })}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                      form.delivery_type === type ? 'bg-white shadow-sm text-[#406A56]' : 'text-[#406A56]/60'
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
                  className="w-full px-3 py-2.5 bg-white border border-[#406A56]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
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
                          ? 'border-[#C35F33] bg-[#C35F33]/5' 
                          : 'border-[#406A56]/10 bg-white hover:border-[#406A56]/30'
                      }`}
                    >
                      <span className="text-xl block">{event.icon}</span>
                      <span className="text-xs font-medium text-[#406A56]">{event.label}</span>
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
                className="w-full px-3 py-2.5 bg-white border border-[#406A56]/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
              />

              <textarea
                placeholder="Write your heartfelt message..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                className="w-full px-3 py-2.5 bg-white border border-[#406A56]/20 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
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

              <div className="bg-white rounded-xl divide-y divide-[#406A56]/10">
                <div className="p-3">
                  <p className="text-xs text-[#406A56]/60 uppercase">To</p>
                  <p className="font-medium text-[#2d2d2d]">{form.recipient_name}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#406A56]/60 uppercase">Delivery</p>
                  <p className="font-medium text-[#2d2d2d]">
                    {form.delivery_type === 'date' && form.delivery_date && new Date(form.delivery_date).toLocaleDateString()}
                    {form.delivery_type === 'event' && EVENT_OPTIONS.find(e => e.key === form.delivery_event)?.label}
                    {form.delivery_type === 'after_passing' && "After I'm gone"}
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-[#406A56]/60 uppercase">Message</p>
                  <p className="font-semibold text-[#2d2d2d]">{form.title}</p>
                  <p className="text-sm text-[#406A56]/80 line-clamp-3">{form.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 border-t border-[#406A56]/10">
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="w-full py-3 bg-[#406A56] text-white font-semibold rounded-xl hover:bg-[#4a7a64] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex-1 py-3 bg-[#406A56]/10 text-[#406A56] font-semibold rounded-xl hover:bg-[#406A56]/20 transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave('scheduled')}
                disabled={saving}
                className="flex-1 py-3 bg-[#C35F33] text-white font-semibold rounded-xl hover:bg-[#A84E2A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? '...' : <><Send size={16} /> Schedule</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
