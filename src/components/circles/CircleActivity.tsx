'use client'

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { 
  Image as ImageIcon, BookOpen, BarChart3, Calendar, UserPlus, UserMinus,
  Crown, Shield, MessageCircle, CheckCircle, XCircle, Bell, Heart, Star
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export type ActivityType = 
  | 'memory_shared'
  | 'wisdom_shared'
  | 'poll_created'
  | 'poll_voted'
  | 'poll_closed'
  | 'event_proposed'
  | 'event_confirmed'
  | 'event_voted'
  | 'member_joined'
  | 'member_left'
  | 'member_promoted'
  | 'member_demoted'
  | 'message_sent'
  | 'content_liked'
  | 'content_commented'

export interface Activity {
  id: string
  type: ActivityType
  actorId: string
  actorName: string
  actorAvatar?: string
  targetId?: string
  targetName?: string
  metadata?: Record<string, any>
  timestamp: Date
}

interface CircleActivityProps {
  activities: Activity[]
  currentUserId: string
}

// ============================================
// ACTIVITY ITEM
// ============================================
function ActivityItem({ activity, currentUserId }: { activity: Activity; currentUserId: string }) {
  const isMe = activity.actorId === currentUserId

  const getIcon = () => {
    switch (activity.type) {
      case 'memory_shared':
        return <ImageIcon size={14} className="text-[#B8562E]" />
      case 'wisdom_shared':
        return <BookOpen size={14} className="text-[#2D5A3D]" />
      case 'poll_created':
      case 'poll_voted':
      case 'poll_closed':
        return <BarChart3 size={14} className="text-[#4A3552]" />
      case 'event_proposed':
      case 'event_confirmed':
      case 'event_voted':
        return <Calendar size={14} className="text-[#C4A235]" />
      case 'member_joined':
        return <UserPlus size={14} className="text-[#2D5A3D]" />
      case 'member_left':
        return <UserMinus size={14} className="text-red-500" />
      case 'member_promoted':
        return <Crown size={14} className="text-[#C4A235]" />
      case 'member_demoted':
        return <Shield size={14} className="text-[#666]" />
      case 'message_sent':
        return <MessageCircle size={14} className="text-[#2D5A3D]" />
      case 'content_liked':
        return <Heart size={14} className="text-red-400" />
      case 'content_commented':
        return <MessageCircle size={14} className="text-[#2D5A3D]" />
      default:
        return <Bell size={14} className="text-[#666]" />
    }
  }

  const getIconBg = () => {
    switch (activity.type) {
      case 'memory_shared':
        return 'bg-[#B8562E]/10'
      case 'wisdom_shared':
        return 'bg-[#2D5A3D]/10'
      case 'poll_created':
      case 'poll_voted':
      case 'poll_closed':
        return 'bg-[#4A3552]/10'
      case 'event_proposed':
      case 'event_confirmed':
      case 'event_voted':
        return 'bg-[#C4A235]/10'
      case 'member_joined':
      case 'member_promoted':
        return 'bg-[#2D5A3D]/10'
      case 'member_left':
      case 'member_demoted':
        return 'bg-red-100'
      case 'content_liked':
        return 'bg-red-50'
      default:
        return 'bg-[#2D5A3D]/10'
    }
  }

  const getMessage = () => {
    const actor = isMe ? 'You' : activity.actorName
    
    switch (activity.type) {
      case 'memory_shared':
        return <><strong>{actor}</strong> shared a memory: <span className="text-[#B8562E]">{activity.targetName}</span></>
      case 'wisdom_shared':
        return <><strong>{actor}</strong> shared wisdom: <span className="text-[#2D5A3D]">{activity.targetName}</span></>
      case 'poll_created':
        return <><strong>{actor}</strong> created a poll: <span className="text-[#4A3552]">{activity.targetName}</span></>
      case 'poll_voted':
        return <><strong>{actor}</strong> voted on <span className="text-[#4A3552]">{activity.targetName}</span></>
      case 'poll_closed':
        return <><strong>{actor}</strong> closed the poll: <span className="text-[#4A3552]">{activity.targetName}</span></>
      case 'event_proposed':
        return <><strong>{actor}</strong> proposed an event: <span className="text-[#8a7c08]">{activity.targetName}</span> with {activity.metadata?.slotCount} time options</>
      case 'event_confirmed':
        return <><strong>{actor}</strong> confirmed the event: <span className="text-[#8a7c08]">{activity.targetName}</span></>
      case 'event_voted':
        return <><strong>{actor}</strong> voted on availability for <span className="text-[#8a7c08]">{activity.targetName}</span></>
      case 'member_joined':
        return <><strong>{actor}</strong> joined the circle</>
      case 'member_left':
        return <><strong>{actor}</strong> left the circle</>
      case 'member_promoted':
        return <><strong>{actor}</strong> promoted <strong>{activity.targetName}</strong> to {activity.metadata?.newRole}</>
      case 'member_demoted':
        return <><strong>{actor}</strong> changed <strong>{activity.targetName}</strong>'s role to {activity.metadata?.newRole}</>
      case 'message_sent':
        return <><strong>{actor}</strong> sent a message: "{activity.metadata?.preview}"</>
      case 'content_liked':
        return <><strong>{actor}</strong> liked <span className="text-[#2D5A3D]">{activity.targetName}</span></>
      case 'content_commented':
        return <><strong>{actor}</strong> commented on <span className="text-[#2D5A3D]">{activity.targetName}</span></>
      default:
        return <><strong>{actor}</strong> performed an action</>
    }
  }

  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true })
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`
    }
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#2D5A3D]/5 transition-colors">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg()}`}>
        {getIcon()}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2d2d2d] leading-relaxed">
          {getMessage()}
        </p>
        <p className="text-xs text-[#999] mt-1">
          {formatTime(activity.timestamp)}
        </p>
      </div>
    </div>
  )
}

// ============================================
// DATE SEPARATOR
// ============================================
function DateSeparator({ date }: { date: Date }) {
  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d')
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-[#2D5A3D]/10" />
      <span className="text-xs font-medium text-[#666] px-2">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-[#2D5A3D]/10" />
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CircleActivity({ activities, currentUserId }: CircleActivityProps) {
  // Group activities by date
  const groupedActivities: { date: Date; activities: Activity[] }[] = []
  
  activities.forEach(activity => {
    const activityDate = new Date(activity.timestamp)
    activityDate.setHours(0, 0, 0, 0)
    
    const lastGroup = groupedActivities[groupedActivities.length - 1]
    if (lastGroup) {
      const lastDate = new Date(lastGroup.date)
      lastDate.setHours(0, 0, 0, 0)
      
      if (lastDate.getTime() === activityDate.getTime()) {
        lastGroup.activities.push(activity)
        return
      }
    }
    
    groupedActivities.push({ 
      date: activityDate, 
      activities: [activity] 
    })
  })

  if (activities.length === 0) {
    return (
      <div className="content-card text-center py-8">
        <div className="w-12 h-12 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mx-auto mb-3">
          <Bell size={20} className="text-[#2D5A3D]" />
        </div>
        <p className="text-sm text-[#666]">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="content-card">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={18} className="text-[#2D5A3D]" />
        <h3 className="font-semibold text-[#2d2d2d]">Recent Activity</h3>
      </div>
      
      <div className="space-y-1">
        {groupedActivities.map(({ date, activities: dayActivities }, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && <DateSeparator date={date} />}
            {dayActivities.map(activity => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
