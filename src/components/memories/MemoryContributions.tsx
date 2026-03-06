'use client'

import { useState, useEffect } from 'react'
import { Plus, Camera, MessageCircle, Sparkles, Quote, Heart, ThumbsUp, Laugh, PartyPopper, Flame, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AddContributionModal from './AddContributionModal'
import { createClient } from '@/lib/supabase/client'

interface Contribution {
  id: string
  type: 'photo' | 'comment' | 'moment' | 'quote'
  content: string
  media_url?: string
  user: {
    id: string
    full_name: string
    avatar_url?: string
  }
  reactions: { emoji: string; count: number; hasReacted: boolean }[]
  created_at: string
}

interface MemoryContributionsProps {
  memoryId: string
}

const TYPE_ICONS = {
  photo: { icon: Camera, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Photo' },
  comment: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Comment' },
  moment: { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Moment' },
  quote: { icon: Quote, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Quote' },
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '🎉', '🔥']

export default function MemoryContributions({ memoryId }: MemoryContributionsProps) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch real contributions from database
  useEffect(() => {
    async function fetchContributions() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('memory_contributions')
          .select(`
            id,
            contribution_type,
            content,
            media_url,
            created_at,
            contributor:profiles!user_id(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('memory_id', memoryId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching contributions:', error)
          setContributions([])
        } else if (data) {
          // Transform to our Contribution type
          const transformed: Contribution[] = data.map((c: any) => ({
            id: c.id,
            type: c.contribution_type || 'comment',
            content: c.content,
            media_url: c.media_url,
            user: {
              id: c.contributor?.id || 'unknown',
              full_name: c.contributor?.full_name || 'Anonymous',
              avatar_url: c.contributor?.avatar_url,
            },
            reactions: [], // TODO: Fetch reactions separately if needed
            created_at: c.created_at,
          }))
          setContributions(transformed)
        }
      } catch (err) {
        console.error('Error:', err)
        setContributions([])
      } finally {
        setLoading(false)
      }
    }

    fetchContributions()
  }, [memoryId, supabase])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleReaction = (contributionId: string, emoji: string) => {
    setContributions(prev => prev.map(c => {
      if (c.id !== contributionId) return c
      
      const existingReaction = c.reactions.find(r => r.emoji === emoji)
      if (existingReaction) {
        return {
          ...c,
          reactions: c.reactions.map(r => 
            r.emoji === emoji 
              ? { ...r, count: r.hasReacted ? r.count - 1 : r.count + 1, hasReacted: !r.hasReacted }
              : r
          ).filter(r => r.count > 0 || r.hasReacted)
        }
      } else {
        return {
          ...c,
          reactions: [...c.reactions, { emoji, count: 1, hasReacted: true }]
        }
      }
    }))
    setActiveReactionPicker(null)
  }

  const handleAddContribution = (type: string, content: string, mediaUrl?: string) => {
    const newContribution: Contribution = {
      id: `c-${Date.now()}`,
      type: type as 'photo' | 'comment' | 'moment' | 'quote',
      content,
      media_url: mediaUrl,
      user: { id: 'me', full_name: 'You' },
      reactions: [],
      created_at: new Date().toISOString(),
    }
    setContributions(prev => [newContribution, ...prev])
  }

  const renderContributionContent = (contribution: Contribution) => {
    const typeConfig = TYPE_ICONS[contribution.type]

    switch (contribution.type) {
      case 'photo':
        return (
          <div className="space-y-3">
            {contribution.content && (
              <p className="text-[#2d2d2d] text-sm">{contribution.content}</p>
            )}
            {contribution.media_url && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src={contribution.media_url} 
                  alt="Contribution" 
                  className="w-full max-h-80 object-cover"
                />
              </div>
            )}
          </div>
        )
      
      case 'comment':
        return (
          <p className="text-[#2d2d2d] text-sm leading-relaxed">{contribution.content}</p>
        )
      
      case 'moment':
        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-r-xl p-4">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-2">
              <Sparkles size={14} />
              SPECIAL MOMENT
            </div>
            <p className="text-[#2d2d2d] text-sm leading-relaxed">{contribution.content}</p>
          </div>
        )
      
      case 'quote':
        return (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 relative">
            <Quote size={32} className="absolute top-2 left-2 text-purple-200" />
            <p className="text-[#2d2d2d] text-lg italic pl-8 leading-relaxed">{contribution.content}</p>
          </div>
        )
    }
  }

  // Don't show the section while loading or if there are no contributions and user hasn't clicked add
  if (loading) {
    return null
  }

  // If no contributions, show a minimal "invite others" section instead of empty state
  if (contributions.length === 0) {
    return (
      <div className="border-t border-gray-200 pt-6">
        <div className="text-center py-8 bg-gradient-to-r from-[#406A56]/5 to-[#8DACAB]/5 rounded-xl">
          <Users size={32} className="mx-auto mb-3 text-[#406A56]/50" />
          <p className="text-sm text-gray-600 mb-3">Share this memory with family or friends</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#406A56]/10 text-[#406A56] rounded-lg text-sm font-medium hover:bg-[#406A56]/20 transition-colors"
          >
            <Plus size={16} />
            Invite to Contribute
          </button>
        </div>
        <AddContributionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          memoryId={memoryId}
          onSubmit={handleAddContribution}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#2d2d2d] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#406A56]/10 flex items-center justify-center">
            <MessageCircle size={16} className="text-[#406A56]" />
          </div>
          Contributions
          <span className="text-sm font-normal text-gray-500">({contributions.length})</span>
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#406A56] text-white rounded-xl text-sm font-medium hover:bg-[#4a7a64] transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        {contributions.length > 1 && (
          <div className="absolute left-5 top-12 bottom-8 w-px bg-gray-200" />
        )}

        {/* Contributions */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {contributions.map((contribution, index) => {
              const typeConfig = TYPE_ICONS[contribution.type]
              const TypeIcon = typeConfig.icon

              return (
                <motion.div
                  key={contribution.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="flex gap-4">
                    {/* Avatar with type indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#406A56] to-[#5A8A72] flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(contribution.user?.full_name || 'Anonymous')}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${typeConfig.bg} flex items-center justify-center border-2 border-white`}>
                        <TypeIcon size={10} className={typeConfig.color} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-[#2d2d2d] text-sm">
                          {contribution.user?.full_name || 'Anonymous'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatTimeAgo(contribution.created_at)}
                        </span>
                      </div>

                      {/* Content Card */}
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
                        {renderContributionContent(contribution)}
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-2 mt-2 relative">
                        {/* Existing reactions */}
                        {contribution.reactions.map(reaction => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(contribution.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                              reaction.hasReacted 
                                ? 'bg-[#406A56]/10 border border-[#406A56]/30' 
                                : 'bg-gray-100 hover:bg-gray-200 border border-transparent'
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className={reaction.hasReacted ? 'text-[#406A56] font-medium' : 'text-gray-600'}>
                              {reaction.count}
                            </span>
                          </button>
                        ))}

                        {/* Add reaction button */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveReactionPicker(
                              activeReactionPicker === contribution.id ? null : contribution.id
                            )}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                          >
                            <Plus size={12} />
                            <span>React</span>
                          </button>

                          {/* Reaction picker */}
                          <AnimatePresence>
                            {activeReactionPicker === contribution.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-1 z-10"
                              >
                                {REACTION_EMOJIS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(contribution.id, emoji)}
                                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg transition-colors"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {contributions.length === 0 && (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#406A56]/10 to-[#D9C61A]/10 rounded-full flex items-center justify-center">
              <MessageCircle size={28} className="text-[#406A56]" />
            </div>
            <h4 className="text-lg font-medium text-[#2d2d2d] mb-2">No contributions yet</h4>
            <p className="text-gray-500 text-sm mb-4">
              Be the first to add a photo, comment, moment, or quote!
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#406A56] text-white rounded-xl text-sm font-medium hover:bg-[#4a7a64] transition-colors"
            >
              <Plus size={16} />
              Add Contribution
            </button>
          </div>
        )}
      </div>

      {/* Add Contribution Modal */}
      <AddContributionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        memoryId={memoryId}
        onSubmit={handleAddContribution}
      />
    </div>
  )
}
