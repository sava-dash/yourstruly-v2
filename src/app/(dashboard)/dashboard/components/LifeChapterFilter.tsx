'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { LIFE_CHAPTERS } from '../constants'

interface LifeChapterFilterProps {
  selectedChapter: string | null
  onSelectChapter: (chapter: string | null) => void
}

export function LifeChapterFilter({ selectedChapter, onSelectChapter }: LifeChapterFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = selectedChapter
    ? LIFE_CHAPTERS.find(c => c.id === selectedChapter)?.label || 'All Chapters'
    : 'All Chapters'

  const selectedColor = selectedChapter
    ? LIFE_CHAPTERS.find(c => c.id === selectedChapter)?.color
    : null

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

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm"
        style={selectedColor ? {
          background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}dd)`,
          color: 'white',
        } : {
          background: 'linear-gradient(135deg, #7828C8, #9353D3)',
          color: 'white',
        }}
      >
        {selectedLabel}
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
            className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2"
          >
            {/* All Chapters */}
            <button
              onClick={() => { onSelectChapter(null); setIsOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedChapter === null
                  ? 'bg-[#7828C8]/10 text-[#7828C8]'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#7828C8] to-[#9353D3] flex-shrink-0" />
              All Chapters
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-3 my-1" />

            {/* Chapter options */}
            {LIFE_CHAPTERS.map((chapter, i) => (
              <motion.button
                key={chapter.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
                onClick={() => { onSelectChapter(chapter.id); setIsOpen(false) }}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedChapter === chapter.id
                    ? 'text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={selectedChapter === chapter.id ? {
                  background: `linear-gradient(135deg, ${chapter.color}, ${chapter.color}dd)`,
                } : {}}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: chapter.color }}
                />
                {chapter.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
