'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useEngagementPrompts } from '@/hooks/useEngagementPrompts'
import { useSubscription } from '@/hooks/useSubscription'
import { CardChain } from '@/components/home-v2/CardChain'
import { RefreshCw, X, Heart, Camera, Brain, User, BookOpen, Sparkles, Menu } from 'lucide-react'
import type { PromptRow, ChainCard, CardType, PromptCategory } from '@/components/home-v2/types'
import { categorizePrompt, generateInitialCards } from '@/components/home-v2/types'
import { useDashboardData } from '../hooks/useDashboardData'
import { useXpState } from '../hooks/useXpState'
import { useGamificationConfig } from '@/hooks/useGamificationConfig'

const BadgeDisplay = dynamic(() => import('@/components/dashboard/BadgeDisplay'), { ssr: false })
const WeeklyChallenges = dynamic(() => import('@/components/dashboard/WeeklyChallenges'), { ssr: false })

const uid = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const CATEGORY_META: Record<string, { icon: any; label: string; hint: string; time: string }> = {
  memory: { icon: Heart, label: 'Remember When', hint: '🎙️ Talk or type', time: '~2 min' },
  photo: { icon: Camera, label: 'Tell The Story', hint: '🎙️ Talk or type', time: '~2 min' },
  wisdom: { icon: Brain, label: 'Share Wisdom', hint: '🎙️ Talk or type', time: '~3 min' },
  contact: { icon: User, label: 'Update Info', hint: '⌨️ Quick fill', time: '~30 sec' },
  profile: { icon: Sparkles, label: 'About You', hint: '👆 Tap to select', time: '~30 sec' },
  favorites: { icon: BookOpen, label: 'Your Favorites', hint: '⌨️ Type', time: '~1 min' },
}

function getXpLevel(xp: number, levels?: any[]) {
  const defaultLevels = [
    { title: 'Memory Keeper', emoji: '🔖', minXp: 0 },
    { title: 'Storyteller', emoji: '📖', minXp: 200 },
    { title: 'Family Historian', emoji: '🏛️', minXp: 500 },
    { title: 'Legacy Builder', emoji: '🌟', minXp: 1000 },
    { title: 'Time Capsule Master', emoji: '💎', minXp: 2500 },
  ]
  const lvls = levels && levels.length > 0 ? levels : defaultLevels
  let current = lvls[0]
  let next = lvls[1]
  for (let i = lvls.length - 1; i >= 0; i--) {
    if (xp >= lvls[i].minXp) {
      current = lvls[i]
      next = lvls[i + 1] || null
      break
    }
  }
  const progress = next ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100 : 100
  const xpToNext = next ? next.minXp - xp : 0
  return { ...current, nextLevel: next, progress: Math.min(progress, 100), xpToNext }
}

// Card dimensions — portrait, comfortably fits with peek of next card
const CARD_W = 530
const CARD_H = 600

export default function HomeV2Page() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const chainScrollRef = useRef<HTMLDivElement>(null)

  const {
    prompts: rawPrompts,
    isLoading: promptsLoading,
    shuffle,
    answerPrompt,
    stats: engagementStats,
  } = useEngagementPrompts(30, null)

  const { subscription } = useSubscription()
  const { stats: dashboardStats, refreshStats: refreshDashboardStats } = useDashboardData(user?.id || null)
  const { totalXp, xpAnimating } = useXpState(user?.id || null)
  const { config: gamificationConfig } = useGamificationConfig()
  const streakDays = 0

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [chainVisible, setChainVisible] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState<Map<string, PromptRow>>(new Map())

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) setProfile(p)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const seenPhotoIds = new Set<string>()
    const newRows = new Map<string, PromptRow>()
    for (const prompt of rawPrompts) {
      if (prompt.type === 'tag_person') continue
      if (prompt.photoId) {
        if (seenPhotoIds.has(prompt.photoId)) continue
        seenPhotoIds.add(prompt.photoId)
      }
      const category = categorizePrompt(prompt.type)
      const cardTypes = generateInitialCards(category, prompt.type)
      const existing = rows.get(prompt.id)
      if (existing) { newRows.set(prompt.id, existing); continue }
      const cards: ChainCard[] = cardTypes.map(type => ({
        id: uid(), type, data: {}, saved: false, createdAt: new Date().toISOString(),
      }))
      // No extra media-item card for photos — the photo is shown on the prompt card itself
      // Chain order for photo: when-where → backstory → tag-people → plus
      newRows.set(prompt.id, {
        promptId: prompt.id, promptText: prompt.promptText, promptType: prompt.type,
        category, photoUrl: prompt.photoUrl, photoId: prompt.photoId,
        contactName: prompt.contactName, contactId: prompt.contactId,
        metadata: prompt.metadata, cards, expanded: false,
      })
    }
    setRows(newRows)
  }, [rawPrompts])

  const handleSelect = useCallback((promptId: string) => {
    setExpandedRowId(promptId)
    setChainVisible(true)
    setTimeout(() => {
      if (chainScrollRef.current) chainScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }, 100)
  }, [])

  // Close: hide chain and clear expanded simultaneously so everything moves together
  const handleBack = useCallback(() => {
    setChainVisible(false)
    setExpandedRowId(null)
  }, [])

  const handleCardSave = useCallback(async (promptId: string, cardId: string, data: Record<string, any>) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const updatedCards = row.cards.map(c =>
        c.id === cardId ? { ...c, data: { ...c.data, ...data }, saved: true } : c
      )
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
    try {
      const row = rows.get(promptId)
      if (!row) return
      const card = row.cards.find(c => c.id === cardId)
      if (!card) return
      if (card.type === 'text-voice-video' || card.type === 'quote' || card.type === 'comment') {
        await answerPrompt(promptId, { type: 'text', text: data.text || '' })
      } else if (card.type === 'when-where' && row.photoId) {
        await supabase.from('memory_media').update({ location_name: data.location || null, taken_at: data.date || null }).eq('id', row.photoId)
      } else if (card.type === 'field-input') {
        await answerPrompt(promptId, { type: 'text', text: Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') })
      } else if (card.type === 'pill-select') {
        const selected = data.selected || []
        await answerPrompt(promptId, { type: 'selection', text: selected.join(', '), data: { value: selected.join(', ') } })
      }
    } catch (err) { console.error('Auto-save failed:', err) }
  }, [rows, answerPrompt, supabase])

  const handleAddCard = useCallback((promptId: string, type: CardType) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const newCard: ChainCard = {
        id: uid(), type, data: {}, saved: false,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) updatedCards.splice(plusIdx, 0, newCard)
      else updatedCards.push(newCard)
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  const handleMediaUploaded = useCallback((promptId: string, files: { url: string; name: string; type: string }[]) => {
    setRows(prev => {
      const next = new Map(prev)
      const row = next.get(promptId)
      if (!row) return prev
      const newCards: ChainCard[] = files.map(file => ({
        id: uid(), type: 'media-item' as CardType, data: file, saved: true,
        addedBy: user ? { userId: user.id, name: profile?.full_name || 'You' } : undefined,
        createdAt: new Date().toISOString(),
      }))
      const plusIdx = row.cards.findIndex(c => c.type === 'plus')
      const updatedCards = [...row.cards]
      if (plusIdx >= 0) updatedCards.splice(plusIdx, 0, ...newCards)
      else updatedCards.push(...newCards)
      next.set(promptId, { ...row, cards: updatedCards })
      return next
    })
  }, [user, profile])

  const allPrompts = Array.from(rows.values())
  const expandedRow = expandedRowId ? rows.get(expandedRowId) : null

  // Sidebar data
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const currentStreakDays = Math.max(engagementStats?.currentStreakDays ?? 0, streakDays)
  const storageUsed = subscription?.storage?.total_bytes ? subscription.storage.total_bytes / (1024 * 1024 * 1024) : 0
  const storageLimit = subscription?.storage?.limit_bytes ? subscription.storage.limit_bytes / (1024 * 1024 * 1024) : 10
  const storagePercentage = subscription?.storage?.percentage || (storageUsed / storageLimit) * 100
  const lvl = getXpLevel(totalXp, gamificationConfig?.xpLevels)

  return (
    <div className="feed-page" data-theme="dark" style={{ background: '#1A1A1A', color: '#F5F5F5' }}>
      {/* ── Mobile sidebar toggle ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="sidebar-toggle-btn"
        style={{
          display: 'none', /* shown via media query */
          position: 'fixed', top: '62px', left: '12px', zIndex: 20,
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              zIndex: 25, display: 'none', /* shown via media query */
            }}
            className="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      {/* ── Left Sidebar ── */}
      <aside
        className={`dashboard-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed', top: '56px', left: 0, width: '280px',
          height: 'calc(100vh - 56px)', overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 12px 12px 16px', display: 'flex', flexDirection: 'column',
          gap: '10px', zIndex: 30,
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="sidebar-close-btn"
          style={{
            display: 'none', /* shown via media query */
            alignSelf: 'flex-end', padding: '4px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '8px',
            border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>
        <div className="profile-card-feed" style={{ borderRadius: '16px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="profile-card-name" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Hey {firstName}</h2>
            {currentStreakDays > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 8px', background: 'linear-gradient(90deg, rgba(217,198,26,0.15), rgba(195,95,51,0.15))', borderRadius: '12px' }}>
                <span style={{ fontSize: '13px' }}>🔥</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#C35F33' }}>{currentStreakDays}</span>
              </div>
            )}
          </div>
          <div className="profile-card-stats" style={{ display: 'flex', alignItems: 'center', textAlign: 'center', marginBottom: '12px' }}>
            <Link href="/dashboard/memories" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.memories ?? 0}</div>
              <div className="profile-stat-label">Memories</div>
            </Link>
            <Link href="/dashboard/contacts" className="profile-stat-bordered" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.contacts ?? 0}</div>
              <div className="profile-stat-label">People</div>
            </Link>
            <Link href="/dashboard/gallery" className="profile-stat-bordered-r" style={{ flex: 1, textDecoration: 'none' }}>
              <div className="profile-stat-value">{dashboardStats?.photos ?? 0}</div>
              <div className="profile-stat-label">Photos</div>
            </Link>
            <div style={{ flex: 1 }}>
              <div className={`profile-stat-xp ${xpAnimating ? 'animate-pulse' : ''}`}>{totalXp.toLocaleString()}</div>
              <div className="profile-stat-label-xp"><span>⚡</span> XP</div>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="profile-card-name" style={{ fontSize: '12px', fontWeight: '700' }}>{lvl.emoji} {lvl.title}</span>
              {lvl.nextLevel && <span style={{ fontSize: '10px', color: '#888' }}>{lvl.xpToNext} XP to {lvl.nextLevel.title}</span>}
            </div>
            <div style={{ height: '4px', background: 'rgba(217,198,26,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '2px', width: `${lvl.progress}%`, background: 'linear-gradient(90deg, #D9C61A, #E8D84A)', transition: 'width 0.8s ease-out' }} />
            </div>
          </div>
          <BadgeDisplay />
          <div className="profile-storage">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="profile-storage-label">Storage</span>
              <span className="profile-storage-value">{storageUsed < 0.1 ? `${(storageUsed * 1024).toFixed(0)} MB` : `${storageUsed.toFixed(1)} GB`} / {storageLimit.toFixed(0)} GB</span>
            </div>
            <div className="profile-storage-track">
              <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(storagePercentage, 100)}%`, background: storagePercentage >= 90 ? 'linear-gradient(90deg, #C35F33, #dc2626)' : 'linear-gradient(90deg, #406A56, #8DACAB)', transition: 'width 0.8s ease-out' }} />
            </div>
          </div>
        </div>
        <WeeklyChallenges />
      </aside>

      {/* ── Main Content — snap-scroll viewport ── */}
      <main className="dashboard-main home-v2-main" style={{ minHeight: '100vh' }}>
        {/* Shuffle — top right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 24px 0' }}>
          <button onClick={() => shuffle()} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: 'none',
            color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer',
          }}>
            <RefreshCw size={14} /> Shuffle
          </button>
        </div>

        {/* Loading skeletons */}
        {promptsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingTop: '40px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: `${CARD_W}px`, maxWidth: '100%', height: `${CARD_H}px`,
                borderRadius: '24px', overflow: 'hidden', position: 'relative',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {/* Shimmer photo area */}
                <div style={{
                  height: '60%', background: 'rgba(255,255,255,0.06)',
                  animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                }} />
                {/* Shimmer content area */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    height: '14px', width: '80px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                    animationDelay: '0.2s',
                  }} />
                  <div style={{
                    height: '24px', width: '85%', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                    animationDelay: '0.3s',
                  }} />
                  <div style={{
                    height: '24px', width: '60%', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                    animationDelay: '0.4s',
                  }} />
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '16px' }}>
                    <div style={{
                      height: '12px', width: '60px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                      animationDelay: '0.5s',
                    }} />
                    <div style={{
                      height: '12px', width: '40px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      animation: 'skeleton-pulse 1.8s ease-in-out infinite',
                      animationDelay: '0.6s',
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Snap-scroll card list */}
        {!promptsLoading && (
          
            <div
              className="snap-container"
              style={{
                height: `calc(100vh - 100px)`,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollSnapType: 'y mandatory',
                padding: '0 24px',
              }}
            >
              {allPrompts.map((row, index) => {
                const isExpanded = row.promptId === expandedRowId
                const showDetailCards = isExpanded && chainVisible

                return (
                  <div
                    key={row.promptId}
                    ref={isExpanded ? chainScrollRef : undefined}
                    style={{
                      scrollSnapAlign: 'start',
                      minHeight: `${CARD_H + 32}px`,
                      paddingTop: '16px',
                      paddingBottom: '16px',
                      overflowX: isExpanded ? 'auto' : 'visible',
                      overflowY: 'visible',
                      scrollbarWidth: 'none',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      /* Always use padding for positioning, never justify-content */
                      paddingRight: isExpanded ? '24px' : 0,
                    }}>
                      {/* Prompt card with animated x position */}
                      <motion.div
                        animate={{
                          marginLeft: isExpanded ? '24px' : 'calc(50% - ' + (CARD_W / 2) + 'px)',
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 280,
                          damping: 28,
                        }}
                        style={{ flexShrink: 0 }}
                      >
                        <PromptCard
                          row={row}
                          onClick={isExpanded ? handleBack : () => handleSelect(row.promptId)}
                          isExpanded={isExpanded}
                          index={index}
                        />
                      </motion.div>

                      {/* Detail cards */}
                      <AnimatePresence>
                        {showDetailCards && (
                          <CardChain
                            row={row}
                            onCardSave={(cardId, data) => handleCardSave(row.promptId, cardId, data)}
                            onAddCard={(type) => handleAddCard(row.promptId, type)}
                            onMediaUploaded={(files) => handleMediaUploaded(row.promptId, files)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
              {/* Bottom spacer so last card can snap to top */}
              <div style={{ height: `calc(100vh - ${CARD_H + 140}px)`, flexShrink: 0 }} />
            </div>
          
        )}

        <style jsx global>{`
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          /* ── Profile card dark theme ── */
          .feed-page[data-theme="dark"] .profile-card-feed {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
          }
          .feed-page[data-theme="dark"] .profile-card-name { color: #8DACAB; }
          .feed-page[data-theme="dark"] .profile-stat-value { font-size: 22px; font-weight: 700; color: #8DACAB; }
          .feed-page[data-theme="dark"] .profile-stat-label { font-size: 9px; color: rgba(141,172,171,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
          .feed-page[data-theme="dark"] .profile-stat-bordered { border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08); }
          .feed-page[data-theme="dark"] .profile-stat-bordered-r { border-right: 1px solid rgba(255,255,255,0.08); }
          .feed-page[data-theme="dark"] .profile-stat-xp { font-size: 22px; font-weight: 700; color: #D9C61A; }
          .feed-page[data-theme="dark"] .profile-stat-label-xp { font-size: 9px; color: rgba(217,198,26,0.5); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 2px; }
          .feed-page[data-theme="dark"] .profile-storage { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; }
          .feed-page[data-theme="dark"] .profile-storage-label { font-size: 10px; font-weight: 600; color: rgba(141,172,171,0.6); text-transform: uppercase; letter-spacing: 0.5px; }
          .feed-page[data-theme="dark"] .profile-storage-value { font-size: 10px; color: rgba(255,255,255,0.5); }
          .feed-page[data-theme="dark"] .profile-storage-track { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }

          /* ── Desktop layout ── */
          .home-v2-main { margin-left: 280px; }
          .dashboard-sidebar { background: #1A1A1A; }
          aside::-webkit-scrollbar { width: 4px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

          /* ── Snap scroll — 1 card per swipe ── */
          .snap-container {
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: contain;
          }
          .snap-container::-webkit-scrollbar { width: 6px; }
          .snap-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

          /* ── Mobile (< 768px) ── */
          @media (max-width: 767px) {
            .home-v2-main { margin-left: 0 !important; }

            /* Hide sidebar by default, slide in from left when open */
            .dashboard-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: #1A1A1A;
              box-shadow: none;
            }
            .dashboard-sidebar.sidebar-open {
              transform: translateX(0);
              box-shadow: 8px 0 32px rgba(0,0,0,0.5);
            }

            /* Show toggle button */
            .sidebar-toggle-btn { display: flex !important; }

            /* Show overlay when sidebar open */
            .sidebar-overlay { display: block !important; }

            /* Show close button inside sidebar */
            .sidebar-close-btn { display: flex !important; }

            /* Cards fill screen width on mobile */
            .snap-container { padding: 0 12px !important; }
          }

          /* ── Tablet (768-1024) ── */
          @media (min-width: 768px) and (max-width: 1024px) {
            .home-v2-main { margin-left: 0 !important; }
            .dashboard-sidebar {
              transform: translateX(-100%);
              transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              background: #1A1A1A;
            }
            .dashboard-sidebar.sidebar-open {
              transform: translateX(0);
              box-shadow: 8px 0 32px rgba(0,0,0,0.5);
            }
            .sidebar-toggle-btn { display: flex !important; }
            .sidebar-overlay { display: block !important; }
            .sidebar-close-btn { display: flex !important; }
          }
        `}</style>
      </main>


    </div>
  )
}


/* ─── Prompt Card — dark theme, portrait, used in both states ─── */
function PromptCard({ row, onClick, isExpanded, index }: {
  row: PromptRow
  onClick: () => void
  isExpanded: boolean
  index: number
}) {
  const meta = CATEGORY_META[row.category] || CATEGORY_META.memory
  const hasPhoto = !!row.photoUrl
  const Icon = meta.icon

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      style={{
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#222',
        border: isExpanded ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isExpanded
          ? '0 20px 60px rgba(0,0,0,0.6)'
          : '0 12px 40px rgba(0,0,0,0.4)',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      whileHover={!isExpanded ? { scale: 1.01, boxShadow: '0 16px 50px rgba(0,0,0,0.5)' } : {}}
      whileTap={!isExpanded ? { scale: 0.99 } : {}}
    >
      {/* Photo hero — fills ~60% of card */}
      {hasPhoto && (
        <div style={{ position: 'relative', flex: '0 0 60%', overflow: 'hidden' }}>
          <img
            src={row.photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)',
          }} />
          {/* Close button when expanded */}
          {isExpanded && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
              onClick={(e) => { e.stopPropagation(); onClick() }}
            >
              <X size={16} />
            </motion.button>
          )}
          {/* Category badge */}
          <div style={{ position: 'absolute', bottom: '14px', left: '18px' }}>
            <span style={{
              padding: '5px 14px', borderRadius: '20px',
              fontSize: '11px', fontWeight: 600,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              color: '#fff',
            }}>
              {meta.label}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{
        padding: hasPhoto ? '20px 24px 28px' : '32px 24px 28px',
        flex: 1, display: 'flex', flexDirection: 'column',
      }}>
        {!hasPhoto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(127,191,155,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color="#7FBF9B" />
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {meta.label}
            </span>
            {isExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginLeft: 'auto', width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                }}
                onClick={(e) => { e.stopPropagation(); onClick() }}
              >
                <X size={16} />
              </motion.button>
            )}
          </div>
        )}

        <p style={{
          fontSize: hasPhoto ? '22px' : '24px',
          fontWeight: 700, color: '#fff',
          lineHeight: 1.3, margin: 0,
        }}>
          {row.promptText}
        </p>

        {row.contactName && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }}>
            About {row.contactName}
          </p>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '10px', marginTop: 'auto', paddingTop: '24px',
          fontSize: '12px', color: 'rgba(255,255,255,0.25)',
        }}>
          <span>{meta.hint}</span>
          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
          <span>{meta.time}</span>
          {!isExpanded && (
            <>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              <span>Tap to start</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
