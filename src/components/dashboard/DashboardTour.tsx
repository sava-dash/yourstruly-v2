'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

const TOUR_STEPS: {
  target: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  beforeShow?: () => void
}[] = [
  {
    target: '[data-tour="nav"]',
    title: 'Your Navigation',
    content: 'Jump anywhere from the top bar — Home, My Story, People, Memories, and more. Your whole life story, one click away.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="weekly-challenges"]',
    title: 'Weekly Challenges',
    content: 'Bite-sized prompts that refresh every week. Finish them to earn XP, level up, and keep your story growing without ever feeling stuck.',
    placement: 'right',
  },
  {
    target: '[data-tour="engagement-card"]',
    title: 'Engagement Cards',
    content: 'Each card is a prompt from your personal storytelling coach. Tap to expand — answer with text, voice, or video, and watch your story come to life.',
    placement: 'left',
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

  // Clip-path with rounded cutout (inner path counter-clockwise to create hole via evenodd)
  const clipPath = `path(evenodd, 'M 0 0 H ${window.innerWidth} V ${window.innerHeight} H 0 Z M ${spotX + spotR} ${spotY} H ${spotX + spotW - spotR} Q ${spotX + spotW} ${spotY} ${spotX + spotW} ${spotY + spotR} V ${spotY + spotH - spotR} Q ${spotX + spotW} ${spotY + spotH} ${spotX + spotW - spotR} ${spotY + spotH} H ${spotX + spotR} Q ${spotX} ${spotY + spotH} ${spotX} ${spotY + spotH - spotR} V ${spotY + spotR} Q ${spotX} ${spotY} ${spotX + spotR} ${spotY} Z')`

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
          background: 'rgba(0,0,0,0.75)',
          clipPath,
          WebkitClipPath: clipPath,
          transition: 'clip-path 0.3s ease',
          pointerEvents: 'auto',
        }}
        onClick={onClose}
      />
      {/* Bright spotlight glow ring (outside the cutout, no inset shadow) */}
      <div
        style={{
          position: 'fixed',
          left: spotX - 6,
          top: spotY - 6,
          width: spotW + 12,
          height: spotH + 12,
          borderRadius: spotR + 6,
          border: '3px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 0 6px rgba(64,106,86,0.4), 0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(64,106,86,0.15)',
          zIndex: 10000,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          background: 'transparent',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08), 0 0 0 4px rgba(64,106,86,0.1)',
        }}>
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#999',
                padding: '6px 12px',
                fontSize: 14,
                borderRadius: 8,
                transition: 'color 0.15s',
              }}
              className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-700"
              aria-label="Skip tour"
            >
              Skip tour
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#999',
                padding: 4,
              }}
              aria-label="Close tour"
            >
              <X size={16} />
            </button>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2d2d2d', marginBottom: 6 }}>{step.title}</h3>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{step.content}</p>
          {/* Progress */}
          <div style={{ marginTop: 16, height: 4, borderRadius: 2, background: 'rgba(64,106,86,0.12)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((stepIdx + 1) / total) * 100}%`, background: '#2D5A3D', borderRadius: 2, transition: 'width 0.3s' }} />
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
              background: '#2D5A3D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
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
        if (document.querySelector('[data-tour="nav"]')) {
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

  const finishTour = () => {
    setActive(false)
    // Dispatch event so engagement overlay knows tour is done
    window.dispatchEvent(new CustomEvent('yt-tour-complete'))
  }

  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(i => i + 1)
    } else {
      finishTour()
    }
  }

  const handlePrev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  const handleClose = () => finishTour()

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
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-[#B8562E]/5 hover:text-[#B8562E] transition-all"
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
