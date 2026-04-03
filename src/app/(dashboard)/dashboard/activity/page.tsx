'use client'

import { useState, useEffect } from 'react'
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
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import '@/styles/page-styles.css'

interface ActivityActor {
  id: string
  name: string
  avatar_url?: string
}

interface ActivityItem {
  id: string
  type: 'memory_shared' | 'wisdom_shared' | 'circle_message' | 'circle_invite' | 'circle_content' | 'wisdom_comment'
  title: string
  description: string
  timestamp: string
  actor?: ActivityActor
  thumbnail?: string
  link: string
  metadata?: Record<string, any>
}

const ACTIVITY_ICONS: Record<string, { icon: typeof Heart; color: string; bg: string; label: string }> = {
  memory_shared: { icon: Image, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Memories' },
  wisdom_shared: { icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Wisdom' },
  circle_message: { icon: MessageCircle, color: 'text-[#2D5A3D]', bg: 'bg-[#2D5A3D]/10', label: 'Messages' },
  circle_invite: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Invites' },
  circle_content: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100', label: 'Shared' },
  wisdom_comment: { icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Comments' },
}

function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true })
    } else if (diffHours < 48) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d, yyyy')
    }
  } catch {
    return 'recently'
  }
}

function ActivityItemCard({ activity, index }: { activity: ActivityItem; index: number }) {
  const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.memory_shared
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link 
        href={activity.link}
        className="flex items-start gap-4 p-4 rounded-2xl glass-card-page hover:shadow-md transition-all group"
      >
        {/* Avatar or Icon */}
        <div className="flex-shrink-0 relative">
          {activity.actor?.avatar_url ? (
            <div className="relative">
              <img 
                src={activity.actor.avatar_url} 
                alt={activity.actor.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${config.bg} flex items-center justify-center shadow-sm border border-white`}>
                <Icon size={12} className={config.color} />
              </div>
            </div>
          ) : activity.actor ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#234A31] flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                {activity.actor.name.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${config.bg} flex items-center justify-center shadow-sm border border-white`}>
                <Icon size={12} className={config.color} />
              </div>
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
              <Icon size={20} className={config.color} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2d2d2d] leading-snug">
            {activity.description}
          </p>
          {activity.title && activity.title !== activity.description && (
            <p className="text-sm text-[#666] mt-1 line-clamp-1">
              {activity.title}
            </p>
          )}
          <p className="text-xs text-[#888] mt-2">
            {formatRelativeTime(activity.timestamp)}
          </p>
        </div>

        {/* Thumbnail */}
        {activity.thumbnail && (
          <div className="flex-shrink-0">
            <img 
              src={activity.thumbnail} 
              alt=""
              className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
            />
          </div>
        )}

        {/* Arrow */}
        <ChevronRight 
          size={20} 
          className="flex-shrink-0 text-[#2D5A3D]/30 group-hover:text-[#2D5A3D] transition-colors"
        />
      </Link>
    </motion.div>
  )
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  const fetchActivities = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    
    try {
      const res = await fetch('/api/activity?limit=50')
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

  const filteredActivities = filter 
    ? activities.filter(a => a.type === filter)
    : activities

  const filterOptions = Object.entries(ACTIVITY_ICONS).map(([type, config]) => ({
    type,
    ...config
  }))

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="page-header-back">
                  <ChevronLeft size={20} />
                </Link>
                <div>
                  <h1 className="page-header-title">Activity</h1>
                  <p className="page-header-subtitle">
                    {activities.length} recent updates
                  </p>
                </div>
              </div>
              <button
                onClick={() => fetchActivities(true)}
                disabled={isRefreshing}
                className="p-2 rounded-xl glass-card-page hover:bg-white transition-colors disabled:opacity-50"
              >
                <RefreshCw 
                  size={18} 
                  className={`text-[#2D5A3D] ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setFilter(null)}
                className={`filter-btn flex-shrink-0 ${filter === null ? 'filter-btn-active' : ''}`}
              >
                All
              </button>
              {filterOptions.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.type}
                    onClick={() => setFilter(filter === opt.type ? null : opt.type)}
                    className={`filter-btn flex-shrink-0 flex items-center gap-2 ${filter === opt.type ? 'filter-btn-active' : ''}`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </header>

          {/* Content */}
          <main className="space-y-3">
            {isLoading ? (
              <div className="loading-container">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={28} className="text-[#C4A235]" />
                </motion.div>
                <span className="loading-text">Loading activity...</span>
              </div>
            ) : error ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Bell size={32} className="text-[#2D5A3D]/30" />
                </div>
                <span className="empty-state-text">{error}</span>
                <button
                  onClick={() => fetchActivities()}
                  className="text-sm text-[#2D5A3D] hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Sparkles size={32} className="text-[#2D5A3D]/40" />
                </div>
                <h3 className="empty-state-title">
                  {filter ? 'No activity in this category' : 'No recent activity'}
                </h3>
                <p className="empty-state-text">
                  Activity from shared memories, wisdom, and circles will appear here
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredActivities.map((activity, index) => (
                  <ActivityItemCard 
                    key={activity.id} 
                    activity={activity} 
                    index={index}
                  />
                ))}
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
