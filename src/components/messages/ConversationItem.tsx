'use client'

import { formatDistanceToNow } from 'date-fns'
import { Brain, Pin, Users } from 'lucide-react'
import { Conversation } from './types'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export default function ConversationItem({ 
  conversation, 
  isActive, 
  onClick 
}: ConversationItemProps) {
  const initials = conversation.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const hasPinnedMessages = conversation.pinnedMessages && conversation.pinnedMessages.length > 0

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
        isActive
          ? 'bg-[#2D5A3D]/15 border border-[#2D5A3D]/20'
          : 'hover:bg-white/60 border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {conversation.avatarUrl ? (
          <img
            src={conversation.avatarUrl}
            alt={conversation.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${
              conversation.type === 'memory-thread'
                ? 'bg-gradient-to-br from-[#C4A235]/30 to-[#B8562E]/30 text-[#B8562E]'
                : conversation.type === 'circle'
                ? 'bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 text-[#2D5A3D]'
                : 'bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30 text-[#2D5A3D]'
            }`}
          >
            {conversation.type === 'memory-thread' ? (
              <Brain size={20} />
            ) : conversation.type === 'circle' ? (
              <Users size={20} />
            ) : (
              initials
            )}
          </div>
        )}
        
        {/* Online indicator */}
        {conversation.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className={`text-sm font-semibold truncate ${
              isActive ? 'text-[#2D5A3D]' : 'text-[#1A1F1C]'
            }`}>
              {conversation.name}
            </h4>
            {hasPinnedMessages && (
              <Pin size={10} className="text-[#B8562E] flex-shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-[#5A6660] flex-shrink-0">
            {formatDistanceToNow(conversation.timestamp, { addSuffix: false })}
          </span>
        </div>
        
        {/* Memory thread badge */}
        {conversation.type === 'memory-thread' && conversation.linkedMemoryTitle && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C4A235]/20 text-[#8a7c08] font-medium">
              Memory Thread
            </span>
            {conversation.participants && conversation.participants > 2 && (
              <span className="text-[10px] text-[#5A6660]">
                · {conversation.participants} people
              </span>
            )}
          </div>
        )}
        
        {/* Circle badge */}
        {conversation.type === 'circle' && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2D5A3D]/15 text-[#2D5A3D] font-medium">
              Circle
            </span>
            {conversation.participants && conversation.participants > 0 && (
              <span className="text-[10px] text-[#5A6660]">
                · {conversation.participants} member{conversation.participants !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        
        <p className={`text-xs mt-1 truncate ${
          conversation.unreadCount > 0 ? 'text-[#1A1F1C] font-medium' : 'text-[#5A6660]'
        }`}>
          {conversation.lastMessage}
        </p>
      </div>

      {/* Unread badge */}
      {conversation.unreadCount > 0 && (
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#B8562E] text-white text-[10px] font-bold flex items-center justify-center">
          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
        </div>
      )}
    </button>
  )
}
