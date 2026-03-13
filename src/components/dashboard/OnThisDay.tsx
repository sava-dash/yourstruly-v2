'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react'
import Link from 'next/link'

interface OnThisDayMemory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  ai_summary?: string
  years_ago: number
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface OnThisDayResponse {
  memories: OnThisDayMemory[]
  date: {
    month: number
    day: number
    formatted: string
  }
}

function getYearsAgoText(yearsAgo: number): string {
  if (yearsAgo === 1) return '1 year ago'
  return `${yearsAgo} years ago`
}

function MemoryPreview({ memory, onClick }: { memory: OnThisDayMemory; onClick: () => void }) {
  const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
  const hasImage = coverMedia && coverMedia.file_type?.startsWith('image')
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#406A56]/5 transition-colors text-left group"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-[#D9C61A]/20 to-[#C35F33]/20 flex items-center justify-center">
        {hasImage ? (
          <img 
            src={coverMedia.file_url} 
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon size={20} className="text-[#406A56]/40" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Years ago badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C35F33]/10 text-[#C35F33] text-[10px] font-semibold mb-1">
          <Calendar size={10} />
          {getYearsAgoText(memory.years_ago)}
        </span>
        
        {/* Title */}
        <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-[#406A56] transition-colors">
          {memory.title || 'Untitled memory'}
        </p>
        
        {/* Snippet */}
        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
          {memory.ai_summary || memory.description || 'A memory from this day'}
        </p>
      </div>
    </motion.button>
  )
}

// Format interview Q&A content into styled blocks
function formatInterviewContent(text: string) {
  // Check if this looks like interview content (has Q1:, A1: patterns)
  if (!text || (!text.includes('Q1:') && !text.includes('Q1.'))) {
    return null
  }
  
  // Split into Q&A pairs
  const pairs: { question: string; answer: string }[] = []
  const qPattern = /Q(\d+)[:.]\s*([^A]*?)(?=A\1[:.]\s*|$)/gi
  const aPattern = /A(\d+)[:.]\s*([^Q]*?)(?=Q\d+[:.]\s*|$)/gi
  
  // Simple approach: split by Q and A markers
  const parts = text.split(/(?=Q\d+[:.]\s*)/i).filter(p => p.trim())
  
  for (const part of parts) {
    const qMatch = part.match(/Q\d+[:.]\s*(.+?)(?=A\d+[:.]\s*)/is)
    const aMatch = part.match(/A\d+[:.]\s*(.+?)$/is)
    
    if (qMatch && aMatch) {
      pairs.push({
        question: qMatch[1].trim(),
        answer: aMatch[1].trim()
      })
    }
  }
  
  if (pairs.length === 0) return null
  
  return pairs
}

function MemoryModal({ memory, onClose }: { memory: OnThisDayMemory; onClose: () => void }) {
  const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
  const hasImage = coverMedia && coverMedia.file_type?.startsWith('image')
  const description = memory.description || memory.ai_summary || ''
  const interviewPairs = formatInterviewContent(description)
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] bg-[#FDF8F3] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
        >
          <X size={18} className="text-gray-600" />
        </button>
        
        {/* Image */}
        {hasImage && (
          <div className="relative aspect-[4/3] w-full">
            <img 
              src={coverMedia.file_url} 
              alt={memory.title || 'Memory'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            
            {/* Years ago badge on image */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full">
              <Calendar size={14} className="text-[#C35F33]" />
              <span className="text-sm font-semibold text-[#C35F33]">
                {getYearsAgoText(memory.years_ago)}
              </span>
            </div>
          </div>
        )}
        
        {/* Content - scrollable */}
        <div className="p-5 overflow-y-auto flex-1">
          {!hasImage && (
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-[#C35F33]" />
              <span className="text-sm font-semibold text-[#C35F33]">
                {getYearsAgoText(memory.years_ago)}
              </span>
            </div>
          )}
          
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {memory.title || 'Untitled memory'}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            {new Date(memory.memory_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          
          {/* Interview Q&A format */}
          {interviewPairs ? (
            <div className="space-y-4">
              {interviewPairs.map((pair, index) => (
                <div key={index} className="bg-white/50 rounded-xl p-4 border border-[#406A56]/10">
                  <p className="text-sm font-medium text-[#406A56] mb-2">
                    {pair.question}
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {pair.answer}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 leading-relaxed">
              {memory.description || memory.ai_summary || 'No description available.'}
            </p>
          )}
          
          {/* View full memory link */}
          <Link
            href={`/dashboard/memories/${memory.id}`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#406A56] text-white text-sm font-medium rounded-xl hover:bg-[#4a7a64] transition-colors"
          >
            View full memory
            <ChevronRight size={16} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function OnThisDay() {
  const [data, setData] = useState<OnThisDayResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedMemory, setSelectedMemory] = useState<OnThisDayMemory | null>(null)

  useEffect(() => {
    const fetchOnThisDay = async () => {
      try {
        const res = await fetch('/api/memories/on-this-day')
        if (!res.ok) throw new Error('Failed to fetch')
        const result = await res.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching on this day:', err)
        setError('Could not load memories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnThisDay()
  }, [])

  const memories = data?.memories || []
  const hasMultiple = memories.length > 1
  const currentMemory = memories[currentIndex]

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? memories.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === memories.length - 1 ? 0 : prev + 1))
  }

  // Don't render anything if no memories on this day
  if (!isLoading && memories.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-[#242424] rounded-xl shadow-md overflow-hidden border border-white/5 hover:border-[#34D7FF] transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-[#FF5C34]/10 to-[#FFB020]/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#FF5C34]/20 flex items-center justify-center">
              <Calendar size={12} className="text-[#FF5C34]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">On This Day</h3>
              {data?.date && (
                <p className="text-[10px] text-gray-500">{data.date.formatted}</p>
              )}
            </div>
          </div>
          
          {/* Navigation arrows for multiple memories */}
          {hasMultiple && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 mr-1">
                {currentIndex + 1}/{memories.length}
              </span>
              <button
                onClick={goToPrev}
                className="p-1 rounded-lg hover:bg-[#406A56]/10 transition-colors"
              >
                <ChevronLeft size={14} className="text-[#406A56]" />
              </button>
              <button
                onClick={goToNext}
                className="p-1 rounded-lg hover:bg-[#406A56]/10 transition-colors"
              >
                <ChevronRight size={14} className="text-[#406A56]" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-h-[88px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                <Calendar size={18} className="text-[#C35F33]/50" />
              </motion.div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-xs text-gray-400">{error}</span>
            </div>
          ) : currentMemory ? (
            <AnimatePresence mode="wait">
              <MemoryPreview 
                key={currentMemory.id}
                memory={currentMemory} 
                onClick={() => setSelectedMemory(currentMemory)}
              />
            </AnimatePresence>
          ) : null}
        </div>
      </div>

      {/* Modal for expanded view */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryModal 
            memory={selectedMemory} 
            onClose={() => setSelectedMemory(null)} 
          />
        )}
      </AnimatePresence>
    </>
  )
}
