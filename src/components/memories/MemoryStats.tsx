'use client'

import { useState, useEffect } from 'react'
import { 
  Camera, 
  Video, 
  Calendar, 
  Users, 
  Flame, 
  Trophy, 
  TrendingUp, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface YearlyStats {
  year: number
  count: number
}

interface PersonStats {
  id: string
  name: string
  avatar_url?: string
  memory_count: number
}

interface Milestone {
  type: 'first' | 'count' | 'anniversary'
  label: string
  memory_id?: string
  memory_title?: string
  memory_date?: string
  achieved: boolean
}

interface MemoryStatsData {
  totalMemories: number
  totalMedia: number
  totalPhotos: number
  totalVideos: number
  byYear: YearlyStats[]
  richestMonth: { month: string; count: number; label: string } | null
  currentStreak: number
  maxStreak: number
  topPeople: PersonStats[]
  milestones: Milestone[]
  averagePerMonth: number
  oldestMemoryYear: number | null
  newestMemoryYear: number | null
}

export default function MemoryStats() {
  const [stats, setStats] = useState<MemoryStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/memories/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Stats error:', err)
      setError('Unable to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6">
        <button 
          className="w-full glass-card-page p-4 flex items-center justify-between opacity-50"
          disabled
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A235]/20 to-[#B8562E]/20 flex items-center justify-center">
              <BarChart3 size={20} className="text-[#2D5A3D]" />
            </div>
            <span className="font-medium text-[#2D5A3D]">Loading stats...</span>
          </div>
        </button>
      </div>
    )
  }

  if (error || !stats || stats.totalMemories === 0) {
    return null // Don't show stats section if no memories
  }

  const maxYearCount = Math.max(...stats.byYear.map(y => y.count), 1)

  return (
    <div className="mb-6">
      {/* Collapsible Header */}
      <div className="glass-card-page flex items-stretch overflow-hidden">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex-1 p-4 flex items-center justify-between hover:bg-white/90 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A235]/20 to-[#B8562E]/20 flex items-center justify-center">
              <Sparkles size={20} className="text-[#C4A235]" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-[#2d2d2d]">Your Memory Journey</span>
              <p className="text-sm text-[#2D5A3D]">
                {stats.totalMemories} memories • {stats.totalMedia} photos/videos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#2D5A3D]">
            {stats.currentStreak > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-[#B8562E]/10 rounded-full">
                <Flame size={14} className="text-[#B8562E]" />
                <span className="text-sm font-medium text-[#B8562E]">{stats.currentStreak} day streak</span>
              </div>
            )}
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>
        <Link 
          href="/dashboard/stats"
          className="hidden sm:flex items-center px-4 bg-[#2D5A3D]/5 hover:bg-[#2D5A3D]/10 border-l border-[#2D5A3D]/10 text-[#2D5A3D] text-sm font-medium transition-colors"
        >
          Full Stats →
        </Link>
      </div>

      {/* Expanded Stats */}
      {expanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Quick Stats Cards */}
          <div className="glass-card-page p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#2D5A3D]/10 flex items-center justify-center">
                <Camera size={16} className="text-[#2D5A3D]" />
              </div>
              <span className="text-sm text-[#666]">Photos</span>
            </div>
            <p className="text-2xl font-bold text-[#2d2d2d]">{stats.totalPhotos.toLocaleString()}</p>
          </div>

          <div className="glass-card-page p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#B8562E]/10 flex items-center justify-center">
                <Video size={16} className="text-[#B8562E]" />
              </div>
              <span className="text-sm text-[#666]">Videos</span>
            </div>
            <p className="text-2xl font-bold text-[#2d2d2d]">{stats.totalVideos.toLocaleString()}</p>
          </div>

          <div className="glass-card-page p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#C4A235]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#C4A235]" />
              </div>
              <span className="text-sm text-[#666]">Avg/Month</span>
            </div>
            <p className="text-2xl font-bold text-[#2d2d2d]">{stats.averagePerMonth}</p>
          </div>

          <div className="glass-card-page p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#B8562E]/10 flex items-center justify-center">
                <Flame size={16} className="text-[#B8562E]" />
              </div>
              <span className="text-sm text-[#666]">Best Streak</span>
            </div>
            <p className="text-2xl font-bold text-[#2d2d2d]">{stats.maxStreak} <span className="text-sm font-normal text-[#666]">days</span></p>
          </div>

          {/* Year Chart */}
          <div className="sm:col-span-2 glass-card-page p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-[#2D5A3D]" />
              <span className="font-medium text-[#2d2d2d]">Memories by Year</span>
            </div>
            <div className="space-y-2">
              {stats.byYear.map((yearData) => (
                <div key={yearData.year} className="flex items-center gap-3">
                  <span className="text-sm text-[#666] w-12">{yearData.year}</span>
                  <div className="flex-1 h-6 bg-[#2D5A3D]/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#2D5A3D] to-[#5A8A72] rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((yearData.count / maxYearCount) * 100, 10)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{yearData.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top People */}
          <div className="glass-card-page p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-[#2D5A3D]" />
              <span className="font-medium text-[#2d2d2d]">Top People</span>
            </div>
            {stats.topPeople.length > 0 ? (
              <div className="space-y-3">
                {stats.topPeople.map((person, i) => (
                  <div key={person.id} className="flex items-center gap-3">
                    <div className="relative">
                      {person.avatar_url ? (
                        <img 
                          src={person.avatar_url} 
                          alt={person.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center text-white text-sm font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {i === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#C4A235] rounded-full flex items-center justify-center">
                          <span className="text-[10px]">👑</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2d2d2d] truncate">{person.name}</p>
                      <p className="text-xs text-[#666]">{person.memory_count} memories</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#666] italic">Tag people in your photos to see who appears most!</p>
            )}
          </div>

          {/* Richest Month & Milestones */}
          <div className="glass-card-page p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[#C4A235]" />
              <span className="font-medium text-[#2d2d2d]">Highlights</span>
            </div>
            
            {stats.richestMonth && (
              <div className="mb-4 p-3 bg-gradient-to-r from-[#C4A235]/10 to-[#B8562E]/10 rounded-xl">
                <p className="text-xs text-[#666] uppercase tracking-wide">Memory-Richest Month</p>
                <p className="font-semibold text-[#2d2d2d]">{stats.richestMonth.label}</p>
                <p className="text-sm text-[#2D5A3D]">{stats.richestMonth.count} memories</p>
              </div>
            )}

            <div className="space-y-2">
              {stats.milestones.slice(0, 4).map((milestone, i) => (
                <div 
                  key={i}
                  className={`flex items-center gap-2 text-sm ${milestone.achieved ? 'text-[#2d2d2d]' : 'text-[#999]'}`}
                >
                  <span>{milestone.label}</span>
                  {milestone.achieved && milestone.memory_id && (
                    <Link 
                      href={`/dashboard/memories/${milestone.memory_id}`}
                      className="text-xs text-[#2D5A3D] hover:underline"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
