'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Loader2, Sparkles, RefreshCw, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { SlideshowPlayer } from '@/components/slideshow'

interface LifeChapter {
  era: string
  yearRange: string
  summary: string
  keyEvents?: string[]
}

interface IntelligenceProfile {
  personalitySummary: string
  coreValues?: string[]
  lifeChapters?: LifeChapter[]
  keyLifeEvents?: string[]
  importantPeople?: Array<{ name: string; relationship: string; importanceScore: number }>
}

interface SlideItem {
  id: string
  url: string
  title?: string
  description?: string
  date?: string
}

interface LifeStoryEngineProps {
  slideItems?: SlideItem[]   // Photos to use for "Play My Life"
}

const CHAPTER_COLORS = [
  { bg: 'linear-gradient(135deg, #FDF8F3 0%, #F5EDE4 100%)', accent: '#C35F33', bar: '#C35F33' },
  { bg: 'linear-gradient(135deg, #EDF6F4 0%, #D4EDE8 100%)', accent: '#406A56', bar: '#406A56' },
  { bg: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3B0 100%)', accent: '#8a7c08', bar: '#D9C61A' },
  { bg: 'linear-gradient(135deg, #F0EDF8 0%, #E4DCF0 100%)', accent: '#4A3552', bar: '#4A3552' },
  { bg: 'linear-gradient(135deg, #EDF6EE 0%, #D4EBDA 100%)', accent: '#2d6a34', bar: '#2d6a34' },
  { bg: 'linear-gradient(135deg, #FFF0EA 0%, #FFE0D0 100%)', accent: '#9b3030', bar: '#C35F33' },
]

export default function LifeStoryEngine({ slideItems = [] }: LifeStoryEngineProps) {
  const [profile, setProfile] = useState<IntelligenceProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [showSlideshow, setShowSlideshow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence')
      const data = await res.json()
      if (data.exists && data.intelligence) {
        setProfile(data.intelligence)
      } else {
        setProfile(null)
      }
    } catch {
      setError('Could not load life story')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleGenerate = async () => {
    setComputing(true)
    setError(null)
    try {
      await fetch('/api/intelligence/compute', { method: 'POST' })
      await loadProfile()
    } catch {
      setError('Generation failed. Try again.')
    } finally {
      setComputing(false)
    }
  }

  const photoSlides = slideItems.filter(s => s.url)

  return (
    <div className="glass-card-page overflow-hidden">
      {/* ── Header ── */}
      <div
        className="relative p-5 cursor-pointer select-none"
        style={{ background: 'linear-gradient(132deg, #180828 0%, #4A3552 22%, #F7B750 100%)' }}
        onClick={() => setExpanded(e => !e)}
      >

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <BookOpen size={20} className="text-[#F7B750]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">The Life Story Engine</h2>
              <p className="text-white/50 text-xs">Your memories turned into a narrative</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Play My Life */}
            {photoSlides.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowSlideshow(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-[#F7B750] text-[#180828] rounded-xl font-bold text-sm hover:bg-[#f5a830] transition-colors shadow-lg"
              >
                <Play size={16} className="fill-current" />
                Play My Life
              </button>
            )}
            {expanded ? (
              <ChevronUp size={20} className="text-white/50" />
            ) : (
              <ChevronDown size={20} className="text-white/50" />
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-[#4A3552]" />
                  <span className="ml-2 text-[#666] text-sm">Loading your life story...</span>
                </div>
              ) : !profile ? (
                /* ── No profile yet ── */
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#4A3552] flex items-center justify-center">
                    <Sparkles size={28} className="text-[#F7B750]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#11181c] mb-2">Generate Your Life Story</h3>
                  <p className="text-sm text-[#52525b] mb-6 max-w-sm mx-auto">
                    AI will analyze your memories and create a biography, life chapters, and legacy archive.
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={computing}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A3552] text-white rounded-xl font-semibold hover:bg-[#3a2842] transition-colors mx-auto disabled:opacity-50"
                  >
                    {computing ? (
                      <><Loader2 size={18} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles size={18} /> Generate My Story</>
                    )}
                  </button>
                  {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                </div>
              ) : (
                <>
                  {/* ── Biography ── */}
                  {profile.personalitySummary && (
                    <section>
                      <h3 className="text-sm font-bold text-[#406A56] uppercase tracking-widest mb-3">Your Biography</h3>
                      <div className="glass-card-page p-4 relative overflow-hidden">
                        <div className="absolute top-2 left-3 text-6xl text-[#406A56]/10 font-serif leading-none select-none">❝</div>
                        <p className="text-[#2d2d2d] text-sm leading-relaxed relative z-10 pl-2">
                          {profile.personalitySummary}
                        </p>
                      </div>
                    </section>
                  )}

                  {/* ── Life Chapters ── */}
                  {profile.lifeChapters && profile.lifeChapters.length > 0 && (
                    <section>
                      <h3 className="text-sm font-bold text-[#406A56] uppercase tracking-widest mb-3">Life Chapters</h3>
                      <div className="space-y-3">
                        {profile.lifeChapters.map((chapter, i) => {
                          const theme = CHAPTER_COLORS[i % CHAPTER_COLORS.length]
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="rounded-xl overflow-hidden border border-white/60"
                              style={{ background: theme.bg }}
                            >
                              <div
                                className="h-[3px]"
                                style={{ background: `linear-gradient(90deg, ${theme.bar}, ${theme.bar}55)` }}
                              />
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                      style={{ color: theme.accent, background: `${theme.bar}18` }}
                                    >
                                      Chapter {i + 1}
                                    </span>
                                    <span className="text-xs text-[#666]">{chapter.yearRange}</span>
                                  </div>
                                </div>
                                <h4
                                  className="font-bold text-base mt-2"
                                  style={{ color: theme.accent }}
                                >
                                  {chapter.era}
                                </h4>
                                <p className="text-sm text-[#444] mt-1 leading-relaxed">{chapter.summary}</p>
                                {chapter.keyEvents && chapter.keyEvents.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {chapter.keyEvents.slice(0, 4).map((ev, j) => (
                                      <span
                                        key={j}
                                        className="text-[10px] px-2 py-0.5 rounded-full"
                                        style={{ color: theme.accent, background: `${theme.bar}20`, border: `1px solid ${theme.bar}30` }}
                                      >
                                        {ev}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Core Values ── */}
                  {profile.coreValues && profile.coreValues.length > 0 && (
                    <section>
                      <h3 className="text-sm font-bold text-[#406A56] uppercase tracking-widest mb-3">Your Core Values</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.coreValues.map((val, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-[#406A56]/10 text-[#406A56] border border-[#406A56]/20"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Refresh ── */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerate}
                      disabled={computing}
                      className="flex items-center gap-1.5 text-xs text-[#406A56]/60 hover:text-[#406A56] transition-colors"
                    >
                      {computing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Regenerate story
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideshow */}
      <SlideshowPlayer
        isOpen={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        title="My Life Story"
        items={photoSlides}
        slideDuration={5}
        autoPlay
      />
    </div>
  )
}
