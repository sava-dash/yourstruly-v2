'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Heart, 
  MessageCircle, 
  Users, 
  BookOpen, 
  Image as ImageIcon,
  Smile,
  Send,
  Sparkles,
  Camera,
  Brain,
  Plus,
  UserPlus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'

interface ActivityActor {
  id: string
  name: string
  avatar_url?: string
}

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  actor?: ActivityActor
  thumbnail?: string
  link: string
  metadata?: Record<string, any>
}

interface ActivityFeedModalProps {
  isOpen: boolean
  onClose: () => void
  initialActivities: ActivityItem[]
}

const ACTIVITY_ICONS: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  memory_shared: { icon: ImageIcon, color: 'text-[#C35F33]', bg: 'bg-[#C35F33]/10' },
  wisdom_shared: { icon: BookOpen, color: 'text-[#4A3552]', bg: 'bg-[#4A3552]/10' },
  circle_message: { icon: MessageCircle, color: 'text-[#406A56]', bg: 'bg-[#406A56]/10' },
  circle_invite: { icon: Users, color: 'text-[#8DACAB]', bg: 'bg-[#8DACAB]/15' },
  circle_content: { icon: Heart, color: 'text-[#C35F33]', bg: 'bg-[#C35F33]/10' },
  wisdom_comment: { icon: MessageCircle, color: 'text-[#4A3552]', bg: 'bg-[#4A3552]/10' },
  xp_earned: { icon: Sparkles, color: 'text-[#406A56]', bg: 'bg-[#406A56]/10' },
  photo_backstory: { icon: Camera, color: 'text-[#D9C61A]', bg: 'bg-[#D9C61A]/15' },
  knowledge: { icon: Brain, color: 'text-[#C35F33]', bg: 'bg-[#C35F33]/10' },
  memory_created: { icon: Plus, color: 'text-[#C35F33]', bg: 'bg-[#C35F33]/10' },
  wisdom_created: { icon: Plus, color: 'text-[#4A3552]', bg: 'bg-[#4A3552]/10' },
  contact_added: { icon: UserPlus, color: 'text-[#406A56]', bg: 'bg-[#406A56]/10' },
  photos_uploaded: { icon: Camera, color: 'text-[#D9C61A]', bg: 'bg-[#D9C61A]/15' },
}

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [liked, setLiked] = useState(false)
  
  const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.memory_shared
  const Icon = config.icon

  const handleAddComment = () => {
    if (!comment.trim()) return
    // TODO: Submit comment to API
    console.log('Comment:', comment)
    setComment('')
    setShowComments(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden mb-4"
    >
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
            {activity.thumbnail ? (
              <Image
                src={activity.thumbnail}
                alt={activity.title}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : activity.actor?.avatar_url ? (
              <Image
                src={activity.actor.avatar_url}
                alt={activity.actor.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <Icon size={20} className={config.color} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Card Content - Link to detail */}
      <Link href={activity.link} className="block hover:bg-gray-50 transition-colors">
        {activity.thumbnail ? (
          <div className="relative w-full aspect-[4/3] bg-gray-100">
            <Image
              src={activity.thumbnail}
              alt={activity.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-gray-700">
              Tap to view details →
            </p>
          </div>
        )}
      </Link>

      {/* Interaction Bar */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#406A56] transition-colors"
        >
          <MessageCircle size={18} />
          <span>Comment</span>
        </button>
        
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#D9C61A] transition-colors">
          <Smile size={18} />
          <span>React</span>
        </button>
      </div>

      {/* Comment Input */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 overflow-hidden"
          >
            <div className="p-4 bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2 rounded-full bg-white border border-gray-200 focus:border-[#406A56] focus:outline-none text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!comment.trim()}
                  className="p-2 rounded-full bg-[#406A56] text-white hover:bg-[#2d4d3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ActivityFeedModal({ isOpen, onClose, initialActivities }: ActivityFeedModalProps) {
  const [activities, setActivities] = useState(initialActivities)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Fetch full activity feed when modal opens
      fetchActivities()
    }
  }, [isOpen])

  const fetchActivities = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/activity?limit=50')
      if (res.ok) {
        const data = await res.json()
        // Filter out XP/engagement activities from full feed - they're shown in the widget only
        const filtered = (data.activities || []).filter((a: ActivityItem) => a.type !== 'xp_earned')
        setActivities(filtered)
      }
    } catch (err) {
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#FDF8F3]"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Activity Feed</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Scrollable Feed */}
      <div className="overflow-y-auto h-[calc(100vh-64px)] pb-8">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={32} className="text-[#D9C61A]" />
              </motion.div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-16 h-16 rounded-full bg-[#406A56]/5 flex items-center justify-center">
                <Sparkles size={24} className="text-[#406A56]/40" />
              </div>
              <p className="text-gray-500">No activity yet</p>
              <p className="text-sm text-gray-400">Start creating memories and wisdom!</p>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
