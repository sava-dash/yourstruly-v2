'use client'

import { useState, useEffect } from 'react'
import { Heart, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { MOOD_DEFINITIONS, MoodType } from '@/lib/ai/moodAnalysis'

interface MoodDistribution {
  mood: MoodType
  count: number
  percentage: number
}

interface JourneyPeriod {
  period: string
  moods: Record<string, number>
}

interface EmotionalJourneyProps {
  userId?: string
}

export default function EmotionalJourney({ userId }: EmotionalJourneyProps) {
  const [distribution, setDistribution] = useState<MoodDistribution[]>([])
  const [journey, setJourney] = useState<JourneyPeriod[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<'bar' | 'timeline'>('bar')

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Load distribution
      const distRes = await fetch('/api/memories/mood-stats?view=distribution')
      const distData = await distRes.json()
      setDistribution(distData.distribution || [])
      setTotal(distData.total || 0)

      // Load journey
      const journeyRes = await fetch('/api/memories/mood-stats?view=journey')
      const journeyData = await journeyRes.json()
      setJourney(journeyData.journey || [])
    } catch (error) {
      console.error('Failed to load mood stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card-page p-4 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="h-32 bg-white/5 rounded" />
      </div>
    )
  }

  if (total === 0) {
    return null // Don't show if no mood data
  }

  // Format month for display
  const formatMonth = (period: string) => {
    const [year, month] = period.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // Get dominant mood for a period
  const getDominantMood = (moods: Record<string, number>): MoodType | null => {
    let maxCount = 0
    let dominant: MoodType | null = null
    for (const [mood, count] of Object.entries(moods)) {
      if (count > maxCount) {
        maxCount = count
        dominant = mood as MoodType
      }
    }
    return dominant
  }

  return (
    <div className="glass-card-page overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Heart size={16} className="text-pink-500" />
          </div>
          <div className="text-left">
            <h3 className="text-[#2d2d2d] font-medium">Emotional Journey</h3>
            <p className="text-[#2D5A3D]/60 text-sm">{total} memories with mood tags</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-[#2D5A3D]/50" />
        ) : (
          <ChevronDown size={20} className="text-[#2D5A3D]/50" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2D5A3D]/10">
          {/* View Toggle */}
          <div className="flex items-center gap-2 my-3">
            <button
              onClick={() => setView('bar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'bar'
                  ? 'bg-[#2D5A3D] text-white'
                  : 'text-[#2D5A3D]/60 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10'
              }`}
            >
              Distribution
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === 'timeline'
                  ? 'bg-[#2D5A3D] text-white'
                  : 'text-[#2D5A3D]/60 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10'
              }`}
            >
              Timeline
            </button>
          </div>

          {view === 'bar' ? (
            /* Bar Chart Distribution */
            <div className="space-y-3">
              {distribution.map((item) => {
                const moodDef = MOOD_DEFINITIONS[item.mood]
                if (!moodDef) return null

                return (
                  <div key={item.mood} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: moodDef.color }} />
                        <span className="text-[#2d2d2d]">{moodDef.label}</span>
                      </span>
                      <span className="text-[#2D5A3D]/60">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#2D5A3D]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: moodDef.color
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Timeline View */
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {journey.slice(0, 12).map((period) => {
                const dominant = getDominantMood(period.moods)
                const dominantDef = dominant ? MOOD_DEFINITIONS[dominant] : null
                const totalInPeriod = Object.values(period.moods).reduce((a, b) => a + b, 0)

                return (
                  <div key={period.period} className="flex items-center gap-3">
                    {/* Month */}
                    <div className="w-20 text-sm text-[#2D5A3D]/60 flex-shrink-0">
                      {formatMonth(period.period)}
                    </div>

                    {/* Mood Stack */}
                    <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-[#2D5A3D]/5">
                      {Object.entries(period.moods)
                        .sort(([, a], [, b]) => b - a)
                        .map(([mood, count]) => {
                          const moodDef = MOOD_DEFINITIONS[mood as MoodType]
                          if (!moodDef) return null
                          const width = (count / totalInPeriod) * 100

                          return (
                            <div
                              key={mood}
                              title={`${moodDef.label}: ${count}`}
                              className="h-full transition-all hover:opacity-80"
                              style={{
                                width: `${width}%`,
                                backgroundColor: moodDef.color
                              }}
                            />
                          )
                        })}
                    </div>

                    {/* Dominant Mood */}
                    <div className="w-20 flex items-center gap-1 text-sm flex-shrink-0">
                      {dominantDef && (
                        <>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dominantDef.color }} />
                          <span className="text-[#2d2d2d] truncate">{dominantDef.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {journey.length === 0 && (
                <p className="text-[#2D5A3D]/50 text-sm text-center py-4">
                  Add dates to your memories to see your emotional journey over time
                </p>
              )}
            </div>
          )}

          {/* Mood Legend (compact) */}
          <div className="mt-4 pt-3 border-t border-[#2D5A3D]/10">
            <div className="flex flex-wrap gap-2">
              {Object.entries(MOOD_DEFINITIONS).map(([mood, def]) => (
                <div
                  key={mood}
                  className="flex items-center gap-1 text-xs text-[#2D5A3D]/60"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: def.color }}
                  />
                  <span>{def.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
