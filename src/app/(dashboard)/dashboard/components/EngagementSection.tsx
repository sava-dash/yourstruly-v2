'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles, Check } from 'lucide-react'
import { SwipeableCardStack } from './SwipeableCardStack'
import { XpFloatingCounter } from './XpFloatingCounter'
import { TYPE_CONFIG, LIFE_CHAPTERS } from '../constants'
import { UnifiedEngagementModal } from '@/components/engagement/UnifiedEngagementModal'
import { PhotoTaggingModal } from '@/components/engagement/PhotoTaggingModal'

const COLLEGE_EDUCATION_LEVELS = [
  'Some College',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate / PhD',
  'Professional Degree (MD, JD, etc.)',
]

interface EngagementSectionProps {
  prompts: any[]
  isLoading: boolean
  answeredPromptIds: string[]
  onAnsweredPromptIds: (ids: string[]) => void
  onCardAnswer: (promptId: string, response: any) => Promise<void>
  onShuffle: () => void
  answerPrompt: (promptId: string, response: any) => Promise<void>
  getPromptText: (prompt: any) => string
  totalXp: number
  xpAnimating: boolean
  lastXpGain: number
  addXp: (amount: number) => void
  addCompletedTile: (tile: any) => void
  refreshStats: () => void
  educationLevel?: string | null
  userContacts: any[]
  carouselIndex: number
  onCarouselIndexChange: (index: number) => void
  streakDays?: number
}

export function EngagementSection({
  prompts,
  isLoading,
  answeredPromptIds,
  onAnsweredPromptIds,
  onCardAnswer,
  onShuffle,
  answerPrompt,
  getPromptText,
  totalXp,
  xpAnimating,
  lastXpGain,
  addXp,
  addCompletedTile,
  refreshStats,
  educationLevel,
  userContacts,
  carouselIndex,
  onCarouselIndexChange,
  streakDays = 0,
}: EngagementSectionProps) {
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [engagementPrompt, setEngagementPrompt] = useState<any | null>(null)
  const [photoTaggingPrompt, setPhotoTaggingPrompt] = useState<any | null>(null)

  const attendedCollege = educationLevel ? COLLEGE_EDUCATION_LEVELS.includes(educationLevel) : false

  const visibleChapters = useMemo(() => {
    return LIFE_CHAPTERS.filter(chapter => {
      if (chapter.id === 'college' && !attendedCollege) return false
      return true
    })
  }, [attendedCollege])

  const filteredPrompts = useMemo(() => {
    if (selectedChapters.length === 0) return prompts
    return prompts.filter(p => {
      const chapter = p.lifeChapter || p.life_chapter || p.metadata?.lifeChapter
      if (!chapter) return true
      return selectedChapters.includes(chapter)
    })
  }, [prompts, selectedChapters])

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(c => c !== chapterId)
        : [...prev, chapterId]
    )
  }

  const chapterButtonLabel = selectedChapters.length === 0
    ? 'All Chapters'
    : selectedChapters.length === 1
      ? visibleChapters.find(c => c.id === selectedChapters[0])?.label || '1 chapter'
      : `${selectedChapters.length} chapters selected`

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setChapterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleEngagementComplete = async (result: {
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
    if (xpGained > 0) addXp(xpGained)
    setEngagementPrompt(null)
    onAnsweredPromptIds([...answeredPromptIds, engagementPrompt.id])
    refreshStats()
    onShuffle()
  }

  if (!isLoading && prompts.length === 0) return null

  return (
    <>
      <section
        id="engagement-section"
        style={{
          minHeight: '500px',
          display: 'flex',
          background: 'transparent',
          overflow: 'visible',
          marginBottom: '16px',
          paddingTop: '8px',
        }}
      >
        {/* Left Column — Header + Chapter Selector */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          padding: '0 24px 24px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
        }}>
          <div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#2d2d2d',
              margin: '0 0 4px 0',
            }}>
              Your Story Prompts
            </h2>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''} waiting
            </p>
          </div>

          {/* XP & Streak — compact row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 12px',
              background: 'rgba(217, 198, 26, 0.08)',
              borderRadius: '12px',
            }}>
              <Sparkles size={16} style={{ color: '#D9C61A' }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d2d2d' }}>{totalXp}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>XP</div>
              </div>
            </div>
            {streakDays > 0 && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 12px',
                background: 'rgba(255, 140, 0, 0.08)',
                borderRadius: '12px',
              }}>
                <span style={{ fontSize: '16px' }}>🔥</span>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#2d2d2d' }}>{streakDays}</div>
                  <div style={{ fontSize: '10px', color: '#888' }}>day{streakDays !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )}
          </div>

          {streakDays >= 3 && (
            <div style={{
              fontSize: '11px',
              color: '#e67700',
              padding: '6px 10px',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              💪 Answer 1 to keep your streak!
            </div>
          )}

          {/* Chapter Filter */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Filter by Chapter
            </div>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setChapterDropdownOpen(!chapterDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: selectedChapters.length > 0
                    ? 'linear-gradient(135deg, #7828C8, #9353D3)'
                    : 'rgba(0,0,0,0.03)',
                  color: selectedChapters.length > 0 ? '#fff' : '#666',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
              >
                {chapterButtonLabel}
                <ChevronDown size={14} style={{
                  transform: chapterDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  marginLeft: 'auto',
                }} />
              </button>

              <AnimatePresence>
                {chapterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      zIndex: 50,
                      minWidth: '240px',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      padding: '8px',
                    }}
                  >
                    <button
                      onClick={() => setSelectedChapters([])}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: selectedChapters.length === 0 ? '600' : '500',
                        color: selectedChapters.length === 0 ? '#7828C8' : '#666',
                        background: selectedChapters.length === 0 ? 'rgba(120,40,200,0.08)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '4px',
                        border: `2px solid ${selectedChapters.length === 0 ? '#7828C8' : '#ccc'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: selectedChapters.length === 0 ? '#7828C8' : 'transparent',
                      }}>
                        {selectedChapters.length === 0 && <Check size={10} color="#fff" />}
                      </span>
                      All Chapters
                    </button>

                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 8px' }} />

                    {visibleChapters.map((chapter) => {
                      const isSelected = selectedChapters.includes(chapter.id)
                      return (
                        <button
                          key={chapter.id}
                          onClick={() => toggleChapter(chapter.id)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '500',
                            color: isSelected ? chapter.color : '#666',
                            background: isSelected ? `${chapter.color}12` : 'transparent',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{
                            width: '16px', height: '16px', borderRadius: '4px',
                            border: `2px solid ${isSelected ? chapter.color : '#ccc'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isSelected ? chapter.color : 'transparent',
                            transition: 'all 0.2s',
                          }}>
                            {isSelected && <Check size={10} color="#fff" />}
                          </span>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: chapter.color, flexShrink: 0,
                          }} />
                          {chapter.label}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Swipe hints */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.8' }}>
              <div>← → Navigate prompts</div>
              <div>Tap card to answer</div>
            </div>
          </div>
        </div>

        {/* Right Column — Card Stack */}
        <div style={{
          flex: 1,
          padding: '16px 0 24px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          minWidth: 0,
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <Sparkles size={32} style={{ color: '#F5A524' }} />
              </motion.div>
              <span style={{ color: '#888' }}>Loading prompts...</span>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '480px' }}>
              <XpFloatingCounter show={xpAnimating} amount={lastXpGain} />
              <SwipeableCardStack
                prompts={filteredPrompts}
                currentIndex={carouselIndex}
                onCurrentIndexChange={onCarouselIndexChange}
                onCardDismiss={(id) => {
                  onAnsweredPromptIds([...answeredPromptIds, id])
                }}
                onCardAnswer={onCardAnswer}
                onNeedMorePrompts={onShuffle}
                getPromptText={getPromptText}
              />
            </div>
          )}
        </div>
      </section>

      {/* Engagement Modal */}
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

      {/* Photo Tagging Modal */}
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
    </>
  )
}
