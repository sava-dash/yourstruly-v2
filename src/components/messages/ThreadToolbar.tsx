'use client'

import { useState } from 'react'
import { 
  Pin, Sparkles, ChevronDown, ChevronUp, X, Loader2,
  Users, BarChart2, Calendar, FileText
} from 'lucide-react'
import { Message, ThreadSummary, Conversation } from './types'
import { format } from 'date-fns'

interface ThreadToolbarProps {
  conversation: Conversation
  messages: Message[]
  pinnedMessages: Message[]
  onUnpin: (messageId: string) => void
  onScrollToMessage?: (messageId: string) => void
}

export default function ThreadToolbar({
  conversation,
  messages,
  pinnedMessages,
  onUnpin,
  onScrollToMessage
}: ThreadToolbarProps) {
  const [showPinned, setShowPinned] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summary, setSummary] = useState<ThreadSummary | null>(null)

  const isGroupThread = conversation.type === 'memory-thread' || (conversation.participants && conversation.participants > 2)
  
  // Count different message types
  const stats = {
    polls: messages.filter(m => m.type === 'poll').length,
    schedules: messages.filter(m => m.type === 'schedule').length,
    attachments: messages.filter(m => m.attachments && m.attachments.length > 0).length,
    participants: conversation.participants || 2
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    // Simulate AI summary generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const textMessages = messages.filter(m => m.type === 'text' && m.content)
    const recentMessages = textMessages.slice(-20)
    
    setSummary({
      summary: `This ${conversation.type === 'memory-thread' ? 'memory thread' : 'conversation'} has ${textMessages.length} messages discussing ${conversation.linkedMemoryTitle || 'various topics'}. The conversation has been active with ${stats.participants} participants contributing.`,
      keyPoints: [
        'Family members are coordinating and sharing memories',
        textMessages.length > 10 ? 'Multiple people have contributed stories and photos' : 'Getting started with sharing',
        stats.polls > 0 ? `${stats.polls} poll(s) created for group decisions` : 'No polls yet',
        stats.schedules > 0 ? `${stats.schedules} time(s) proposed for meetups` : 'No schedules proposed'
      ].filter(Boolean),
      actionItems: [
        stats.polls > 0 ? 'Vote on open polls' : null,
        stats.schedules > 0 ? 'Confirm availability for proposed times' : null,
        pinnedMessages.length > 0 ? `Review ${pinnedMessages.length} pinned message(s)` : null,
        'Continue sharing and collaborating!'
      ].filter(Boolean) as string[],
      generatedAt: new Date()
    })
    setIsGeneratingSummary(false)
    setShowSummary(true)
  }

  if (!isGroupThread && pinnedMessages.length === 0) {
    return null
  }

  return (
    <div className="border-b border-[#2D5A3D]/10 bg-white/30">
      {/* Quick Stats Bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-[#666]">
          {stats.participants > 2 && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              {stats.participants}
            </span>
          )}
          {stats.polls > 0 && (
            <span className="flex items-center gap-1 text-[#8a7c08]">
              <BarChart2 size={12} />
              {stats.polls} poll{stats.polls !== 1 ? 's' : ''}
            </span>
          )}
          {stats.schedules > 0 && (
            <span className="flex items-center gap-1 text-[#B8562E]">
              <Calendar size={12} />
              {stats.schedules}
            </span>
          )}
          {stats.attachments > 0 && (
            <span className="flex items-center gap-1">
              <FileText size={12} />
              {stats.attachments} file{stats.attachments !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Pinned Messages Toggle */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => {
                setShowPinned(!showPinned)
                setShowSummary(false)
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                showPinned
                  ? 'bg-[#B8562E]/15 text-[#B8562E]'
                  : 'bg-white/60 text-[#666] hover:bg-white hover:text-[#B8562E] border border-[#2D5A3D]/10'
              }`}
            >
              <Pin size={12} />
              <span>{pinnedMessages.length} Pinned</span>
              {showPinned ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* AI Summary Button */}
          {messages.length >= 5 && (
            <button
              onClick={() => {
                if (!summary) {
                  generateSummary()
                } else {
                  setShowSummary(!showSummary)
                  setShowPinned(false)
                }
              }}
              disabled={isGeneratingSummary}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                showSummary
                  ? 'bg-[#C4A235]/20 text-[#8a7c08]'
                  : 'bg-white/60 text-[#666] hover:bg-white hover:text-[#8a7c08] border border-[#2D5A3D]/10'
              }`}
            >
              {isGeneratingSummary ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              <span>{summary ? 'Summary' : 'Summarize'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Messages Panel */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          <div className="p-3 bg-[#B8562E]/5 rounded-xl border border-[#B8562E]/10">
            <p className="text-xs font-semibold text-[#B8562E] mb-2 flex items-center gap-1">
              <Pin size={12} />
              Pinned Messages
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {pinnedMessages.map(msg => (
                <div 
                  key={msg.id}
                  className="flex items-start justify-between gap-2 p-2 bg-white rounded-lg cursor-pointer hover:bg-[#B8562E]/5 transition-colors"
                  onClick={() => onScrollToMessage?.(msg.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[#2D5A3D]">
                      {msg.senderName}
                    </p>
                    <p className="text-xs text-[#2d2d2d] truncate">
                      {msg.content || (msg.type === 'poll' ? '📊 Poll' : msg.type === 'schedule' ? '📅 Schedule' : '[Media]')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#999]">
                      {format(msg.timestamp, 'MMM d')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUnpin(msg.id)
                      }}
                      className="p-0.5 text-[#666] hover:text-[#B8562E] transition-colors"
                      title="Unpin"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Summary Panel */}
      {showSummary && summary && (
        <div className="px-4 pb-3">
          <div className="p-4 bg-gradient-to-br from-[#C4A235]/10 to-[#2D5A3D]/10 rounded-xl border border-[#C4A235]/20">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-[#8a7c08] flex items-center gap-1.5">
                <Sparkles size={12} />
                AI Thread Summary
              </p>
              <span className="text-[10px] text-[#666]">
                {format(summary.generatedAt, 'h:mm a')}
              </span>
            </div>
            
            <p className="text-sm text-[#2d2d2d] mb-4 leading-relaxed">
              {summary.summary}
            </p>
            
            {summary.keyPoints.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
                  Key Points
                </p>
                <ul className="space-y-1">
                  {summary.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#2d2d2d]">
                      <span className="text-[#2D5A3D]">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {summary.actionItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
                  Action Items
                </p>
                <ul className="space-y-1">
                  {summary.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#2d2d2d]">
                      <span className="text-[#B8562E]">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={generateSummary}
              className="mt-3 text-xs text-[#8a7c08] hover:text-[#6b6006] flex items-center gap-1"
            >
              <Sparkles size={10} />
              Regenerate summary
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
