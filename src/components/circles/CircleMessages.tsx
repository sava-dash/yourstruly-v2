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

  // Pick a deterministic incoming-bubble color from the editorial palette
  // so different senders read as visually distinct without storing per-user
  // color metadata.
  const PALETTE: { bg: string; ink: string }[] = [
    { bg: 'var(--ed-red, #E23B2E)',    ink: '#fff' },
    { bg: 'var(--ed-blue, #2A5CD3)',   ink: '#fff' },
    { bg: 'var(--ed-ink, #111)',       ink: '#fff' },
  ]
  let hash = 0
  for (let i = 0; i < message.senderId.length; i += 1) {
    hash = (hash * 31 + message.senderId.charCodeAt(i)) | 0
  }
  const incoming = PALETTE[Math.abs(hash) % PALETTE.length]
  const bubbleStyle: React.CSSProperties = message.isOwn
    ? { background: 'var(--ed-yellow, #F2C84B)', color: 'var(--ed-ink, #111)' }
    : { background: incoming.bg, color: incoming.ink }

  return (
    <div className={`flex gap-3 ${message.isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar — editorial square, color-keyed to bubble */}
      <div className="flex-shrink-0 w-9">
        {showAvatar && !message.isOwn && (
          message.senderAvatar ? (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              className="w-9 h-9 object-cover"
              style={{ border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
            />
          ) : (
            <span
              className="flex items-center justify-center w-9 h-9 text-xs font-bold"
              style={{
                background: incoming.bg,
                color: incoming.ink,
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {initials}
            </span>
          )
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[70%] ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {showName && !message.isOwn && (
          <p
            className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)] mb-1 px-1"
            style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
          >
            {message.senderName.toUpperCase()}
          </p>
        )}

        {/* Bubble — editorial flat colored block with ink border */}
        <div
          className="px-3.5 py-2.5"
          style={{
            ...bubbleStyle,
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
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
    <div className="p-3" style={{ borderTop: '2px solid var(--ed-ink, #111)', background: 'var(--ed-paper, #FFFBF1)' }}>
      {showEmojiPicker && (
        <div
          className="mb-3 p-2"
          style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              QUICK REACTIONS
            </span>
            <button onClick={() => setShowEmojiPicker(false)} className="text-[var(--ed-muted,#6F6B61)] hover:text-[var(--ed-ink,#111)]">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage((prev) => prev + emoji)
                  setShowEmojiPicker(false)
                  textareaRef.current?.focus()
                }}
                className="w-9 h-9 text-xl"
                style={{ border: '1.5px solid var(--ed-ink, #111)', borderRadius: 2, background: 'var(--ed-paper, #FFFBF1)' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAttachMenu && (
        <div
          className="mb-3 p-3"
          style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] tracking-[0.18em] text-[var(--ed-muted,#6F6B61)]"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
            >
              ATTACH
            </span>
            <button onClick={() => setShowAttachMenu(false)} className="text-[var(--ed-muted,#6F6B61)] hover:text-[var(--ed-ink,#111)]">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="flex flex-col items-center gap-1 p-2"
              style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
            >
              <ImageIcon size={18} className="text-[var(--ed-ink,#111)]" />
              <span className="text-[10px] tracking-[0.16em]" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>PHOTO</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-2"
              style={{ background: 'var(--ed-paper, #FFFBF1)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
            >
              <Mic size={18} className="text-[var(--ed-red,#E23B2E)]" />
              <span className="text-[10px] tracking-[0.16em]" style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>VOICE</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false) }}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
          style={{
            background: showAttachMenu ? 'var(--ed-ink, #111)' : 'var(--ed-paper, #FFFBF1)',
            color: showAttachMenu ? '#fff' : 'var(--ed-ink, #111)',
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
        >
          <Paperclip size={16} />
        </button>

        <div
          className="flex-1 flex items-stretch"
          style={{ background: 'var(--ed-cream, #F3ECDC)', border: '2px solid var(--ed-ink, #111)', borderRadius: 2 }}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-3 py-2.5 bg-transparent text-sm text-[var(--ed-ink,#111)] placeholder:text-[var(--ed-muted,#6F6B61)] focus:outline-none resize-none min-h-[40px] max-h-[120px]"
          />
          <button
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false) }}
            className="px-3"
            style={{ color: showEmojiPicker ? 'var(--ed-yellow, #C09020)' : 'var(--ed-muted, #6F6B61)' }}
            aria-label="Emoji picker"
          >
            <Smile size={16} />
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center disabled:opacity-50"
          style={{
            background: 'var(--ed-red, #E23B2E)',
            color: '#fff',
            border: '2px solid var(--ed-ink, #111)',
            borderRadius: 2,
          }}
          aria-label="Send"
        >
          <Send size={16} strokeWidth={2.5} />
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
    <div
      className="h-[600px] flex flex-col overflow-hidden"
      style={{
        background: 'var(--ed-cream, #F3ECDC)',
        border: '2px solid var(--ed-ink, #111)',
        borderRadius: 2,
      }}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: 56, height: 56,
                background: 'var(--ed-red, #E23B2E)',
                color: '#fff',
                border: '2px solid var(--ed-ink, #111)',
                borderRadius: 999,
              }}
            >
              <Send size={22} />
            </div>
            <p
              className="text-xl text-[var(--ed-ink,#111)] mb-2 leading-tight"
              style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)' }}
            >
              START THE CONVERSATION
            </p>
            <p className="text-sm text-[var(--ed-muted,#6F6B61)]">
              Send the first message to {circleName}.
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages: dayMessages }, groupIndex) => (
            <div key={groupIndex}>
              {/* Editorial date separator: red dot + DATE mono */}
              <div className="flex items-center gap-3 mb-4">
                <span aria-hidden style={{ width: 8, height: 8, background: 'var(--ed-red, #E23B2E)', borderRadius: 999 }} />
                <span
                  className="text-[10px] tracking-[0.22em] text-[var(--ed-ink,#111)]"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
                >
                  {formatDateSeparator(date).toUpperCase()}
                </span>
                <div className="flex-1 h-px bg-[var(--ed-ink,#111)]/30" />
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
