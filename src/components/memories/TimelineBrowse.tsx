'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { ChevronLeft, Calendar, Clock, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import MemoryCard from './MemoryCard'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface TimelineBrowseProps {
  memories: Memory[]
}

type ZoomLevel = 'decade' | 'year' | 'month'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function TimelineBrowse({ memories }: TimelineBrowseProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('decade')
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Parse and group memories by time
  const timeGroups = useMemo(() => {
    const decades: Record<number, { years: Record<number, { months: Record<number, Memory[]> }> }> = {}
    
    memories.forEach(memory => {
      if (!memory.memory_date) return
      
      const date = new Date(memory.memory_date)
      const year = date.getFullYear()
      const month = date.getMonth()
      const decade = Math.floor(year / 10) * 10
      
      if (!decades[decade]) {
        decades[decade] = { years: {} }
      }
      if (!decades[decade].years[year]) {
        decades[decade].years[year] = { months: {} }
      }
      if (!decades[decade].years[year].months[month]) {
        decades[decade].years[year].months[month] = []
      }
      
      decades[decade].years[year].months[month].push(memory)
    })
    
    return decades
  }, [memories])

  // Get sorted decades
  const sortedDecades = useMemo(() => {
    return Object.keys(timeGroups)
      .map(Number)
      .sort((a, b) => b - a)
  }, [timeGroups])

  // Get count for a decade
  const getDecadeCount = (decade: number) => {
    let count = 0
    Object.values(timeGroups[decade]?.years || {}).forEach(year => {
      Object.values(year.months).forEach(memories => {
        count += memories.length
      })
    })
    return count
  }

  // Get count for a year
  const getYearCount = (decade: number, year: number) => {
    let count = 0
    Object.values(timeGroups[decade]?.years[year]?.months || {}).forEach(memories => {
      count += memories.length
    })
    return count
  }

  // Get max count for density calculation
  const maxDecadeCount = useMemo(() => {
    return Math.max(...sortedDecades.map(d => getDecadeCount(d)), 1)
  }, [sortedDecades, timeGroups])

  // Get density class based on count
  const getDensityClass = (count: number, max: number) => {
    const ratio = count / max
    if (ratio >= 0.75) return 'density-high'
    if (ratio >= 0.5) return 'density-medium'
    if (ratio >= 0.25) return 'density-low'
    return 'density-minimal'
  }

  // Get cover image for a time period
  const getCoverForDecade = (decade: number) => {
    const years = timeGroups[decade]?.years || {}
    for (const year of Object.values(years)) {
      for (const memories of Object.values(year.months)) {
        for (const memory of memories) {
          const cover = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
          if (cover) return cover.file_url
        }
      }
    }
    return null
  }

  const getCoverForYear = (decade: number, year: number) => {
    const months = timeGroups[decade]?.years[year]?.months || {}
    for (const memories of Object.values(months)) {
      for (const memory of memories) {
        const cover = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
        if (cover) return cover.file_url
      }
    }
    return null
  }

  const getCoverForMonth = (decade: number, year: number, month: number) => {
    const memories = timeGroups[decade]?.years[year]?.months[month] || []
    for (const memory of memories) {
      const cover = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
      if (cover) return cover.file_url
    }
    return null
  }

  // Navigation handlers
  const goBack = () => {
    if (selectedMonth !== null) {
      setSelectedMonth(null)
    } else if (selectedYear !== null) {
      setSelectedYear(null)
      setZoomLevel('decade')
    } else if (selectedDecade !== null) {
      setSelectedDecade(null)
    }
  }

  const selectDecade = (decade: number) => {
    setSelectedDecade(decade)
    setZoomLevel('year')
  }

  const selectYear = (year: number) => {
    setSelectedYear(year)
    setZoomLevel('month')
  }

  const selectMonth = (month: number) => {
    setSelectedMonth(month)
  }

  // Get current breadcrumb
  const getBreadcrumb = () => {
    const parts: string[] = []
    if (selectedDecade !== null) parts.push(`${selectedDecade}s`)
    if (selectedYear !== null) parts.push(String(selectedYear))
    if (selectedMonth !== null) parts.push(MONTHS[selectedMonth])
    return parts.join(' → ')
  }

  // Render month view (show memories)
  if (selectedMonth !== null && selectedYear !== null && selectedDecade !== null) {
    const monthMemories = timeGroups[selectedDecade]?.years[selectedYear]?.months[selectedMonth] || []
    
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} className="page-header-back">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D9C61A] to-[#C35F33] flex items-center justify-center shadow-md">
              <Calendar size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2d2d2d]">
                {MONTHS[selectedMonth]} {selectedYear}
              </h2>
              <p className="text-sm text-[#406A56]">
                {monthMemories.length} memories
              </p>
            </div>
          </div>
        </div>

        {/* Memories grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          {monthMemories.map((memory, idx) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <MemoryCard memory={memory} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  // Render year view (show months)
  if (selectedYear !== null && selectedDecade !== null) {
    const yearData = timeGroups[selectedDecade]?.years[selectedYear] || { months: {} }
    const maxMonthCount = Math.max(...Object.values(yearData.months).map(m => m.length), 1)
    
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} className="page-header-back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#2d2d2d]">{selectedYear}</h2>
            <p className="text-sm text-[#406A56]">{getBreadcrumb()}</p>
          </div>
        </div>

        {/* Months grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4"
        >
          {MONTHS.map((monthName, monthIdx) => {
            const monthMemories = yearData.months[monthIdx] || []
            const count = monthMemories.length
            const coverUrl = getCoverForMonth(selectedDecade, selectedYear, monthIdx)
            
            return (
              <motion.button
                key={monthIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: monthIdx * 0.03 }}
                onClick={() => count > 0 && selectMonth(monthIdx)}
                disabled={count === 0}
                className={`group relative aspect-square rounded-2xl overflow-hidden transition-all duration-300
                            ${count > 0 
                              ? 'cursor-pointer hover:shadow-xl hover:scale-105' 
                              : 'opacity-40 cursor-not-allowed'
                            }`}
              >
                {/* Background */}
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={monthName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 ${
                    count > 0
                      ? 'bg-gradient-to-br from-[#406A56]/30 to-[#D9C61A]/30'
                      : 'bg-gray-200/50'
                  }`} />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Density indicator */}
                {count > 0 && (
                  <div 
                    className={`absolute top-2 right-2 w-4 h-4 rounded-full ${
                      getDensityClass(count, maxMonthCount) === 'density-high' 
                        ? 'bg-[#D9C61A]'
                        : getDensityClass(count, maxMonthCount) === 'density-medium'
                        ? 'bg-[#D9C61A]/70'
                        : 'bg-[#D9C61A]/40'
                    }`}
                    style={{
                      transform: `scale(${0.5 + (count / maxMonthCount) * 0.5})`
                    }}
                  />
                )}
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                  <span className="text-white font-medium text-sm">
                    {monthName.slice(0, 3)}
                  </span>
                  {count > 0 && (
                    <span className="block text-white/70 text-xs">
                      {count}
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    )
  }

  // Render decade view (show years)
  if (selectedDecade !== null) {
    const decadeData = timeGroups[selectedDecade] || { years: {} }
    const years = Object.keys(decadeData.years).map(Number).sort((a, b) => b - a)
    const maxYearCount = Math.max(...years.map(y => getYearCount(selectedDecade, y)), 1)
    
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={goBack} className="page-header-back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#2d2d2d]">The {selectedDecade}s</h2>
            <p className="text-sm text-[#406A56]">
              {getDecadeCount(selectedDecade)} memories across {years.length} years
            </p>
          </div>
        </div>

        {/* Years grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
        >
          {Array.from({ length: 10 }, (_, i) => selectedDecade + i).map((year, idx) => {
            const count = getYearCount(selectedDecade, year)
            const coverUrl = getCoverForYear(selectedDecade, year)
            
            return (
              <motion.button
                key={year}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => count > 0 && selectYear(year)}
                disabled={count === 0}
                className={`group relative aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-300
                            ${count > 0 
                              ? 'cursor-pointer hover:shadow-xl hover:scale-105' 
                              : 'opacity-30 cursor-not-allowed'
                            }`}
              >
                {/* Background */}
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={String(year)}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className={`absolute inset-0 ${
                    count > 0
                      ? 'bg-gradient-to-br from-[#406A56]/30 to-[#D9C61A]/30'
                      : 'bg-gray-200/50'
                  }`} />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Density indicator */}
                {count > 0 && (
                  <div 
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold
                                ${getDensityClass(count, maxYearCount) === 'density-high' 
                                  ? 'bg-[#D9C61A] text-[#2d2d2d]'
                                  : getDensityClass(count, maxYearCount) === 'density-medium'
                                  ? 'bg-[#D9C61A]/80 text-[#2d2d2d]'
                                  : 'bg-white/60 text-[#2d2d2d]'
                                }`}
                  >
                    {count}
                  </div>
                )}
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                  <span className="text-white font-bold text-2xl drop-shadow-lg">
                    {year}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    )
  }

  // Render decades view (top level)
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D9C61A] to-[#C35F33] flex items-center justify-center">
          <Clock size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#2d2d2d]">Your Timeline</h2>
          <p className="text-sm text-[#406A56]">
            Explore {memories.length} memories across {sortedDecades.length} {sortedDecades.length === 1 ? 'decade' : 'decades'}
          </p>
        </div>
      </div>

      {sortedDecades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Calendar size={32} className="text-[#406A56]/50" />
          </div>
          <h3 className="empty-state-title">No dated memories yet</h3>
          <p className="empty-state-text">
            Add dates to your memories to explore them through time
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {sortedDecades.map((decade, idx) => {
            const count = getDecadeCount(decade)
            const coverUrl = getCoverForDecade(decade)
            
            return (
              <motion.button
                key={decade}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => selectDecade(decade)}
                className="group relative aspect-[3/2] rounded-2xl overflow-hidden shadow-md
                           hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {/* Background */}
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`${decade}s`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#406A56]/40 to-[#D9C61A]/40" />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Density bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/20">
                  <div 
                    className="h-full bg-[#D9C61A] transition-all"
                    style={{ width: `${(count / maxDecadeCount) * 100}%` }}
                  />
                </div>
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-white/70 text-xs uppercase tracking-wider">Decade</span>
                      <h3 className="text-white font-bold text-3xl drop-shadow-lg">
                        {decade}s
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-bold text-xl">{count}</span>
                      <span className="text-white/70 text-xs block">memories</span>
                    </div>
                  </div>
                </div>
                
                {/* Hover glow */}
                <div className="absolute inset-0 bg-[#D9C61A]/0 group-hover:bg-[#D9C61A]/10 transition-colors" />
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
