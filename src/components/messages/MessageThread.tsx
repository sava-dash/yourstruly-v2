'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { Brain, Users, MoreVertical, Info } from 'lucide-react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import ThreadToolbar from './ThreadToolbar'
import { Message, Conversation, Reaction } from './types'

interface MessageThreadProps {
  conversation: Conversation
  messages: Message[]
  onSendMessage: (content: string, type: 'text' | 'image' | 'voice' | 'poll' | 'schedule', extras?: any) => void
  onReact?: (messageId: string, emoji: string) => void
  onPin?: (messageId: string) => void
}

export default function MessageThread({
  conversation,
  messages,
  onSendMessage,
  onReact,
  onPin
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initials = conversation.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  // Group messages by date
  const groupedMessages: { date: Date; messages: Message[] }[] = []
  messages.forEach(message => {
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && isSameDay(lastGroup.date, message.timestamp)) {
      lastGroup.messages.push(message)
    } else {
      groupedMessages.push({ date: message.timestamp, messages: [message] })
    }
  })

  // Get pinned messages
  const pinnedMessages = useMemo(() => 
    messages.filter(m => m.isPinned),
    [messages]
  )

  // Get participants for mentions
  const participants = useMemo(() => {
    if (conversation.participantsList) return conversation.participantsList
    // Build from message senders
    const uniqueSenders = new Map<string, { id: string; name: string }>()
    messages.forEach(m => {
      if (!m.isOwn && !uniqueSenders.has(m.senderId)) {
        uniqueSenders.set(m.senderId, { id: m.senderId, name: m.senderName })
      }
    })
    return Array.from(uniqueSenders.values())
  }, [messages, conversation.participantsList])

  const handleReact = (messageId: string, emoji: string) => {
    onReact?.(messageId, emoji)
  }

  const handlePin = (messageId: string) => {
    onPin?.(messageId)
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  const handleUnpin = (messageId: string) => {
    onPin?.(messageId) // Toggle pin
  }

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('bg-[#C4A235]/20')
      setTimeout(() => element.classList.remove('bg-[#C4A235]/20'), 2000)
    }
  }

  const handleSend = (content: string, type: 'text' | 'image' | 'voice' | 'poll' | 'schedule', extras?: any) => {
    onSendMessage(content, type, {
      ...extras,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        content: replyingTo.content
      } : undefined
    })
    setReplyingTo(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2D5A3D]/10 bg-white/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {conversation.avatarUrl ? (
            <img
              src={conversation.avatarUrl}
              alt={conversation.name}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold ${
              conversation.type === 'memory-thread'
                ? 'bg-gradient-to-br from-[#C4A235]/30 to-[#B8562E]/30 text-[#B8562E]'
                : 'bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30 text-[#2D5A3D]'
            }`}>
              {conversation.type === 'memory-thread' ? (
                <Brain size={20} />
              ) : (
                initials
              )}
            </div>
          )}
          
          <div>
            <h3 className="font-semibold text-[#2d2d2d]">{conversation.name}</h3>
            <div className="flex items-center gap-2 text-xs text-[#666]">
              {conversation.type === 'memory-thread' && conversation.linkedMemoryTitle && (
                <>
                  <span className="flex items-center gap-1">
                    <Brain size={10} className="text-[#C4A235]" />
                    {conversation.linkedMemoryTitle}
                  </span>
                  <span>·</span>
                </>
              )}
              {conversation.participants && conversation.participants > 1 && (
                <span className="flex items-center gap-1">
                  <Users size={10} />
                  {conversation.participants} participants
                </span>
              )}
              {conversation.isOnline && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Online
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#2D5A3D]/10 hover:text-[#2D5A3D] transition-colors"
            title="View members & details"
          >
            <Info size={18} />
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-[#666] hover:bg-[#2D5A3D]/10 hover:text-[#2D5A3D] transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Thread Toolbar */}
      <ThreadToolbar
        conversation={conversation}
        messages={messages}
        pinnedMessages={pinnedMessages}
        onUnpin={handleUnpin}
        onScrollToMessage={scrollToMessage}
      />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0"
      >
        {groupedMessages.map(({ date, messages: dayMessages }, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Separator */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-[#2D5A3D]/10" />
              <span className="text-xs font-medium text-[#666] bg-[#FAF7E8] px-3 py-1 rounded-full">
                {formatDateSeparator(date)}
              </span>
              <div className="flex-1 h-px bg-[#2D5A3D]/10" />
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {dayMessages.map((message, msgIndex) => {
                const prevMessage = msgIndex > 0 ? dayMessages[msgIndex - 1] : null
                const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId
                const showName = showAvatar && !message.isOwn

                return (
                  <div 
                    key={message.id} 
                    id={`msg-${message.id}`}
                    className="transition-colors duration-500 rounded-lg"
                  >
                    <MessageBubble
                      message={message}
                      showAvatar={showAvatar}
                      showName={showName}
                      onReact={handleReact}
                      onPin={handlePin}
                      onReply={handleReply}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput 
          onSend={handleSend}
          placeholder={`Message ${conversation.name}...`}
          participants={participants}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  )
}
