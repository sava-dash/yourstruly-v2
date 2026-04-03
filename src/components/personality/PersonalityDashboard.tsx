'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Heart, Lightbulb, TrendingUp, Quote } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Unified personality dimensions that blend traits + wisdom
const PERSONALITY_DIMENSIONS = [
  { 
    key: 'wisdom', 
    name: 'Wisdom', 
    icon: Lightbulb,
    color: '#C4A235',
    description: 'Life lessons & insights shared',
    keywords: ['learned', 'lesson', 'advice', 'realize', 'understand', 'wisdom', 'knowledge']
  },
  { 
    key: 'connection', 
    name: 'Connection', 
    icon: Heart,
    color: '#B8562E',
    description: 'Relationships & emotional bonds',
    keywords: ['love', 'family', 'friend', 'together', 'care', 'relationship', 'bond', 'close']
  },
  { 
    key: 'resilience', 
    name: 'Resilience', 
    icon: TrendingUp,
    color: '#2D5A3D',
    description: 'Overcoming challenges',
    keywords: ['overcome', 'difficult', 'challenge', 'strong', 'survive', 'through', 'persever']
  },
  { 
    key: 'joy', 
    name: 'Joy', 
    icon: Sparkles,
    color: '#8DACAB',
    description: 'Happiness & gratitude',
    keywords: ['happy', 'joy', 'laugh', 'grateful', 'blessed', 'wonderful', 'amazing', 'love']
  },
  { 
    key: 'growth', 
    name: 'Growth', 
    icon: Brain,
    color: '#4A3552',
    description: 'Learning & self-improvement',
    keywords: ['learn', 'grow', 'change', 'better', 'improve', 'develop', 'discover', 'new']
  },
  { 
    key: 'legacy', 
    name: 'Legacy', 
    icon: Quote,
    color: '#2d2d2d',
    description: 'Stories worth passing on',
    keywords: ['remember', 'story', 'pass', 'generation', 'teach', 'share', 'tradition', 'heritage']
  },
]

interface WisdomEntry {
  id: string
  title: string
  description: string
  ai_summary?: string
  memory_type: string
  tags?: string[]
}

interface PersonalityDashboardProps {
  userId?: string
  compact?: boolean
}

export function PersonalityDashboard({ userId, compact = false }: PersonalityDashboardProps) {
  const [wisdomEntries, setWisdomEntries] = useState<WisdomEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadWisdomData()
  }, [userId])

  const loadWisdomData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    // Load all wisdom/knowledge entries
    const { data } = await supabase
      .from('memories')
      .select('id, title, description, ai_summary, memory_type, tags')
      .eq('user_id', targetUserId)
      .in('memory_type', ['wisdom', 'knowledge', 'memory', 'story'])
      .order('created_at', { ascending: false })
      .limit(100)

    setWisdomEntries(data || [])
    setLoading(false)
  }

  // Calculate personality scores from wisdom content
  const personalityScores = useMemo(() => {
    const scores: Record<string, { score: number; count: number; excerpts: string[] }> = {}
    
    PERSONALITY_DIMENSIONS.forEach(dim => {
      scores[dim.key] = { score: 30, count: 0, excerpts: [] } // Base score of 30
    })

    for (const entry of wisdomEntries) {
      const content = `${entry.title} ${entry.description} ${entry.ai_summary || ''}`.toLowerCase()
      
      PERSONALITY_DIMENSIONS.forEach(dim => {
        const matchCount = dim.keywords.filter(kw => content.includes(kw)).length
        if (matchCount > 0) {
          scores[dim.key].score += matchCount * 8
          scores[dim.key].count++
          
          // Capture a relevant excerpt
          if (scores[dim.key].excerpts.length < 3 && entry.ai_summary) {
            scores[dim.key].excerpts.push(entry.ai_summary.slice(0, 100))
          }
        }
      })
    }

    // Normalize scores to 0-100
    Object.keys(scores).forEach(key => {
      scores[key].score = Math.min(100, scores[key].score)
    })

    return scores
  }, [wisdomEntries])

  // Spider graph calculations
  const graphSize = compact ? 180 : 260
  const center = graphSize / 2
  const radius = (graphSize / 2) - 30
  const levels = 4

  const points = PERSONALITY_DIMENSIONS.map((dim, i) => {
    const angle = (Math.PI * 2 / PERSONALITY_DIMENSIONS.length) * i - Math.PI / 2
    const score = personalityScores[dim.key]?.score || 0
    const r = (score / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 25) * Math.cos(angle),
      labelY: center + (radius + 25) * Math.sin(angle),
      fullX: center + radius * Math.cos(angle),
      fullY: center + radius * Math.sin(angle),
      dim,
      score,
      angle
    }
  })

  const polygonPath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z'

  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const r = (radius / levels) * (i + 1)
    return PERSONALITY_DIMENSIONS.map((_, j) => {
      const angle = (Math.PI * 2 / PERSONALITY_DIMENSIONS.length) * j - Math.PI / 2
      return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
    })
  })

  const selectedData = selectedDimension ? personalityScores[selectedDimension] : null
  const selectedDim = PERSONALITY_DIMENSIONS.find(d => d.key === selectedDimension)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#4A3552] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-sm overflow-hidden ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A3552] to-[#C4A235] flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your Essence</h3>
            <p className="text-xs text-gray-500">{wisdomEntries.length} stories analyzed</p>
          </div>
        </div>
      </div>

      <div className={`flex ${compact ? 'flex-col' : 'flex-col lg:flex-row'} gap-6`}>
        {/* Spider Graph */}
        <div className="flex-shrink-0 flex justify-center">
          <div className="relative" style={{ width: graphSize, height: graphSize }}>
            <svg width={graphSize} height={graphSize} className="overflow-visible">
              {/* Background grid */}
              <g className="stroke-gray-200">
                {gridLevels.map((level, i) => (
                  <polygon
                    key={i}
                    points={level.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    strokeWidth="1"
                    strokeOpacity={0.4}
                    strokeDasharray={i === levels - 1 ? "0" : "3,3"}
                  />
                ))}
                {/* Axis lines */}
                {points.map((p, i) => (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={p.fullX}
                    y2={p.fullY}
                    strokeWidth="1"
                    strokeOpacity={0.2}
                  />
                ))}
              </g>

              {/* Gradient definition */}
              <defs>
                <linearGradient id="essenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4A3552" />
                  <stop offset="50%" stopColor="#C4A235" />
                  <stop offset="100%" stopColor="#2D5A3D" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Filled area with animation */}
              <motion.path
                d={polygonPath}
                fill="url(#essenceGradient)"
                fillOpacity={0.2}
                stroke="url(#essenceGradient)"
                strokeWidth={2}
                filter="url(#glow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ transformOrigin: 'center' }}
              />

              {/* Data points */}
              {points.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={selectedDimension === p.dim.key ? 8 : 5}
                  fill={p.dim.color}
                  stroke="white"
                  strokeWidth={2}
                  className="cursor-pointer"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  onClick={() => setSelectedDimension(selectedDimension === p.dim.key ? null : p.dim.key)}
                  whileHover={{ scale: 1.3 }}
                />
              ))}
            </svg>

            {/* Labels */}
            {points.map((p, i) => {
              const Icon = p.dim.icon
              const isSelected = selectedDimension === p.dim.key
              return (
                <motion.div
                  key={i}
                  className={`absolute flex flex-col items-center cursor-pointer transition-all
                    ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                  style={{
                    left: p.labelX,
                    top: p.labelY,
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.05 }}
                  onClick={() => setSelectedDimension(isSelected ? null : p.dim.key)}
                >
                  <div 
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 transition-colors
                      ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                    style={{ 
                      backgroundColor: `${p.dim.color}20`,
                      // @ts-ignore - CSS var for ring color
                      '--tw-ring-color': p.dim.color
                    } as React.CSSProperties}
                  >
                    <Icon size={14} style={{ color: p.dim.color }} />
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {p.dim.name}
                  </span>
                </motion.div>
              )
            })}

            {/* Center score */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-[#4A3552] to-[#C4A235] bg-clip-text text-transparent">
                  {Math.round(Object.values(personalityScores).reduce((a, b) => a + b.score, 0) / 6)}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Essence</div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {selectedDimension && selectedDim && selectedData ? (
              <motion.div
                key={selectedDimension}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedDim.color}20` }}
                  >
                    <selectedDim.icon size={20} style={{ color: selectedDim.color }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedDim.name}</h4>
                    <p className="text-xs text-gray-500">{selectedDim.description}</p>
                  </div>
                  <div className="ml-auto">
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: selectedDim.color }}
                    >
                      {selectedData.score}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: selectedDim.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedData.score}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <p className="text-sm text-gray-600">
                  Found in <span className="font-semibold">{selectedData.count}</span> of your stories
                </p>

                {/* Excerpts */}
                {selectedData.excerpts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Related insights</p>
                    {selectedData.excerpts.map((excerpt, i) => (
                      <div 
                        key={i}
                        className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border-l-2"
                        style={{ borderColor: selectedDim.color }}
                      >
                        "{excerpt}..."
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col justify-center"
              >
                <p className="text-gray-500 text-sm mb-4">
                  Tap any dimension to explore how your stories shape your essence.
                </p>
                
                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  {PERSONALITY_DIMENSIONS.slice(0, 4).map(dim => {
                    const score = personalityScores[dim.key]?.score || 0
                    return (
                      <button
                        key={dim.key}
                        onClick={() => setSelectedDimension(dim.key)}
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${dim.color}15` }}
                        >
                          <dim.icon size={14} style={{ color: dim.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">{dim.name}</div>
                          <div className="text-sm font-semibold" style={{ color: dim.color }}>{score}%</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer hint */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Your essence grows with every story you share ✨
          </p>
        </div>
      )}
    </div>
  )
}
