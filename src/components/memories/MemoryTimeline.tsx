'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'

interface TimelineMemory {
  id: string
  title: string
  memory_date: string
  cover_url?: string
  memory_type?: string
}

interface MemoryTimelineProps {
  memories: TimelineMemory[]
}

export function MemoryTimeline({ memories }: MemoryTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Group memories by year and month
  const grouped = memories.reduce((acc, memory) => {
    const date = new Date(memory.memory_date)
    const year = date.getFullYear()
    const month = date.toLocaleString('default', { month: 'short' })
    const key = `${year}-${month}`
    
    if (!acc[key]) {
      acc[key] = { year, month, memories: [] }
    }
    acc[key].memories.push(memory)
    return acc
  }, {} as Record<string, { year: number; month: string; memories: TimelineMemory[] }>)

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return new Date(`${b.month} 1`).getMonth() - new Date(`${a.month} 1`).getMonth()
  })

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -300 : 300
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    setTimeout(checkScroll, 300)
  }

  if (memories.length === 0) return null

  return (
    <div className="relative mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={20} className="text-[#C4A235]" />
          Memory Timeline
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-full bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-full bg-white/80 border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Timeline Container */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto scrollbar-hide px-6 pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {sortedGroups.map((group, groupIdx) => (
          <motion.div
            key={`${group.year}-${group.month}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Year/Month Label */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#C4A235]" />
              <span className="text-sm font-semibold text-gray-700">
                {group.month} {group.year}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-[#2D5A3D]/30 to-transparent" />
            </div>

            {/* Memory Cards */}
            <div className="flex gap-3">
              {group.memories.map((memory, idx) => (
                <Link
                  key={memory.id}
                  href={`/dashboard/memories/${memory.id}`}
                  className="group"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: groupIdx * 0.1 + idx * 0.05 }}
                    className="relative w-28 h-36 rounded-2xl overflow-hidden bg-gray-100 shadow-md 
                               group-hover:shadow-xl group-hover:scale-105 transition-all duration-300"
                  >
                    {memory.cover_url ? (
                      <img 
                        src={memory.cover_url} 
                        alt={memory.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
                        <Calendar size={24} className="text-[#2D5A3D]/40" />
                      </div>
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                        {memory.title}
                      </p>
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-[#C4A235]/0 group-hover:bg-[#C4A235]/10 transition-colors" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Timeline line */}
      <div className="absolute left-6 right-6 top-[3.75rem] h-0.5 bg-gradient-to-r from-[#2D5A3D]/20 via-[#C4A235]/30 to-[#B8562E]/20 -z-10" />
    </div>
  )
}
