'use client'

import { useState, useRef, useEffect } from 'react'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { 
  Send, Paperclip, Smile, Mic, X, Image as ImageIcon,
  Check, CheckCheck, MoreVertical
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface CircleMessage {
  id: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'voice'
  imageUrl?: string
  voiceDuration?: number
  isOwn: boolean
  status?: 'sent' | 'delivered' | 'read'
}

interface CircleMessagesProps {
  circleName: string
  memberCount: number
  currentUserId: string
  messages: CircleMessage[]
  onSendMessage: (content: string, type: 'text' | 'image' | 'voice') => void
}

// ============================================
// MESSAGE BUBBLE
// ============================================
function MessageBubble({ 
  message, 
  showAvatar,
  showName
}: { 
  message: CircleMessage
  showAvatar: boolean
  showName: boolean 
}) {
  const initials = message.senderName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const formatVoiceDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex gap-3 ${message.isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-9">
        {showAvatar && !message.isOwn && (
          message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
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
      <div className={`max-w-[70%] ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showName && !message.isOwn && (
          <p className="text-xs font-semibold text-[#2D5A3D] mb-1 px-1">
            {message.senderName}
          </p>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            message.isOwn
              ? 'bg-[#2D5A3D] text-white rounded-br-md'
              : 'bg-white border border-[#2D5A3D]/10 text-[#1A1F1C] rounded-bl-md'
          }`}
        >
          {/* Text message */}
          {message.type === 'text' && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Image message */}
          {message.type === 'image' && message.imageUrl && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={message.imageUrl}
                  alt="Shared image"
                  className="max-w-full max-h-64 object-cover rounded-lg"
                />
              </div>
              {message.content && (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
            </div>
          )}

          {/* Voice message */}
          {message.type === 'voice' && (
            <div className="flex items-center gap-3 min-w-[180px]">
              <button className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.isOwn 
                  ? 'bg-white/20 text-white hover:bg-white/30' 
                  : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
              } transition-colors`}>
                <Mic size={14} />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-0.5 h-6">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full ${
                        message.isOwn ? 'bg-white/40' : 'bg-[#2D5A3D]/30'
                      }`}
                      style={{ height: `${Math.random() * 100}%`, minHeight: '4px' }}
                    />
                  ))}
                </div>
              </div>
              <span className={`text-xs font-medium ${
                message.isOwn ? 'text-white/70' : 'text-[#5A6660]'
              }`}>
                {formatVoiceDuration(message.voiceDuration || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Timestamp & Status */}
        <div className={`flex items-center gap-1.5 mt-1 px-1 ${
          message.isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span className="text-[10px] text-[#94A09A]">
            {format(message.timestamp, 'h:mm a')}
          </span>
          {message.isOwn && message.status && (
            <span className="text-[#2D5A3D]">
              {message.status === 'read' ? (
                <CheckCheck size={12} />
              ) : (
                <Check size={12} />
              )}
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
  onSend: (content: string, type: 'text' | 'image' | 'voice') => void
  disabled?: boolean
  placeholder?: string 
}) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!message.trim() || disabled) return
    onSend(message.trim(), 'text')
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
            <span className="text-xs font-medium text-[#5A6660]">Quick Reactions</span>
            <button 
              onClick={() => setShowEmojiPicker(false)}
              className="text-[#5A6660] hover:text-[#1A1F1C]"
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

      {/* Attachment Menu */}
      {showAttachMenu && (
        <div className="mb-3 p-3 bg-white rounded-xl border border-[#2D5A3D]/10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#5A6660]">Attach</span>
            <button 
              onClick={() => setShowAttachMenu(false)}
              className="text-[#5A6660] hover:text-[#1A1F1C]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                <ImageIcon size={18} className="text-[#2D5A3D]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Photo</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#B8562E]/10 flex items-center justify-center">
                <Mic size={18} className="text-[#B8562E]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <button
          onClick={() => {
            setShowAttachMenu(!showAttachMenu)
            setShowEmojiPicker(false)
          }}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            showAttachMenu
              ? 'bg-[#2D5A3D] text-white'
              : 'bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20'
          }`}
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 pr-10 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-xl text-sm text-[#1A1F1C] placeholder:text-[#94A09A] focus:outline-none focus:border-[#2D5A3D]/30 focus:bg-white transition-all resize-none min-h-[44px] max-h-[120px]"
          />
          
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker)
              setShowAttachMenu(false)
            }}
            className={`absolute right-3 bottom-2.5 p-1 rounded transition-colors ${
              showEmojiPicker
                ? 'text-[#C4A235]'
                : 'text-[#94A09A] hover:text-[#5A6660]'
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
export default function CircleMessages({
  circleName,
  memberCount,
  currentUserId,
  messages,
  onSendMessage
}: CircleMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  // Group messages by date
  const groupedMessages: { date: Date; messages: CircleMessage[] }[] = []
  messages.forEach(message => {
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && isSameDay(lastGroup.date, message.timestamp)) {
      lastGroup.messages.push(message)
    } else {
      groupedMessages.push({ date: message.timestamp, messages: [message] })
    }
  })

  return (
    <div className="h-[600px] flex flex-col bg-[#FAF7E8]/50 rounded-2xl border border-[#2D5A3D]/10 overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center mb-4">
              <Send size={24} className="text-[#2D5A3D]" />
            </div>
            <h3 className="font-semibold text-[#1A1F1C] mb-1">Start the conversation</h3>
            <p className="text-sm text-[#5A6660]">
              Send the first message to {circleName}
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages: dayMessages }, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-[#2D5A3D]/10" />
                <span className="text-xs font-medium text-[#5A6660] bg-[#FAF7E8] px-3 py-1 rounded-full">
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
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showAvatar={showAvatar}
                      showName={showName}
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
        onSend={onSendMessage}
        placeholder={`Message ${circleName}...`}
      />
    </div>
  )
}
