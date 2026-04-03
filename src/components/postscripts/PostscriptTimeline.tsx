'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Send, Calendar, Clock, CheckCircle, Users, Image as ImageIcon, 
  Mic, ChevronRight
} from 'lucide-react'
import { getEventIcon, EVENT_LABELS } from '@/lib/postscripts/events'

interface PostScript {
  id: string
  title: string
  message: string | null
  recipient_name: string
  recipient_email: string | null
  circle_id: string | null
  delivery_type: 'date' | 'event' | 'after_passing'
  delivery_date: string | null
  delivery_event: string | null
  status: 'draft' | 'scheduled' | 'sent' | 'opened'
  created_at: string
  audio_url?: string | null
  recipient?: {
    id: string
    full_name: string
    relationship_type: string | null
    avatar_url: string | null
  } | null
  circle?: {
    id: string
    name: string
  } | null
  attachments?: {
    id: string
    file_url: string
    file_type: string
  }[]
}

function formatLongDate(dateStr: string | null): string {
  if (!dateStr) return 'Not scheduled'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-400'
    case 'scheduled': return 'bg-amber-500'
    case 'sent': return 'bg-blue-500'
    case 'opened': return 'bg-green-500'
    default: return 'bg-gray-400'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return Clock
    case 'scheduled': return Calendar
    case 'sent': return Send
    case 'opened': return CheckCircle
    default: return Clock
  }
}

function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

interface TimelineCardProps {
  postscript: PostScript
  isLeft: boolean
}

function TimelineCard({ postscript, isLeft }: TimelineCardProps) {
  const isCircle = !!postscript.circle_id
  const displayName = postscript.circle?.name || postscript.recipient_name
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  const firstImage = postscript.attachments?.find(a => a.file_type?.startsWith('image/'))
  const hasAudio = postscript.audio_url
  
  // Render status icon based on status
  const renderStatusIcon = () => {
    const Icon = getStatusIcon(postscript.status)
    return <Icon size={10} />
  }

  return (
    <Link href={`/dashboard/postscripts/${postscript.id}`}>
      <div className={`
        group relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/80
        hover:shadow-md hover:border-[#B8562E]/20 transition-all duration-200 overflow-hidden
        ${isLeft ? 'mr-auto' : 'ml-auto'}
      `}>
        {/* Image Preview */}
        {firstImage && (
          <div className="relative h-32 overflow-hidden">
            
<img src={firstImage.file_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        
        <div className="p-4">
          {/* Header with Avatar */}
          <div className="flex items-start gap-3 mb-3">
            {/* Recipient Avatar */}
            <div className="flex-shrink-0">
              {isCircle ? (
                <div className="w-10 h-10 rounded-full bg-[#8DACAB] flex items-center justify-center text-white">
                  <Users size={18} />
                </div>
              ) : postscript.recipient?.avatar_url ? (
                <img 
                  src={postscript.recipient.avatar_url} 
                  alt={postscript.recipient_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B8562E] to-[#C4A235] 
                                flex items-center justify-center text-white text-sm font-medium">
                  {initials}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-[#B8562E] transition-colors line-clamp-2">
                {postscript.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                To: {displayName}
              </p>
            </div>
            
            <ChevronRight size={16} className="text-gray-300 group-hover:text-[#B8562E] transition-colors flex-shrink-0" />
          </div>

          {/* Message Preview */}
          {postscript.message && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
              {postscript.message}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            {/* Status Badge */}
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium
              ${postscript.status === 'draft' ? 'bg-gray-100 text-gray-600' : ''}
              ${postscript.status === 'scheduled' ? 'bg-amber-50 text-amber-700' : ''}
              ${postscript.status === 'sent' ? 'bg-blue-50 text-blue-700' : ''}
              ${postscript.status === 'opened' ? 'bg-green-50 text-green-700' : ''}
            `}>
              {renderStatusIcon()}
              <span>{getStatusLabel(postscript.status)}</span>
            </div>
            
            {/* Attachments indicators */}
            <div className="flex items-center gap-2 text-gray-400">
              {hasAudio && <Mic size={12} />}
              {postscript.attachments && postscript.attachments.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs">
                  <ImageIcon size={12} />
                  {postscript.attachments.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

interface TimelineItemProps {
  postscript: PostScript
  index: number
}

function TimelineItem({ postscript, index }: TimelineItemProps) {
  const isLeft = index % 2 === 0
  
  // Render delivery icon based on type
  const renderDeliveryIcon = () => {
    const Icon = postscript.delivery_type === 'event' 
      ? getEventIcon(postscript.delivery_event) 
      : Calendar
    return <Icon size={12} className="text-[#B8562E]" />
  }
  
  // Get display date
  let displayDate = ''
  if (postscript.delivery_type === 'date') {
    displayDate = formatLongDate(postscript.delivery_date)
  } else if (postscript.delivery_type === 'event') {
    displayDate = EVENT_LABELS[postscript.delivery_event || ''] || 'Life Event'
  } else {
    displayDate = "After I'm gone"
  }
  
  return (
    <div className="relative">
      {/* Timeline connector - the dot on the center line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
        {/* Status dot */}
        <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm ${getStatusColor(postscript.status)}`} />
      </div>
      
      {/* Date badge - positioned above the dot */}
      <div className={`
        absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2
        px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-100
        flex items-center gap-1.5 text-xs font-medium text-gray-700 whitespace-nowrap
      `}>
        {renderDeliveryIcon()}
        <span>{displayDate}</span>
      </div>
      
      {/* Card container */}
      <div className={`
        grid grid-cols-2 gap-8 pt-8
        ${isLeft ? '' : ''}
      `}>
        {/* Left side */}
        <div className={isLeft ? 'pr-4' : ''}>
          {isLeft && (
            <TimelineCard postscript={postscript} isLeft={true} />
          )}
        </div>
        
        {/* Right side */}
        <div className={!isLeft ? 'pl-4' : ''}>
          {!isLeft && (
            <TimelineCard postscript={postscript} isLeft={false} />
          )}
        </div>
      </div>
    </div>
  )
}

// Group header for "After I'm Gone" section
function AfterPassingGroup({ postscripts, startIndex }: { postscripts: PostScript[], startIndex: number }) {
  return (
    <div className="relative">
      {/* Timeline connector - the dot on the center line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-4 h-4 rounded-full border-4 border-white shadow-sm bg-[#8DACAB]" />
      </div>
      
      {/* Group header badge - positioned above the dot */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2
        px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-100
        flex items-center gap-1.5 text-xs font-medium text-gray-700 whitespace-nowrap">
        <Calendar size={12} className="text-[#B8562E]" />
        <span>After I'm gone</span>
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#8DACAB]/20 text-[#8DACAB] text-[10px]">
          {postscripts.length}
        </span>
      </div>
      
      {/* Cards in alternating layout */}
      <div className="pt-8 space-y-6">
        {postscripts.map((postscript, idx) => {
          const isLeft = (startIndex + idx) % 2 === 0
          return (
            <div key={postscript.id} className="relative">
              {/* Secondary connector dot for items after the first */}
              {idx > 0 && (
                <div className="absolute left-1/2 transform -translate-x-1/2 -top-3 z-10">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(postscript.status)}`} />
                </div>
              )}
              
              <div className={`grid grid-cols-2 gap-8 ${isLeft ? '' : ''}`}>
                {/* Left side */}
                <div className={isLeft ? 'pr-4' : ''}>
                  {isLeft && <TimelineCard postscript={postscript} isLeft={true} />}
                </div>
                
                {/* Right side */}
                <div className={!isLeft ? 'pl-4' : ''}>
                  {!isLeft && <TimelineCard postscript={postscript} isLeft={false} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface PostscriptTimelineProps {
  postscripts: PostScript[]
}

export default function PostscriptTimeline({ postscripts }: PostscriptTimelineProps) {
  // Separate regular postscripts from "after passing" ones
  const regularPostscripts = postscripts.filter(p => p.delivery_type !== 'after_passing')
  const afterPassingPostscripts = postscripts.filter(p => p.delivery_type === 'after_passing')
  
  // Sort regular postscripts by delivery date/event chronologically
  const sortedRegular = [...regularPostscripts].sort((a, b) => {
    // Prioritize by delivery date if available
    if (a.delivery_date && b.delivery_date) {
      return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
    }
    // Put dated ones before events
    if (a.delivery_date && !b.delivery_date) return -1
    if (!a.delivery_date && b.delivery_date) return 1
    // Default to created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  
  // Sort after passing by created_at
  const sortedAfterPassing = [...afterPassingPostscripts].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  
  if (postscripts.length === 0) {
    return null
  }

  return (
    <div className="relative py-8">
      {/* Vertical center line */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-[#B8562E]/30 via-[#C4A235]/30 to-[#8DACAB]/30"
        style={{ top: '2rem', bottom: '2rem' }}
      />
      
      {/* Timeline items */}
      <div className="space-y-16">
        {/* Regular postscripts (dated and events) */}
        {sortedRegular.map((postscript, index) => (
          <TimelineItem 
            key={postscript.id} 
            postscript={postscript} 
            index={index} 
          />
        ))}
        
        {/* "After I'm Gone" grouped section */}
        {sortedAfterPassing.length > 0 && (
          <AfterPassingGroup 
            postscripts={sortedAfterPassing} 
            startIndex={sortedRegular.length} 
          />
        )}
      </div>
      
      {/* End cap */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
        <div className="w-3 h-3 rounded-full bg-[#8DACAB] border-4 border-white shadow-sm" />
      </div>
    </div>
  )
}
