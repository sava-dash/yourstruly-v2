'use client'

import '@/styles/feed.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Users, Calendar, Search, Map as MapIcon, Plus, Mic, Video, Upload, Image as ImageIcon, MessageSquare, Gift, Sparkles, BookOpen, Brain, Heart, Camera, Clock, Play, ChevronDown, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { InlineAudioPlayer } from '@/components/feed/InlineAudioPlayer'
import { FeedDetailModal } from '@/components/feed/FeedDetailModal'

const FeedMap = dynamic(() => import('@/components/feed/FeedMap'), { ssr: false })
const BadgeDisplay = dynamic(() => import('@/components/dashboard/BadgeDisplay'), { ssr: false })

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  thumbnail?: string
  audio_url?: string
  link: string
  metadata?: {
    location?: string
    lat?: number
    lng?: number
    tagged_people?: string[]
    recipient_name?: string
    delivery_date?: string
    category?: string
    contactName?: string
    wisdomId?: string
    memoryId?: string
    contactId?: string
    photoId?: string
  }
}

import { useGamificationConfig } from '@/hooks/useGamificationConfig'
import type { XpLevelConfig } from '@/lib/gamification-config'

function getXpLevel(xp: number, levels: XpLevelConfig[]) {
  let current = levels[0]
  for (const lvl of levels) {
    if (xp >= lvl.minXp) current = lvl
    else break
  }
  const nextLevel = levels.find(l => l.minXp > xp)
  const progress = nextLevel
    ? ((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100
    : 100
  return { ...current, nextLevel, progress, xpToNext: nextLevel ? nextLevel.minXp - xp : 0 }
}

type CategoryFilter = 'all' | 'memories' | 'wisdom' | 'media' | 'interviews' | 'shared'
type ViewMode = 'card' | 'map'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'memories', label: 'Memories' },
  { id: 'wisdom', label: 'Wisdom' },
  { id: 'media', label: 'Media' },
  { id: 'interviews', label: 'Interviews' },
  { id: 'shared', label: 'Shared with me' },
] as const

type ReminisceMode = 'people' | 'places' | 'moods' | 'categories' | null

const REMINISCE_OPTIONS: { mode: Exclude<ReminisceMode, null>; label: string; icon: any }[] = [
  { mode: 'people',     label: 'People',      icon: Users },
  { mode: 'places',     label: 'Places',      icon: MapPin },
  { mode: 'moods',      label: 'Moods',       icon: Heart },
  { mode: 'categories', label: 'Categories',  icon: BookOpen },
]

const MOOD_DISPLAY = [
  { value: 'joyful',      emoji: '😊', label: 'Happy' },
  { value: 'loving',      emoji: '❤️', label: 'Love' },
  { value: 'grateful',    emoji: '🙏', label: 'Grateful' },
  { value: 'nostalgic',   emoji: '🌅', label: 'Nostalgic' },
  { value: 'proud',       emoji: '🏆', label: 'Proud' },
  { value: 'peaceful',    emoji: '🌿', label: 'Peaceful' },
  { value: 'reflective',  emoji: '🤔', label: 'Reflective' },
  { value: 'bittersweet', emoji: '😢', label: 'Bittersweet' },
]

const REMINISCE_CATEGORIES = [
  { value: 'family',      label: 'Family',       emoji: '👨‍👩‍👧' },
  { value: 'travel',      label: 'Travel',        emoji: '✈️' },
  { value: 'celebration', label: 'Celebrations',  emoji: '🎉' },
  { value: 'career',      label: 'Career',        emoji: '💼' },
  { value: 'nature',      label: 'Nature',        emoji: '🌲' },
  { value: 'food',        label: 'Food',          emoji: '🍽️' },
  { value: 'friends',     label: 'Friends',       emoji: '🤝' },
  { value: 'everyday',    label: 'Everyday',      emoji: '☕' },
]

const QUICK_ACTIONS: Record<string, Array<{ label: string; icon: any; action: string }>> = {
  memories: [
    { label: 'Add a Memory', icon: Plus, action: 'add_memory' },
    { label: 'Upload Media', icon: Upload, action: 'upload_memory' },
    { label: 'Random Memory Question', icon: Sparkles, action: 'random_memory' },
  ],
  wisdom: [
    { label: 'Add Wisdom', icon: Plus, action: 'add_wisdom' },
    { label: 'Random Wisdom Question', icon: Sparkles, action: 'random_wisdom' },
  ],
  media: [
    { label: 'Upload Photos/Videos', icon: Upload, action: 'upload_media' },
    { label: 'Digitize Printed Photos', icon: ImageIcon, action: 'digitize_photos' },
  ],
  interviews: [
    { label: 'New Interview', icon: MessageSquare, action: 'new_interview' },
  ],
  postscripts: [
    { label: 'Add New PostScript', icon: Gift, action: 'add_postscript' },
  ],
}

// Brand colors from YoursTruly brand kit
const BRAND_COLORS = {
  green: '#406A56',
  greenLight: '#D3E1DF',
  yellow: '#D9C61A',
  yellowLight: '#F2F1E5',
  blue: '#8DACAB',
  blueLight: '#C5CDD6',
  red: '#C35F33',
  redLight: '#EBD4CA',
  purple: '#4A3552',
  purpleLight: '#D8D3DA',
  offWhite: '#F2F1E5',
  black: '#000000',
}

// Brand gradients for cards without images (using brand colors)
const TYPE_GRADIENTS: Record<string, string> = {
  memory: `linear-gradient(135deg, ${BRAND_COLORS.red} 0%, #E07A52 100%)`,
  wisdom: `linear-gradient(135deg, ${BRAND_COLORS.purple} 0%, #6B4A7A 100%)`,
  interview: `linear-gradient(135deg, ${BRAND_COLORS.blue} 0%, #A8C4C3 100%)`,
  media: `linear-gradient(135deg, ${BRAND_COLORS.yellow} 0%, #E8D84A 100%)`,
  postscript: `linear-gradient(135deg, ${BRAND_COLORS.green} 0%, #5A8A72 100%)`,
  contact: `linear-gradient(135deg, ${BRAND_COLORS.green} 0%, #5A8A72 100%)`,
  circle: `linear-gradient(135deg, ${BRAND_COLORS.blue} 0%, #A8C4C3 100%)`,
}

const TYPE_CONFIG: Record<string, { label: string; color: string; gradient: string; icon: any }> = {
  memory_created: { label: 'Memory', color: BRAND_COLORS.red, gradient: TYPE_GRADIENTS.memory, icon: BookOpen },
  memory_shared: { label: 'Shared Memory', color: BRAND_COLORS.red, gradient: TYPE_GRADIENTS.memory, icon: Heart },
  wisdom_created: { label: 'Wisdom', color: BRAND_COLORS.purple, gradient: TYPE_GRADIENTS.wisdom, icon: Brain },
  wisdom_shared: { label: 'Shared Wisdom', color: BRAND_COLORS.purple, gradient: TYPE_GRADIENTS.wisdom, icon: Brain },
  interview_response: { label: 'Interview', color: BRAND_COLORS.blue, gradient: TYPE_GRADIENTS.interview, icon: MessageSquare },
  photos_uploaded: { label: 'Photos', color: BRAND_COLORS.yellow, gradient: TYPE_GRADIENTS.media, icon: Camera },
  postscript_created: { label: 'PostScript', color: BRAND_COLORS.green, gradient: TYPE_GRADIENTS.postscript, icon: Gift },
  contact_added: { label: 'Contact', color: BRAND_COLORS.green, gradient: TYPE_GRADIENTS.contact, icon: Users },
  circle_content: { label: 'Circle', color: BRAND_COLORS.blue, gradient: TYPE_GRADIENTS.circle, icon: Users },
}

// Memory Completeness Score
function getCompleteness(activity: ActivityItem) {
  if (activity.type !== 'memory_created') return null
  let score = 0
  let total = 6
  if (activity.title && activity.title !== 'Untitled Memory') score++
  if (activity.description && !activity.description.toLowerCase().startsWith('you ')) score++
  if (activity.metadata?.location) score++
  if (activity.timestamp) score++ // has date
  if (activity.thumbnail) score++ // has photo
  if (activity.audio_url) score++ // has voice
  return { score, total, percentage: Math.round((score / total) * 100) }
}

function MasonryTile({ 
  activity, 
  index, 
  isDarkMode,
  playingAudio,
  onAudioToggle,
  onCardClick
}: { 
  activity: ActivityItem
  index: number
  isDarkMode: boolean
  playingAudio: string | null
  onAudioToggle: (id: string) => void
  onCardClick: (activity: ActivityItem) => void
}) {
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.memory_created
  
  const getSummary = () => {
    const desc = activity.description || ''
    if (desc.toLowerCase().startsWith('you ')) return ''
    return desc
  }
  const summary = getSummary()

  return (
    <div className="card-wrapper" data-year={new Date(activity.timestamp).getFullYear()}>
      <div
        onClick={() => onCardClick(activity)}
        className="card block relative overflow-hidden"
        style={{ 
          cursor: 'pointer',
          borderRadius: '20px',
          background: activity.thumbnail ? '#000' : config.gradient,
          border: '4px solid #fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '200px',
        }}
      >
        {activity.thumbnail && (
          <div 
            style={{
              paddingTop: '75%',
              backgroundImage: `url(${activity.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              borderRadius: '20px 20px 0 0',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))'
            }} />
          </div>
        )}

        <div 
          className="feed-card-content"
          style={{
            padding: '16px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            color: '#fff',
            flex: 1,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'rgba(255,255,255,0.7)',
          }}>
            <config.icon size={12} />
            {config.label}
            {activity.audio_url && <Play size={10} style={{ marginLeft: '4px', opacity: 0.8 }} />}
          </div>

          <h3 style={{
            fontSize: '16px',
            fontWeight: '700',
            lineHeight: '1.3',
            margin: 0,
            color: '#fff',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {activity.title || 'Untitled'}
          </h3>

          {summary && (
            <p style={{
              fontSize: '13px',
              lineHeight: '1.4',
              color: 'rgba(255,255,255,0.8)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {summary}
            </p>
          )}

          {activity.type === 'postscript_created' && activity.metadata?.recipient_name && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.8)',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}>
              <Gift size={14} />
              <span>To {activity.metadata.recipient_name}</span>
              {activity.metadata.delivery_date && (
                <span style={{ opacity: 0.7, marginLeft: 'auto' }}>
                  {format(new Date(activity.metadata.delivery_date), 'MMM d')}
                </span>
              )}
            </div>
          )}
          
          {activity.metadata?.category && activity.type !== 'interview_response' && activity.type !== 'postscript_created' && (
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px', 
              color: 'rgba(255,255,255,0.95)',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.15)',
              padding: '6px 10px',
              borderRadius: '6px',
              width: 'fit-content',
              textTransform: 'capitalize',
            }}>
              {activity.metadata.category.replace(/_/g, ' ')}
            </div>
          )}
          
          {activity.type === 'interview_response' && activity.metadata?.contactName && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.8)',
              fontWeight: '500',
            }}>
              <Users size={14} />
              <span>with {activity.metadata.contactName}</span>
            </div>
          )}

          {activity.audio_url && (
            <div 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAudioToggle(activity.id)
              }}
              style={{ marginTop: '4px' }}
            >
              <InlineAudioPlayer
                audioUrl={activity.audio_url}
                isPlaying={playingAudio === activity.id}
                onToggle={() => onAudioToggle(activity.id)}
                accentColor={config.color}
              />
            </div>
          )}

          {activity.metadata?.tagged_people && activity.metadata.tagged_people.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
            }}>
              {activity.metadata.tagged_people.map((name: string, i: number) => (
                <span key={i} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.15)',
                  padding: '3px 8px',
                  borderRadius: '10px',
                }}>
                  <Users size={9} />
                  {name}
                </span>
              ))}
            </div>
          )}

          {(() => {
            const c = getCompleteness(activity)
            if (!c || c.percentage === 100) return null
            const color = c.percentage >= 80 ? '#22c55e' : c.percentage >= 50 ? '#D9C61A' : '#C35F33'
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                fontWeight: '600',
                color,
                padding: '4px 0',
              }}>
                <div style={{
                  width: '40px',
                  height: '4px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${c.percentage}%`,
                    background: color,
                    borderRadius: '2px',
                  }} />
                </div>
                {c.percentage}%
              </div>
            )
          })()}

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: '500',
            marginTop: 'auto',
            paddingTop: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={11} />
              {format(new Date(activity.timestamp), 'MMM d, yyyy')}
            </div>
            {activity.metadata?.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={11} />
                <span style={{ 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px'
                }}>
                  {activity.metadata.location}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FeedContent component ──
// Extracted from the feed page — renders everything EXCEPT the profile card sidebar.
// The parent component wraps this alongside its own sidebar.

export default function FeedContent() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [openSubmenu, setOpenSubmenu] = useState<CategoryFilter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { config: gamificationConfig } = useGamificationConfig()
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [showMapOverlay, setShowMapOverlay] = useState(false)
  const [showEngagementModal, setShowEngagementModal] = useState(false)
  const [engagementPrompt, setEngagementPrompt] = useState<any>(null)
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [showPostscriptModal, setShowPostscriptModal] = useState(false)
  const [showDigitizeCamera, setShowDigitizeCamera] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState<'uploading' | 'backstory' | 'done'>('uploading')
  const [uploadedMemoryId, setUploadedMemoryId] = useState<string | null>(null)
  const [memoryMetadata, setMemoryMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    location: ''
  })
  const gridRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  
  // Reminisce state
  const [reminisceMode, setReminisceMode] = useState<ReminisceMode>(null)
  const [reminisceDropdownOpen, setReminisceDropdownOpen] = useState(false)
  const reminisceRef = useRef<HTMLDivElement>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [selectedReminisceCategory, setSelectedReminisceCategory] = useState<string | null>(null)
  
  // People/Places browse mode state
  const [browsedPersonId, setBrowsedPersonId] = useState<string | null>(null)
  const [browsedPlace, setBrowsedPlace] = useState<string | null>(null)
  
  // People data from face tags
  const [peopleData, setPeopleData] = useState<any[]>([])
  const [faceTagMemoryMap, setFaceTagMemoryMap] = useState<Record<string, string[]>>({})
  
  // Timeline state
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [activeTimelineYear, setActiveTimelineYear] = useState<number>(new Date().getFullYear())
  const timelineRef = useRef<HTMLDivElement>(null)

  const handleAudioToggle = (activityId: string) => {
    setPlayingAudio(prev => prev === activityId ? null : activityId)
  }

  const fetchBirthYear = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', user.id)
        .single()
      if (profile?.date_of_birth) {
        const year = new Date(profile.date_of_birth).getFullYear()
        setBirthYear(year)
      }
    } catch (err) {
      console.error('[BirthYear] Error:', err)
    }
  }

  const fetchPeopleData = useCallback(async (contactsList: any[], activitiesList: ActivityItem[]) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: faceTags, error: ftError } = await supabase
        .from('memory_face_tags')
        .select(`
          contact_id,
          memory_media!inner(memory_id)
        `)
        .eq('user_id', user.id)
        .not('contact_id', 'is', null)

      const memoryCountMap: Record<string, Set<string>> = {}
      faceTags?.forEach((tag: any) => {
        const contactId = tag.contact_id
        const memoryId = tag.memory_media?.memory_id
        if (contactId && memoryId) {
          if (!memoryCountMap[contactId]) memoryCountMap[contactId] = new Set()
          memoryCountMap[contactId].add(memoryId)
        }
      })

      const faceTagMap: Record<string, string[]> = {}
      Object.entries(memoryCountMap).forEach(([cid, mids]) => {
        faceTagMap[cid] = Array.from(mids)
      })
      setFaceTagMemoryMap(faceTagMap)

      const activityCountMap: Record<string, number> = {}
      contactsList.forEach(contact => {
        const count = activitiesList.filter(a => {
          const meta = a.metadata
          if (!meta) return false
          const tagged = meta.tagged_people || []
          const nameMatch = (name: string) => name.toLowerCase().includes(contact.full_name.toLowerCase()) || contact.full_name.toLowerCase().includes(name.toLowerCase())
          return (
            tagged.some((p: string) => nameMatch(p)) ||
            (meta.contactName && nameMatch(meta.contactName)) ||
            (meta.recipient_name && nameMatch(meta.recipient_name)) ||
            meta.contactId === contact.id
          )
        }).length
        activityCountMap[contact.id] = count
      })

      const contactMap = new Map(contactsList.map(c => [c.id, c]))

      const allContactIds = new Set([
        ...contactsList.map(c => c.id),
        ...Object.keys(memoryCountMap)
      ])

      const missingIds = Object.keys(memoryCountMap).filter(id => !contactMap.has(id))
      if (missingIds.length > 0) {
        const { data: extraContacts } = await supabase
          .from('contacts')
          .select('id, full_name, avatar_url, relationship_type')
          .in('id', missingIds)
        extraContacts?.forEach(c => contactMap.set(c.id, c))
      }

      const merged = Array.from(allContactIds).map(id => {
        const contact = contactMap.get(id)
        if (!contact) return null
        const faceTagCount = memoryCountMap[id]?.size || 0
        const activityCount = activityCountMap[id] || 0
        return {
          ...contact,
          entryCount: faceTagCount + activityCount,
          faceTagCount,
          activityCount,
        }
      }).filter(Boolean)

      merged.sort((a: any, b: any) => {
        if (b.entryCount !== a.entryCount) return b.entryCount - a.entryCount
        return a.full_name.localeCompare(b.full_name)
      })

      setPeopleData(merged)
    } catch (err) {
      console.error('Error fetching people data:', err)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    fetchContacts()
    fetchBirthYear()
  }, [])

  const fetchContacts = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, avatar_url, relationship_type')
        .eq('user_id', user.id)
        .order('full_name')
      if (!error && data) {
        setContacts(data)
      }
    } catch (err) {
      console.error('Error fetching contacts:', err)
    }
  }

  const handleCreateInterview = async () => {
    if (!selectedContact) {
      alert('Please select a contact')
      return
    }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) throw new Error('Contact not found')
      const { data: session, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          contact_id: selectedContact,
          title: `Interview with ${selectedContactData.full_name}`,
          status: 'pending'
        })
        .select()
        .single()
      if (error) throw error
      window.location.href = `/dashboard/journalist#session-${session.id}`
    } catch (err) {
      console.error('Error creating interview:', err)
      alert('Failed to create interview: ' + (err as Error).message)
    }
  }

  const handleCreatePostscript = async () => {
    if (!selectedContact) {
      alert('Please select a contact (recipient)')
      return
    }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) throw new Error('Contact not found')
      const { data: postscript, error } = await supabase
        .from('postscripts')
        .insert({
          user_id: user.id,
          recipient_contact_id: selectedContact,
          recipient_name: selectedContactData.full_name,
          title: 'New PostScript',
          message: ''
        })
        .select()
        .single()
      if (error) throw error
      window.location.href = `/dashboard/postscripts/${postscript.id}`
    } catch (err) {
      console.error('Error creating postscript:', err)
      alert('Failed to create postscript: ' + (err as Error).message)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity?limit=200&includePostscripts=true')
      if (res.ok) {
        const data = await res.json()
        const filtered = (data.activities || [])
          .filter((a: ActivityItem) => a.type !== 'xp_earned')
          .map((a: ActivityItem) => ({
            ...a,
            thumbnail: a.thumbnail?.startsWith('http') ? a.thumbnail : undefined,
          }))
        setActivities(filtered)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch people data when activities are loaded
  useEffect(() => {
    if (activities.length > 0) {
      fetchPeopleData(contacts, activities)
    }
  }, [contacts, activities, fetchPeopleData])

  const handleCategoryClick = (categoryId: CategoryFilter) => {
    setReminisceMode(null)
    setBrowsedPersonId(null)
    setBrowsedPlace(null)
    setSelectedPerson(null)
    setSelectedPlace(null)
    setSelectedMood(null)
    setSelectedReminisceCategory(null)
    
    if (activeCategory === categoryId && openSubmenu === categoryId) {
      setOpenSubmenu(null)
    } else {
      setActiveCategory(categoryId)
      if (QUICK_ACTIONS[categoryId]) {
        setOpenSubmenu(categoryId)
      } else {
        setOpenSubmenu(null)
      }
    }
  }

  const handleQuickAction = async (action: string) => {
    switch(action) {
      case 'add_memory':
        setEngagementPrompt({
          id: 'quick-add-memory',
          type: 'memory',
          promptText: 'What memory would you like to capture?',
          metadata: { category: 'moment' }
        })
        setShowEngagementModal(true)
        break
      case 'upload_memory':
        fileInputRef.current?.click()
        break
      case 'random_memory':
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            const allPrompts = data.prompts || data || []
            const memoryPrompts = allPrompts.filter((p: any) => 
              p.type === 'memory' || p.type === 'moment' || p.prompt_type === 'memory'
            )
            const targetPrompts = memoryPrompts.length > 0 ? memoryPrompts : allPrompts.slice(0, 10)
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: randomPrompt.type || randomPrompt.prompt_type || 'memory',
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What would you like to remember?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            }
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
        }
        break
      case 'add_wisdom':
        setEngagementPrompt({
          id: 'quick-add-wisdom',
          type: 'wisdom',
          promptText: 'What wisdom would you like to share?',
          metadata: { category: 'general' }
        })
        setShowEngagementModal(true)
        break
      case 'random_wisdom':
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            const allPrompts = data.prompts || data || []
            const wisdomPrompts = allPrompts.filter((p: any) => 
              p.type === 'wisdom' || p.prompt_type === 'wisdom'
            )
            const targetPrompts = wisdomPrompts.length > 0 ? wisdomPrompts : allPrompts.slice(0, 10)
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: randomPrompt.type || randomPrompt.prompt_type || 'wisdom',
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What wisdom would you like to share?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            }
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
        }
        break
      case 'upload_media':
        fileInputRef.current?.click()
        break
      case 'digitize_photos':
        cameraInputRef.current?.click()
        break
      case 'new_interview':
        await fetchContacts()
        setShowInterviewModal(true)
        break
      case 'add_postscript':
        await fetchContacts()
        setShowPostscriptModal(true)
        break
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      setUploadProgress(10)
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: memoryMetadata.location || 'Uploaded Media',
          description: '',
          memory_date: memoryMetadata.date,
          location_name: memoryMetadata.location || null
        })
        .select()
        .single()
      if (memoryError) throw new Error(memoryError.message || 'Failed to create memory')
      setUploadedMemoryId(memory.id)
      setUploadProgress(30)
      const uploadedResults = []
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`/api/memories/${memory.id}/media`, {
          method: 'POST',
          body: formData,
        })
        const progress = 30 + ((i + 1) / fileArray.length) * 50
        setUploadProgress(Math.round(progress))
        if (response.ok) {
          const result = await response.json()
          uploadedResults.push(result)
          if (result.file_type?.includes('image') || file.type.startsWith('image/')) {
            fetch(`/api/media/${result.id}/detect-faces`, { method: 'POST' }).catch(() => {})
          }
        } else {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }
      }
      setUploadedFiles(uploadedResults)
      setUploadProgress(100)
      setTimeout(() => { setUploadStep('backstory') }, 500)
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Upload error: ' + (err as Error).message)
      setShowUploadModal(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSkipBackstory = () => {
    setShowUploadModal(false)
    setUploadedFiles([])
    setUploadProgress(0)
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    setMemoryMetadata({ date: new Date().toISOString().split('T')[0], location: '' })
    fetchActivities()
  }

  const handleAddBackstory = () => {
    if (!uploadedMemoryId) return
    setEngagementPrompt({
      id: uploadedMemoryId,
      type: 'memory',
      promptText: 'Tell us about these photos. What was happening?',
      metadata: { memoryId: uploadedMemoryId, isBackstory: true }
    })
    setShowEngagementModal(true)
    setShowUploadModal(false)
    setUploadedFiles([])
    setUploadProgress(0)
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    setMemoryMetadata({ date: new Date().toISOString().split('T')[0], location: '' })
  }

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      setUploadProgress(10)
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: 'Digitized Photo',
          description: '',
          memory_date: memoryMetadata.date,
          location_name: memoryMetadata.location || null
        })
        .select()
        .single()
      if (memoryError) throw new Error(memoryError.message || 'Failed to create memory')
      setUploadedMemoryId(memory.id)
      setUploadProgress(30)
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch(`/api/memories/${memory.id}/media`, {
        method: 'POST',
        body: formData
      })
      setUploadProgress(60)
      if (uploadRes.ok) {
        const uploadedFile = await uploadRes.json()
        const photoUrl = uploadedFile.url || uploadedFile.file_url
        setUploadProgress(80)
        try {
          const enhanceRes = await fetch('/api/digitize/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: photoUrl })
          })
          if (enhanceRes.ok) {
            const { enhancedUrl } = await enhanceRes.json()
            uploadedFile.enhanced = true
            uploadedFile.enhancedUrl = enhancedUrl
          }
        } catch {}
        fetch(`/api/media/${uploadedFile.id}/detect-faces`, { method: 'POST' }).catch(() => {})
        setUploadedFiles([uploadedFile])
        setUploadProgress(100)
        setTimeout(() => { setUploadStep('backstory') }, 500)
      } else {
        const error = await uploadRes.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error capturing photo:', err)
      alert('Capture error: ' + (err as Error).message)
      setShowUploadModal(false)
    }
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const filterActivities = (category: CategoryFilter) => {
    let filtered = activities
    const SHARED_TYPES = ['memory_shared', 'wisdom_shared', 'circle_message', 'circle_content', 'circle_invite']
    if (category === 'shared') {
      filtered = activities.filter(a => SHARED_TYPES.includes(a.type))
    } else if (category === 'interviews') {
      filtered = activities.filter(a => a.type === 'interview_response')
    } else if (category === 'memories') {
      filtered = activities.filter(a => a.type === 'memory_created')
    } else if (category === 'wisdom') {
      filtered = activities.filter(a => a.type === 'wisdom_created')
    } else if (category === 'media') {
      filtered = activities.filter(a => a.type === 'photos_uploaded')
    } else {
      filtered = activities.filter(a => !SHARED_TYPES.includes(a.type))
    }

    if (selectedPerson) {
      filtered = filtered.filter(a => {
        const meta = a.metadata
        if (!meta) return false
        const tagged = meta.tagged_people || []
        const personLower = selectedPerson.toLowerCase()
        return (
          tagged.some((p: string) => p.toLowerCase().includes(personLower)) ||
          meta.contactName?.toLowerCase().includes(personLower) ||
          meta.recipient_name?.toLowerCase().includes(personLower)
        )
      })
    }

    if (selectedPlace) {
      filtered = filtered.filter(a => {
        const loc = a.metadata?.location?.toLowerCase() || ''
        return loc.includes(selectedPlace.toLowerCase())
      })
    }

    if (selectedMood) {
      filtered = filtered.filter(a => {
        const meta = a.metadata as any
        return meta?.mood === selectedMood || meta?.ai_mood === selectedMood
      })
    }

    if (selectedReminisceCategory) {
      filtered = filtered.filter(a => {
        const cat = a.metadata?.category?.toLowerCase() || ''
        return cat === selectedReminisceCategory.toLowerCase()
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.metadata?.location?.toLowerCase().includes(q) ||
        (a.metadata?.tagged_people || []).some((name: string) => name.toLowerCase().includes(q))
      )
    }

    setFilteredActivities(filtered)
  }

  const uniqueYears = [...new Set(activities.map(a => new Date(a.timestamp).getFullYear()))].sort((a, b) => b - a)
  
  const uniquePlaces = [...new Set(
    activities
      .map(a => a.metadata?.location)
      .filter((loc): loc is string => !!loc && loc.trim() !== '')
  )].sort()

  const placesData = (() => {
    const locationMap = new Map<string, { name: string; count: number; thumbnail: string | null; activities: ActivityItem[] }>()
    activities.forEach(a => {
      const loc = a.metadata?.location?.trim()
      if (!loc) return
      const existing = locationMap.get(loc)
      if (existing) {
        existing.count++
        existing.activities.push(a)
        if (!existing.thumbnail && a.thumbnail) {
          existing.thumbnail = a.thumbnail
        }
      } else {
        locationMap.set(loc, {
          name: loc,
          count: 1,
          thumbnail: a.thumbnail || null,
          activities: [a]
        })
      }
    })
    return Array.from(locationMap.values()).sort((a, b) => b.count - a.count)
  })()

  const getActivitiesForPerson = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return []
    const faceTagMemoryIds = new Set(faceTagMemoryMap[contactId] || [])
    return activities.filter(a => {
      if (a.metadata?.memoryId && faceTagMemoryIds.has(a.metadata.memoryId)) return true
      const meta = a.metadata
      if (!meta) return false
      const tagged = meta.tagged_people || []
      const nameMatch = (name: string) => name.toLowerCase().includes(contact.full_name.toLowerCase()) || contact.full_name.toLowerCase().includes(name.toLowerCase())
      return (
        tagged.some((p: string) => nameMatch(p)) ||
        (meta.contactName && nameMatch(meta.contactName)) ||
        (meta.recipient_name && nameMatch(meta.recipient_name)) ||
        meta.contactId === contact.id
      )
    })
  }

  const getActivitiesForPlace = (location: string) => {
    return activities.filter(a => a.metadata?.location?.trim() === location)
  }

  const timelineYears = (() => {
    const currentYear = new Date().getFullYear()
    const latestYear = uniqueYears.length > 0 ? Math.max(currentYear, uniqueYears[0]) : currentYear
    const oldestDataYear = uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : latestYear
    const startYear = birthYear || Math.min(oldestDataYear, latestYear - 40)
    const years: number[] = []
    for (let y = latestYear; y >= startYear; y--) {
      years.push(y)
    }
    return years
  })()

  // Timeline scroll detection
  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const detectMidpointYear = () => {
      const containerRect = el.getBoundingClientRect()
      const midY = containerRect.top + containerRect.height / 2
      const buttons = Array.from(el.querySelectorAll('.timeline-year-btn')) as HTMLElement[]
      let closestBtn: HTMLElement | null = null
      let closestDist = Infinity
      for (const btn of buttons) {
        const btnRect = btn.getBoundingClientRect()
        const btnMid = btnRect.top + btnRect.height / 2
        const dist = Math.abs(btnMid - midY)
        if (dist < closestDist) {
          closestDist = dist
          closestBtn = btn
        }
      }
      if (closestBtn) {
        const year = parseInt(closestBtn.textContent || '0')
        if (year && year !== activeTimelineYear) {
          setActiveTimelineYear(year)
          syncedScrollTilesToYear(year)
        }
      }
    }
    el.addEventListener('scroll', detectMidpointYear, { passive: true })
    return () => el.removeEventListener('scroll', detectMidpointYear)
  }, [activeTimelineYear])

  const scrollTilesToYear = useCallback((year: number) => {
    if (!gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.card-wrapper[data-year]')
    for (const card of Array.from(cards)) {
      const cardYear = parseInt(card.getAttribute('data-year') || '0')
      if (cardYear === year) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
  }, [])

  const timelineInitialized = useRef(false)
  useEffect(() => {
    if (timelineInitialized.current) return
    const el = timelineRef.current
    if (!el || timelineYears.length === 0) return
    requestAnimationFrame(() => {
      const firstBtn = el.querySelector('.timeline-year-btn') as HTMLElement
      if (firstBtn) {
        const containerHeight = el.clientHeight
        el.scrollTop = firstBtn.offsetTop - containerHeight / 2 + firstBtn.offsetHeight / 2
        timelineInitialized.current = true
      }
    })
  }, [timelineYears])

  const handleTimelineYearClick = (year: number) => {
    setActiveTimelineYear(year)
    syncedScrollTilesToYear(year)
    const el = timelineRef.current
    if (el) {
      const btn = el.querySelector(`.timeline-year-btn[data-year="${year}"]`) as HTMLElement
      if (btn) {
        const containerHeight = el.clientHeight
        el.scrollTo({
          top: btn.offsetTop - containerHeight / 2 + btn.offsetHeight / 2,
          behavior: 'smooth'
        })
      }
    }
  }

  const scrollSyncRef = useRef(false)
  useEffect(() => {
    const handleMainScroll = () => {
      if (scrollSyncRef.current) return
      if (!gridRef.current || !timelineRef.current) return
      const cards = gridRef.current.querySelectorAll('.card-wrapper[data-year]')
      if (cards.length === 0) return
      const viewportTop = window.scrollY + 200
      let closestCard: Element | null = null
      let closestDist = Infinity
      for (const card of Array.from(cards)) {
        const rect = card.getBoundingClientRect()
        const dist = Math.abs(rect.top - 200)
        if (dist < closestDist) {
          closestDist = dist
          closestCard = card
        }
      }
      if (closestCard) {
        const year = parseInt(closestCard.getAttribute('data-year') || '0')
        if (year && year !== activeTimelineYear) {
          setActiveTimelineYear(year)
          const el = timelineRef.current
          if (el) {
            const btn = el.querySelector(`.timeline-year-btn[data-year="${year}"]`) as HTMLElement
            if (btn) {
              const containerHeight = el.clientHeight
              el.scrollTo({
                top: btn.offsetTop - containerHeight / 2 + btn.offsetHeight / 2,
                behavior: 'smooth'
              })
            }
          }
        }
      }
    }
    window.addEventListener('scroll', handleMainScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleMainScroll)
  }, [activeTimelineYear])

  const originalScrollTilesToYear = scrollTilesToYear
  const syncedScrollTilesToYear = useCallback((year: number) => {
    scrollSyncRef.current = true
    originalScrollTilesToYear(year)
    setTimeout(() => { scrollSyncRef.current = false }, 1000)
  }, [originalScrollTilesToYear])

  const isInBrowseMode = (reminisceMode === 'people' && !browsedPersonId) || (reminisceMode === 'places' && !browsedPlace)
  const isInBrowseDetail = (reminisceMode === 'people' && !!browsedPersonId) || (reminisceMode === 'places' && !!browsedPlace)
  
  const browsedActivities = browsedPersonId 
    ? getActivitiesForPerson(browsedPersonId) 
    : browsedPlace 
    ? getActivitiesForPlace(browsedPlace) 
    : []

  const browsedPersonName = browsedPersonId ? contacts.find(c => c.id === browsedPersonId)?.full_name : null

  useEffect(() => {
    filterActivities(activeCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, activeCategory, searchQuery, selectedPerson, selectedPlace, selectedMood, selectedReminisceCategory])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminisceRef.current && !reminisceRef.current.contains(e.target as Node)) {
        setReminisceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getReminisceButtonDisplay = (): { icon: any; label: string } => {
    if (reminisceMode === 'people') return { icon: Users, label: 'People' }
    if (reminisceMode === 'places') return { icon: MapPin, label: 'Places' }
    if (selectedMood) {
      const mood = MOOD_DISPLAY.find(m => m.value === selectedMood)
      return { icon: Heart, label: mood ? `${mood.emoji} ${mood.label}` : selectedMood }
    }
    if (selectedReminisceCategory) {
      const cat = REMINISCE_CATEGORIES.find(c => c.value === selectedReminisceCategory)
      return { icon: BookOpen, label: cat ? `${cat.emoji} ${cat.label}` : selectedReminisceCategory }
    }
    return { icon: Search, label: 'Filter' }
  }

  const reminisceDisplay = getReminisceButtonDisplay()
  const hasActiveReminisceFilter = !!(reminisceMode === 'people' || reminisceMode === 'places' || selectedMood || selectedReminisceCategory)

  return (
    <div className="feed-page" data-theme={isDarkMode ? 'dark' : 'light'} style={{ minHeight: '100vh', borderRadius: '16px' }}>
      {/* Theme Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 8px 0' }}>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="theme-toggle"
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Header Controls */}
      <div className="feed-header-controls">
        <div className="header-controls">
          {/* Quick Actions */}
          <AnimatePresence>
            {openSubmenu && QUICK_ACTIONS[openSubmenu] && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="quick-actions-row"
              >
                {QUICK_ACTIONS[openSubmenu].map((action, idx) => {
                  const Icon = action.icon
                  return (
                    <motion.button
                      key={action.action}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, type: 'spring', damping: 15, stiffness: 300 }}
                      onClick={() => handleQuickAction(action.action)}
                      className="quick-action-btn"
                    >
                      <Icon size={18} />
                      <span>{action.label}</span>
                    </motion.button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Single Controls Row */}
          <div className="controls-row">
            {/* Category Pills */}
            <div className="filter-tags">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id as CategoryFilter)}
                  className={`category-tag ${activeCategory === cat.id && !isInBrowseMode && !isInBrowseDetail ? 'active' : ''} ${isInBrowseMode || isInBrowseDetail ? 'dimmed' : ''}`}
                >
                  <span className="category-text-wrapper">
                    <span className="category-text category-text-top">{cat.label}</span>
                    <span className="category-text category-text-bottom">{cat.label}</span>
                  </span>
                  <span className="category-underline" />
                </button>
              ))}
            </div>

            {/* Search + Map */}
            <div className="controls-center">
              <div className="search-box-compact">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowMapOverlay(true)}
                className={`map-toggle-btn ${showMapOverlay ? 'active' : ''}`}
                title="Open map view"
              >
                <MapIcon size={16} />
              </button>
            </div>

            {/* Reminisce Dropdown */}
            <div className="reminisce-dropdown-wrapper" ref={reminisceRef}>
              <span className="reminisce-label-inline">REMINISCE BY</span>
              <button
                className={`reminisce-dropdown-btn ${hasActiveReminisceFilter ? 'active' : ''}`}
                onClick={() => setReminisceDropdownOpen(!reminisceDropdownOpen)}
              >
                <reminisceDisplay.icon size={14} />
                <span className="reminisce-btn-text">{reminisceDisplay.label}</span>
                <ChevronDown size={12} style={{
                  transform: reminisceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </button>

              {hasActiveReminisceFilter && (
                <button
                  onClick={() => {
                    setSelectedYear(null)
                    setSelectedPerson(null)
                    setSelectedPlace(null)
                    setSelectedMood(null)
                    setSelectedReminisceCategory(null)
                    setReminisceMode(null)
                    setBrowsedPersonId(null)
                    setBrowsedPlace(null)
                    setReminisceDropdownOpen(false)
                  }}
                  className="reminisce-clear-inline"
                  title="Clear filters"
                >
                  <X size={12} />
                </button>
              )}

              <AnimatePresence>
                {reminisceDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="reminisce-dropdown-menu"
                  >
                    {REMINISCE_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isActive = reminisceMode === option.mode
                      return (
                        <div key={option.mode} className="reminisce-dropdown-group">
                          <button
                            className={`reminisce-dropdown-item ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              if (option.mode === 'people' || option.mode === 'places') {
                                if (isActive) {
                                  setReminisceMode(null)
                                  setBrowsedPersonId(null)
                                  setBrowsedPlace(null)
                                } else {
                                  setReminisceMode(option.mode)
                                  setBrowsedPersonId(null)
                                  setBrowsedPlace(null)
                                  setSelectedPerson(null)
                                  setSelectedPlace(null)
                                  setSelectedMood(null)
                                  setSelectedReminisceCategory(null)
                                }
                                setReminisceDropdownOpen(false)
                              } else {
                                if (isActive) {
                                  setReminisceMode(null)
                                  if (option.mode === 'moods') setSelectedMood(null)
                                  if (option.mode === 'categories') setSelectedReminisceCategory(null)
                                } else {
                                  setReminisceMode(option.mode)
                                }
                              }
                            }}
                          >
                            <Icon size={14} />
                            <span>{option.label}</span>
                            <ChevronDown size={12} style={{
                              marginLeft: 'auto',
                              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              opacity: 0.5
                            }} />
                          </button>

                          <AnimatePresence>
                            {isActive && (option.mode === 'moods' || option.mode === 'categories') && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="reminisce-submenu-pills"
                              >
                                {option.mode === 'moods' && MOOD_DISPLAY.map(({ value, emoji, label }) => (
                                  <button
                                    key={value}
                                    onClick={() => {
                                      setSelectedMood(selectedMood === value ? null : value)
                                      if (selectedMood !== value) setReminisceDropdownOpen(false)
                                    }}
                                    className={`reminisce-pill ${selectedMood === value ? 'active' : ''}`}
                                  >
                                    <span>{emoji}</span>
                                    {label}
                                  </button>
                                ))}
                                {option.mode === 'categories' && REMINISCE_CATEGORIES.map(({ value, emoji, label }) => (
                                  <button
                                    key={value}
                                    onClick={() => {
                                      setSelectedReminisceCategory(selectedReminisceCategory === value ? null : value)
                                      if (selectedReminisceCategory !== value) setReminisceDropdownOpen(false)
                                    }}
                                    className={`reminisce-pill ${selectedReminisceCategory === value ? 'active' : ''}`}
                                  >
                                    <span>{emoji}</span>
                                    {label}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="feed-content-wrapper">
        <div className="feed-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
            </div>
          ) : isInBrowseMode ? (
            <div className="browse-grid-container">
              {reminisceMode === 'people' && (
                <>
                  <h2 className="browse-heading">People in Your Memories</h2>
                  {peopleData.length === 0 ? (
                    <div className="empty-state"><p>No people found in your entries</p></div>
                  ) : (
                    <div className="masonry-grid">
                      {peopleData.map((person) => {
                        const initials = person.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        const avatarUrl = person.avatar_url
                        return (
                          <div key={person.id} className="card-wrapper">
                            <div
                              className="card person-tile"
                              onClick={() => setBrowsedPersonId(person.id)}
                              style={{
                                cursor: 'pointer',
                                borderRadius: '20px',
                                border: '4px solid #fff',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '32px 20px 24px',
                                background: avatarUrl ? '#000' : TYPE_GRADIENTS.contact,
                              }}
                            >
                              {avatarUrl ? (
                                <div style={{
                                  width: 80, height: 80, borderRadius: '50%',
                                  backgroundImage: `url(${avatarUrl})`,
                                  backgroundSize: 'cover', backgroundPosition: 'center',
                                  border: '3px solid rgba(255,255,255,0.3)',
                                  marginBottom: 16
                                }} />
                              ) : (
                                <div style={{
                                  width: 80, height: 80, borderRadius: '50%',
                                  background: 'rgba(255,255,255,0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 28, fontWeight: 700, color: '#fff',
                                  border: '3px solid rgba(255,255,255,0.3)',
                                  marginBottom: 16
                                }}>
                                  {initials}
                                </div>
                              )}
                              <h3 style={{
                                fontSize: 16, fontWeight: 700, color: '#fff',
                                margin: 0, textAlign: 'center', lineHeight: 1.3,
                                marginBottom: 6
                              }}>
                                {person.full_name}
                              </h3>
                              {person.relationship_type && (
                                <span style={{
                                  fontSize: 11, color: 'rgba(255,255,255,0.6)',
                                  textTransform: 'capitalize', marginBottom: 8
                                }}>
                                  {person.relationship_type}
                                </span>
                              )}
                              <span style={{
                                fontSize: 13, color: 'rgba(255,255,255,0.8)',
                                fontWeight: 600,
                                background: 'rgba(255,255,255,0.12)',
                                padding: '4px 14px', borderRadius: 12
                              }}>
                                {person.entryCount} {person.entryCount === 1 ? 'entry' : 'entries'}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {reminisceMode === 'places' && (
                <>
                  <h2 className="browse-heading">Places in Your Memories</h2>
                  {placesData.length === 0 ? (
                    <div className="empty-state"><p>No places found in your entries</p></div>
                  ) : (
                    <div className="masonry-grid">
                      {placesData.map((place) => (
                        <div key={place.name} className="card-wrapper">
                          <div
                            className="card place-tile"
                            onClick={() => setBrowsedPlace(place.name)}
                            style={{
                              cursor: 'pointer',
                              borderRadius: '20px',
                              border: '4px solid #fff',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              minHeight: place.thumbnail ? 220 : 160,
                              position: 'relative',
                              background: place.thumbnail ? '#000' : TYPE_GRADIENTS.memory,
                            }}
                          >
                            {place.thumbnail && (
                              <div style={{
                                position: 'absolute', inset: 0,
                                backgroundImage: `url(${place.thumbnail})`,
                                backgroundSize: 'cover', backgroundPosition: 'center',
                              }}>
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)'
                                }} />
                              </div>
                            )}
                            <div style={{
                              position: 'relative', zIndex: 1,
                              padding: '20px', display: 'flex',
                              flexDirection: 'column', justifyContent: 'flex-end',
                              flex: 1, gap: 8
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                <MapPin size={12} />
                                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Location</span>
                              </div>
                              <h3 style={{
                                fontSize: 18, fontWeight: 700, color: '#fff',
                                margin: 0, lineHeight: 1.3,
                              }}>
                                {place.name}
                              </h3>
                              <span style={{
                                fontSize: 13, color: 'rgba(255,255,255,0.8)',
                                fontWeight: 600,
                                background: 'rgba(255,255,255,0.12)',
                                padding: '4px 14px', borderRadius: 12,
                                width: 'fit-content'
                              }}>
                                {place.count} {place.count === 1 ? 'entry' : 'entries'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : isInBrowseDetail ? (
            <div>
              <button
                className="browse-back-btn"
                onClick={() => {
                  if (browsedPersonId) setBrowsedPersonId(null)
                  if (browsedPlace) setBrowsedPlace(null)
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to {reminisceMode === 'people' ? 'People' : 'Places'}</span>
              </button>
              <h2 className="browse-detail-heading">
                {browsedPersonName || browsedPlace}
              </h2>
              {browsedActivities.length === 0 ? (
                <div className="empty-state"><p>No entries found</p></div>
              ) : (
                <div ref={gridRef} className="masonry-grid">
                  {browsedActivities.map((activity, index) => (
                    <MasonryTile
                      key={activity.id}
                      activity={activity}
                      index={index}
                      isDarkMode={isDarkMode}
                      playingAudio={playingAudio}
                      onAudioToggle={handleAudioToggle}
                      onCardClick={(a) => {
                        setSelectedActivity(a)
                        setShowDetailModal(true)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="empty-state">
              <p>No items found</p>
            </div>
          ) : (
            <div ref={gridRef} className="masonry-columns-wrapper">
              {(() => {
                const colCount = typeof window !== 'undefined' 
                  ? window.innerWidth <= 640 ? 1 
                  : window.innerWidth <= 768 ? 2 
                  : window.innerWidth <= 1024 ? 3 
                  : window.innerWidth <= 1280 ? 4 : 5
                  : 5
                const columns: { items: ActivityItem[]; height: number }[] = 
                  Array.from({ length: colCount }, () => ({ items: [], height: 0 }))
                filteredActivities.forEach((item) => {
                  const shortest = columns.reduce((minIdx, col, idx) => 
                    col.height < columns[minIdx].height ? idx : minIdx, 0)
                  columns[shortest].items.push(item)
                  columns[shortest].height += item.thumbnail ? 340 : 200
                })
                return columns.map((col, colIdx) => (
                  <div key={colIdx} className="masonry-column">
                    {col.items.map((activity, rowIdx) => (
                      <MasonryTile 
                        key={activity.id} 
                        activity={activity} 
                        index={rowIdx} 
                        isDarkMode={isDarkMode}
                        playingAudio={playingAudio}
                        onAudioToggle={handleAudioToggle}
                        onCardClick={(a) => {
                          setSelectedActivity(a)
                          setShowDetailModal(true)
                        }}
                      />
                    ))}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>

        {/* Timeline Scrubber */}
        {viewMode === 'card' && !isInBrowseMode && timelineYears.length > 1 && (
          <div className="timeline-wrapper">
            <div 
              className="timeline-scrubber" 
              ref={timelineRef}
              onWheel={(e) => {
                e.stopPropagation()
                if (timelineRef.current) {
                  timelineRef.current.scrollTop += e.deltaY
                }
              }}
              onMouseDown={(e) => {
                const el = timelineRef.current
                if (!el) return
                el.style.cursor = 'grabbing'
                const startY = e.clientY
                const startScroll = el.scrollTop
                const onMove = (ev: MouseEvent) => {
                  el.scrollTop = startScroll - (ev.clientY - startY)
                }
                const onUp = () => {
                  el.style.cursor = 'grab'
                  window.removeEventListener('mousemove', onMove)
                  window.removeEventListener('mouseup', onUp)
                }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
              onTouchStart={(e) => {
                const el = timelineRef.current
                if (!el) return
                const startY = e.touches[0].clientY
                const startScroll = el.scrollTop
                const onMove = (ev: TouchEvent) => {
                  ev.preventDefault()
                  el.scrollTop = startScroll - (ev.touches[0].clientY - startY)
                }
                const onEnd = () => {
                  el.removeEventListener('touchmove', onMove)
                  el.removeEventListener('touchend', onEnd)
                }
                el.addEventListener('touchmove', onMove, { passive: false })
                el.addEventListener('touchend', onEnd)
              }}
            >
              <div className="timeline-spacer" />
              {timelineYears.map((year, idx) => (
                <div key={year} className="timeline-year-group">
                  <button
                    className={`timeline-year-btn ${activeTimelineYear === year ? 'active' : ''}`}
                    data-year={year}
                    onClick={() => handleTimelineYearClick(year)}
                    title={`Jump to ${year}`}
                  >
                    {year}
                  </button>
                  {idx < timelineYears.length - 1 && (
                    <div className="timeline-ticks">
                      {Array.from({ length: 11 }, (_, i) => (
                        <div key={i} className="timeline-tick" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="timeline-spacer" />
            </div>
            <div className="timeline-midpoint-indicator" />
          </div>
        )}
      </div>

      {/* Map Overlay */}
      <AnimatePresence>
        {showMapOverlay && (
          <motion.div
            className="map-overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setShowMapOverlay(false)}
          >
            <motion.div
              className="map-overlay-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="map-overlay-close"
                onClick={() => setShowMapOverlay(false)}
              >
                <X size={20} />
              </button>
              <FeedMap
                activities={activities.filter(a => (a.metadata?.lat && a.metadata?.lng) || a.metadata?.location)}
                onLocationClick={(location) => {
                  setShowMapOverlay(false)
                  setReminisceMode('places')
                  setBrowsedPlace(location)
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
      />

      {/* Engagement Modal */}
      <AnimatePresence>
        {showEngagementModal && engagementPrompt && (
          <UnifiedEngagementModal
            prompt={engagementPrompt}
            onComplete={(result) => {
              setShowEngagementModal(false)
              setEngagementPrompt(null)
              fetchActivities()
            }}
            onClose={() => {
              setShowEngagementModal(false)
              setEngagementPrompt(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Feed Detail Modal */}
      <FeedDetailModal
        activity={selectedActivity}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedActivity(null)
        }}
        onUpdate={(updatedActivity) => {
          setActivities(prev => 
            prev.map(a => a.id === updatedActivity.id ? updatedActivity : a)
          )
          setSelectedActivity(updatedActivity)
        }}
      />

      {/* Interview Modal */}
      <AnimatePresence>
        {showInterviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowInterviewModal(false); setSelectedContact('') }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New Interview</h2>
              <p className="text-gray-600 mb-4">Who would you like to interview?</p>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#406A56] text-gray-900 font-medium"
                style={{ color: '#1A1A1A' }}
              >
                <option value="" style={{ color: '#999' }}>Select a contact...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id} style={{ color: '#1A1A1A' }}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-sm text-amber-600 mb-4">No contacts found. Please add contacts first.</p>
              )}
              <div className="flex gap-3">
                <button onClick={handleCreateInterview} disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Start Interview
                </button>
                <button onClick={() => { setShowInterviewModal(false); setSelectedContact('') }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">
                {uploadStep === 'uploading' ? 'Upload Progress' : 'Add Backstory'}
              </h2>
              {uploadStep === 'uploading' && (
                <>
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#406A56] to-[#4a7a64] h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
                  </div>
                  {uploadProgress < 100 && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input type="date" value={memoryMetadata.date}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input type="text" value={memoryMetadata.location}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, location: e.target.value })}
                          placeholder="Where was this taken?"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]" />
                      </div>
                    </div>
                  )}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => {
                          const fileUrl = file.enhancedUrl || file.url || file.file_url
                          const fileType = file.file_type || (file.url?.includes('image') ? 'image' : 'video')
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              {fileUrl && <img src={fileUrl} alt={`Upload ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg" />}
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {fileType === 'image' ? '📸 Photo' : '🎥 Video'}
                                  {file.enhanced && ' (Enhanced)'}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {memoryMetadata.date} {memoryMetadata.location && `• ${memoryMetadata.location}`}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
              {uploadStep === 'backstory' && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Great! Your {uploadedFiles.length} {uploadedFiles.length === 1 ? 'photo has' : 'photos have'} been uploaded.
                  </p>
                  <p className="text-gray-600 mb-6">
                    Would you like to add the story behind {uploadedFiles.length === 1 ? 'this photo' : 'these photos'}?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={handleAddBackstory}
                      className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors">
                      Add Backstory
                    </button>
                    <button onClick={handleSkipBackstory}
                      className="flex-1 px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200">
                      Skip for Now
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PostScript Modal */}
      <AnimatePresence>
        {showPostscriptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowPostscriptModal(false); setSelectedContact('') }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New PostScript</h2>
              <p className="text-gray-600 mb-4">Who should receive this PostScript?</p>
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#406A56] text-gray-900 font-medium"
                style={{ color: '#1A1A1A' }}
              >
                <option value="" style={{ color: '#999' }}>Select a recipient...</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id} style={{ color: '#1A1A1A' }}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="text-sm text-amber-600 mb-4">No contacts found. Please add contacts first.</p>
              )}
              <div className="flex gap-3">
                <button onClick={handleCreatePostscript} disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Create PostScript
                </button>
                <button onClick={() => { setShowPostscriptModal(false); setSelectedContact('') }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
