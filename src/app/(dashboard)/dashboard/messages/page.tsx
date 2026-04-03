'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ConversationList, 
  MessageThread, 
  CircleMessageThread,
  Conversation, 
  Message,
  Poll,
  ScheduleProposal
} from '@/components/messages'
import '@/styles/page-styles.css'

// ============================================
// MAIN PAGE
// ============================================
export default function MessagesPage() {
  const router = useRouter()
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({})
  const [loadingCircles, setLoadingCircles] = useState(true)

  // Fetch circle conversations on mount
  useEffect(() => {
    async function fetchCircleConversations() {
      try {
        const res = await fetch('/api/messages/circles')
        if (res.ok) {
          const data = await res.json()
          const circleConversations: Conversation[] = data.conversations.map((c: any) => ({
            id: c.id,
            name: c.name,
            lastMessage: c.lastMessage,
            timestamp: new Date(c.timestamp),
            unreadCount: c.unreadCount,
            type: 'circle' as const,
            participants: c.participants,
            circleId: c.circleId,
            circleDescription: c.circleDescription,
          }))

          // Merge with existing conversations (mock DMs and memory threads)
          setConversations(prev => {
            // Remove any existing circle conversations and add fresh ones
            const nonCircleConvos = prev.filter(c => c.type !== 'circle')
            const merged = [...nonCircleConvos, ...circleConversations].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            // Set first conversation as active if none selected
            if (!activeConversation && merged.length > 0) {
              // Use setTimeout to avoid setting state during render
              setTimeout(() => setActiveConversation(merged[0]), 0)
            }

            return merged
          })
        }
      } catch (error) {
        console.error('Failed to fetch circle conversations:', error)
      } finally {
        setLoadingCircles(false)
      }
    }
    fetchCircleConversations()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation)
    // Clear unread count
    setConversations(prev =>
      prev.map(c =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    )
  }

  // Navigate to circle detail page (alternative access point)
  const handleOpenCircleDetail = (circleId: string) => {
    router.push(`/dashboard/circles/${circleId}`)
  }

  const handleSendMessage = (
    content: string,
    type: 'text' | 'image' | 'voice' | 'poll' | 'schedule',
    extras?: { poll?: Poll; schedule?: ScheduleProposal; replyTo?: Message }
  ) => {
    if (!activeConversation) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'user-1',
      senderName: 'You',
      content,
      timestamp: new Date(),
      type,
      isOwn: true,
      status: 'sent',
      poll: extras?.poll,
      schedule: extras?.schedule,
      replyTo: extras?.replyTo ? {
        id: extras.replyTo.id,
        senderName: extras.replyTo.senderName,
        content: extras.replyTo.content
      } : undefined,
    }

    setMessagesMap(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMessage],
    }))

    // Update conversation preview
    const previewText = type === 'poll'
      ? '📊 Poll created'
      : type === 'schedule'
        ? '📅 Times proposed'
        : content

    setConversations(prev =>
      prev.map(c =>
        c.id === activeConversation.id
          ? { ...c, lastMessage: previewText, timestamp: new Date() }
          : c
      )
    )
  }

  const handleReact = (messageId: string, emoji: string) => {
    if (!activeConversation) return

    setMessagesMap(prev => {
      const messages = prev[activeConversation.id] || []
      return {
        ...prev,
        [activeConversation.id]: messages.map(msg => {
          if (msg.id !== messageId) return msg

          const reactions = [...(msg.reactions || [])]
          const existingIndex = reactions.findIndex(r => r.emoji === emoji)

          if (existingIndex >= 0) {
            const reaction = reactions[existingIndex]
            if (reaction.userReacted) {
              // Remove user's reaction
              if (reaction.count === 1) {
                reactions.splice(existingIndex, 1)
              } else {
                reactions[existingIndex] = {
                  ...reaction,
                  count: reaction.count - 1,
                  userReacted: false,
                  users: reaction.users.filter(u => u !== 'user-1')
                }
              }
            } else {
              // Add user's reaction
              reactions[existingIndex] = {
                ...reaction,
                count: reaction.count + 1,
                userReacted: true,
                users: [...reaction.users, 'user-1']
              }
            }
          } else {
            // New reaction
            reactions.push({
              emoji,
              count: 1,
              users: ['user-1'],
              userReacted: true
            })
          }

          return { ...msg, reactions }
        })
      }
    })
  }

  const handlePin = (messageId: string) => {
    if (!activeConversation) return

    setMessagesMap(prev => {
      const messages = prev[activeConversation.id] || []
      return {
        ...prev,
        [activeConversation.id]: messages.map(msg =>
          msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
        )
      }
    })

    // Update conversation's pinned messages list
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== activeConversation.id) return c
        const pinnedMessages = c.pinnedMessages || []
        const isPinned = pinnedMessages.includes(messageId)
        return {
          ...c,
          pinnedMessages: isPinned
            ? pinnedMessages.filter(id => id !== messageId)
            : [...pinnedMessages, messageId]
        }
      })
    )
  }

  const currentMessages = activeConversation
    ? messagesMap[activeConversation.id] || []
    : []

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden relative">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Main Content - Full Height - 80% Width - NO SCROLL */}
      <main className="h-full px-4 lg:px-6 py-4 lg:py-6 relative z-10">
        <div className="h-full w-full max-w-[80%] mx-auto">
          {/* Messages Panel - Glass Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[20px] shadow-lg border border-white/50 overflow-hidden h-full">
            <div className="flex h-full">
              {/* Conversation List - Left Panel */}
              <div
                className={`w-full lg:w-[360px] border-r border-[#2D5A3D]/10 bg-[#F5F3EE]/50 flex-shrink-0 flex flex-col ${
                  activeConversation ? 'hidden lg:flex' : 'flex'
                }`}
              >
                <ConversationList
                  conversations={conversations}
                  activeId={activeConversation?.id || null}
                  onSelect={handleSelectConversation}
                />
              </div>

              {/* Message Thread - Right Panel */}
              <div className={`flex-1 flex flex-col min-w-0 bg-white/40 ${!activeConversation ? 'hidden lg:flex' : 'flex'}`}>
                {activeConversation ? (
                  <>
                    {/* Mobile back button */}
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="lg:hidden flex items-center gap-2 px-4 py-3 text-[#2D5A3D] bg-white/60 border-b border-[#2D5A3D]/10 flex-shrink-0 hover:bg-white/80 transition-all"
                    >
                      <ChevronLeft size={18} />
                      <span className="text-sm font-medium">Back to conversations</span>
                    </button>
                    <div className="flex-1 overflow-hidden min-h-0">
                      {activeConversation.type === 'circle' && activeConversation.circleId ? (
                        <CircleMessageThread
                          circleId={activeConversation.circleId}
                          circleName={activeConversation.name}
                          memberCount={activeConversation.participants || 0}
                          onOpenDetail={() => handleOpenCircleDetail(activeConversation.circleId!)}
                          onMessageSent={() => {
                            // Update conversation preview when message is sent
                            setConversations(prev =>
                              prev.map(c =>
                                c.id === activeConversation.id
                                  ? { ...c, lastMessage: 'You: Message sent', timestamp: new Date() }
                                  : c
                              )
                            )
                          }}
                        />
                      ) : (
                        <MessageThread
                          conversation={activeConversation}
                          messages={currentMessages}
                          onSendMessage={handleSendMessage}
                          onReact={handleReact}
                          onPin={handlePin}
                        />
                      )}
                    </div>
                  </>
                ) : (
                  /* Empty State */
                  <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-white/60 to-[#F5F3EE]/40">
                    <div className="text-center px-8 py-8 bg-white rounded-xl shadow-sm mx-4">
                      <div className="w-20 h-20 rounded-full bg-[#4A3552]/10 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={32} className="text-[#4A3552]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">
                        Select a conversation
                      </h3>
                      <p className="text-sm text-[#666] max-w-sm">
                        Choose a conversation from the list to start messaging,
                        or browse memory threads to collaborate with family.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
