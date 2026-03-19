'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { Sparkles } from 'lucide-react'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { PhotoTaggingModal } from '@/components/engagement/PhotoTaggingModal'
import { AddContactModal } from '@/components/contacts/AddContactModal'
import PhotoUploadModal from '@/components/dashboard/PhotoUploadModal'
import { useSubscription } from '@/hooks/useSubscription'
import '@/styles/home.css'
import '@/styles/engagement.css'
import '@/styles/conversation.css'
import dynamic from 'next/dynamic'

const MonthlyRecap = dynamic(() => import('@/components/dashboard/MonthlyRecap'), { ssr: false })

// Local imports
import { 
  TYPE_CONFIG, 
  PHOTO_TAGGING_TYPES, 
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
  SwipeableCardStack,
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
  } = useEngagementPrompts(50, selectedChapter)
  
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
  
  // Handle card answer (from flipped card)
  const handleCardAnswer = useCallback(async (promptId: string, response: { type: 'text' | 'voice' | 'selection'; text?: string; videoUrl?: string }) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (!prompt) return
    
    try {
      const result = await answerPrompt(promptId, response) as any
      const config = TYPE_CONFIG[prompt.type] || TYPE_CONFIG.memory_prompt
      
      addCompletedTile({
        id: promptId,
        type: prompt.type,
        title: prompt.promptText?.substring(0, 40) || config.label,
        xp: config.xp,
        contactName: prompt.contactName,
        contactId: prompt.contactId || result?.contactId,
      })

      if (config.xp > 0) {
        addXp(config.xp)
      }
      
      setAnsweredPromptIds(prev => [...prev, promptId])
      refreshStats()
    } catch (err) {
      console.error('Error answering prompt:', err)
      throw err
    }
  }, [prompts, answerPrompt, addCompletedTile, addXp, refreshStats])

  // Handle photo tagging (still uses modal for face selection)
  const handlePhotoTagClick = useCallback((prompt: any) => {
    if (PHOTO_TAGGING_TYPES.includes(prompt.type)) {
      setPhotoTaggingPrompt(prompt)
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

  // Handle shuffle
  const handleShuffle = useCallback(() => {
    shuffle()
  }, [shuffle])

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
            <LifeChapterFilter
              selectedChapter={selectedChapter}
              onSelectChapter={setSelectedChapter}
            />
            <div className="home-bubbles">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={32} className="text-[#F5A524]" />
                  </motion.div>
                  <span className="text-gray-500">Loading prompts...</span>
                </div>
              ) : (
                <div className="w-full">
                  <XpFloatingCounter show={xpAnimating} amount={lastXpGain} />
                  <SwipeableCardStack
                    prompts={prompts}
                    onCardDismiss={(id) => {
                      setAnsweredPromptIds(prev => [...prev, id])
                    }}
                    onCardAnswer={handleCardAnswer}
                    onNeedMorePrompts={handleShuffle}
                    getPromptText={getPromptText}
                  />
                </div>
              )}
            </div>

          </div>
        </main>

        {/* Right sidebar: same level as left sidebar in home-layout */}
        <aside className="home-right-sidebar">
          <MonthlyRecap />
          <QuickActions
            onShuffle={handleShuffle}
            onPhotoUpload={() => setShowPhotoUpload(true)}
            onPostscript={() => setShowPostscriptModal(true)}
            onAddContact={() => setShowContactModal(true)}
            onQuickMemory={() => setShowQuickMemoryModal(true)}
          />
        </aside>
      </div>
    </div>
  )
}
