'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { useSubscription } from '@/hooks/useSubscription'
import { useGamificationConfig } from '@/hooks/useGamificationConfig'
import { Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import '@/styles/home.css'
import '@/styles/engagement.css'
import '@/styles/conversation.css'
import '@/styles/feed.css'

import type { XpLevelConfig } from '@/lib/gamification-config'

// Components
import FeedContent from '@/components/feed/FeedContent'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { PhotoTaggingModal } from '@/components/engagement/PhotoTaggingModal'
import { AddContactModal } from '@/components/contacts/AddContactModal'
import PhotoUploadModal from '@/components/dashboard/PhotoUploadModal'
import { QuickActions } from './components/QuickActions'
import { EngagementTile } from './components/EngagementTile'
import { EngagementOverlay } from './components/EngagementOverlay'
import { useDashboardData } from './hooks/useDashboardData'
import { useXpState } from './hooks/useXpState'
import {
  MilestoneModal,
  PostscriptModal,
  QuickMemoryModal,
  XpFloatingCounter,
  type Milestone,
} from './components'
import {
  TYPE_CONFIG,
  PHOTO_TAGGING_TYPES,
  isContactPrompt,
} from './constants'

const WeeklyChallenges = dynamic(() => import('@/components/dashboard/WeeklyChallenges'), { ssr: false })
const BadgeDisplay = dynamic(() => import('@/components/dashboard/BadgeDisplay'), { ssr: false })
const MonthlyRecap = dynamic(() => import('@/components/dashboard/MonthlyRecap'), { ssr: false })

function getXpLevel(xp: number, levels: XpLevelConfig[]) {
  let current = levels[0]
  for (const lvl of levels) {
    if (xp >= lvl.minXp) current = lvl
    else break
  }
  const nextLevel = levels.find(l => l.minXp > xp)
  const progress = nextLevel
    ? ((xp - current.minXp) / (nextLevel.minXp - current.minXp)) * 100
    : 100
  return { ...current, nextLevel, progress, xpToNext: nextLevel ? nextLevel.minXp - xp : 0 }
}

export default function DashboardPage() {
  const supabase = createClient()
  const { subscription } = useSubscription()
  const { config: gamificationConfig } = useGamificationConfig()

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
    refreshStats,
  } = useDashboardData(currentUserId)

  const {
    totalXp,
    xpAnimating,
    lastXpGain,
    completedTiles,
    addXp,
    addCompletedTile,
  } = useXpState(currentUserId)

  // Engagement prompts — fetch all chapters, overlay handles chapter filtering
  const {
    prompts: rawPrompts,
    isLoading,
    shuffle,
    answerPrompt,
    stats: engagementStats,
  } = useEngagementPrompts(50, null)

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
  const [showEngagement, setShowEngagement] = useState(false)
  const [engagementPrompt, setEngagementPrompt] = useState<any | null>(null)
  const [photoTaggingPrompt, setPhotoTaggingPrompt] = useState<any | null>(null)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showPostscriptModal, setShowPostscriptModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showQuickMemoryModal, setShowQuickMemoryModal] = useState(false)
  const [showMonthlyRecap, setShowMonthlyRecap] = useState(false)

  // Monthly recap: show in first week of month if not dismissed
  useEffect(() => {
    const now = new Date()
    const isFirstWeek = now.getDate() <= 7
    const lastDismissed = localStorage.getItem('yt_recap_dismissed')
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`
    if (isFirstWeek && lastDismissed !== currentMonth) {
      setShowMonthlyRecap(true)
    }
  }, [])

  // Handle card answer (from flipped card in overlay)
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

  // Handle engagement modal completion
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

  // Profile data for sidebar
  const userFirstName = profile?.full_name?.split(' ')[0] || 'there'
  const streakDays = engagementStats?.currentStreakDays ?? 0
  const storageUsed = subscription?.storage?.total_bytes ? subscription.storage.total_bytes / (1024 * 1024 * 1024) : 0
  const storageLimit = subscription?.storage?.limit_bytes ? subscription.storage.limit_bytes / (1024 * 1024 * 1024) : 10
  const storagePercentage = subscription?.storage?.percentage || 0

  return (
    <div className="feed-page" data-theme="light">
      <div style={{
        display: 'flex',
        maxWidth: '1800px',
        margin: '0 auto',
        padding: '80px 24px 24px',
      }}>
        {/* Left Sidebar */}
        <aside
          className="hidden lg:flex"
          style={{
            width: '320px',
            flexShrink: 0,
            position: 'sticky',
            top: '80px',
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '8px',
          }}
        >
          {/* Profile Card - dark themed matching feed */}
          <div className="profile-card-feed" style={{
            borderRadius: '16px',
            padding: '16px 20px',
          }}>
            {/* Name + Streak */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 className="profile-card-name" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Hey {userFirstName}
              </h2>
              {streakDays > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '3px 8px',
                  background: 'linear-gradient(90deg, rgba(217,198,26,0.15), rgba(195,95,51,0.15))',
                  borderRadius: '12px',
                }}>
                  <span style={{ fontSize: '13px' }}>🔥</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#C35F33' }}>{streakDays}</span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="profile-card-stats" style={{ display: 'flex', alignItems: 'center', textAlign: 'center', marginBottom: '12px' }}>
              <Link href="/dashboard/memories" style={{ flex: 1, textDecoration: 'none' }}>
                <div className="profile-stat-value">{stats.memories}</div>
                <div className="profile-stat-label">Memories</div>
              </Link>
              <Link href="/dashboard/contacts" className="profile-stat-bordered" style={{ flex: 1, textDecoration: 'none' }}>
                <div className="profile-stat-value">{stats.contacts}</div>
                <div className="profile-stat-label">People</div>
              </Link>
              <Link href="/dashboard/gallery" className="profile-stat-bordered-r" style={{ flex: 1, textDecoration: 'none' }}>
                <div className="profile-stat-value">{stats.photos}</div>
                <div className="profile-stat-label">Photos</div>
              </Link>
              <div style={{ flex: 1 }}>
                <div className={`profile-stat-xp ${xpAnimating ? 'animate-pulse' : ''}`}>{totalXp.toLocaleString()}</div>
                <div className="profile-stat-label-xp">
                  <span>⚡</span> XP
                </div>
              </div>
            </div>

            {/* XP Level + Progress */}
            {(() => {
              const lvl = getXpLevel(totalXp, gamificationConfig.xpLevels)
              return (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700' }} className="profile-card-name">
                      {lvl.emoji} {lvl.title}
                    </span>
                    {lvl.nextLevel && (
                      <span style={{ fontSize: '10px', color: '#888' }}>
                        {lvl.xpToNext} XP to {lvl.nextLevel.title}
                      </span>
                    )}
                  </div>
                  <div style={{ height: '4px', background: 'rgba(217,198,26,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '2px',
                      width: `${lvl.progress}%`,
                      background: 'linear-gradient(90deg, #D9C61A, #E8D84A)',
                      transition: 'width 0.8s ease-out',
                    }} />
                  </div>
                </div>
              )
            })()}

            {/* Badges */}
            <BadgeDisplay />

            {/* Storage Bar */}
            <div className="profile-storage">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="profile-storage-label">Storage</span>
                <span className="profile-storage-value">
                  {storageUsed < 0.1
                    ? `${(storageUsed * 1024).toFixed(0)} MB`
                    : `${storageUsed.toFixed(1)} GB`
                  } / {storageLimit.toFixed(0)} GB
                </span>
              </div>
              <div className="profile-storage-track">
                <div style={{
                  height: '100%',
                  borderRadius: '3px',
                  width: `${Math.min(storagePercentage, 100)}%`,
                  background: storagePercentage >= 90
                    ? 'linear-gradient(90deg, #C35F33, #dc2626)'
                    : 'linear-gradient(90deg, #406A56, #8DACAB)',
                  transition: 'width 0.8s ease-out',
                }} />
              </div>
            </div>
          </div>

          {/* Weekly Challenges */}
          <WeeklyChallenges />

          {/* Quick Actions */}
          <QuickActions
            onPhotoUpload={() => setShowPhotoUpload(true)}
            onAddContact={() => setShowContactModal(true)}
            onQuickMemory={() => setShowQuickMemoryModal(true)}
          />

          {/* Engagement Tile */}
          <EngagementTile
            nextPrompt={prompts[0] || null}
            totalWaiting={prompts.length}
            onOpen={() => setShowEngagement(true)}
          />
        </aside>

        {/* Main Content - Feed */}
        <main style={{ flex: 1, minWidth: 0, marginLeft: '24px' }}>
          <FeedContent />
        </main>
      </div>

      {/* Engagement Overlay */}
      <EngagementOverlay
        isOpen={showEngagement}
        onClose={() => setShowEngagement(false)}
        prompts={prompts}
        isLoading={isLoading}
        answeredPromptIds={answeredPromptIds}
        onAnsweredPromptIds={setAnsweredPromptIds}
        onCardAnswer={handleCardAnswer}
        onShuffle={handleShuffle}
        answerPrompt={answerPrompt}
        getPromptText={getPromptText}
        totalXp={totalXp}
        xpAnimating={xpAnimating}
        lastXpGain={lastXpGain}
        addXp={addXp}
        addCompletedTile={addCompletedTile}
        refreshStats={refreshStats}
        educationLevel={profile?.education_level}
        userContacts={userContacts}
      />

      {/* Monthly Recap Popup */}
      {showMonthlyRecap && (
        <MonthlyRecap onClose={() => {
          setShowMonthlyRecap(false)
          const now = new Date()
          localStorage.setItem('yt_recap_dismissed', `${now.getFullYear()}-${now.getMonth()}`)
        }} />
      )}

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

      {/* XP floating counter */}
      <XpFloatingCounter show={xpAnimating} amount={lastXpGain} />
    </div>
  )
}
