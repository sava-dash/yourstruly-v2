'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

const TOUR_STEPS = [
  {
    target: '[data-tour="category-tabs"]',
    title: 'Category Tabs',
    content: 'Switch between Memories, Wisdom, Media, Interviews, and items shared with you. Each tab filters your feed.',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="category-tabs"]',
    title: 'Quick Actions',
    content: 'Click any category to reveal quick action buttons. Add a memory, upload photos, start an interview, or get a random prompt.',
    placement: 'bottom' as const,
    beforeShow: () => {
      const btn = document.querySelector('[data-tour="category-tabs"] button:first-child') as HTMLElement
      btn?.click()
    },
  },
  {
    target: '[data-tour="filter-dropdown"]',
    title: 'Reminisce By',
    content: 'Filter your content by People, Places, Moods, or Categories. Browse through your memories organized the way you think about them.',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="engagement-prompts"]',
    title: 'Engagement Prompts',
    content: 'Your personal storytelling coach! Tap here to see prompts that help you capture more of your story. Answer them to earn XP and level up.',
    placement: 'left' as const,
  },
  {
    target: '[data-tour="first-tile"]',
    title: 'Your Content Tiles',
    content: 'Click any tile to see its full details. From there you can add more context: a backstory, location, tagged people, or a voice recording.',
    placement: 'left' as const,
  },
]

const TOUR_STORAGE_KEY = 'yt_dashboard_tour_seen'

function getRect(el: Element): DOMRect {
  return el.getBoundingClientRect()
}

function TourOverlay({ step, stepIdx, total, onNext, onPrev, onClose }: {
  step: typeof TOUR_STEPS[0]
  stepIdx: number
  total: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const rafRef = useRef<number>(0)

  const updateRect = useCallback(() => {
    const el = document.querySelector(step.target)
    if (el) {
      setRect(getRect(el))
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [step.target])

  useEffect(() => {
    step.beforeShow?.()
    // Small delay for beforeShow effects to render
    const timer = setTimeout(updateRect, 200)
    
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateRect)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [step, updateRect])

  if (!rect) return null

  const pad = 8
  const spotX = rect.x - pad
  const spotY = rect.y - pad
  const spotW = rect.width + pad * 2
  const spotH = rect.height + pad * 2
  const spotR = 12

  // Clip-path with rounded cutout
  const clipPath = `path('M 0 0 H ${window.innerWidth} V ${window.innerHeight} H 0 Z M ${spotX} ${spotY + spotR} Q ${spotX} ${spotY} ${spotX + spotR} ${spotY} H ${spotX + spotW - spotR} Q ${spotX + spotW} ${spotY} ${spotX + spotW} ${spotY + spotR} V ${spotY + spotH - spotR} Q ${spotX + spotW} ${spotY + spotH} ${spotX + spotW - spotR} ${spotY + spotH} H ${spotX + spotR} Q ${spotX} ${spotY + spotH} ${spotX} ${spotY + spotH - spotR} Z')`

  // Tooltip position
  let tooltipStyle: React.CSSProperties = { position: 'fixed', zIndex: 10001, maxWidth: 360 }
  const gap = 16
  const placement = step.placement as string
  if (placement === 'bottom') {
    tooltipStyle.top = rect.bottom + gap
    tooltipStyle.left = Math.max(16, rect.left + rect.width / 2 - 180)
  } else if (placement === 'left') {
    tooltipStyle.top = rect.top
    tooltipStyle.right = window.innerWidth - rect.left + gap
  } else if (placement === 'right') {
    tooltipStyle.top = rect.top
    tooltipStyle.left = rect.right + gap
  } else {
    tooltipStyle.bottom = window.innerHeight - rect.top + gap
    tooltipStyle.left = Math.max(16, rect.left + rect.width / 2 - 180)
  }

  const isLast = stepIdx === total - 1

  return createPortal(
    <>
      {/* Overlay with cutout */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.6)',
          clipPath,
          WebkitClipPath: clipPath,
          transition: 'clip-path 0.3s ease',
          pointerEvents: 'auto',
        }}
        onClick={onClose}
      />
      {/* Spotlight ring */}
      <div
        style={{
          position: 'fixed',
          left: spotX - 2,
          top: spotY - 2,
          width: spotW + 4,
          height: spotH + 4,
          borderRadius: spotR + 2,
          border: '2px solid rgba(64,106,86,0.6)',
          boxShadow: '0 0 0 4px rgba(64,106,86,0.15), 0 0 20px rgba(64,106,86,0.2)',
          zIndex: 10000,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      />
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        style={tooltipStyle}
      >
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2d2d2d', marginBottom: 6 }}>{step.title}</h3>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{step.content}</p>
          {/* Progress */}
          <div style={{ marginTop: 16, height: 4, borderRadius: 2, background: 'rgba(64,106,86,0.12)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((stepIdx + 1) / total) * 100}%`, background: '#406A56', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          {/* Buttons */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#999', marginRight: 'auto' }}>{stepIdx + 1} of {total}</span>
            {stepIdx > 0 && (
              <button onClick={onPrev} style={{
                padding: '8px 16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12,
                background: 'transparent', color: '#666', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}>
                Back
              </button>
            )}
            <button onClick={onNext} style={{
              padding: '8px 20px', border: 'none', borderRadius: 12,
              background: '#406A56', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              {isLast ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  )
}

export function DashboardTourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  // Auto-start on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.pathname !== '/dashboard') return
    const seen = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!seen) {
      const timer = setTimeout(() => {
        if (document.querySelector('[data-tour="category-tabs"]')) {
          setActive(true)
          setStepIdx(0)
          localStorage.setItem(TOUR_STORAGE_KEY, 'true')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Expose start function via window for menu trigger
  useEffect(() => {
    (window as any).__startDashboardTour = () => {
      setStepIdx(0)
      setActive(true)
    }
    return () => { delete (window as any).__startDashboardTour }
  }, [])

  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      setActive(false)
    }
  }

  const handlePrev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  const handleClose = () => setActive(false)

  return (
    <>
      {children}
      <AnimatePresence>
        {active && (
          <TourOverlay
            step={TOUR_STEPS[stepIdx]}
            stepIdx={stepIdx}
            total={TOUR_STEPS.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// Simple trigger button for user menu
export function DashboardTourTrigger() {
  return (
    <button
      onClick={() => (window as any).__startDashboardTour?.()}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33] transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>Dashboard Tour</span>
    </button>
  )
}
