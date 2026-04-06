'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { 
  Paperclip, Smile, Send, Mic, X, Image as ImageIcon, 
  Calendar, BarChart2, AtSign, FileIcon, Plus, XCircle,
  Clock
} from 'lucide-react'
import { Message, Attachment, Poll, ScheduleProposal } from './types'
import { format } from 'date-fns'

interface Participant {
  id: string
  name: string
  avatar?: string
}

interface MessageInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'voice' | 'poll' | 'schedule', extras?: {
    attachments?: File[]
    poll?: Poll
    schedule?: ScheduleProposal
    mentions?: { userId: string; userName: string; startIndex: number; endIndex: number }[]
    replyTo?: Message
  }) => void
  disabled?: boolean
  placeholder?: string
  participants?: Participant[]
  replyingTo?: Message | null
  onCancelReply?: () => void
}

export default function MessageInput({ 
  onSend, 
  disabled = false,
  placeholder = 'Type a message...',
  participants = [],
  replyingTo,
  onCancelReply
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [showScheduleCreator, setShowScheduleCreator] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  
  // Poll creator state
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollMultiSelect, setPollMultiSelect] = useState(false)
  
  // Schedule creator state
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [scheduleSlots, setScheduleSlots] = useState<string[]>([''])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Quick emojis
  const quickEmojis = ['😊', '❤️', '👍', '😂', '🙏', '✨', '🎉', '💪']

  // Filter participants for mentions
  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  // Handle @ mentions
  useEffect(() => {
    const lastAt = message.lastIndexOf('@')
    if (lastAt >= 0 && lastAt >= message.length - 20) {
      const afterAt = message.slice(lastAt + 1)
      if (!afterAt.includes(' ') && afterAt.length < 20) {
        setShowMentions(true)
        setMentionSearch(afterAt)
        setMentionStartIndex(lastAt)
        return
      }
    }
    setShowMentions(false)
    setMentionSearch('')
    setMentionStartIndex(-1)
  }, [message])

  const handleSend = () => {
    if (showPollCreator) {
      sendPoll()
      return
    }
    if (showScheduleCreator) {
      sendSchedule()
      return
    }
    if ((!message.trim() && attachedFiles.length === 0) || disabled) return
    
    onSend(message.trim(), attachedFiles.length > 0 ? 'image' : 'text', {
      attachments: attachedFiles,
      replyTo: replyingTo || undefined
    })
    setMessage('')
    setAttachedFiles([])
    onCancelReply?.()
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const sendPoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return
    
    const poll: Poll = {
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()).map((text, i) => ({
        id: `opt-${i}`,
        text,
        votes: 0,
        voters: [],
        userVoted: false
      })),
      multiSelect: pollMultiSelect,
      totalVotes: 0
    }
    
    onSend('', 'poll', { poll })
    setPollQuestion('')
    setPollOptions(['', ''])
    setPollMultiSelect(false)
    setShowPollCreator(false)
  }

  const sendSchedule = () => {
    if (!scheduleTitle.trim() || scheduleSlots.filter(s => s).length < 1) return
    
    const schedule: ScheduleProposal = {
      title: scheduleTitle,
      slots: scheduleSlots.filter(s => s).map((datetime, i) => ({
        id: `slot-${i}`,
        datetime: new Date(datetime),
        votes: 0,
        voters: [],
        userVoted: false
      })),
      creatorId: 'current-user'
    }
    
    onSend('', 'schedule', { schedule })
    setScheduleTitle('')
    setScheduleSlots([''])
    setShowScheduleCreator(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const insertMention = (participant: Participant) => {
    const newMessage = 
      message.slice(0, mentionStartIndex) + 
      `@${participant.name} ` + 
      message.slice(mentionStartIndex + mentionSearch.length + 1)
    setMessage(newMessage)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
    setShowAttachMenu(false)
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ''])
    }
  }

  const addScheduleSlot = () => {
    if (scheduleSlots.length < 5) {
      setScheduleSlots([...scheduleSlots, ''])
    }
  }

  return (
    <div className="p-4 border-t border-[#2D5A3D]/10 bg-white/50">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 p-2.5 bg-[#2D5A3D]/5 rounded-xl border-l-2 border-[#2D5A3D] flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#2D5A3D]">
              Replying to {replyingTo.senderName}
            </p>
            <p className="text-xs text-[#5A6660] truncate mt-0.5">
              {replyingTo.content || '[Media]'}
            </p>
          </div>
          <button 
            onClick={onCancelReply}
            className="p-1 text-[#5A6660] hover:text-[#1A1F1C]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div 
              key={i}
              className="relative group flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[#2D5A3D]/10"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon size={14} className="text-[#2D5A3D]" />
              ) : (
                <FileIcon size={14} className="text-[#2D5A3D]" />
              )}
              <span className="text-xs text-[#1A1F1C] max-w-[100px] truncate">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#B8562E] text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Poll Creator */}
      {showPollCreator && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-[#2D5A3D]/10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#2D5A3D]" />
              <span className="text-sm font-semibold text-[#1A1F1C]">Create Poll</span>
            </div>
            <button onClick={() => setShowPollCreator(false)} className="text-[#5A6660] hover:text-[#1A1F1C]">
              <X size={16} />
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Ask a question..."
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-lg text-sm text-[#1A1F1C] placeholder:text-[#5A6660] focus:outline-none focus:border-[#2D5A3D]/30"
          />
          
          <div className="space-y-2 mb-3">
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions]
                    newOpts[i] = e.target.value
                    setPollOptions(newOpts)
                  }}
                  className="flex-1 px-3 py-2 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-lg text-sm text-[#1A1F1C] placeholder:text-[#5A6660] focus:outline-none focus:border-[#2D5A3D]/30"
                />
                {pollOptions.length > 2 && (
                  <button 
                    onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    className="text-[#5A6660] hover:text-[#B8562E]"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={addPollOption}
                disabled={pollOptions.length >= 6}
                className="flex items-center gap-1 text-xs text-[#2D5A3D] hover:text-[#234A31] disabled:opacity-50"
              >
                <Plus size={14} />
                Add option
              </button>
              <label className="flex items-center gap-2 text-xs text-[#5A6660] cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pollMultiSelect}
                  onChange={(e) => setPollMultiSelect(e.target.checked)}
                  className="rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]"
                />
                Multiple choice
              </label>
            </div>
            <button
              onClick={sendPoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              className="px-4 py-1.5 bg-[#2D5A3D] text-white text-xs font-medium rounded-lg hover:bg-[#234A31] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Poll
            </button>
          </div>
        </div>
      )}

      {/* Schedule Creator */}
      {showScheduleCreator && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-[#2D5A3D]/10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#B8562E]" />
              <span className="text-sm font-semibold text-[#1A1F1C]">Propose Times</span>
            </div>
            <button onClick={() => setShowScheduleCreator(false)} className="text-[#5A6660] hover:text-[#1A1F1C]">
              <X size={16} />
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Event title (e.g., Family Dinner)"
            value={scheduleTitle}
            onChange={(e) => setScheduleTitle(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-lg text-sm focus:outline-none focus:border-[#2D5A3D]/30"
          />
          
          <div className="space-y-2 mb-3">
            {scheduleSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6660]" />
                  <input
                    type="datetime-local"
                    value={slot}
                    onChange={(e) => {
                      const newSlots = [...scheduleSlots]
                      newSlots[i] = e.target.value
                      setScheduleSlots(newSlots)
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-lg text-sm focus:outline-none focus:border-[#2D5A3D]/30"
                  />
                </div>
                {scheduleSlots.length > 1 && (
                  <button 
                    onClick={() => setScheduleSlots(scheduleSlots.filter((_, j) => j !== i))}
                    className="text-[#5A6660] hover:text-[#B8562E]"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={addScheduleSlot}
              disabled={scheduleSlots.length >= 5}
              className="flex items-center gap-1 text-xs text-[#2D5A3D] hover:text-[#234A31] disabled:opacity-50"
            >
              <Plus size={14} />
              Add time slot
            </button>
            <button
              onClick={sendSchedule}
              disabled={!scheduleTitle.trim() || scheduleSlots.filter(s => s).length < 1}
              className="px-4 py-1.5 bg-[#B8562E] text-white text-xs font-medium rounded-lg hover:bg-[#d46d3f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Propose Times
            </button>
          </div>
        </div>
      )}

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
            <span className="text-xs font-medium text-[#5A6660]">Add to message</span>
            <button 
              onClick={() => setShowAttachMenu(false)}
              className="text-[#5A6660] hover:text-[#1A1F1C]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                <ImageIcon size={18} className="text-[#2D5A3D]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Photo</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                <FileIcon size={18} className="text-[#2D5A3D]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">File</span>
            </button>
            <button 
              onClick={() => {
                setShowAttachMenu(false)
                setShowPollCreator(true)
              }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#C4A235]/10 flex items-center justify-center">
                <BarChart2 size={18} className="text-[#8a7c08]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Poll</span>
            </button>
            <button 
              onClick={() => {
                setShowAttachMenu(false)
                setShowScheduleCreator(true)
              }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#B8562E]/10 flex items-center justify-center">
                <Calendar size={18} className="text-[#B8562E]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Schedule</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-[#2D5A3D]/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#8DACAB]/20 flex items-center justify-center">
                <Mic size={18} className="text-[#5d8585]" />
              </div>
              <span className="text-[10px] text-[#5A6660]">Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* Mentions dropdown */}
      {showMentions && filteredParticipants.length > 0 && (
        <div className="mb-2 p-1 bg-white rounded-xl border border-[#2D5A3D]/10 shadow-sm max-h-32 overflow-y-auto">
          {filteredParticipants.map(p => (
            <button
              key={p.id}
              onClick={() => insertMention(p)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2D5A3D]/10 rounded-lg text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30 flex items-center justify-center text-[10px] font-semibold text-[#2D5A3D]">
                {p.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm text-[#1A1F1C]">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Attach Button */}
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

        {/* Mention Button */}
        <button
          onClick={() => {
            setMessage(prev => prev + '@')
            textareaRef.current?.focus()
          }}
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20 transition-all"
        >
          <AtSign size={18} />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || showPollCreator || showScheduleCreator}
            rows={1}
            className="w-full px-4 py-2.5 pr-10 bg-[#2D5A3D]/5 border border-[#2D5A3D]/10 rounded-xl text-sm text-[#1A1F1C] placeholder:text-[#94A09A] focus:outline-none focus:border-[#2D5A3D]/30 focus:bg-white transition-all resize-none min-h-[44px] max-h-[120px]"
          />
          
          {/* Emoji Button (inside input) */}
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

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && attachedFiles.length === 0 && !showPollCreator && !showScheduleCreator) || disabled}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            (message.trim() || attachedFiles.length > 0 || showPollCreator || showScheduleCreator) && !disabled
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
