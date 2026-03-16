'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { RefreshCw, Sparkles, X, Send } from 'lucide-react'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { PhotoTaggingModal } from '@/components/engagement/PhotoTaggingModal'
import { AddContactModal } from '@/components/contacts/AddContactModal'
import PhotoUploadModal from '@/components/dashboard/PhotoUploadModal'
import { useSubscription } from '@/hooks/useSubscription'
import '@/styles/home.css'
import '@/styles/engagement.css'
import '@/styles/conversation.css'

// Local imports
import { 
  TYPE_CONFIG, 
  CONVERSATION_TYPES, 
  PHOTO_TAGGING_TYPES, 
  INLINE_INPUT_TYPES,
  isContactPrompt,
} from './constants'
import { useDashboardData } from './hooks/useDashboardData'
import { useXpState } from './hooks/useXpState'
import {
  DashboardSidebar,
  LifeChapterFilter,
  QuickActions,
  MilestoneModal,
  QuickMemoryModal,
  PostscriptModal,
  XpFloatingCounter,
  type Milestone,
} from './components'

export default function DashboardPage() {
  const supabase = createClient()
  const { subscription } = useSubscription()
  
  // User ID for scoping
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUserId()
  }, [supabase])
  
  // Custom hooks for data and XP
  const { 
    profile, 
    stats, 
    userContacts, 
    refreshStats 
  } = useDashboardData(currentUserId)
  
  const { 
    totalXp, 
    xpAnimating, 
    lastXpGain, 
    completedTiles,
    addXp,
    addCompletedTile,
  } = useXpState(currentUserId)
  
  // Life chapter filter
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null)
  
  // Engagement prompts
  const { 
    prompts: rawPrompts, 
    isLoading, 
    shuffle, 
    answerPrompt, 
    stats: engagementStats 
  } = useEngagementPrompts(6, selectedChapter)
  
  // Track locally answered prompts
  const [answeredPromptIds, setAnsweredPromptIds] = useState<string[]>([])

  // Filter prompts
  const contactTypes = ['quick_question', 'missing_info', 'tag_person']
  const seenTexts = new Set<string>()
  let contactCount = 0
  
  const prompts = rawPrompts.filter(prompt => {
    if (answeredPromptIds.includes(prompt.id)) return false
    if (seenTexts.has(prompt.promptText)) return false
    seenTexts.add(prompt.promptText)
    if (contactTypes.includes(prompt.type)) {
      if (contactCount >= 2) return false
      contactCount++
    }
    return true
  })

  // Modal states
  const [engagementPrompt, setEngagementPrompt] = useState<any | null>(null)
  const [photoTaggingPrompt, setPhotoTaggingPrompt] = useState<any | null>(null)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showPostscriptModal, setShowPostscriptModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showQuickMemoryModal, setShowQuickMemoryModal] = useState(false)
  
  // Inline input state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [textValue, setTextValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tilesKey, setTilesKey] = useState(0)

  // Handle tile click
  const handleTileClick = useCallback((prompt: any) => {
    if (PHOTO_TAGGING_TYPES.includes(prompt.type)) {
      setPhotoTaggingPrompt(prompt)
    } else if (CONVERSATION_TYPES.includes(prompt.type)) {
      setEngagementPrompt(prompt)
    } else if (INLINE_INPUT_TYPES.includes(prompt.type)) {
      setExpandedId(prompt.id)
    }
  }, [])

  // Handle engagement completion
  const handleEngagementComplete = useCallback(async (result: {
    memoryId?: string
    responseText?: string
    xpAwarded: number
  }) => {
    if (!engagementPrompt) return
    
    const config = TYPE_CONFIG[engagementPrompt.type] || TYPE_CONFIG.memory_prompt
    const xpGained = result.xpAwarded || config.xp
    
    addCompletedTile({
      id: engagementPrompt.id,
      type: engagementPrompt.type,
      title: engagementPrompt.promptText?.substring(0, 40) || config.label,
      xp: xpGained,
      photoUrl: engagementPrompt.photoUrl,
      contactName: engagementPrompt.contactName,
      contactId: engagementPrompt.contactId,
      memoryId: result.memoryId,
      resultMemoryId: result.memoryId,
    })

    if (xpGained > 0) {
      addXp(xpGained)
    }

    setEngagementPrompt(null)
    setAnsweredPromptIds(prev => [...prev, engagementPrompt.id])
    refreshStats()
    shuffle()
  }, [engagementPrompt, addCompletedTile, addXp, refreshStats, shuffle])

  // Handle inline answer
  const handleInlineAnswer = useCallback(async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (!prompt || !textValue.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await answerPrompt(promptId, { type: 'text', text: textValue }) as any
      const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
      
      addCompletedTile({
        id: promptId,
        type: prompt.type,
        title: prompt.contactName || config.label,
        xp: config.xp,
        contactName: prompt.contactName,
        contactId: prompt.contactId || result?.contactId,
      })

      if (config.xp > 0) {
        addXp(config.xp)
      }

      setTextValue('')
      setExpandedId(null)
      setAnsweredPromptIds(prev => [...prev, promptId])
    } catch (err) {
      console.error('Error answering prompt:', err)
    }
    setIsSubmitting(false)
  }, [prompts, textValue, answerPrompt, addCompletedTile, addXp])

  // Handle shuffle
  const handleShuffle = () => {
    setTilesKey(prev => prev + 1)
    shuffle()
  }

  // Helper functions
  const getContactName = (prompt: any, index: number = 0) => {
    const fromPrompt = prompt.contactName 
      || prompt.contact_name
      || prompt.metadata?.contact?.name 
      || prompt.metadata?.contact?.full_name
    if (fromPrompt) return fromPrompt
    if (isContactPrompt(prompt.type) && userContacts.length > 0) {
      const contactIdx = prompt.id ? prompt.id.charCodeAt(0) % userContacts.length : index % userContacts.length
      return userContacts[contactIdx]?.full_name || null
    }
    return null
  }

  const getPromptText = (prompt: any) => {
    if (prompt.promptText && prompt.promptText.trim()) {
      let text = prompt.promptText
      const contactName = prompt.contactName || prompt.contact_name || prompt.metadata?.contact?.name || 'this person'
      text = text.replace(/\{\{contact_name\}\}/gi, contactName)
      text = text.replace(/\{\{occupation\}\}/gi, prompt.personalizationContext?.occupation || 'your work')
      return text
    }
    
    if (isContactPrompt(prompt.type)) {
      const contactName = prompt.contactName || prompt.metadata?.contact?.name || 'this contact'
      if (prompt.missingField) {
        const labels: Record<string, string> = { 
          phone: 'phone number', email: 'email address', date_of_birth: 'birthday',
          birth_date: 'birthday', how_met: 'story of how you met', relationship: 'relationship to you',
          nickname: 'nickname', notes: 'a story about them', address: 'address',
          company: 'workplace', job_title: 'job title',
        }
        if (prompt.missingField === 'how_met') return `How did you and ${contactName} first meet?`
        if (prompt.missingField === 'relationship') return `How would you describe your relationship with ${contactName}?`
        if (prompt.missingField === 'notes' || prompt.missingField === 'contact_story') {
          const fallbacks = [
            `What's your favorite memory with ${contactName}?`,
            `What makes ${contactName} special to you?`,
          ]
          return fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }
        return `What is ${contactName}'s ${labels[prompt.missingField] || prompt.missingField.replace(/_/g, ' ')}?`
      }
      const genericFallbacks = [
        `What's a great memory you have with ${contactName}?`,
        `What do you admire about ${contactName}?`,
      ]
      return genericFallbacks[Math.floor(Math.random() * genericFallbacks.length)]
    }
    return prompt.promptText || 'Share something meaningful...'
  }

  return (
    <div className="overflow-x-hidden">
      {/* Background */}
      <div className="home-background">
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        <div className="home-blob home-blob-3" />
        <div className="home-blob home-blob-4" />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {engagementPrompt && (
          <UnifiedEngagementModal
            prompt={engagementPrompt}
            expectedXp={TYPE_CONFIG[engagementPrompt.type]?.xp || 15}
            onComplete={handleEngagementComplete}
            onClose={() => setEngagementPrompt(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {photoTaggingPrompt && photoTaggingPrompt.photoId && (
          <PhotoTaggingModal
            photoId={photoTaggingPrompt.photoId}
            photoUrl={photoTaggingPrompt.photoUrl}
            promptId={photoTaggingPrompt.id}
            onComplete={async (result) => {
              try {
                await answerPrompt(photoTaggingPrompt.id, { type: 'selection', data: { action: 'photo_tagged' } })
              } catch (err) {
                console.error('Failed to mark prompt answered:', err)
              }
              addCompletedTile({
                id: photoTaggingPrompt.id,
                type: photoTaggingPrompt.type,
                title: 'Tagged photo',
                xp: result.xpAwarded,
                photoUrl: photoTaggingPrompt.photoUrl,
              })
              setPhotoTaggingPrompt(null)
            }}
            onClose={() => setPhotoTaggingPrompt(null)}
          />
        )}
      </AnimatePresence>

      <MilestoneModal milestone={milestone} onClose={() => setMilestone(null)} />
      <PhotoUploadModal isOpen={showPhotoUpload} onClose={() => setShowPhotoUpload(false)} />
      <PostscriptModal isOpen={showPostscriptModal} onClose={() => setShowPostscriptModal(false)} />
      <QuickMemoryModal isOpen={showQuickMemoryModal} onClose={() => setShowQuickMemoryModal(false)} />
      
      <AnimatePresence>
        {showContactModal && (
          <AddContactModal onClose={() => setShowContactModal(false)} onSave={() => {}} />
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="home-layout">
        <DashboardSidebar
          profile={profile}
          stats={stats}
          totalXp={totalXp}
          xpAnimating={xpAnimating}
          completedTiles={completedTiles}
          currentStreakDays={engagementStats?.currentStreakDays ?? 0}
          subscription={subscription}
        />

        <main className="home-main">
          <div className="engagement-column">
            <div className="home-bubbles">
              <LifeChapterFilter
                selectedChapter={selectedChapter}
                onSelectChapter={setSelectedChapter}
              />

              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={28} className="text-[#F5A524]" />
                  </motion.div>
                  <span className="text-gray-500">Loading prompts...</span>
                </div>
              ) : prompts.length === 0 ? (
                <div className="home-empty">
                  <div className="home-empty-icon">
                    <Sparkles size={32} className="text-[#F5A524]" />
                  </div>
                  <h3>{selectedChapter ? 'No prompts for this chapter yet' : 'All caught up!'}</h3>
                  <p>
                    {selectedChapter 
                      ? 'Generate new prompts to get questions about this life chapter.' 
                      : "You've answered all your prompts. Generate more to keep capturing memories."}
                  </p>
                  <button onClick={handleShuffle} className="home-refresh-btn">
                    <RefreshCw size={16} />
                    Generate More
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <XpFloatingCounter show={xpAnimating} amount={lastXpGain} />

                  {expandedId && (
                    <div 
                      className="tile-expanded-backdrop"
                      onClick={() => { setExpandedId(null); setTextValue(''); }}
                    />
                  )}

                  <div className="tiles-grid">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedChapter || 'all'}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'contents' }}
                      >
                        {(() => {
                          const sortedPrompts = [...prompts.slice(0, 5)]
                          const photoIndex = sortedPrompts.findIndex(p => 
                            p.photoUrl && (p.type === 'photo_backstory' || p.type === 'tag_person')
                          )
                          if (photoIndex !== -1 && photoIndex !== 4) {
                            const [photoPrompt] = sortedPrompts.splice(photoIndex, 1)
                            if (sortedPrompts.length >= 4) {
                              sortedPrompts.splice(4, 0, photoPrompt)
                            } else {
                              sortedPrompts.push(photoPrompt)
                            }
                          }
                          return sortedPrompts
                        })().map((prompt, i) => {
                          const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
                          const isExpanded = expandedId === prompt.id
                          const hasPhoto = prompt.photoUrl && (prompt.type === 'photo_backstory' || prompt.type === 'tag_person')
                          const contactName = getContactName(prompt, i)
                          const isContact = isContactPrompt(prompt.type)
                          const isTall = i === 4 && hasPhoto

                          return (
                            <motion.div
                              key={prompt.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0, zIndex: isExpanded ? 50 : 1 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                              onClick={() => !isExpanded && handleTileClick(prompt)}
                              className={`bubble-tile ${isTall ? 'tile-tall' : ''} ${isExpanded ? 'tile-expanded' : ''}`}
                              data-type={prompt.type}
                              style={{ cursor: isExpanded ? 'default' : 'pointer' }}
                            >
                              <div className={`bubble-accent bubble-accent-${config.color}`} />
                              
                              {!isExpanded && config.xp > 0 && (
                                <div className={`bubble-xp bubble-xp-${config.color}`}>
                                  <Sparkles size={10} />
                                  +{config.xp}
                                </div>
                              )}

                              {isExpanded && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setExpandedId(null); setTextValue(''); }}
                                  className="absolute top-3 right-3 p-1.5 bg-black/5 hover:bg-black/10 rounded-full z-10"
                                >
                                  <X size={14} className="text-gray-500" />
                                </button>
                              )}

                              <div className="bubble-content">
                                <div className="mb-3">
                                  <span className={`bubble-type bubble-type-${config.color}`}>{config.label}</span>
                                </div>

                                {isContact && (
                                  <div className="bubble-contact">
                                    <div className="bubble-contact-avatar">
                                      {(contactName || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="bubble-contact-name">{contactName || 'Unknown Contact'}</div>
                                      <div className="bubble-contact-sub">
                                        {prompt.missingField 
                                          ? `Add ${prompt.missingField === 'how_met' ? 'how met' : prompt.missingField.replace(/_/g, ' ')}` 
                                          : 'Update info'}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {hasPhoto && (
                                  <img 
                                    src={prompt.photoUrl} 
                                    alt={`Photo for ${getPromptText(prompt).substring(0, 50)}`}
                                    className={`bubble-photo ${isTall ? 'bubble-photo-tall' : ''}`}
                                  />
                                )}

                                <p className="bubble-text">{getPromptText(prompt)}</p>

                                {isExpanded && isContact && (
                                  <div className="mt-4 space-y-3">
                                    {prompt.missingField === 'birth_date' || prompt.missingField === 'date_of_birth' ? (
                                      <input
                                        type="date"
                                        value={textValue}
                                        onChange={(e) => setTextValue(e.target.value)}
                                        className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 focus:outline-none focus:border-[#406A56]/30"
                                      />
                                    ) : prompt.missingField === 'phone' ? (
                                      <input
                                        type="tel"
                                        value={textValue}
                                        onChange={(e) => setTextValue(e.target.value)}
                                        placeholder="(555) 123-4567"
                                        className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#406A56]/30"
                                      />
                                    ) : prompt.missingField === 'email' ? (
                                      <input
                                        type="email"
                                        value={textValue}
                                        onChange={(e) => setTextValue(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#406A56]/30"
                                      />
                                    ) : (
                                      <textarea
                                        value={textValue}
                                        onChange={(e) => setTextValue(e.target.value)}
                                        placeholder={`Enter ${prompt.missingField?.replace(/_/g, ' ') || 'info'}...`}
                                        rows={2}
                                        autoFocus
                                        className="w-full p-3 bg-[#406A56]/5 border border-[#406A56]/10 rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-[#406A56]/30"
                                      />
                                    )}
                                    
                                    <div className="flex justify-between">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setExpandedId(null); setTextValue(''); }} 
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleInlineAnswer(prompt.id); }}
                                        disabled={!textValue.trim() || isSubmitting}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#406A56] hover:bg-[#4a7a64] text-white text-sm font-medium rounded-lg disabled:opacity-50"
                                      >
                                        <Send size={14} />
                                        {isSubmitting ? 'Saving...' : 'Save'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <QuickActions
            onShuffle={handleShuffle}
            onPhotoUpload={() => setShowPhotoUpload(true)}
            onPostscript={() => setShowPostscriptModal(true)}
            onAddContact={() => setShowContactModal(true)}
            onQuickMemory={() => setShowQuickMemoryModal(true)}
          />
        </main>
      </div>
    </div>
  )
}
