'use client'

import { useEffect, useState } from 'react'
import { SpotlightProvider, SpotlightTour, useSpotlight } from 'react-tourlight'
import 'react-tourlight/styles.css'

const TOUR_STEPS = [
  {
    target: '[data-tour="category-tabs"]',
    title: 'Category Tabs',
    content: 'Switch between different types of content — Memories, Wisdom, Media, Interviews, and items shared with you. Each tab filters your feed to show just that type.',
    placement: 'bottom' as const,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="category-tabs"]',
    title: 'Quick Actions',
    content: 'Click any category to reveal quick action buttons — add a memory, upload photos, start an interview, or get a random prompt to spark your storytelling.',
    placement: 'bottom' as const,
    spotlightPadding: 12,
  },
  {
    target: '[data-tour="filter-dropdown"]',
    title: 'Reminisce By',
    content: 'Filter your content by People, Places, Moods, or Categories. Browse through your memories organized the way you think about them.',
    placement: 'bottom' as const,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="engagement-prompts"]',
    title: 'Engagement Prompts',
    content: 'Your personal storytelling coach! Tap here to see prompts that help you capture more of your story. Answer them to earn XP and level up.',
    placement: 'right' as const,
    spotlightPadding: 8,
  },
  {
    target: '[data-tour="first-tile"]',
    title: 'Your Content Tiles',
    content: 'Click any tile to see its full details. From there, you can add more context — a backstory, location, tagged people, or voice recording to make your memories richer.',
    placement: 'left' as const,
    spotlightPadding: 8,
  },
]

const TOUR_STORAGE_KEY = 'yt_dashboard_tour_seen'

// Custom theme matching YoursTruly brand
import type { SpotlightTheme } from 'react-tourlight'

const ytTheme: SpotlightTheme = {
  overlay: {
    background: 'rgba(0, 0, 0, 0.65)',
  },
  tooltip: {
    background: '#ffffff',
    color: '#2d2d2d',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    padding: '28px',
    maxWidth: '360px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: '8px',
  },
  content: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
  button: {
    background: '#406A56',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    hoverBackground: '#4a7a64',
  },
  buttonSecondary: {
    background: 'transparent',
    color: '#666',
    border: '1px solid rgba(0,0,0,0.1)',
    hoverBackground: 'rgba(0,0,0,0.03)',
  },
  progress: {
    background: 'rgba(64, 106, 86, 0.15)',
    fill: '#406A56',
    height: '4px',
    borderRadius: '2px',
  },
  arrow: {
    fill: '#ffffff',
  },
  closeButton: {
    color: '#999',
    hoverColor: '#333',
  },
}

function TourAutoStart() {
  const { start } = useSpotlight()

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!seen) {
      // Small delay to let the dashboard render fully
      const timer = setTimeout(() => {
        start('dashboard-tour')
        localStorage.setItem(TOUR_STORAGE_KEY, 'true')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [start])

  return null
}

export function DashboardTourProvider({ children }: { children: React.ReactNode }) {
  return (
    <SpotlightProvider
      theme={ytTheme}
      labels={{
        next: 'Next',
        previous: 'Back',
        done: 'Got it!',
        skip: 'Skip tour',
        close: '×',
        stepOf: (current: number, total: number) => `${current} of ${total}`,
      }}
    >
      <SpotlightTour
        id="dashboard-tour"
        steps={TOUR_STEPS}
      />
      <TourAutoStart />
      {children}
    </SpotlightProvider>
  )
}

// Hook to trigger the tour from anywhere (e.g. user menu)
export function useDashboardTour() {
  const { start } = useSpotlight()
  return {
    startTour: () => start('dashboard-tour'),
  }
}

// Standalone button component for the user menu
export function DashboardTourTrigger() {
  const { start } = useSpotlight()
  return (
    <button
      onClick={() => start('dashboard-tour')}
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
