'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { LIFE_CHAPTERS } from '../constants'

// Education levels that indicate the user attended college
const COLLEGE_EDUCATION_LEVELS = [
  'Some College',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate / PhD',
  'Professional Degree (MD, JD, etc.)',
]

interface LifeChapterFilterProps {
  selectedChapters: string[]
  onSelectChapters: (chapters: string[]) => void
  educationLevel?: string | null
}

export function LifeChapterFilter({ selectedChapters, onSelectChapters, educationLevel }: LifeChapterFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const attendedCollege = educationLevel ? COLLEGE_EDUCATION_LEVELS.includes(educationLevel) : false

  // Filter out college chapter if user didn't attend college
  const visibleChapters = useMemo(() => {
    return LIFE_CHAPTERS.filter(chapter => {
      if (chapter.id === 'college' && !attendedCollege) return false
      return true
    })
  }, [attendedCollege])

  // If college was selected but user changed education to non-college, remove it
  useEffect(() => {
    if (selectedChapters.includes('college') && !attendedCollege) {
      onSelectChapters(selectedChapters.filter(c => c !== 'college'))
    }
  }, [selectedChapters, attendedCollege, onSelectChapters])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleChapter = (chapterId: string) => {
    if (selectedChapters.includes(chapterId)) {
      onSelectChapters(selectedChapters.filter(c => c !== chapterId))
    } else {
      onSelectChapters([...selectedChapters, chapterId])
    }
  }

  const toggleAll = () => {
    if (selectedChapters.length === 0 || selectedChapters.length === visibleChapters.length) {
      onSelectChapters([])
    } else {
      onSelectChapters(visibleChapters.map(c => c.id))
    }
  }

  // Button label
  const buttonLabel = selectedChapters.length === 0 || selectedChapters.length === visibleChapters.length
    ? 'All Chapters'
    : selectedChapters.length === 1
    ? visibleChapters.find(c => c.id === selectedChapters[0])?.label || '1 chapter'
    : `${selectedChapters.length} chapters`

  // Button color
  const buttonColor = selectedChapters.length === 1
    ? visibleChapters.find(c => c.id === selectedChapters[0])?.color || null
    : null

  const allSelected = selectedChapters.length === 0 || selectedChapters.length === visibleChapters.length

  return (
    <div ref={dropdownRef} className="relative inline-flex">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm"
        style={buttonColor ? {
          background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`,
          color: 'white',
        } : {
          background: 'linear-gradient(135deg, #7828C8, #9353D3)',
          color: 'white',
        }}
      >
        {buttonLabel}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-full mt-2 z-50 min-w-[220px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2"
            style={{ left: '50%', marginLeft: '-110px' }}
          >
            {/* All Chapters toggle */}
            <button
              onClick={toggleAll}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                allSelected
                  ? 'bg-[#7828C8]/10 text-[#7828C8]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span style={{
                width: '16px', height: '16px', borderRadius: '4px',
                border: `2px solid ${allSelected ? '#7828C8' : '#ccc'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: allSelected ? '#7828C8' : 'transparent',
                flexShrink: 0,
              }}>
                {allSelected && <Check size={10} color="#fff" />}
              </span>
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#7828C8] to-[#9353D3] flex-shrink-0" />
              All Chapters
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-3 my-1" />

            {/* Chapter options with checkboxes */}
            {visibleChapters.map((chapter, i) => {
              const isSelected = selectedChapters.includes(chapter.id)
              return (
                <motion.button
                  key={chapter.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.15 }}
                  onClick={() => toggleChapter(chapter.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={isSelected ? {
                    background: `linear-gradient(135deg, ${chapter.color}, ${chapter.color}dd)`,
                  } : {}}
                >
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '4px',
                    border: `2px solid ${isSelected ? '#fff' : '#ccc'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'rgba(255,255,255,0.3)' : 'transparent',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    {isSelected && <Check size={10} color="#fff" />}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: isSelected ? '#fff' : chapter.color }}
                  />
                  {chapter.label}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
