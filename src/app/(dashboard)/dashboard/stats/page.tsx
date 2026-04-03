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
  ChevronLeft,
  BarChart3,
  Image as ImageIcon,
  Heart,
  MapPin
} from 'lucide-react'
import Link from 'next/link'
import '@/styles/page-styles.css'

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

export default function StatsPage() {
  const [stats, setStats] = useState<MemoryStatsData | null>(null)
  const [loading, setLoading] = useState(true)
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

  const maxYearCount = stats ? Math.max(...stats.byYear.map(y => y.count), 1) : 1

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/memories" className="page-header-back">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="page-header-title flex items-center gap-3">
                <Sparkles className="text-[#C4A235]" size={28} />
                Your Memory Journey
              </h1>
              <p className="page-header-subtitle">
                Stats, milestones, and insights from your memories
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-container">
            <div className="loading-text">Crunching your memory stats...</div>
          </div>
        ) : error || !stats ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BarChart3 size={32} className="text-[#2D5A3D]/50" />
            </div>
            <h3 className="empty-state-title">No stats available</h3>
            <p className="empty-state-text">
              Start adding memories to see your journey unfold
            </p>
            <Link href="/dashboard/memories" className="btn-primary mx-auto mt-4">
              <ImageIcon size={18} />
              Go to Memories
            </Link>
          </div>
        ) : stats.totalMemories === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Heart size={32} className="text-[#B8562E]/50" />
            </div>
            <h3 className="empty-state-title">Your journey starts here</h3>
            <p className="empty-state-text">
              Add your first memory to begin tracking your story
            </p>
            <Link href="/dashboard/memories" className="btn-primary mx-auto mt-4">
              <ImageIcon size={18} />
              Add Your First Memory
            </Link>
          </div>
        ) : (
          <>
            {/* Hero Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="glass-card-page p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#2D5A3D]/20 to-[#5A8A72]/20 flex items-center justify-center">
                  <ImageIcon size={24} className="text-[#2D5A3D]" />
                </div>
                <p className="text-3xl font-bold text-[#2d2d2d]">{stats.totalMemories.toLocaleString()}</p>
                <p className="text-sm text-[#666]">Total Memories</p>
              </div>

              <div className="glass-card-page p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#C4A235]/20 to-[#B8562E]/20 flex items-center justify-center">
                  <Camera size={24} className="text-[#C4A235]" />
                </div>
                <p className="text-3xl font-bold text-[#2d2d2d]">{stats.totalPhotos.toLocaleString()}</p>
                <p className="text-sm text-[#666]">Photos</p>
              </div>

              <div className="glass-card-page p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#B8562E]/20 to-[#2D5A3D]/20 flex items-center justify-center">
                  <Video size={24} className="text-[#B8562E]" />
                </div>
                <p className="text-3xl font-bold text-[#2d2d2d]">{stats.totalVideos.toLocaleString()}</p>
                <p className="text-sm text-[#666]">Videos</p>
              </div>

              <div className="glass-card-page p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#B8562E]/20 to-[#C4A235]/20 flex items-center justify-center">
                  <Flame size={24} className="text-[#B8562E]" />
                </div>
                <p className="text-3xl font-bold text-[#2d2d2d]">{stats.currentStreak}</p>
                <p className="text-sm text-[#666]">Day Streak 🔥</p>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Year Chart - Full Width on Mobile, 2 cols on Desktop */}
              <div className="lg:col-span-2 glass-card-page p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center">
                    <Calendar size={20} className="text-[#2D5A3D]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#2d2d2d]">Memories by Year</h2>
                    <p className="text-sm text-[#666]">
                      {stats.oldestMemoryYear} — {stats.newestMemoryYear}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {stats.byYear.map((yearData) => (
                    <div key={yearData.year} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-[#2D5A3D] w-14">{yearData.year}</span>
                      <div className="flex-1 h-8 bg-[#2D5A3D]/5 rounded-xl overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#2D5A3D] to-[#5A8A72] rounded-xl transition-all duration-700 flex items-center justify-end pr-3"
                          style={{ width: `${Math.max((yearData.count / maxYearCount) * 100, 8)}%` }}
                        >
                          <span className="text-sm text-white font-medium">{yearData.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top People */}
              <div className="glass-card-page p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#C4A235]/10 flex items-center justify-center">
                    <Users size={20} className="text-[#C4A235]" />
                  </div>
                  <h2 className="font-semibold text-[#2d2d2d]">Top People</h2>
                </div>
                {stats.topPeople.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topPeople.map((person, i) => (
                      <div key={person.id} className="flex items-center gap-4">
                        <div className="relative">
                          {person.avatar_url ? (
                            <img 
                              src={person.avatar_url} 
                              alt={person.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center text-white text-lg font-medium border-2 border-white shadow">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {i === 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C4A235] rounded-full flex items-center justify-center shadow">
                              <span className="text-xs">👑</span>
                            </div>
                          )}
                          {i === 1 && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#C0C0C0] rounded-full flex items-center justify-center shadow text-xs">
                              2
                            </div>
                          )}
                          {i === 2 && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#CD7F32] rounded-full flex items-center justify-center shadow text-xs text-white">
                              3
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#2d2d2d] truncate">{person.name}</p>
                          <p className="text-sm text-[#666]">{person.memory_count} memories together</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users size={32} className="mx-auto mb-3 text-[#2D5A3D]/30" />
                    <p className="text-sm text-[#666]">Tag people in your photos to see who appears most!</p>
                  </div>
                )}
              </div>

              {/* Richest Month */}
              {stats.richestMonth && (
                <div className="glass-card-page p-6 bg-gradient-to-br from-white/80 to-[#C4A235]/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C4A235]/20 flex items-center justify-center">
                      <Trophy size={20} className="text-[#C4A235]" />
                    </div>
                    <h2 className="font-semibold text-[#2d2d2d]">Memory Champion Month</h2>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-[#2d2d2d] mb-1">{stats.richestMonth.count}</p>
                    <p className="text-lg text-[#2D5A3D] font-medium">{stats.richestMonth.label}</p>
                    <p className="text-sm text-[#666] mt-2">Your most memory-packed month!</p>
                  </div>
                </div>
              )}

              {/* Streaks */}
              <div className="glass-card-page p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#B8562E]/10 flex items-center justify-center">
                    <Flame size={20} className="text-[#B8562E]" />
                  </div>
                  <h2 className="font-semibold text-[#2d2d2d]">Streak Stats</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[#B8562E]/5 rounded-xl">
                    <p className="text-3xl font-bold text-[#B8562E]">{stats.currentStreak}</p>
                    <p className="text-sm text-[#666]">Current Streak</p>
                  </div>
                  <div className="text-center p-4 bg-[#2D5A3D]/5 rounded-xl">
                    <p className="text-3xl font-bold text-[#2D5A3D]">{stats.maxStreak}</p>
                    <p className="text-sm text-[#666]">Best Streak</p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-[#666]">
                    Average: <span className="font-medium text-[#2d2d2d]">{stats.averagePerMonth}</span> memories/month
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div className="glass-card-page p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C4A235]/20 to-[#B8562E]/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-[#C4A235]" />
                  </div>
                  <h2 className="font-semibold text-[#2d2d2d]">Milestones</h2>
                </div>
                <div className="space-y-3">
                  {stats.milestones.map((milestone, i) => (
                    <div 
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        milestone.achieved 
                          ? 'bg-[#2D5A3D]/5' 
                          : 'bg-[#999]/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${milestone.achieved ? '' : 'grayscale'}`}>
                          {milestone.label.split(' ')[0]}
                        </span>
                        <span className={`text-sm font-medium ${
                          milestone.achieved ? 'text-[#2d2d2d]' : 'text-[#999]'
                        }`}>
                          {milestone.label.slice(milestone.label.indexOf(' ') + 1)}
                        </span>
                      </div>
                      {milestone.achieved && milestone.memory_id && (
                        <Link 
                          href={`/dashboard/memories/${milestone.memory_id}`}
                          className="text-xs text-[#2D5A3D] hover:text-[#234A31] font-medium"
                        >
                          View →
                        </Link>
                      )}
                      {!milestone.achieved && (
                        <span className="text-xs text-[#999]">Coming soon</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
