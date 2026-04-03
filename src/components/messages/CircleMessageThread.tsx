'use client'

import { useState, useRef, useEffect } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { 
  Send, Paperclip, Smile, Mic, X, Image as ImageIcon,
  Check, CheckCheck, Users, ExternalLink, Loader2
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface CircleMessage {
  id: string
  content: string
  media_url?: string
  media_type?: string
  created_at: string
  sender: {
    id: string
    full_name: string
    avatar_url?: string
  }
  reply_to?: {
    id: string
    content: string
    sender: {
      id: string
      full_name: string
    }
  }
}

interface CircleMessageThreadProps {
  circleId: string
  circleName: string
  memberCount: number
  onOpenDetail: () => void
  onMessageSent: () => void
}

// ============================================
// MESSAGE BUBBLE
// ============================================
function MessageBubble({ 
  message, 
  showAvatar,
  showName,
  currentUserId
}: { 
  message: CircleMessage
  showAvatar: boolean
  showName: boolean
  currentUserId: string
}) {
  const isOwn = message.sender.id === currentUserId
  const initials = message.sender.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-9">
        {showAvatar && !isOwn && (
          message.sender.avatar_url ? (
            <img
              src={message.sender.avatar_url}
              alt={message.sender.full_name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30 flex items-center justify-center text-xs font-semibold text-[#2D5A3D]">
              {initials}
            </div>
          )
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showName && !isOwn && (
          <p className="text-xs font-semibold text-[#2D5A3D] mb-1 px-1">
            {message.sender.full_name}
          </p>
        )}

        {/* Reply preview */}
        {message.reply_to && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs bg-[#2D5A3D]/5 border-l-2 border-[#2D5A3D]/30 ${isOwn ? 'ml-auto' : ''}`}>
            <span className="font-medium text-[#2D5A3D]">{message.reply_to.sender.full_name}</span>
            <p className="text-[#666] truncate">{message.reply_to.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? 'bg-[#2D5A3D] text-white rounded-br-md'
              : 'bg-white border border-[#2D5A3D]/10 text-[#2d2d2d] rounded-bl-md'
          }`}
        >
          {/* Image message */}
          {message.media_url && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={message.media_url}
                  alt="Shared image"
                  className="max-w-full max-h-64 object-cover rounded-lg"
                />
              </div>
            </div>
          )}
          
          {/* Text content */}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className={`flex items-center gap-1.5 mt-1 px-1 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span className="text-[10px] text-[#999]">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
          {isOwn && (
            <span className="text-[#2D5A3D]">
              <CheckCheck size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MESSAGE INPUT
// ============================================
function CircleMessageInput({ 
  onSend, 
  disabled = false,
  placeholder = 'Type a message...'
}: { 
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string 
}) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!message.trim() || disabled) return
    onSend(message.trim())
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const quickEmojis = ['😊', '❤️', '👍', '😂', '🙏', '✨', '🎉', '💪']

  return (
    <div className="p-4 border-t border-[#2D5A3D]/10 bg-white/50">
      {/* Emoji Quick Picker */}
      {showEmojiPicker && (
        <div className="mb-3 p-2 bg-white rounded-xl border border-[#2D5A3D]/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#666]">Quick Reactions</span>
            <button 
              onClick={() => setShowEmojiPicker(false)}
              className="text-[#666] hover:text-[#2d2d2d]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {quickEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage(prev => prev + emoji)
                  setShowEmojiPicker(false)
                  textareaRef.current?.focus()
                }}
                className="w-9 h-9 text-xl hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 pr-10 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-xl text-sm text-[#2d2d2d] placeholder:text-[#999] focus:outline-none focus:border-[#2D5A3D]/30 focus:bg-white transition-all resize-none min-h-[44px] max-h-[120px]"
          />
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`absolute right-3 bottom-2.5 p-1 rounded transition-colors ${
              showEmojiPicker
                ? 'text-[#C4A235]'
                : 'text-[#999] hover:text-[#666]'
            }`}
          >
            <Smile size={18} />
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            message.trim() && !disabled
              ? 'bg-[#2D5A3D] text-white hover:bg-[#234A31] shadow-sm'
              : 'bg-[#2D5A3D]/10 text-[#2D5A3D]/40 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CircleMessageThread({
  circleId,
  circleName,
  memberCount,
  onOpenDetail,
  onMessageSent
}: CircleMessageThreadProps) {
  const [messages, setMessages] = useState<CircleMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch messages and user
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Import supabase client dynamically to avoid SSR issues
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        // Fetch messages via API
        const res = await fetch(`/api/circles/${circleId}/messages`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [circleId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || sending) return
    
    setSending(true)
    try {
      const res = await fetch(`/api/circles/${circleId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        onMessageSent()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  // Group messages by date
  const groupedMessages: { date: Date; messages: CircleMessage[] }[] = []
  messages.forEach(message => {
    const msgDate = new Date(message.created_at)
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && isSameDay(lastGroup.date, msgDate)) {
      lastGroup.messages.push(message)
    } else {
      groupedMessages.push({ date: msgDate, messages: [message] })
    }
  })

  return (
    <div className="h-full flex flex-col bg-[#FAF7E8]/30">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#2D5A3D]/10 bg-white/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
            <Users size={18} className="text-[#2D5A3D]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2d2d2d]">{circleName}</h3>
            <p className="text-xs text-[#666]">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={onOpenDetail}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          View Circle
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#2D5A3D]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mb-4">
              <Send size={24} className="text-[#2D5A3D]" />
            </div>
            <h3 className="font-semibold text-[#2d2d2d] mb-1">Start the conversation</h3>
            <p className="text-sm text-[#666]">
              Send the first message to {circleName}
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages: dayMessages }, groupIndex) => (
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
                  const showAvatar = !prevMessage || prevMessage.sender.id !== message.sender.id
                  const showName = showAvatar && message.sender.id !== currentUserId

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showAvatar={showAvatar}
                      showName={showName}
                      currentUserId={currentUserId}
                    />
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <CircleMessageInput 
        onSend={handleSendMessage}
        disabled={sending}
        placeholder={`Message ${circleName}...`}
      />
    </div>
  )
}
