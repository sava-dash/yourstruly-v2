'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface PersonalityTrait {
  name: string
  value: number // 0-100
  color?: string
}

interface SpiderGraphProps {
  traits: PersonalityTrait[]
  size?: number
  animated?: boolean
}

export function SpiderGraph({ traits, size = 200, animated = true }: SpiderGraphProps) {
  const center = size / 2
  const radius = (size / 2) - 20
  const levels = 5

  // Calculate point positions
  const points = useMemo(() => {
    const angleStep = (Math.PI * 2) / traits.length
    return traits.map((trait, i) => {
      const angle = angleStep * i - Math.PI / 2 // Start from top
      const r = (trait.value / 100) * radius
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        labelX: center + (radius + 15) * Math.cos(angle),
        labelY: center + (radius + 15) * Math.sin(angle),
        trait
      }
    })
  }, [traits, center, radius])

  // Generate polygon path
  const polygonPath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z'

  // Generate background grid
  const gridLevels = Array.from({ length: levels }, (_, i) => {
    const r = (radius / levels) * (i + 1)
    const angleStep = (Math.PI * 2) / traits.length
    return traits.map((_, j) => {
      const angle = angleStep * j - Math.PI / 2
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      }
    })
  })

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid */}
        <g className="stroke-gray-200">
          {gridLevels.map((level, i) => (
            <polygon
              key={i}
              points={level.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              strokeWidth="1"
              strokeOpacity={0.5}
            />
          ))}
          {/* Axis lines */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos((Math.PI * 2 / traits.length) * i - Math.PI / 2)}
              y2={center + radius * Math.sin((Math.PI * 2 / traits.length) * i - Math.PI / 2)}
              strokeWidth="1"
              strokeOpacity={0.3}
            />
          ))}
        </g>

        {/* Filled area */}
        <motion.path
          d={polygonPath}
          fill="url(#spiderGradient)"
          fillOpacity={0.3}
          stroke="url(#spiderGradient)"
          strokeWidth={2}
          initial={animated ? { scale: 0, opacity: 0 } : undefined}
          animate={animated ? { scale: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: 'center' }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={p.trait.color || '#4A3552'}
            stroke="white"
            strokeWidth={2}
            initial={animated ? { scale: 0 } : undefined}
            animate={animated ? { scale: 1 } : undefined}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="spiderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A3552" />
            <stop offset="100%" stopColor="#C4A235" />
          </linearGradient>
        </defs>
      </svg>

      {/* Labels */}
      {points.map((p, i) => (
        <motion.div
          key={i}
          className="absolute text-xs font-medium text-gray-700 whitespace-nowrap"
          style={{
            left: p.labelX,
            top: p.labelY,
            transform: 'translate(-50%, -50%)'
          }}
          initial={animated ? { opacity: 0 } : undefined}
          animate={animated ? { opacity: 1 } : undefined}
          transition={{ delay: 0.8 + i * 0.05 }}
        >
          {p.trait.name}
        </motion.div>
      ))}
    </div>
  )
}

// Preset personality dimensions
export const PERSONALITY_DIMENSIONS = [
  { key: 'openness', name: 'Openness', description: 'Curiosity and creativity' },
  { key: 'warmth', name: 'Warmth', description: 'Caring and emotional expression' },
  { key: 'resilience', name: 'Resilience', description: 'Strength through challenges' },
  { key: 'humor', name: 'Humor', description: 'Joy and playfulness' },
  { key: 'wisdom', name: 'Wisdom', description: 'Life lessons and insights' },
  { key: 'adventure', name: 'Adventure', description: 'Exploration and experiences' },
]

// Calculate personality from conversations
export function calculatePersonality(conversations: Array<{
  type: string
  content: string
  tags?: string[]
}>): PersonalityTrait[] {
  // Simple scoring based on keywords and conversation types
  const scores: Record<string, number> = {
    openness: 50,
    warmth: 50,
    resilience: 50,
    humor: 50,
    wisdom: 50,
    adventure: 50,
  }

  for (const conv of conversations) {
    const content = conv.content?.toLowerCase() || ''
    const type = conv.type?.toLowerCase() || ''

    // Openness indicators
    if (content.includes('learn') || content.includes('curious') || content.includes('new')) {
      scores.openness += 5
    }
    
    // Warmth indicators
    if (content.includes('love') || content.includes('family') || content.includes('care')) {
      scores.warmth += 5
    }
    
    // Resilience indicators
    if (content.includes('overcome') || content.includes('challenge') || content.includes('difficult')) {
      scores.resilience += 5
    }
    
    // Humor indicators
    if (content.includes('laugh') || content.includes('funny') || content.includes('joke')) {
      scores.humor += 5
    }
    
    // Wisdom indicators
    if (type === 'wisdom' || type === 'knowledge' || content.includes('lesson')) {
      scores.wisdom += 10
    }
    
    // Adventure indicators
    if (content.includes('travel') || content.includes('adventure') || content.includes('trip')) {
      scores.adventure += 5
    }
  }

  // Normalize and return
  return PERSONALITY_DIMENSIONS.map(dim => ({
    name: dim.name,
    value: Math.min(100, scores[dim.key]),
    color: '#4A3552'
  }))
}
