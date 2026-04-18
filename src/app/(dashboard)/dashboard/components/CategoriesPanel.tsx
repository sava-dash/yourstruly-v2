'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Heart, Camera, Brain, User, Sparkles, BookOpen, LayoutGrid, Check,
  BabyIcon, GraduationCap, Briefcase, Globe, Users as UsersIcon, Church,
  Utensils, Music, Film, Gift, Mountain, Compass, Award, Star, Shuffle,
  type LucideIcon,
} from 'lucide-react'

interface CategoriesPanelProps {
  open: boolean
  onClose: () => void
  /** Currently selected category key, or null for "All" */
  activeCategory: string | null
  /**
   * Map of category key → count.
   * Use the special key `all` for the total.
   * Every other key becomes its own tile. Categories with count=0
   * stay in the list (click-to-shuffle) so the user can still pick them.
   */
  counts: Record<string, number>
  onSelect: (category: string | null) => void
  /** Triggered when the user taps a tile with count=0 — lets the host
      regenerate the prompt pool to try to pull fresh rows for that
      chapter before rendering an empty feed. */
  onShufflePull?: () => void | Promise<void>
}

// ────────────────────────────────────────────────────────────────────
// Category presentation map — friendly label + icon + colour per known
// raw DB category value. Anything not in this map still renders via
// `fallbackTile()`, so new categories added server-side show up
// automatically without a code change.
// ────────────────────────────────────────────────────────────────────
interface TilePreset {
  label: string
  icon: LucideIcon
  bg: string
  border: string
  accent: string
  description?: string
}

const PRESETS: Record<string, TilePreset> = {
  // High-level PromptCategory buckets (fallback when dbCategory is null)
  memory: { label: 'Memories', icon: Heart, bg: '#E6F0EA', border: '#7A9B88', accent: '#2D5A3D', description: 'Moments from your life' },
  photo: { label: 'Photo Stories', icon: Camera, bg: '#FAF5E4', border: '#C4A235', accent: '#7A6520', description: 'Behind the picture' },
  wisdom: { label: 'Wisdom', icon: Brain, bg: '#FBF0EB', border: '#B8562E', accent: '#6B3A1E', description: 'Lessons and advice' },
  contact: { label: 'People You Know', icon: User, bg: '#E6F0EA', border: '#2D7A4F', accent: '#1B3926', description: 'Contact details' },
  profile: { label: 'About You', icon: Sparkles, bg: '#F5F1EA', border: '#C4A235', accent: '#5A6660', description: 'Personality & beliefs' },
  favorites: { label: 'Favorites', icon: BookOpen, bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', description: 'Books, movies, music' },
  general: { label: 'General', icon: Sparkles, bg: '#F5F1EA', border: '#94A09A', accent: '#5A6660', description: 'Mixed prompts' },

  // Life-chapter / fine-grained template categories
  childhood: { label: 'Childhood', icon: BabyIcon, bg: '#EBF2FB', border: '#60A5FA', accent: '#1E3A5F', description: 'Early years' },
  teenage: { label: 'Teenage Years', icon: Star, bg: '#FFF3DC', border: '#F5A524', accent: '#7A4F00', description: 'Coming of age' },
  high_school: { label: 'School Days', icon: GraduationCap, bg: '#EEE4F5', border: '#7828C8', accent: '#3B0D6B', description: 'Classroom stories' },
  school: { label: 'School Days', icon: GraduationCap, bg: '#EEE4F5', border: '#7828C8', accent: '#3B0D6B', description: 'Classroom stories' },
  college: { label: 'College', icon: GraduationCap, bg: '#FCEBEF', border: '#F31260', accent: '#7A0D2E', description: 'University years' },
  jobs_career: { label: 'Career', icon: Briefcase, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'Work life' },
  career: { label: 'Career', icon: Briefcase, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'Work life' },
  work: { label: 'Work', icon: Briefcase, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'Jobs you\'ve had' },
  relationships: { label: 'Relationships', icon: UsersIcon, bg: '#F1E8FA', border: '#C084FC', accent: '#4A1E6B', description: 'People close to you' },
  family: { label: 'Family', icon: UsersIcon, bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', description: 'Parents, siblings, kids' },
  marriage: { label: 'Marriage', icon: Heart, bg: '#FBE8EE', border: '#E85A7F', accent: '#7A1E3A', description: 'Your partner' },
  travel: { label: 'Travel', icon: Globe, bg: '#E3F5EA', border: '#17C964', accent: '#0B4A24', description: 'Places you\'ve been' },
  adventure: { label: 'Adventure', icon: Mountain, bg: '#E3F5EA', border: '#17C964', accent: '#0B4A24', description: 'Big experiences' },
  spirituality: { label: 'Spirituality', icon: Church, bg: '#ECE4F5', border: '#9353D3', accent: '#3F1E6B', description: 'Faith & meaning' },
  religion: { label: 'Religion', icon: Church, bg: '#ECE4F5', border: '#9353D3', accent: '#3F1E6B', description: 'Beliefs & practice' },
  wisdom_legacy: { label: 'Wisdom & Legacy', icon: Brain, bg: '#EBE0F7', border: '#6020A0', accent: '#2F0A4D', description: 'What you want remembered' },
  life_moments: { label: 'Life Moments', icon: Gift, bg: '#FFF6DC', border: '#FCD34D', accent: '#7A5A00', description: 'Milestones & firsts' },
  life_lessons: { label: 'Life Lessons', icon: Brain, bg: '#FBF0EB', border: '#B8562E', accent: '#6B3A1E', description: 'What you\'ve learned' },
  milestones: { label: 'Milestones', icon: Award, bg: '#FFF6DC', border: '#FCD34D', accent: '#7A5A00', description: 'Big accomplishments' },
  firsts: { label: 'Firsts', icon: Star, bg: '#FFF3DC', border: '#F5A524', accent: '#7A4F00', description: 'First time experiences' },
  favorites_firsts: { label: 'Favorites & Firsts', icon: Star, bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', description: 'What you love' },
  recipes: { label: 'Recipes', icon: Utensils, bg: '#FFF6DC', border: '#FCD34D', accent: '#7A5A00', description: 'Family cooking' },
  recipes_wisdom: { label: 'Recipes & Wisdom', icon: Utensils, bg: '#FFF6DC', border: '#FCD34D', accent: '#7A5A00', description: 'Cooking stories' },
  music: { label: 'Music', icon: Music, bg: '#FEF3DC', border: '#FCD34D', accent: '#7A5A00', description: 'Songs of your life' },
  movies: { label: 'Movies', icon: Film, bg: '#FCEBEF', border: '#F31260', accent: '#7A0D2E', description: 'Films that matter' },
  books: { label: 'Books', icon: BookOpen, bg: '#F0EAF5', border: '#8A6BA8', accent: '#4A3552', description: 'Stories that shaped you' },
  hobbies: { label: 'Hobbies', icon: Compass, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'What you love doing' },
  interests: { label: 'Interests', icon: Compass, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'Your passions' },
  skills: { label: 'Skills', icon: Award, bg: '#E3F5EA', border: '#17C964', accent: '#0B4A24', description: 'What you can do' },
  languages: { label: 'Languages', icon: Globe, bg: '#E1EEFC', border: '#006FEE', accent: '#003A7A', description: 'Languages you speak' },
  personality: { label: 'Personality', icon: Sparkles, bg: '#F5F1EA', border: '#C4A235', accent: '#5A6660', description: 'Who you are' },
  daily_checkin: { label: 'Daily Check-in', icon: Star, bg: '#E6F0EA', border: '#2D7A4F', accent: '#1B3926', description: 'Quick daily thoughts' },
}

const FALLBACK: TilePreset = {
  label: '',
  icon: Sparkles,
  bg: '#F5F1EA',
  border: '#94A09A',
  accent: '#5A6660',
  description: '',
}

function prettyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Right slide-out panel: dynamic list of every category present in the
 * current feed. Tapping a tile filters the feed to that category.
 */
export function CategoriesPanel({
  open,
  onClose,
  activeCategory,
  counts,
  onSelect,
  onShufflePull,
}: CategoriesPanelProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const tiles = useMemo(() => {
    const entries = Object.entries(counts).filter(([k]) => k !== 'all')
    // Sort: non-zero counts first (highest first), then zero-count
    // library chapters alphabetized underneath. Keeps the hot feed
    // buckets on top while still surfacing every chapter.
    entries.sort((a, b) => {
      if (a[1] > 0 && b[1] === 0) return -1
      if (a[1] === 0 && b[1] > 0) return 1
      if (a[1] !== b[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    return entries.map(([key, count]) => {
      const preset = PRESETS[key] || FALLBACK
      return {
        key,
        count,
        label: preset.label || prettyLabel(key),
        description: preset.description || '',
        icon: preset.icon,
        bg: preset.bg,
        border: preset.border,
        accent: preset.accent,
      }
    })
  }, [counts])

  if (!mounted) return null

  const totalAll = counts.all ?? 0

  const panel = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26, 31, 28, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 60,
            }}
          />
          <motion.aside
            key="cat-panel"
            role="dialog"
            aria-label="Prompt categories"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(400px, 94vw)',
              background: '#FAFAF7',
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '12px 0 48px rgba(0,0,0,0.22)',
              borderLeft: '1px solid #DDE3DF',
            }}
          >
            <header
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid #DDE3DF',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LayoutGrid size={16} color="#2D5A3D" />
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#1A1F1C',
                      fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)',
                    }}
                  >
                    Browse by category
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94A09A' }}>
                  Pick a chapter to explore
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close categories"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid #DDE3DF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5A6660',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
              {/* All row */}
              <button
                onClick={() => {
                  onSelect(null)
                  onClose()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  borderRadius: '14px',
                  background: activeCategory === null ? '#2D5A3D' : '#FFFFFF',
                  color: activeCategory === null ? '#FFFFFF' : '#1A1F1C',
                  border: `1px solid ${activeCategory === null ? '#2D5A3D' : '#DDE3DF'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: activeCategory === null ? 'rgba(255,255,255,0.15)' : '#F5F1EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🌿
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>All prompts</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.7 }}>
                    Show everything in the feed
                  </p>
                </div>
                {activeCategory === null && <Check size={16} />}
              </button>

              {tiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5A6660' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌿</div>
                  <p style={{ margin: 0, fontSize: '13px' }}>No prompts loaded yet.</p>
                </div>
              )}

              {/* Grid of category tiles — 2 columns on wide, still grows */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                }}
              >
                {tiles.map((tile) => {
                  const isActive = activeCategory === tile.key
                  const Icon = tile.icon
                  const count = tile.count
                  const isEmpty = count === 0
                  return (
                    <button
                      key={tile.key}
                      onClick={async () => {
                        if (isEmpty && onShufflePull) {
                          // Pull fresh rows before filtering, so the
                          // user doesn't see an empty-state flash.
                          await onShufflePull()
                        }
                        onSelect(tile.key)
                        onClose()
                      }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '14px',
                        borderRadius: '16px',
                        background: tile.bg,
                        border: `2px solid ${isActive ? tile.accent : `${tile.border}33`}`,
                        cursor: 'pointer',
                        opacity: isEmpty ? 0.6 : 1,
                        textAlign: 'left',
                        transition: 'border-color 0.15s ease, transform 0.15s ease',
                        minHeight: '124px',
                      }}
                      title={isEmpty ? 'No loaded prompts yet — tap to shuffle and pull fresh ones from the library' : undefined}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${tile.border}40`,
                        }}
                      >
                        <Icon size={17} color={tile.accent} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: 700,
                            color: tile.accent,
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tile.label}
                        </p>
                        {tile.description && (
                          <p
                            style={{
                              margin: '3px 0 0',
                              fontSize: '11px',
                              color: '#5A6660',
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {tile.description}
                          </p>
                        )}
                      </div>

                      {/* Shuffle hint for empty tiles */}
                      {isEmpty && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: `1px solid ${tile.border}40`,
                            color: tile.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Shuffle size={10} />
                        </div>
                      )}

                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: tile.accent,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(panel, document.body)
}
