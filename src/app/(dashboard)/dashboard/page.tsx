'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
// gsap removed - animations simplified
import { MapPin, Users, Calendar, Search, Map as MapIcon, Plus, Mic, Video, Upload, Image as ImageIcon, MessageSquare, Gift, Sparkles, BookOpen, Brain, Heart, Camera, Clock, Play, ChevronDown, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { PhotoTaggingModal } from '@/components/engagement/PhotoTaggingModal'
import { InlineAudioPlayer } from '@/components/feed/InlineAudioPlayer'
import { FeedDetailModal } from '@/components/feed/FeedDetailModal'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { useSubscription } from '@/hooks/useSubscription'
import { EngagementTile } from './components/EngagementTile'
import { EngagementOverlay } from './components/EngagementOverlay'
import { QuickActions } from './components/QuickActions'
import { AddContactModal } from '@/components/contacts/AddContactModal'
import PhotoUploadModal from '@/components/dashboard/PhotoUploadModal'
import { useDashboardData } from './hooks/useDashboardData'
import { useXpState } from './hooks/useXpState'
import {
  MilestoneModal,
  PostscriptModal,
  QuickMemoryModal,
  XpFloatingCounter,
  type Milestone,
} from './components'
import {
  TYPE_CONFIG as ENGAGEMENT_TYPE_CONFIG,
  PHOTO_TAGGING_TYPES,
  isContactPrompt,
} from './constants'

const FeedMap = dynamic(() => import('@/components/feed/FeedMap'), { ssr: false })
const BadgeDisplay = dynamic(() => import('@/components/dashboard/BadgeDisplay'), { ssr: false })
const WeeklyChallenges = dynamic(() => import('@/components/dashboard/WeeklyChallenges'), { ssr: false })
const MonthlyRecap = dynamic(() => import('@/components/dashboard/MonthlyRecap'), { ssr: false })

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

// Card heights are now determined by content (images use aspect ratio, text cards flex)

function MasonryTile({ 
  activity, 
  index, 
  isDarkMode,
  playingAudio,
  onAudioToggle,
  onCardClick,
  dataTour,
}: { 
  activity: ActivityItem
  index: number
  isDarkMode: boolean
  playingAudio: string | null
  onAudioToggle: (id: string) => void
  onCardClick: (activity: ActivityItem) => void
  dataTour?: string
}) {
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.memory_created
  
  // Get a meaningful summary - use description if it's not a generic "you created..." message
  const getSummary = () => {
    const desc = activity.description || ''
    // If description is generic ("You created...", "You added..."), return empty
    if (desc.toLowerCase().startsWith('you ')) return ''
    return desc
  }
  const summary = getSummary()

  return (
    <div className="card-wrapper" data-year={new Date(activity.timestamp).getFullYear()} {...(dataTour ? { 'data-tour': dataTour } : {})}>
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
        {/* Card Image - flexible height based on image */}
        {activity.thumbnail && (
          <div 
            style={{
              paddingTop: '75%', // 4:3 aspect ratio, can be taller
              backgroundImage: `url(${activity.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              borderRadius: '20px 20px 0 0',
            }}
          >
            {/* Gradient overlay for text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.9))'
            }} />
          </div>
        )}

        {/* Card Content */}
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
          {/* Category Badge with Icon */}
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

          {/* Title */}
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

          {/* 2-line Summary */}
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

          {/* Type-specific quick info */}
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
          
          {/* Smart category badge - shown for all types with categories */}
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
          
          {/* Interview - show contact name */}
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

          {/* Audio Player (if audio exists) */}
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

          {/* Tagged People Pills */}
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

          {/* Completeness Score - memories only */}
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

          {/* Date & Location - at bottom */}
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

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [openSubmenu, setOpenSubmenu] = useState<CategoryFilter | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { config: gamificationConfig } = useGamificationConfig()
  const [userFirstName, setUserFirstName] = useState<string>('')
  const [profileStats, setProfileStats] = useState({ memories: 0, contacts: 0, photos: 0, xp: 0 })
  const [storageInfo, setStorageInfo] = useState({ used: 0, limit: 10, percentage: 0 })
  const [streakDays, setStreakDays] = useState(0)
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
  
  // Reminisce by state
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
  
  // People data from face tags (Fix 1)
  const [peopleData, setPeopleData] = useState<any[]>([])
  const [faceTagMemoryMap, setFaceTagMemoryMap] = useState<Record<string, string[]>>({})
  
  // Timeline state
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [activeTimelineYear, setActiveTimelineYear] = useState<number>(new Date().getFullYear())
  const timelineRef = useRef<HTMLDivElement>(null)

  // ── Engagement System (from dashboard) ──
  const supabase = createClient()
  const { subscription } = useSubscription()
  
  // User ID for scoping
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUserId()
  }, [supabase])
  
  // Custom hooks for data and XP
  const {
    profile,
    stats: dashboardStats,
    userContacts: dashboardContacts,
    refreshStats: refreshDashboardStats,
  } = useDashboardData(currentUserId)
  
  const {
    totalXp,
    xpAnimating,
    lastXpGain,
    completedTiles,
    addXp,
    addCompletedTile,
  } = useXpState(currentUserId)
  
  // Engagement prompts
  const {
    prompts: rawEngagementPrompts,
    isLoading: engagementLoading,
    shuffle: engagementShuffle,
    answerPrompt: engagementAnswerPrompt,
    stats: engagementStats,
  } = useEngagementPrompts(50, null)
  
  // Track locally answered prompts
  const [answeredPromptIds, setAnsweredPromptIds] = useState<string[]>([])
  
  // Filter prompts
  const engagementContactTypes = ['quick_question', 'missing_info', 'tag_person']
  const seenTexts = new Set<string>()
  let engContactCount = 0
  
  const engagementPrompts = rawEngagementPrompts.filter(prompt => {
    if (answeredPromptIds.includes(prompt.id)) return false
    if (seenTexts.has(prompt.promptText)) return false
    seenTexts.add(prompt.promptText)
    if (engagementContactTypes.includes(prompt.type)) {
      if (engContactCount >= 2) return false
      engContactCount++
    }
    return true
  })
  
  // Modal states for engagement
  const [showEngagement, setShowEngagement] = useState(false)
  const [engagementCarouselIndex, setEngagementCarouselIndex] = useState(0)
  const [dashEngagementPrompt, setDashEngagementPrompt] = useState<any | null>(null)
  const [photoTaggingPrompt, setPhotoTaggingPrompt] = useState<any | null>(null)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [showPhotoUploadDash, setShowPhotoUploadDash] = useState(false)
  const [showPostscriptModalDash, setShowPostscriptModalDash] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showQuickMemoryModal, setShowQuickMemoryModal] = useState(false)
  const [showMonthlyRecap, setShowMonthlyRecap] = useState(false)
  
  // Monthly recap: show in first week of month if not dismissed
  useEffect(() => {
    const now = new Date()
    const isFirstWeek = now.getDate() <= 7
    const lastDismissed = localStorage.getItem('yt_recap_dismissed')
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`
    if (isFirstWeek && lastDismissed !== currentMonth) {
      setShowMonthlyRecap(true)
    }
  }, [])
  
  // Handle card answer (from flipped card in overlay)
  const handleCardAnswer = useCallback(async (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => {
    const prompt = engagementPrompts.find(p => p.id === promptId)
    if (!prompt) return

    try {
      const result = await engagementAnswerPrompt(promptId, response) as any
      const config = ENGAGEMENT_TYPE_CONFIG[prompt.type] || ENGAGEMENT_TYPE_CONFIG.memory_prompt

      addCompletedTile({
        id: promptId,
        type: prompt.type,
        title: prompt.promptText?.substring(0, 40) || config.label,
        xp: config.xp,
        contactName: prompt.contactName,
        contactId: prompt.contactId || result?.contactId,
      })

      if (config.xp > 0) {
        addXp(config.xp)
      }

      setAnsweredPromptIds(prev => [...prev, promptId])
      refreshDashboardStats()
    } catch (err) {
      console.error('Error answering prompt:', err)
      throw err
    }
  }, [engagementPrompts, engagementAnswerPrompt, addCompletedTile, addXp, refreshDashboardStats])

  // Handle engagement modal completion
  const handleEngagementComplete = useCallback(async (result: {
    memoryId?: string
    responseText?: string
    xpAwarded: number
  }) => {
    if (!dashEngagementPrompt) return

    const config = ENGAGEMENT_TYPE_CONFIG[dashEngagementPrompt.type] || ENGAGEMENT_TYPE_CONFIG.memory_prompt
    const xpGained = result.xpAwarded || config.xp

    addCompletedTile({
      id: dashEngagementPrompt.id,
      type: dashEngagementPrompt.type,
      title: dashEngagementPrompt.promptText?.substring(0, 40) || config.label,
      xp: xpGained,
      photoUrl: dashEngagementPrompt.photoUrl,
      contactName: dashEngagementPrompt.contactName,
      contactId: dashEngagementPrompt.contactId,
      memoryId: result.memoryId,
      resultMemoryId: result.memoryId,
    })

    if (xpGained > 0) {
      addXp(xpGained)
    }

    setDashEngagementPrompt(null)
    setAnsweredPromptIds(prev => [...prev, dashEngagementPrompt.id])
    refreshDashboardStats()
    engagementShuffle()
  }, [dashEngagementPrompt, addCompletedTile, addXp, refreshDashboardStats, engagementShuffle])

  // Handle shuffle
  const handleEngagementShuffle = useCallback(() => {
    engagementShuffle()
  }, [engagementShuffle])

  // Helper functions
  const getPromptText = (prompt: any) => {
    if (prompt.promptText && prompt.promptText.trim()) {
      let text = prompt.promptText
      const contactName = prompt.contactName || prompt.contact_name || prompt.metadata?.contact?.name || 'this person'
      text = text.replace(/\{\{contact_name\}\}/gi, contactName)
      text = text.replace(/\{\{occupation\}\}/gi, prompt.personalizationContext?.occupation || 'your work')
      return text
    }

    if (isContactPrompt(prompt.type)) {
      const contactName = prompt.contactName || prompt.metadata?.contact?.name || 'this contact'
      if (prompt.missingField) {
        const labels: Record<string, string> = {
          phone: 'phone number', email: 'email address', date_of_birth: 'birthday',
          birth_date: 'birthday', how_met: 'story of how you met', relationship: 'relationship to you',
          nickname: 'nickname', notes: 'a story about them', address: 'address',
          company: 'workplace', job_title: 'job title',
        }
        if (prompt.missingField === 'how_met') return `How did you and ${contactName} first meet?`
        if (prompt.missingField === 'relationship') return `How would you describe your relationship with ${contactName}?`
        if (prompt.missingField === 'notes' || prompt.missingField === 'contact_story') {
          const fallbacks = [
            `What's your favorite memory with ${contactName}?`,
            `What makes ${contactName} special to you?`,
          ]
          return fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }
        return `What is ${contactName}'s ${labels[prompt.missingField] || prompt.missingField.replace(/_/g, ' ')}?`
      }
      const genericFallbacks = [
        `What's a great memory you have with ${contactName}?`,
        `What do you admire about ${contactName}?`,
      ]
      return genericFallbacks[Math.floor(Math.random() * genericFallbacks.length)]
    }
    return prompt.promptText || 'Share something meaningful...'
  }

  // ── End Engagement System ──

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
      console.log('[BirthYear] profile:', profile, 'dob:', profile?.date_of_birth)
      if (profile?.date_of_birth) {
        const year = new Date(profile.date_of_birth).getFullYear()
        console.log('[BirthYear] Setting birth year to:', year)
        setBirthYear(year)
      } else {
        console.log('[BirthYear] No date_of_birth found')
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

      console.log('[PeopleData] Starting fetch. contacts:', contactsList.length, 'activities:', activitiesList.length)

      // Fetch face tags (same approach as PeopleBrowse component)
      const { data: faceTags, error: ftError } = await supabase
        .from('memory_face_tags')
        .select(`
          contact_id,
          memory_media!inner(memory_id)
        `)
        .eq('user_id', user.id)
        .not('contact_id', 'is', null)

      console.log('[PeopleData] Face tags:', faceTags?.length || 0, 'error:', ftError?.message || 'none')

      // Count unique memory_id per contact_id
      const memoryCountMap: Record<string, Set<string>> = {}
      faceTags?.forEach((tag: any) => {
        const contactId = tag.contact_id
        const memoryId = tag.memory_media?.memory_id
        if (contactId && memoryId) {
          if (!memoryCountMap[contactId]) memoryCountMap[contactId] = new Set()
          memoryCountMap[contactId].add(memoryId)
        }
      })

      // Store for later use
      const faceTagMap: Record<string, string[]> = {}
      Object.entries(memoryCountMap).forEach(([cid, mids]) => {
        faceTagMap[cid] = Array.from(mids)
      })
      setFaceTagMemoryMap(faceTagMap)

      // SECONDARY: activity metadata matches
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

      // Build contact map for quick lookup
      const contactMap = new Map(contactsList.map(c => [c.id, c]))

      // Find contacts from face tags that might not be in contactsList
      const allContactIds = new Set([
        ...contactsList.map(c => c.id),
        ...Object.keys(memoryCountMap)
      ])

      // Fetch any missing contacts from face tags
      const missingIds = Object.keys(memoryCountMap).filter(id => !contactMap.has(id))
      if (missingIds.length > 0) {
        const { data: extraContacts } = await supabase
          .from('contacts')
          .select('id, full_name, avatar_url, relationship_type')
          .in('id', missingIds)
        extraContacts?.forEach(c => contactMap.set(c.id, c))
      }

      // Merge ALL unique contacts
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

      console.log('[PeopleData] Result:', merged.length, 'people')
      setPeopleData(merged)
    } catch (err) {
      console.error('Error fetching people data:', err)
    }
  }, [])

  useEffect(() => {
    fetchUserName()
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
      
      if (error) {
        console.error('Error fetching contacts:', error)
        return
      }

      if (data) {
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
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get contact details
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) {
        throw new Error('Contact not found')
      }
      
      // Create interview session with title
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

      if (error) {
        console.error('Interview creation error:', error)
        throw error
      }

      // Navigate to journalist page to select questions
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
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      // Get contact details
      const selectedContactData = contacts.find(c => c.id === selectedContact)
      if (!selectedContactData) {
        throw new Error('Contact not found')
      }
      
      // Create postscript
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

      if (error) {
        console.error('PostScript creation error:', error)
        throw error
      }

      // Navigate to postscript edit page to set delivery time and content
      window.location.href = `/dashboard/postscripts/${postscript.id}`
    } catch (err) {
      console.error('Error creating postscript:', err)
      alert('Failed to create postscript: ' + (err as Error).message)
    }
  }

  const fetchUserName = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        const firstName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || ''
        const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1)
        setUserFirstName(capitalized)

        // XP from localStorage (same key as useXpState hook)
        try {
          const savedXp = localStorage.getItem(`yt_total_xp_${user.id}`)
          if (savedXp) setProfileStats(prev => ({ ...prev, xp: parseInt(savedXp, 10) || 0 }))
        } catch {}

        // Record daily activity (updates streak) + fetch current streak
        try {
          const { data: streakResult } = await supabase.rpc('record_daily_activity', {
            p_user_id: user.id,
            p_activity_type: 'app_usage',
          })
          const streak = streakResult?.[0]?.streak || streakResult?.streak
          if (streak) setStreakDays(prev => Math.max(prev, streak))
        } catch {}
        // Fallback: read from table if RPC didn't return
        try {
          const { data: engStats } = await supabase
            .from('engagement_stats')
            .select('current_streak_days')
            .eq('user_id', user.id)
            .single()
          if (engStats?.current_streak_days) setStreakDays(prev => Math.max(prev, engStats.current_streak_days))
        } catch {}

        // Fetch stats in parallel
        const [memoriesRes, contactsRes, photosRes] = await Promise.all([
          supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('memory_media').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('file_type', 'image'),
        ])
        setProfileStats(prev => ({
          ...prev,
          memories: memoriesRes.count || 0,
          contacts: contactsRes.count || 0,
          photos: photosRes.count || 0,
        }))

        // Fetch comprehensive storage usage from API
        try {
          const storageRes = await fetch('/api/storage/usage')
          if (storageRes.ok) {
            const storage = await storageRes.json()
            setStorageInfo({
              used: storage.used_gb || 0,
              limit: storage.limit_gb || 10,
              percentage: storage.percentage || 0,
            })
          }
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching user name:', err)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activity?limit=200&includePostscripts=true')
      if (res.ok) {
        const data = await res.json()
        console.log('[Feed] API returned', data.activities?.length, 'activities, total:', data.total)
        const debugYears = [...new Set((data.activities || []).map((a: any) => new Date(a.timestamp).getFullYear()))].sort((a, b) => (b as number) - (a as number))
        console.log('[Feed] Years in data:', debugYears)
        const filtered = (data.activities || [])
          .filter((a: ActivityItem) => a.type !== 'xp_earned')
          .map((a: ActivityItem) => ({
            ...a,
            // Sanitize non-URL thumbnails (e.g. "conversation", "text-only")
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

  const animateIn = () => {
    // Animation removed for cleaner UX
  }

  // Fetch people data when activities are loaded (contacts may be empty)
  useEffect(() => {
    if (activities.length > 0) {
      fetchPeopleData(contacts, activities)
    }
  }, [contacts, activities, fetchPeopleData])

  const handleCategoryClick = (categoryId: CategoryFilter) => {
    // Reset browse modes when clicking any main category
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
    console.log('Quick action:', action)
    
    switch(action) {
      case 'add_memory':
        // Open engagement modal with a memory prompt
        setEngagementPrompt({
          id: 'quick-add-memory',
          type: 'memory',
          promptText: 'What memory would you like to capture?',
          metadata: { category: 'moment' }
        })
        setShowEngagementModal(true)
        break
        
      case 'upload_memory':
        // Open file browser for media upload
        fileInputRef.current?.click()
        break
        
      case 'random_memory':
        // Fetch a random memory prompt from engagement cluster
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            console.log('Full engagement API response:', data)
            
            // Check all possible structures
            const allPrompts = data.prompts || data || []
            console.log('All prompts:', allPrompts)
            console.log('Sample prompt structure:', allPrompts[0])
            
            const memoryPrompts = allPrompts.filter((p: any) => 
              p.type === 'memory' || p.type === 'moment' || p.prompt_type === 'memory'
            )
            
            console.log('Memory prompts filtered:', memoryPrompts.length)
            
            // If no memory prompts found, use any prompt as a memory
            const targetPrompts = memoryPrompts.length > 0 ? memoryPrompts : allPrompts.slice(0, 10)
            console.log('Using prompts:', targetPrompts.length, 'from', memoryPrompts.length > 0 ? 'memory filter' : 'any prompts')
            
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              console.log('Selected random prompt:', randomPrompt)
              
              // Map API structure to modal expected structure
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
            } else if (allPrompts.length > 0) {
              // Fallback: use any prompt and treat it as a memory
              console.warn('No memory prompts found by filter, using any available prompt')
              const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
              
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: 'memory', // Force type to memory
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What would you like to remember?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else {
              console.error('No prompts available at all')
              alert('No prompts available')
            }
          } else {
            const errorText = await res.text()
            console.error('Failed to fetch prompts:', res.status, res.statusText, errorText)
            alert('Could not load memory prompts')
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
          alert('Could not load memory prompts')
        }
        break
        
      case 'add_wisdom':
        // Open engagement modal with wisdom prompt
        setEngagementPrompt({
          id: 'quick-add-wisdom',
          type: 'wisdom',
          promptText: 'What wisdom would you like to share?',
          metadata: { category: 'general' }
        })
        setShowEngagementModal(true)
        break
        
      case 'random_wisdom':
        // Fetch a random wisdom prompt
        try {
          const res = await fetch('/api/engagement/prompts?count=50&regenerate=true')
          if (res.ok) {
            const data = await res.json()
            console.log('Full engagement API response:', data)
            
            const allPrompts = data.prompts || data || []
            console.log('All prompts:', allPrompts)
            
            const wisdomPrompts = allPrompts.filter((p: any) => 
              p.type === 'wisdom' || p.prompt_type === 'wisdom'
            )
            
            console.log('Wisdom prompts filtered:', wisdomPrompts.length)
            
            // If no wisdom prompts found, use any prompt as wisdom
            const targetPrompts = wisdomPrompts.length > 0 ? wisdomPrompts : allPrompts.slice(0, 10)
            console.log('Using prompts:', targetPrompts.length, 'from', wisdomPrompts.length > 0 ? 'wisdom filter' : 'any prompts')
            
            if (targetPrompts.length > 0) {
              const randomPrompt = targetPrompts[Math.floor(Math.random() * targetPrompts.length)]
              console.log('Selected random wisdom:', randomPrompt)
              
              // Map API structure to modal expected structure
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
            } else if (allPrompts.length > 0) {
              // Fallback: use any prompt and treat it as wisdom
              console.warn('No wisdom prompts found by filter, using any available prompt')
              const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
              
              setEngagementPrompt({
                id: randomPrompt.id || `random-${Date.now()}`,
                type: 'wisdom', // Force type to wisdom
                promptText: randomPrompt.prompt_text || randomPrompt.text || randomPrompt.promptText || 'What wisdom would you like to share?',
                photoUrl: randomPrompt.photo_url || randomPrompt.photoUrl,
                contactName: randomPrompt.contact_name || randomPrompt.contactName,
                contactId: randomPrompt.contact_id || randomPrompt.contactId,
                metadata: randomPrompt.metadata || {}
              })
              setShowEngagementModal(true)
            } else {
              console.error('No prompts available at all')
              alert('No prompts available')
            }
          } else {
            const errorText = await res.text()
            console.error('Failed to fetch prompts:', res.status, res.statusText, errorText)
            alert('Could not load wisdom prompts')
          }
        } catch (err) {
          console.error('Error fetching prompts:', err)
          alert('Could not load wisdom prompts')
        }
        break
        
      case 'upload_media':
        // Open file browser for media upload
        fileInputRef.current?.click()
        break
        
      case 'digitize_photos':
        // Open camera for photo capture
        cameraInputRef.current?.click()
        break
        
      case 'new_interview':
        // Fetch contacts then open modal
        await fetchContacts()
        setShowInterviewModal(true)
        break
        
      case 'add_postscript':
        // Fetch contacts then open modal
        await fetchContacts()
        setShowPostscriptModal(true)
        break
        
      default:
        console.warn('Unknown action:', action)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    console.log('Files selected for upload:', fileArray.length)

    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create a memory
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

      if (memoryError) {
        console.error('Memory creation error:', memoryError)
        throw new Error(memoryError.message || 'Failed to create memory')
      }

      setUploadedMemoryId(memory.id)

      setUploadProgress(30)

      // Upload photos to this memory (one at a time)
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
          
          // Auto-trigger face detection for images
          if (result.file_type?.includes('image') || file.type.startsWith('image/')) {
            console.log('Running face detection on uploaded image:', result.id)
            fetch(`/api/media/${result.id}/detect-faces`, { 
              method: 'POST' 
            }).then(res => res.json()).then(faceResult => {
              if (faceResult.facesDetected > 0) {
                console.log(`Detected ${faceResult.facesDetected} face(s), auto-tagged: ${faceResult.autoTagged}`)
              }
            }).catch(err => {
              console.warn('Face detection failed:', err)
            })
          }
        } else {
          const error = await response.json()
          console.error('Upload failed for file:', file.name, error)
          throw new Error(error.error || 'Upload failed')
        }
      }

      setUploadedFiles(uploadedResults)
      setUploadProgress(100)
      
      // Move to backstory step
      setTimeout(() => {
        setUploadStep('backstory')
      }, 500)
    } catch (err) {
      console.error('Error uploading files:', err)
      alert('Upload error: ' + (err as Error).message)
      setShowUploadModal(false)
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
    
    // Open engagement modal with memory context
    setEngagementPrompt({
      id: uploadedMemoryId,
      type: 'memory',
      promptText: 'Tell us about these photos. What was happening?',
      metadata: {
        memoryId: uploadedMemoryId,
        isBackstory: true
      }
    })
    setShowEngagementModal(true)
    setShowUploadModal(false)
    
    // Reset upload state
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
    console.log('Photo captured:', file.name)

    setShowUploadModal(true)
    setUploadProgress(0)
    setUploadedFiles([])
    setUploadStep('uploading')
    setUploadedMemoryId(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Create a memory for the digitized photo
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

      if (memoryError) {
        console.error('Memory creation error:', memoryError)
        throw new Error(memoryError.message || 'Failed to create memory')
      }

      setUploadedMemoryId(memory.id)

      setUploadProgress(30)

      // Upload the photo
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
        
        console.log('Photo uploaded:', photoUrl)
        
        setUploadProgress(80)
        
        // Try to enhance it
        try {
          const enhanceRes = await fetch('/api/digitize/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: photoUrl })
          })

          if (enhanceRes.ok) {
            const { enhancedUrl } = await enhanceRes.json()
            console.log('Photo enhanced:', enhancedUrl)
            uploadedFile.enhanced = true
            uploadedFile.enhancedUrl = enhancedUrl
          }
        } catch (enhanceErr) {
          console.warn('Enhancement error:', enhanceErr)
        }
        
        // Auto-trigger face detection
        console.log('Running face detection on captured photo:', uploadedFile.id)
        fetch(`/api/media/${uploadedFile.id}/detect-faces`, { 
          method: 'POST' 
        }).then(res => res.json()).then(faceResult => {
          if (faceResult.facesDetected > 0) {
            console.log(`Detected ${faceResult.facesDetected} face(s), auto-tagged: ${faceResult.autoTagged}`)
          }
        }).catch(err => {
          console.warn('Face detection failed:', err)
        })

        setUploadedFiles([uploadedFile])
        setUploadProgress(100)
        
        setTimeout(() => {
          setUploadStep('backstory')
        }, 500)
      } else {
        const error = await uploadRes.json()
        throw new Error(error.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error capturing photo:', err)
      alert('Capture error: ' + (err as Error).message)
      setShowUploadModal(false)
    }

    // Reset the input
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
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
      // 'all' — exclude shared items
      filtered = activities.filter(a => !SHARED_TYPES.includes(a.type))
    }

    // Apply Reminisce filters on top (year handled by timeline scroll, not filtering)
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

  // Extract unique values from activities for Reminisce submenus
  const uniqueYears = [...new Set(activities.map(a => new Date(a.timestamp).getFullYear()))].sort((a, b) => b - a)
  
  const uniquePlaces = [...new Set(
    activities
      .map(a => a.metadata?.location)
      .filter((loc): loc is string => !!loc && loc.trim() !== '')
  )].sort()

  const uniquePeople = [...new Set(
    activities.flatMap(a => {
      const names: string[] = []
      if (a.metadata?.tagged_people) names.push(...a.metadata.tagged_people)
      if (a.metadata?.contactName) names.push(a.metadata.contactName)
      if (a.metadata?.recipient_name) names.push(a.metadata.recipient_name)
      return names
    }).filter(n => n && n.trim() !== '')
  )].sort()

  // peopleData is now a state variable populated by fetchPeopleData()

  // Compute places browse data: unique locations with thumbnails and counts
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

  // Get activities for a specific person (by contact id)
  // Includes both metadata matches AND face-tag-based memory matches
  const getActivitiesForPerson = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return []
    
    // Get memory IDs from face tags for this contact
    const faceTagMemoryIds = new Set(faceTagMemoryMap[contactId] || [])
    
    return activities.filter(a => {
      // Match via face tags: activity has a memoryId that's in the face tag set
      if (a.metadata?.memoryId && faceTagMemoryIds.has(a.metadata.memoryId)) {
        return true
      }
      
      // Match via activity metadata (secondary)
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

  // Get activities for a specific place
  const getActivitiesForPlace = (location: string) => {
    return activities.filter(a => a.metadata?.location?.trim() === location)
  }

  // Timeline years — always use current year as latest, birth year as earliest
  const timelineYears = (() => {
    const currentYear = new Date().getFullYear()
    const latestYear = uniqueYears.length > 0 ? Math.max(currentYear, uniqueYears[0]) : currentYear
    const oldestDataYear = uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : latestYear
    const startYear = birthYear || (uniqueYears.length > 0 ? oldestDataYear : latestYear - 5)
    console.log('[Timeline] latestYear:', latestYear, 'oldestData:', oldestDataYear, 'birthYear:', birthYear, 'startYear:', startYear)
    const years: number[] = []
    for (let y = latestYear; y >= startYear; y--) {
      years.push(y)
    }
    return years
  })()

  // Timeline scroll → detect year at midpoint → filter tiles
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

  // Scroll tiles to a specific year
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

  // On mount: position timeline so 2026 is at the midpoint indicator
  const timelineInitialized = useRef(false)
  useEffect(() => {
    if (timelineInitialized.current) return
    const el = timelineRef.current
    if (!el || timelineYears.length === 0) return
    // Need a small delay for DOM to be ready
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
    // Scroll the timeline so clicked year is at midpoint
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

  // Sync: when user scrolls main content, update timeline to match visible year
  const scrollSyncRef = useRef(false) // prevent feedback loops
  useEffect(() => {
    const handleMainScroll = () => {
      if (scrollSyncRef.current) return // skip if timeline initiated this scroll
      if (!gridRef.current || !timelineRef.current) return
      
      const cards = gridRef.current.querySelectorAll('.card-wrapper[data-year]')
      if (cards.length === 0) return
      
      // Find the card closest to top of viewport
      const viewportTop = window.scrollY + 200 // offset for header
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
          // Scroll timeline to this year
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

  // Prevent feedback loop: when scrollTilesToYear is called from timeline, skip main scroll handler
  const originalScrollTilesToYear = scrollTilesToYear
  const syncedScrollTilesToYear = useCallback((year: number) => {
    scrollSyncRef.current = true
    originalScrollTilesToYear(year)
    // Reset after scroll animation completes
    setTimeout(() => { scrollSyncRef.current = false }, 1000)
  }, [originalScrollTilesToYear])

  // Check if we're in a browse mode (people/places tiles shown)
  const isInBrowseMode = (reminisceMode === 'people' && !browsedPersonId) || (reminisceMode === 'places' && !browsedPlace)
  const isInBrowseDetail = (reminisceMode === 'people' && !!browsedPersonId) || (reminisceMode === 'places' && !!browsedPlace)
  
  // Get browsed activities
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

  // Close reminisce dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reminisceRef.current && !reminisceRef.current.contains(e.target as Node)) {
        setReminisceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (filteredActivities.length > 0 && viewMode === 'card') {
      setTimeout(() => {
        animateIn()
        setupScrollAnimation()
      }, 50)
    }
  }, [filteredActivities, viewMode])

  const setupScrollAnimation = () => {
    // Scroll animations removed for cleaner UX
  }

  // Compute reminisce dropdown button display
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

  // Derived values for sidebar profile card
  const sidebarFirstName = profile?.full_name?.split(' ')[0] || userFirstName || 'there'
  const sidebarStreakDays = Math.max(engagementStats?.currentStreakDays ?? 0, streakDays)
  const sidebarStorageUsed = subscription?.storage?.total_bytes ? subscription.storage.total_bytes / (1024 * 1024 * 1024) : storageInfo.used
  const sidebarStorageLimit = subscription?.storage?.limit_bytes ? subscription.storage.limit_bytes / (1024 * 1024 * 1024) : storageInfo.limit
  const sidebarStoragePercentage = subscription?.storage?.percentage || storageInfo.percentage

  return (
    <div className="feed-page" data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* ── Left Sidebar — fixed position ── */}
      <aside className="dashboard-sidebar" style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        width: '280px',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 12px 12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10,
      }}>
          {/* Profile Card */}
          <div className="profile-card-feed" style={{
            borderRadius: '16px',
            padding: '16px 20px',
          }}>
              {/* Name + Streak */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 className="profile-card-name" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  Hey {sidebarFirstName}
                </h2>
                {sidebarStreakDays > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '3px 8px',
                    background: 'linear-gradient(90deg, rgba(217,198,26,0.15), rgba(195,95,51,0.15))',
                    borderRadius: '12px',
                  }}>
                    <span style={{ fontSize: '13px' }}>🔥</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#C35F33' }}>{sidebarStreakDays}</span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="profile-card-stats" style={{ display: 'flex', alignItems: 'center', textAlign: 'center', marginBottom: '12px' }}>
                <Link href="/dashboard/memories" style={{ flex: 1, textDecoration: 'none' }}>
                  <div className="profile-stat-value">{dashboardStats?.memories ?? profileStats.memories}</div>
                  <div className="profile-stat-label">Memories</div>
                </Link>
                <Link href="/dashboard/contacts" className="profile-stat-bordered" style={{ flex: 1, textDecoration: 'none' }}>
                  <div className="profile-stat-value">{dashboardStats?.contacts ?? profileStats.contacts}</div>
                  <div className="profile-stat-label">People</div>
                </Link>
                <Link href="/dashboard/gallery" className="profile-stat-bordered-r" style={{ flex: 1, textDecoration: 'none' }}>
                  <div className="profile-stat-value">{dashboardStats?.photos ?? profileStats.photos}</div>
                  <div className="profile-stat-label">Photos</div>
                </Link>
                <div style={{ flex: 1 }}>
                  <div className={`profile-stat-xp ${xpAnimating ? 'animate-pulse' : ''}`}>{totalXp.toLocaleString()}</div>
                  <div className="profile-stat-label-xp">
                    <span>⚡</span> XP
                  </div>
                </div>
              </div>

              {/* XP Level + Progress */}
              {(() => {
                const lvl = getXpLevel(totalXp, gamificationConfig.xpLevels)
                return (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }} className="profile-card-name">
                        {lvl.emoji} {lvl.title}
                      </span>
                      {lvl.nextLevel && (
                        <span style={{ fontSize: '10px', color: '#888' }}>
                          {lvl.xpToNext} XP to {lvl.nextLevel.title}
                        </span>
                      )}
                    </div>
                    <div style={{ height: '4px', background: 'rgba(217,198,26,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '2px',
                        width: `${lvl.progress}%`,
                        background: 'linear-gradient(90deg, #D9C61A, #E8D84A)',
                        transition: 'width 0.8s ease-out',
                      }} />
                    </div>
                  </div>
                )
              })()}

              {/* Badges */}
              <BadgeDisplay />

              {/* Storage Bar */}
              <div className="profile-storage">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="profile-storage-label">Storage</span>
                  <span className="profile-storage-value">
                    {sidebarStorageUsed < 0.1 
                      ? `${(sidebarStorageUsed * 1024).toFixed(0)} MB` 
                      : `${sidebarStorageUsed.toFixed(1)} GB`
                    } / {sidebarStorageLimit.toFixed(0)} GB
                  </span>
                </div>
                <div className="profile-storage-track">
                  <div style={{
                    height: '100%',
                    borderRadius: '3px',
                    width: `${Math.min(sidebarStoragePercentage, 100)}%`,
                    background: sidebarStoragePercentage >= 90
                      ? 'linear-gradient(90deg, #C35F33, #dc2626)'
                      : 'linear-gradient(90deg, #406A56, #8DACAB)',
                    transition: 'width 0.8s ease-out',
                  }} />
                </div>
              </div>
            </div>

          {/* Weekly Challenges */}
          <WeeklyChallenges />

          {/* Quick Actions */}
          <QuickActions
            onPhotoUpload={() => setShowPhotoUploadDash(true)}
            onAddContact={() => setShowContactModal(true)}
            onQuickMemory={() => setShowQuickMemoryModal(true)}
          />

          {/* Engagement Tile */}
          <div data-tour="engagement-prompts">
            <EngagementTile
              nextPrompt={engagementPrompts[0] || null}
              totalWaiting={engagementPrompts.length}
              onOpen={() => setShowEngagement(true)}
            />
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="dashboard-main" style={{ marginLeft: '280px', padding: '70px 24px 24px 24px', minHeight: '100vh' }}>
          <div className="header-controls">
            {/* Category Nav Row — sticky */}
            <div className="controls-row">
              {/* Left: Category Pills */}
              <div className="filter-tags" data-tour="category-tabs">
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

              {/* Center: Search + Map Button */}
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

              {/* Right: Reminisce By Dropdown */}
              <div className="reminisce-dropdown-wrapper" ref={reminisceRef} data-tour="filter-dropdown">
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

                {/* Clear filter button */}
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

                {/* Dropdown Menu */}
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
                                  // People/Places: toggle browse mode and close dropdown
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
                                  // Moods/Categories: toggle submenu
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

                            {/* Submenu pills for active mode (moods/categories only - people/places use browse mode) */}
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

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="theme-toggle"
                aria-label="Toggle theme"
                style={{ marginLeft: '8px', flexShrink: 0 }}
              >
                {isDarkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Sub-options — expand below the sticky nav */}
            <AnimatePresence>
              {openSubmenu && QUICK_ACTIONS[openSubmenu] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="quick-actions-row"
                  data-tour="category-submenu"
                  style={{ marginTop: '8px' }}
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
          </div>

          {/* Mobile-only: compact profile bar + quick actions (below sticky header) */}
          <div className="mobile-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  Hey {sidebarFirstName}
                </h2>
                {sidebarStreakDays > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px' }}>
                    🔥 <span style={{ fontWeight: '700', color: '#C35F33' }}>{sidebarStreakDays}</span>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                <Sparkles size={14} style={{ color: '#D9C61A' }} />
                {totalXp} XP
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <QuickActions
                onPhotoUpload={() => setShowPhotoUploadDash(true)}
                onAddContact={() => setShowContactModal(true)}
                onQuickMemory={() => setShowQuickMemoryModal(true)}
              />
            </div>
            {engagementPrompts.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <EngagementTile
                  nextPrompt={engagementPrompts[0] || null}
                  totalWaiting={engagementPrompts.length}
                  onOpen={() => setShowEngagement(true)}
                />
              </div>
            )}
          </div>

          {/* Feed Content */}
          <div className="feed-content-area" style={{
            marginTop: openSubmenu && QUICK_ACTIONS[openSubmenu] ? '90px' : '30px',
            transition: 'margin-top 0.3s ease',
          }}>
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
            </div>
          ) : isInBrowseMode ? (
            /* ── People / Places Browse Grid ── */
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
            /* ── Filtered activities for a person/place ── */
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
                // Shortest-column greedy: place each item in the shortest column
                // This keeps columns balanced so items at the same visual height
                // come from similar positions in the sorted (chronological) list
                const colCount = typeof window !== 'undefined' 
                  ? window.innerWidth <= 640 ? 1 
                  : window.innerWidth <= 768 ? 2 
                  : window.innerWidth <= 1024 ? 3 
                  : window.innerWidth <= 1280 ? 4 : 5
                  : 5
                const columns: { items: ActivityItem[]; height: number }[] = 
                  Array.from({ length: colCount }, () => ({ items: [], height: 0 }))
                filteredActivities.forEach((item) => {
                  // Find shortest column
                  const shortest = columns.reduce((minIdx, col, idx) => 
                    col.height < columns[minIdx].height ? idx : minIdx, 0)
                  columns[shortest].items.push(item)
                  // Estimate height: cards with images are taller
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
                        dataTour={colIdx === 0 && rowIdx === 0 ? 'first-tile' : undefined}
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

        {/* ── Vertical Timeline Scrubber ── */}
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
            {/* Top spacer so first year can sit at midpoint */}
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
                {/* Month tick marks between years */}
                {idx < timelineYears.length - 1 && (
                  <div className="timeline-ticks">
                    {Array.from({ length: 11 }, (_, i) => (
                      <div key={i} className="timeline-tick" />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Bottom spacer so last year can sit at midpoint */}
            <div className="timeline-spacer" />
          </div>
            {/* Midpoint indicator — right side */}
            <div className="timeline-midpoint-indicator" />
          </div>
        )}
          </div>{/* end feed-content-area */}
        </main>{/* end main content */}

      {/* ── Map Overlay ── */}
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

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Hidden camera input for digitizing photos */}
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
              console.log('Engagement completed:', result)
              setShowEngagementModal(false)
              setEngagementPrompt(null)
              // Refresh activities after submission
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
          // Update the activity in the list AND the selected activity (so modal reflects changes)
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
            onClick={() => {
              setShowInterviewModal(false)
              setSelectedContact('')
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New Interview</h2>
              <p className="text-gray-600 mb-4">
                Who would you like to interview?
              </p>
              
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
                <p className="text-sm text-amber-600 mb-4">
                  No contacts found. Please add contacts first in the Contacts section.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreateInterview}
                  disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Interview
                </button>
                <button
                  onClick={() => {
                    setShowInterviewModal(false)
                    setSelectedContact('')
                  }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress Modal */}
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
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">
                {uploadStep === 'uploading' ? 'Upload Progress' : 'Add Backstory'}
              </h2>
              
              {uploadStep === 'uploading' && (
                <>
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#406A56] to-[#4a7a64] h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
                  </div>

                  {/* Metadata Editing */}
                  {uploadProgress < 100 && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={memoryMetadata.date}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          value={memoryMetadata.location}
                          onChange={(e) => setMemoryMetadata({ ...memoryMetadata, location: e.target.value })}
                          placeholder="Where was this taken?"
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#406A56]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => {
                          const fileUrl = file.enhancedUrl || file.url || file.file_url
                          const fileType = file.file_type || (file.url?.includes('image') ? 'image' : 'video')
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                              {fileUrl && (
                                <img 
                                  src={fileUrl} 
                                  alt={`Upload ${idx + 1}`} 
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
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
                    Would you like to add the story behind {uploadedFiles.length === 1 ? 'this photo' : 'these photos'}? You can share what was happening, who was there, or any special memories.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddBackstory}
                      className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors"
                    >
                      Add Backstory
                    </button>
                    <button
                      onClick={handleSkipBackstory}
                      className="flex-1 px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                    >
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
            onClick={() => {
              setShowPostscriptModal(false)
              setSelectedContact('')
            }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                mass: 0.8,
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-semibold mb-4 text-[#2d2d2d]">New PostScript</h2>
              <p className="text-gray-600 mb-4">
                Who should receive this PostScript?
              </p>
              
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
                <p className="text-sm text-amber-600 mb-4">
                  No contacts found. Please add contacts first in the Contacts section.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCreatePostscript}
                  disabled={!selectedContact}
                  className="flex-1 px-6 py-3 bg-[#406A56] text-white font-medium rounded-xl hover:bg-[#4a7a64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create PostScript
                </button>
                <button
                  onClick={() => {
                    setShowPostscriptModal(false)
                    setSelectedContact('')
                  }}
                  className="px-6 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dashboard Engagement Overlay ── */}
      <EngagementOverlay
        isOpen={showEngagement}
        onClose={() => setShowEngagement(false)}
        prompts={engagementPrompts}
        isLoading={engagementLoading}
        answeredPromptIds={answeredPromptIds}
        onAnsweredPromptIds={setAnsweredPromptIds}
        onCardAnswer={handleCardAnswer}
        onShuffle={handleEngagementShuffle}
        answerPrompt={engagementAnswerPrompt}
        getPromptText={getPromptText}
        totalXp={totalXp}
        xpAnimating={xpAnimating}
        lastXpGain={lastXpGain}
        addXp={addXp}
        addCompletedTile={addCompletedTile}
        refreshStats={refreshDashboardStats}
        educationLevel={profile?.education_level}
        userContacts={dashboardContacts}
        carouselIndex={engagementCarouselIndex}
        onCarouselIndexChange={setEngagementCarouselIndex}
      />

      {/* Monthly Recap Popup */}
      {showMonthlyRecap && (
        <MonthlyRecap onClose={() => {
          setShowMonthlyRecap(false)
          const now = new Date()
          localStorage.setItem('yt_recap_dismissed', `${now.getFullYear()}-${now.getMonth()}`)
        }} />
      )}

      {/* Dashboard Engagement Modals */}
      <AnimatePresence>
        {dashEngagementPrompt && (
          <UnifiedEngagementModal
            prompt={dashEngagementPrompt}
            expectedXp={ENGAGEMENT_TYPE_CONFIG[dashEngagementPrompt.type]?.xp || 15}
            onComplete={handleEngagementComplete}
            onClose={() => setDashEngagementPrompt(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {photoTaggingPrompt && photoTaggingPrompt.photoId && (
          <PhotoTaggingModal
            photoId={photoTaggingPrompt.photoId}
            photoUrl={photoTaggingPrompt.photoUrl}
            promptId={photoTaggingPrompt.id}
            onComplete={async (result) => {
              try {
                await engagementAnswerPrompt(photoTaggingPrompt.id, { type: 'selection', data: { action: 'photo_tagged' } })
              } catch (err) {
                console.error('Failed to mark prompt answered:', err)
              }
              addCompletedTile({
                id: photoTaggingPrompt.id,
                type: photoTaggingPrompt.type,
                title: 'Tagged photo',
                xp: result.xpAwarded,
                photoUrl: photoTaggingPrompt.photoUrl,
              })
              setPhotoTaggingPrompt(null)
            }}
            onClose={() => setPhotoTaggingPrompt(null)}
          />
        )}
      </AnimatePresence>

      <MilestoneModal milestone={milestone} onClose={() => setMilestone(null)} />
      <PhotoUploadModal isOpen={showPhotoUploadDash} onClose={() => setShowPhotoUploadDash(false)} />
      <PostscriptModal isOpen={showPostscriptModalDash} onClose={() => setShowPostscriptModalDash(false)} />
      <QuickMemoryModal isOpen={showQuickMemoryModal} onClose={() => setShowQuickMemoryModal(false)} />

      <AnimatePresence>
        {showContactModal && (
          <AddContactModal onClose={() => setShowContactModal(false)} onSave={() => {}} />
        )}
      </AnimatePresence>

      {/* XP floating counter */}
      <XpFloatingCounter show={xpAnimating} amount={lastXpGain} />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .feed-page {
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .feed-page[data-theme="dark"] {
          background-color: #1A1A1A;
          color: #F5F5F5;
        }

        .feed-page[data-theme="light"] {
          background-color: #F8FAFC;
          color: #1A1A1A;
        }

        /* Sidebar scrollbar */
        aside::-webkit-scrollbar {
          width: 4px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        .feed-page[data-theme="dark"] aside::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        .feed-page[data-theme="light"] aside::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 2px;
        }
        .feed-page[data-theme="dark"] aside {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .feed-page[data-theme="light"] aside {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.12) transparent;
        }

        .feed-header {
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(10px);
          padding: 24px 80px 24px 60px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .feed-header {
          background: rgba(26, 26, 26, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .feed-header {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .theme-toggle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: currentColor;
        }

        .feed-page[data-theme="light"] .theme-toggle {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .theme-toggle:hover {
          background: rgba(255, 92, 52, 0.1);
          border-color: #FF5C34;
          color: #FF5C34;
        }

        .header-content {
          max-width: 1920px;
          margin: 0 auto;
        }

        .page-title {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 700;
          font-size: 32px;
          margin: 0;
          letter-spacing: -0.5px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .page-title {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .page-title {
          color: #1A1A1A;
        }

        .welcome-heading {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 600;
          font-size: 4rem;
          margin: 0;
          letter-spacing: -1px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .welcome-heading {
          color: #FFFFFF;
        }

        .feed-page[data-theme="light"] .welcome-heading {
          color: #1A1A1A;
        }

        @media (max-width: 768px) {
          .welcome-heading {
            font-size: 3rem;
          }
        }

        /* Profile Card - Dark Theme */
        .feed-page[data-theme="dark"] .profile-card-feed {
          background: rgba(40, 40, 40, 0.92);
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .feed-page[data-theme="dark"] .profile-card-name { color: #8DACAB; }
        .feed-page[data-theme="dark"] .profile-stat-value { font-size: 22px; font-weight: 700; color: #8DACAB; }
        .feed-page[data-theme="dark"] .profile-stat-label { font-size: 9px; color: rgba(141,172,171,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .feed-page[data-theme="dark"] .profile-stat-bordered { border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08); }
        .feed-page[data-theme="dark"] .profile-stat-bordered-r { border-right: 1px solid rgba(255,255,255,0.08); }
        .feed-page[data-theme="dark"] .profile-stat-xp { font-size: 22px; font-weight: 700; color: #D9C61A; }
        .feed-page[data-theme="dark"] .profile-stat-label-xp { font-size: 9px; color: rgba(217,198,26,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 2px; }
        .feed-page[data-theme="dark"] .profile-storage { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; }
        .feed-page[data-theme="dark"] .profile-storage-label { font-size: 10px; font-weight: 600; color: rgba(141,172,171,0.6); text-transform: uppercase; letter-spacing: 0.5px; }
        .feed-page[data-theme="dark"] .profile-storage-value { font-size: 10px; color: rgba(255,255,255,0.5); }
        .feed-page[data-theme="dark"] .profile-storage-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }

        /* Profile Card - Light Theme */
        .feed-page[data-theme="light"] .profile-card-feed {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          border: 1px solid rgba(64,106,86,0.1);
        }
        .feed-page[data-theme="light"] .profile-card-name { color: #406A56; }
        .feed-page[data-theme="light"] .profile-stat-value { font-size: 22px; font-weight: 700; color: #406A56; }
        .feed-page[data-theme="light"] .profile-stat-label { font-size: 9px; color: rgba(64,106,86,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .feed-page[data-theme="light"] .profile-stat-bordered { border-left: 1px solid rgba(64,106,86,0.1); border-right: 1px solid rgba(64,106,86,0.1); }
        .feed-page[data-theme="light"] .profile-stat-bordered-r { border-right: 1px solid rgba(64,106,86,0.1); }
        .feed-page[data-theme="light"] .profile-stat-xp { font-size: 22px; font-weight: 700; color: #D9C61A; }
        .feed-page[data-theme="light"] .profile-stat-label-xp { font-size: 9px; color: rgba(217,198,26,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 2px; }
        .feed-page[data-theme="light"] .profile-storage { border-top: 1px solid rgba(64,106,86,0.1); padding-top: 10px; }
        .feed-page[data-theme="light"] .profile-storage-label { font-size: 10px; font-weight: 600; color: rgba(64,106,86,0.6); text-transform: uppercase; letter-spacing: 0.5px; }
        .feed-page[data-theme="light"] .profile-storage-value { font-size: 10px; color: #888; }
        .feed-page[data-theme="light"] .profile-storage-track { height: 6px; background: #F2F1E5; border-radius: 3px; overflow: hidden; }

        .header-controls {
          position: fixed !important;
          top: 56px !important;
          left: 280px !important;
          right: 0 !important;
          z-index: 20 !important;
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(128,128,128,0.1);
        }

        .feed-page[data-theme="dark"] .header-controls {
          background: rgba(26, 26, 26, 0.97);
        }

        .feed-page[data-theme="light"] .header-controls {
          background: rgba(248, 250, 252, 0.97);
        }

        .controls-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .controls-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-box-compact {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 20px;
          max-width: 250px;
          width: 200px;
          transition: all 0.3s ease;
        }

        .feed-page[data-theme="dark"] .search-box-compact {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .feed-page[data-theme="light"] .search-box-compact {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #1A1A1A;
        }

        .search-box-compact:focus-within {
          border-color: #C35F33;
          width: 250px;
        }

        .search-box-compact input {
          background: transparent;
          border: none;
          outline: none;
          font-size: 13px;
          flex: 1;
          font-family: 'Inter', sans-serif;
          color: inherit;
          min-width: 0;
        }

        .feed-page[data-theme="dark"] .search-box-compact input::placeholder {
          color: #666;
        }

        .feed-page[data-theme="light"] .search-box-compact input::placeholder {
          color: #999;
        }

        .map-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 20px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .feed-page[data-theme="dark"] .map-toggle-btn {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
        }

        .feed-page[data-theme="light"] .map-toggle-btn {
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(0, 0, 0, 0.1);
          color: rgba(0, 0, 0, 0.5);
        }

        .map-toggle-btn:hover {
          border-color: #C35F33;
          color: #C35F33;
        }

        .map-toggle-btn.active {
          background: rgba(195, 95, 51, 0.12);
          color: #C35F33;
          border-color: rgba(195, 95, 51, 0.4);
        }

        /* Reminisce Dropdown */
        .reminisce-dropdown-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .reminisce-label-inline {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.5;
          white-space: nowrap;
          user-select: none;
        }

        .reminisce-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        .feed-page[data-theme="dark"] .reminisce-dropdown-btn {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .reminisce-dropdown-btn {
          background: rgba(0, 0, 0, 0.03);
          color: rgba(0, 0, 0, 0.5);
          border-color: rgba(0, 0, 0, 0.08);
        }

        .reminisce-dropdown-btn:hover {
          border-color: #C35F33;
          color: #C35F33;
        }

        .reminisce-dropdown-btn.active {
          background: rgba(195, 95, 51, 0.12);
          color: #C35F33;
          border-color: rgba(195, 95, 51, 0.4);
          font-weight: 600;
        }

        .reminisce-btn-text {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .reminisce-clear-inline {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid rgba(195, 95, 51, 0.3);
          background: rgba(195, 95, 51, 0.08);
          color: #C35F33;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .reminisce-clear-inline:hover {
          background: #C35F33;
          color: #fff;
          border-color: #C35F33;
        }

        .reminisce-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 220px;
          border-radius: 16px;
          padding: 8px;
          z-index: 50;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        }

        .feed-page[data-theme="dark"] .reminisce-dropdown-menu {
          background: #2a2a2a;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .reminisce-dropdown-menu {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .reminisce-dropdown-group {
          display: flex;
          flex-direction: column;
        }

        .reminisce-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'Inter', sans-serif;
          width: 100%;
          text-align: left;
        }

        .feed-page[data-theme="dark"] .reminisce-dropdown-item {
          color: rgba(255, 255, 255, 0.7);
        }

        .feed-page[data-theme="light"] .reminisce-dropdown-item {
          color: rgba(0, 0, 0, 0.6);
        }

        .reminisce-dropdown-item:hover {
          background: rgba(195, 95, 51, 0.08);
          color: #C35F33;
        }

        .reminisce-dropdown-item.active {
          background: rgba(195, 95, 51, 0.12);
          color: #C35F33;
          font-weight: 600;
        }

        .reminisce-submenu-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 6px 8px 10px;
          overflow: hidden;
        }

        .quick-actions-row {
          position: relative;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 92, 52, 0.08);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .feed-page[data-theme="dark"] .quick-action-btn {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .feed-page[data-theme="light"] .quick-action-btn {
          color: #1A1A1A;
        }

        .quick-action-btn:hover {
          background: rgba(255, 92, 52, 0.15);
          transform: translateY(-1px);
        }

        .feed-page[data-theme="dark"] .quick-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .filter-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          flex: 1;
        }

        /* view-toggle removed - replaced by map-toggle-btn */

        .category-tag {
          position: relative;
          padding: 8px 18px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 0;
        }

        .category-text-wrapper {
          position: relative;
          display: block;
          height: 20px;
          overflow: hidden;
        }

        .category-text {
          display: block;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          line-height: 20px;
        }

        .feed-page[data-theme="dark"] .category-text-top {
          color: #aaa;
        }

        .feed-page[data-theme="light"] .category-text-top {
          color: #666;
        }

        .category-text-bottom {
          position: absolute;
          top: 100%;
          left: 0;
          color: #C35F33;
        }

        .category-tag:hover .category-text-top {
          transform: translateY(-100%);
        }

        .category-tag:hover .category-text-bottom {
          transform: translateY(-100%);
        }

        .category-underline {
          position: absolute;
          bottom: 2px;
          left: 18px;
          right: 18px;
          height: 2px;
          background: #C35F33;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-tag:hover .category-underline {
          transform: scaleX(1);
        }

        .category-tag.active {
          font-weight: 600;
        }

        .category-tag.active::before {
          content: '';
          position: absolute;
          inset: -4px -8px;
          background-image: url('/images/nav-active-bg.svg');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          z-index: -1;
          opacity: 0.9;
        }

        .category-tag.active .category-text-top {
          color: #C35F33;
        }

        .category-tag.active .category-underline {
          transform: scaleX(1);
        }

        .feed-page[data-theme="dark"] .tag:hover:not(.active) {
          color: #fff;
          background: rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .tag:hover:not(.active) {
          color: #1A1A1A;
          background: rgba(0,0,0,0.05);
        }

        /* search-box replaced by search-box-compact */

        .feed-content-wrapper {
          display: flex;
          max-width: 1920px;
          margin: 0 auto;
          position: relative;
        }

        .feed-content-area {
          position: relative;
          min-width: 0;
          padding: 20px 0;
          padding-right: 48px;
        }

        .feed-content {
          flex: 1;
          padding: 40px 60px;
          padding-right: 80px;
          min-width: 0;
        }

        .map-container {
          width: 100%;
          height: calc(100vh - 200px);
          min-height: 700px;
          border-radius: 16px;
          overflow: hidden;
        }

        .map-overlay-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .map-overlay-content {
          position: relative;
          width: 100%;
          max-width: 1200px;
          height: 75vh;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
        }

        .map-overlay-close {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 55;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 30, 30, 0.85);
          color: #fff;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s, background 0.2s;
        }

        .map-overlay-close:hover {
          transform: scale(1.1);
          background: rgba(50, 50, 50, 0.95);
        }

        .masonry-columns-wrapper {
          display: flex;
          gap: 20px;
          width: 100%;
        }

        .masonry-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .card-wrapper {
          display: block;
        }

        /* Keep .masonry-grid for browse mode grids (people/places) */
        .masonry-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          width: 100%;
        }

        .card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .card:hover {
          z-index: 2;
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
        }

        .card:hover .feed-card-cta {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.6);
        }

        .card-content {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }

        .card-meta {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          margin-bottom: 4px;
        }

        .card-title {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 14px;
          line-height: 1.3;
          margin-bottom: 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-title {
          color: #fff;
        }

        .feed-page[data-theme="light"] .card-title {
          color: #1A1A1A;
        }

        .card-description {
          font-size: 12px;
          line-height: 1.4;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-description {
          color: #999;
        }

        .feed-page[data-theme="light"] .card-description {
          color: #666;
        }

        .card-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding-top: 8px;
          transition: border-color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-details {
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .feed-page[data-theme="light"] .card-details {
          border-top: 1px solid rgba(0,0,0,0.08);
        }

        .card-date,
        .card-location {
          font-size: 10px;
          font-family: 'Inter', sans-serif;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .card-date,
        .feed-page[data-theme="dark"] .card-location,
        .feed-page[data-theme="dark"] .card-details svg {
          color: #666;
        }

        .feed-page[data-theme="light"] .card-date,
        .feed-page[data-theme="light"] .card-location,
        .feed-page[data-theme="light"] .card-details svg {
          color: #888;
        }

        .loading-state {
          display: flex;
          justify-content: center;
          padding: 60px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 92, 52, 0.1);
          border-top-color: #FF5C34;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          font-size: 16px;
          transition: color 0.3s ease;
        }

        .feed-page[data-theme="dark"] .empty-state {
          color: #666;
        }

        .feed-page[data-theme="light"] .empty-state {
          color: #888;
        }

        /* Responsive Masonry Breakpoints */
        @media (max-width: 1280px) {
          .masonry-columns-wrapper, .masonry-grid { gap: 18px; }
          .masonry-column { gap: 18px; }
          .masonry-grid { grid-template-columns: repeat(4, 1fr); }
        }

        @media (max-width: 1024px) {
          .masonry-columns-wrapper, .masonry-grid { gap: 16px; }
          .masonry-column { gap: 16px; }
          .masonry-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 768px) {
          .masonry-columns-wrapper, .masonry-grid { gap: 14px; }
          .masonry-column { gap: 14px; }
          .masonry-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .masonry-columns-wrapper, .masonry-grid { gap: 12px; }
          .masonry-column { gap: 12px; }
          .masonry-grid { grid-template-columns: 1fr; }
          
          /* All cards single column on mobile */
          .card-animation-layer,
          .card-animation-layer.wide,
          .card-animation-layer.large,
          .card-animation-layer.medium {
            grid-column: span 1;
            grid-row: span 1;
          }
          
          /* Adjust card content for mobile */
          .card {
            min-height: auto !important;
          }
          
          /* Card content responsive */
          .feed-card-content {
            padding: 16px !important;
            gap: 10px !important;
          }
          
          .feed-card-title {
            font-size: 16px !important;
          }
          
          .feed-card-description {
            font-size: 13px !important;
            line-height: 1.4 !important;
          }
          
          .feed-card-cta {
            padding: 10px 16px !important;
            font-size: 13px !important;
          }
          
          /* Filter tags responsive */
          .filter-tags {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 8px;
          }
          
          .filter-tags::-webkit-scrollbar {
            display: none;
          }
          
          .category-tag {
            font-size: 13px !important;
            padding: 8px 16px !important;
            white-space: nowrap;
          }
          
          /* Controls row responsive */
          .controls-row {
            flex-direction: column;
            align-items: stretch !important;
            gap: 12px !important;
          }

          .controls-center {
            justify-content: stretch;
          }

          .search-box-compact {
            flex: 1;
            width: auto;
            max-width: 100%;
          }

          .reminisce-dropdown-wrapper {
            justify-content: flex-start;
          }

          .reminisce-dropdown-menu {
            right: auto;
            left: 0;
          }
          
          .feed-header,
          .feed-content {
            padding-left: 20px;
            padding-right: 20px;
          }
        }

        /* Extra small devices */
        @media (max-width: 480px) {
          .welcome-heading {
            font-size: 2.5rem !important;
          }
          
          .feed-card-content {
            padding: 14px !important;
          }
          
          .feed-card-title {
            font-size: 15px !important;
          }
          
          .feed-card-description {
            font-size: 12px !important;
          }
          
          .category-tag {
            font-size: 12px !important;
            padding: 6px 12px !important;
          }
          
          .masonry-grid {
            gap: 12px;
          }
        }

        /* iPhone SE and similar */
        @media (max-width: 375px) {
          .welcome-heading {
            font-size: 2rem !important;
          }
          
          .feed-card-title {
            font-size: 14px !important;
          }
          
          .feed-card-cta {
            padding: 8px 14px !important;
            font-size: 12px !important;
          }
        }

        /* ── Reminisce By Styles (dropdown version) ── */

        .reminisce-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 16px;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        .feed-page[data-theme="dark"] .reminisce-pill {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.65);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .feed-page[data-theme="light"] .reminisce-pill {
          background: rgba(0, 0, 0, 0.03);
          color: rgba(0, 0, 0, 0.55);
          border-color: rgba(0, 0, 0, 0.08);
        }

        .reminisce-pill:hover {
          border-color: #C35F33;
          color: #C35F33;
        }

        .reminisce-pill.active {
          background: #C35F33;
          color: #fff;
          border-color: #C35F33;
          font-weight: 600;
        }

        .reminisce-empty {
          font-size: 12px;
          font-style: italic;
          padding: 4px 0;
        }

        .feed-page[data-theme="dark"] .reminisce-empty {
          color: rgba(255, 255, 255, 0.3);
        }

        .feed-page[data-theme="light"] .reminisce-empty {
          color: rgba(0, 0, 0, 0.3);
        }

        /* Old reminisce-tabs mobile styles removed - using dropdown now */

        /* ── People / Places Browse Mode ── */

        .browse-grid-container {
          width: 100%;
        }

        .browse-heading {
          font-family: 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px 0;
          letter-spacing: -0.3px;
        }

        .feed-page[data-theme="dark"] .browse-heading {
          color: #fff;
        }

        .feed-page[data-theme="light"] .browse-heading {
          color: #1A1A1A;
        }

        .browse-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
          margin-bottom: 16px;
        }

        .feed-page[data-theme="dark"] .browse-back-btn {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.7);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .browse-back-btn {
          background: rgba(0, 0, 0, 0.04);
          color: rgba(0, 0, 0, 0.6);
          border-color: rgba(0, 0, 0, 0.08);
        }

        .browse-back-btn:hover {
          color: #C35F33;
          border-color: #C35F33;
          background: rgba(195, 95, 51, 0.08);
        }

        .browse-detail-heading {
          font-family: 'Inter', sans-serif;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 24px 0;
          letter-spacing: -0.3px;
        }

        .feed-page[data-theme="dark"] .browse-detail-heading {
          color: #fff;
        }

        .feed-page[data-theme="light"] .browse-detail-heading {
          color: #1A1A1A;
        }

        .person-tile:hover,
        .place-tile:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
        }

        /* Dim category pills when in browse mode */
        .feed-page .category-tag.dimmed .category-text-top {
          opacity: 0.4;
        }

        /* ── Vertical Timeline Scrubber ── */

        .timeline-wrapper {
          position: fixed;
          right: 17px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 25;
          display: flex;
          align-items: center;
        }

        .timeline-midpoint-indicator {
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-right: 8px solid #C35F33;
          z-index: 30;
          filter: drop-shadow(0 1px 3px rgba(195, 95, 51, 0.4));
        }

        .timeline-scrubber {
          width: 45px;
          max-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
          border-radius: 16px;
          backdrop-filter: blur(12px);
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
          cursor: grab;
          user-select: none;
        }

        /* Spacers so first/last year can reach the midpoint */
        .timeline-spacer {
          flex-shrink: 0;
          height: 30vh;
        }

        .timeline-scrubber::-webkit-scrollbar {
          display: none;
        }

        .feed-page[data-theme="dark"] .timeline-scrubber {
          background: rgba(40, 40, 40, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .feed-page[data-theme="light"] .timeline-scrubber {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .timeline-year-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .timeline-year-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 10px 4px;
          border: none;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          border-radius: 6px;
          white-space: nowrap;
        }

        .feed-page[data-theme="dark"] .timeline-year-btn {
          color: rgba(255, 255, 255, 0.35);
        }

        .feed-page[data-theme="light"] .timeline-year-btn {
          color: rgba(0, 0, 0, 0.3);
        }

        .timeline-year-btn:hover {
          color: #C35F33;
          background: rgba(195, 95, 51, 0.08);
        }

        .timeline-year-btn.active {
          font-size: 12px;
          font-weight: 700;
          color: #C35F33;
          background: rgba(195, 95, 51, 0.1);
          transform: scale(1.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .timeline-ticks {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 4px 0;
        }

        .timeline-tick {
          width: 12px;
          height: 1.5px;
          border-radius: 1px;
        }

        .feed-page[data-theme="dark"] .timeline-tick {
          background: rgba(255, 255, 255, 0.1);
        }

        .feed-page[data-theme="light"] .timeline-tick {
          background: rgba(0, 0, 0, 0.08);
        }

        /* Timeline responsive */
        @media (max-width: 768px) {
          .timeline-wrapper {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════
           MOBILE RESPONSIVE — Dashboard Layout
           ═══════════════════════════════════════════════ */

        /* Mobile top bar hidden on desktop */
        .mobile-top-bar {
          display: none;
        }

        @media (max-width: 768px) {
          /* Hide desktop sidebar on mobile */
          .dashboard-sidebar {
            display: none !important;
          }

          /* Show mobile top bar — NOT sticky, just flows with content */
          .mobile-top-bar {
            display: block !important;
            margin-bottom: 12px;
            padding-top: 4px;
          }

          /* Main content takes full width — top padding just clears the 56px nav */
          .dashboard-main {
            margin-left: 0 !important;
            padding: 60px 12px 80px 12px !important;
          }

          /* Timeline bubble positioned without sidebar offset */
          .timeline-bubble {
            left: 12px !important;
          }

          /* Header controls: remove sidebar offset, make sticky instead of fixed */
          .header-controls {
            position: sticky !important;
            left: auto !important;
            right: auto !important;
            top: 56px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          /* Controls row stacks on mobile */
          .controls-row {
            flex-wrap: wrap;
          }

          /* Less top margin on feed content since mobile-top-bar is in between */
          .feed-content-area {
            margin-top: 16px !important;
          }

          /* ── Engagement Overlay: full-screen on mobile ── */
          .engagement-overlay-content {
            width: 100% !important;
            max-width: 100% !important;
            height: calc(100vh - 56px) !important;
            max-height: calc(100vh - 56px) !important;
            border-radius: 0 !important;
            margin-top: 56px !important;
          }

          /* Close button: bigger, visible below nav on mobile */
          .engagement-close-btn {
            top: 12px !important;
            right: 12px !important;
            width: 44px !important;
            height: 44px !important;
            background: rgba(0,0,0,0.12) !important;
            z-index: 20 !important;
          }

          /* Hide left panel on mobile — card takes full screen */
          .engagement-left-panel {
            display: none !important;
          }

          /* Card area fills entire overlay */
          .engagement-right-panel {
            padding: 56px 12px 16px 12px !important;
          }

          /* ── Card Stack responsive ── */
          .card-stack-container {
            height: calc(100vh - 160px) !important;
            max-height: 560px;
          }

          .card-stack-indicator {
            top: -20px !important;
          }

          /* Nav arrows: inside card area on mobile */
          .card-nav-arrow.card-nav-left {
            left: 8px !important;
            top: auto !important;
            bottom: 12px !important;
            transform: none !important;
            width: 44px !important;
            height: 44px !important;
            background: rgba(255,255,255,0.9) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .card-nav-arrow.card-nav-right {
            right: 8px !important;
            top: auto !important;
            bottom: 12px !important;
            transform: none !important;
            width: 44px !important;
            height: 44px !important;
            background: rgba(255,255,255,0.9) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
        }

        @media (max-width: 640px) {
          .dashboard-main {
            padding: 60px 8px 80px 8px !important;
          }
        }
      `}</style>
    </div>
  )
}
