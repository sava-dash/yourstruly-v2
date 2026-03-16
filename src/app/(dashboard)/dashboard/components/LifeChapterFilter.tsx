'use client'

import { LIFE_CHAPTERS } from '../constants'

interface LifeChapterFilterProps {
  selectedChapter: string | null
  onSelectChapter: (chapter: string | null) => void
}

export function LifeChapterFilter({ selectedChapter, onSelectChapter }: LifeChapterFilterProps) {
  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-2 mb-6 px-4">
      <button
        onClick={() => onSelectChapter(null)}
        className={`
          px-4 py-2 rounded-full text-sm font-medium
          transition-all duration-200
          ${selectedChapter === null
            ? 'bg-gradient-to-r from-[#7828C8] to-[#9353D3] text-white shadow-lg scale-105'
            : 'bg-white/80 backdrop-blur-sm text-[#7828C8] border border-[#7828C8]/20 hover:bg-white hover:border-[#7828C8]/40'
          }
        `}
      >
        All Chapters
      </button>
      {LIFE_CHAPTERS.map((chapter) => (
        <button
          key={chapter.id}
          onClick={() => onSelectChapter(chapter.id)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium
            transition-all duration-200
            ${selectedChapter === chapter.id
              ? 'text-white shadow-lg scale-105'
              : 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-300 hover:bg-white hover:border-gray-400'
            }
          `}
          style={selectedChapter === chapter.id ? {
            background: `linear-gradient(135deg, ${chapter.color}, ${chapter.color}dd)`
          } : {}}
        >
          {chapter.label}
        </button>
      ))}
    </div>
  )
}
