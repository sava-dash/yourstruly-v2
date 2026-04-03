'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, 
  MessageCircle, 
  Users, 
  BookOpen, 
  Image, 
  Bell,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Zap,
  Camera,
  Brain,
  UserPlus,
  Edit3,
  Link as LinkIcon,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { colors } from '@/lib/design-tokens'

interface ActivityActor {
  id: string
  name: string
  avatar_url?: string
}

interface ActivityItem {
  id: string
  type: 'memory_shared' | 'wisdom_shared' | 'circle_message' | 'circle_invite' | 'circle_content' | 'wisdom_comment' | 'xp_earned'
  title: string
  description: string
  timestamp: string
  actor?: ActivityActor
  thumbnail?: string
  link: string
  metadata?: Record<string, any>
  xp?: number
  isNew?: boolean
}

// XP completion that can be added externally
export interface XPCompletion {
  id: string
  type: string
  title: string
  xp: number
  photoUrl?: string
  contactName?: string
  timestamp: string
}

// Activity icons with semantic color tokens from design system
const ACTIVITY_ICONS: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  // Social/Circle activities
  memory_shared: { icon: Image, color: 'text-[#F31260]', bg: 'bg-[#FEE2E2]' }, // error light
  wisdom_shared: { icon: BookOpen, color: 'text-[#7828C8]', bg: 'bg-[#F3E8FF]' }, // primary purple
  circle_message: { icon: MessageCircle, color: 'text-[#006FEE]', bg: 'bg-[#DBEAFE]' }, // info blue
  circle_invite: { icon: Users, color: 'text-[#17C964]', bg: 'bg-[#D1FAE5]' }, // success green
  circle_content: { icon: Heart, color: 'text-[#F31260]', bg: 'bg-[#FEE2E2]' }, // error red
  wisdom_comment: { icon: MessageCircle, color: 'text-[#7828C8]', bg: 'bg-[#F3E8FF]' }, // primary purple
  xp_earned: { icon: Zap, color: 'text-[#F5A524]', bg: 'bg-[#FEF3C7]' }, // warning yellow
  
  // Prompt types (from TYPE_CONFIG)
  photo_backstory: { icon: Camera, color: 'text-[#78350F]', bg: 'bg-[#FEF3C7]' }, // yellow (photo)
  tag_person: { icon: Users, color: 'text-[#1E3A8A]', bg: 'bg-[#DBEAFE]' }, // blue (connect)
  missing_info: { icon: Edit3, color: 'text-[#14532D]', bg: 'bg-[#D1FAE5]' }, // green (contact)
  quick_question: { icon: UserPlus, color: 'text-[#14532D]', bg: 'bg-[#D1FAE5]' }, // green (contact)
  contact_info: { icon: UserPlus, color: 'text-[#14532D]', bg: 'bg-[#D1FAE5]' }, // green (contact)
  memory_prompt: { icon: MessageCircle, color: 'text-[#581C87]', bg: 'bg-[#F3E8FF]' }, // purple (memory)
  knowledge: { icon: Brain, color: 'text-[#7F1D1D]', bg: 'bg-[#FEE2E2]' }, // red (wisdom)
  connect_dots: { icon: LinkIcon, color: 'text-[#1E3A8A]', bg: 'bg-[#DBEAFE]' }, // blue (connect)
  highlight: { icon: Star, color: 'text-[#78350F]', bg: 'bg-[#FEF3C7]' }, // yellow (photo)
  postscript: { icon: Mail, color: 'text-[#581C87]', bg: 'bg-[#F3E8FF]' }, // purple (memory)
  favorites_firsts: { icon: Trophy, color: 'text-[#7F1D1D]', bg: 'bg-[#FEE2E2]' }, // red (wisdom)
  recipes_wisdom: { icon: BookOpen, color: 'text-[#78350F]', bg: 'bg-[#FEF3C7]' }, // yellow (photo)
}

function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return 'recently'
  }
}

function ActivityItemCard({ activity, index }: { activity: ActivityItem; index: number }) {
  const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.memory_shared
  const Icon = config.icon
  const isXPActivity = activity.type === 'xp_earned' || activity.xp

  // Consistent item style for all activities
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="mx-2 mb-1"
    >
      <Link 
        href={activity.link}
        className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/60 hover:bg-white border border-transparent hover:border-[#2D5A3D]/10 hover:shadow-sm transition-all group"
        style={{ minHeight: '60px' }}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
            {isXPActivity ? (
              <Sparkles size={14} className="text-[#F5A524]" />
            ) : (
              <Icon size={14} className={config.color} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* XP badge + description row */}
          <div className="flex items-start gap-2">
            {activity.xp && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#7828C8] text-white text-[10px] font-semibold flex-shrink-0 mt-0.5">
                +{activity.xp} XP
              </span>
            )}
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
              {activity.description}
            </p>
          </div>
          {/* Timestamp */}
          <p className="text-[10px] text-gray-400 mt-1">
            {formatRelativeTime(activity.timestamp)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

interface ActivityFeedProps {
  xpCompletions?: XPCompletion[]
}

export default function ActivityFeed({ xpCompletions = [] }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Merge XP completions into activity feed
  const mergedActivities = useCallback((): ActivityItem[] => {
    const xpActivities: ActivityItem[] = xpCompletions.map(xp => ({
      id: `xp-${xp.id}`,
      type: 'xp_earned' as const,
      title: xp.title,
      description: xp.title,
      timestamp: xp.timestamp,
      link: xp.contactName ? '/dashboard/contacts' : '/dashboard/memories',
      thumbnail: xp.photoUrl,
      xp: xp.xp,
      isNew: true,
      metadata: { originalType: xp.type, contactName: xp.contactName }
    }))
    
    // Combine and sort by timestamp (newest first)
    return [...xpActivities, ...activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15) // Limit to 15 items
  }, [xpCompletions, activities])

  const fetchActivities = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    
    try {
      const res = await fetch('/api/activity?limit=10')
      if (!res.ok) throw new Error('Failed to fetch activities')
      const data = await res.json()
      setActivities(data.activities || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching activities:', err)
      setError('Could not load activity')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return (
    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-100 flex flex-col" style={{ maxHeight: '320px' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[#7828C8]" />
          <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
        </div>
        <button
          onClick={() => fetchActivities(true)}
          disabled={isRefreshing}
          className="p-1.5 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw 
            size={14} 
            className={`text-[#7828C8] ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Content - Scrollable with styled scrollbar */}
      <div className="flex-1 overflow-y-auto py-2 px-1 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent hover:scrollbar-thumb-purple-300">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles size={14} className="text-[#F5A524]" />
            </motion.div>
            <span className="text-[10px] text-gray-400">Loading...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <Bell size={14} className="text-gray-300" />
            <span className="text-[10px] text-gray-400">{error}</span>
            <button
              onClick={() => fetchActivities()}
              className="text-[10px] text-[#7828C8] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : mergedActivities().length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Sparkles size={14} className="text-purple-300" />
            </div>
            <span className="text-xs text-gray-500">No recent activity</span>
            <span className="text-[10px] text-gray-400 text-center px-2">
              Complete prompts to earn XP!
            </span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {mergedActivities().map((activity, index) => (
              <ActivityItemCard 
                key={activity.id} 
                activity={activity} 
                index={index}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer - See All - compact */}
      {activities.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
          <Link 
            href="/dashboard/activity"
            className="flex items-center justify-center gap-1 text-[10px] text-[#7828C8] hover:text-[#6020A0] transition-colors font-medium"
          >
            See all
            <ChevronRight size={10} />
          </Link>
        </div>
      )}
    </div>
  )
}
