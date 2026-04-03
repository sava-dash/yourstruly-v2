'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface MilestonePromptProps {
  memoryCount: number
  userId?: string
}

const MILESTONES = [10, 25, 50, 100, 250, 500]

export default function MilestonePrompt({ memoryCount, userId }: MilestonePromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null)
  const [dismissedMilestones, setDismissedMilestones] = useState<number[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadDismissedMilestones()
  }, [])

  useEffect(() => {
    // Check if we've hit a milestone
    const milestone = MILESTONES.find(m => 
      memoryCount >= m && 
      memoryCount < m + 5 && // Show within 5 memories of milestone
      !dismissedMilestones.includes(m)
    )
    
    if (milestone) {
      setCurrentMilestone(milestone)
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [memoryCount, dismissedMilestones])

  const loadDismissedMilestones = async () => {
    // Load from localStorage first for instant feedback
    const stored = localStorage.getItem('yt_photobook_dismissed_milestones')
    if (stored) {
      setDismissedMilestones(JSON.parse(stored))
    }

    // Also check database if user is logged in
    if (userId) {
      const { data } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'dismissed_photobook_milestones')
        .single()
      
      if (data?.value) {
        const dbMilestones = JSON.parse(data.value)
        setDismissedMilestones(dbMilestones)
        localStorage.setItem('yt_photobook_dismissed_milestones', data.value)
      }
    }
  }

  const handleDismiss = async () => {
    if (!currentMilestone) return

    const newDismissed = [...dismissedMilestones, currentMilestone]
    setDismissedMilestones(newDismissed)
    setIsVisible(false)

    // Save to localStorage
    localStorage.setItem('yt_photobook_dismissed_milestones', JSON.stringify(newDismissed))

    // Save to database if user is logged in
    if (userId) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          key: 'dismissed_photobook_milestones',
          value: JSON.stringify(newDismissed)
        }, {
          onConflict: 'user_id,key'
        })
    }
  }

  const handleNeverShow = async () => {
    // Dismiss all milestones
    setDismissedMilestones(MILESTONES)
    setIsVisible(false)

    localStorage.setItem('yt_photobook_dismissed_milestones', JSON.stringify(MILESTONES))

    if (userId) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          key: 'dismissed_photobook_milestones',
          value: JSON.stringify(MILESTONES)
        }, {
          onConflict: 'user_id,key'
        })
    }
  }

  if (!isVisible || !currentMilestone) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="glass-card-page p-5 max-w-sm shadow-xl border border-[#C4A235]/30">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 transition-all"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C4A235] to-[#B8562E] flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>
          <div className="flex items-center gap-1 text-[#C4A235]">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Milestone!</span>
          </div>
        </div>

        {/* Message */}
        <h3 className="text-lg font-semibold text-[#2d2d2d] mb-1">
          You have {memoryCount} memories!
        </h3>
        <p className="text-sm text-[#2D5A3D]/70 mb-4">
          That&apos;s a beautiful collection. Turn them into a printed photo book you can hold forever.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/photobook/create?source=memories"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#B8562E] to-[#C4A235] text-white rounded-xl font-medium hover:opacity-90 transition-all"
          >
            <BookOpen size={18} />
            Create Book
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Don't show again */}
        <button
          onClick={handleNeverShow}
          className="w-full mt-2 text-xs text-[#2D5A3D]/50 hover:text-[#2D5A3D] transition-colors"
        >
          Don&apos;t remind me again
        </button>
      </div>
    </div>
  )
}
