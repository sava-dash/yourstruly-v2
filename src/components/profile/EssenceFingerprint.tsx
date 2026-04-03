'use client'

import { useMemo, useState } from 'react'
import { ESSENCE_LAYERS, getLayerValues, EssenceVector, EssenceLayer } from '@/lib/essence'

interface EssenceFingerprintProps {
  essenceVector: EssenceVector
  size?: number
  className?: string
  interactive?: boolean
}

// Layer colors from essence.ts
const LAYER_COLORS: Record<EssenceLayer, string> = {
  temperament: '#2D5A3D',      // Sage green
  motivation: '#C4A235',        // Gold
  cognitiveStyle: '#B8562E',    // Coral
  emotionalSignature: '#8DACAB', // Teal
  socialPattern: '#4A3552',      // Plum
}

// Layer display info
const LAYER_INFO: Record<EssenceLayer, { name: string; icon: string; description: string }> = {
  temperament: { 
    name: 'Temperament', 
    icon: '🌿', 
    description: 'Your core nature - how you naturally respond to the world' 
  },
  motivation: { 
    name: 'Motivation', 
    icon: '✨', 
    description: 'What drives you - your deepest goals and desires' 
  },
  cognitiveStyle: { 
    name: 'Cognitive Style', 
    icon: '🧠', 
    description: 'How you think - your mental patterns and preferences' 
  },
  emotionalSignature: { 
    name: 'Emotional Signature', 
    icon: '💫', 
    description: 'How you feel - your emotional landscape' 
  },
  socialPattern: { 
    name: 'Social Pattern', 
    icon: '🤝', 
    description: 'How you connect - your relationship style' 
  },
}

const LAYER_ORDER: EssenceLayer[] = [
  'temperament',
  'motivation', 
  'cognitiveStyle',
  'emotionalSignature',
  'socialPattern'
]

interface LayerData {
  key: EssenceLayer
  name: string
  icon: string
  description: string
  color: string
  dimensions: { name: string; value: number }[]
  avgValue: number
}

/**
 * Get full layer data from essence vector
 */
function getLayerData(essenceVector: EssenceVector): LayerData[] {
  return LAYER_ORDER.map((key) => {
    const values = getLayerValues(essenceVector, key)
    const dimensions = ESSENCE_LAYERS[key].dimensions
    const info = LAYER_INFO[key]
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length
    
    return {
      key,
      name: info.name,
      icon: info.icon,
      description: info.description,
      color: LAYER_COLORS[key],
      avgValue,
      dimensions: dimensions.map((dim, i) => ({
        name: dim,
        value: values[i]
      }))
    }
  })
}

/**
 * Generate SVG path for a layer polygon
 */
function generateLayerPath(
  values: number[], 
  centerX: number, 
  centerY: number, 
  radius: number
): string {
  const angleStep = (2 * Math.PI) / values.length
  const startAngle = -Math.PI / 2 // Start from top
  
  return values.map((value, i) => {
    const angle = startAngle + i * angleStep
    // Ensure minimum visibility with at least 10% radius
    const r = Math.max(value, 0.1) * radius
    const x = centerX + r * Math.cos(angle)
    const y = centerY + r * Math.sin(angle)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ') + ' Z'
}

/**
 * Generate concentric grid circles
 */
function GridCircles({ 
  centerX, 
  centerY, 
  radius 
}: { 
  centerX: number
  centerY: number
  radius: number 
}) {
  const levels = [0.25, 0.5, 0.75, 1]
  
  return (
    <>
      {levels.map((level) => (
        <circle
          key={level}
          cx={centerX}
          cy={centerY}
          r={radius * level}
          fill="none"
          stroke="#D1D5DB"
          strokeWidth={level === 1 ? 1.5 : 0.5}
          strokeDasharray={level === 1 ? 'none' : '3 3'}
          opacity={0.4}
        />
      ))}
    </>
  )
}

/**
 * Single layer polygon with hover effects
 */
function LayerPolygon({
  layer,
  centerX,
  centerY,
  radius,
  isHighlighted,
  isHovered,
  onHover,
  onLeave,
  onClick
}: {
  layer: LayerData
  centerX: number
  centerY: number
  radius: number
  isHighlighted: boolean
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const values = layer.dimensions.map(d => d.value)
  const path = generateLayerPath(values, centerX, centerY, radius)
  
  // Opacity logic: highlighted layers are more visible
  const baseOpacity = isHovered ? 0.5 : 0.35
  const dimmedOpacity = 0.15
  const fillOpacity = isHighlighted ? baseOpacity : (isHovered ? baseOpacity : dimmedOpacity)
  
  return (
    <g 
      className="cursor-pointer transition-opacity duration-200"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <path
        d={path}
        fill={layer.color}
        fillOpacity={isHighlighted ? fillOpacity : (isHovered ? 0.35 : 0.35)}
        stroke={layer.color}
        strokeWidth={isHovered ? 2.5 : 1.5}
        strokeLinejoin="round"
        strokeOpacity={isHovered ? 1 : 0.7}
        style={{
          transition: 'all 150ms ease-out'
        }}
      />
    </g>
  )
}

/**
 * Legend showing layer colors and names
 */
function LayerLegend({
  layers,
  hoveredLayer,
  onHover,
  onLeave,
  onClick,
  compact = false
}: {
  layers: LayerData[]
  hoveredLayer: EssenceLayer | null
  onHover: (key: EssenceLayer) => void
  onLeave: () => void
  onClick: (key: EssenceLayer) => void
  compact?: boolean
}) {
  return (
    <div className={`flex flex-wrap justify-center gap-2 ${compact ? 'mt-2' : 'mt-4'}`}>
      {layers.map((layer) => {
        const isHovered = hoveredLayer === layer.key
        return (
          <button
            key={layer.key}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
              transition-all duration-150 border
              ${isHovered 
                ? 'border-gray-300 shadow-sm scale-105' 
                : 'border-transparent hover:border-gray-200'
              }
            `}
            style={{ 
              backgroundColor: isHovered ? `${layer.color}25` : `${layer.color}10`,
            }}
            onMouseEnter={() => onHover(layer.key)}
            onMouseLeave={onLeave}
            onClick={() => onClick(layer.key)}
          >
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: layer.color }}
            />
            <span 
              className="font-medium"
              style={{ color: isHovered ? layer.color : '#4B5563' }}
            >
              {compact ? layer.icon : layer.name}
            </span>
            {!compact && (
              <span className="text-gray-400">
                {Math.round(layer.avgValue * 100)}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Detailed breakdown modal
 */
function LayerModal({
  layer,
  onClose
}: {
  layer: LayerData
  onClose: () => void
}) {
  const sortedDims = [...layer.dimensions].sort((a, b) => b.value - a.value)
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${layer.color}20` }}
            >
              {layer.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{layer.name}</h3>
              <p className="text-sm text-gray-500">{layer.dimensions.length} traits</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 mb-5 pb-4 border-b border-gray-100">
          {layer.description}
        </p>
        
        {/* Trait bars */}
        <div className="space-y-3">
          {sortedDims.map((dim, i) => {
            const label = dim.name
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim()
            
            return (
              <div key={dim.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{label}</span>
                  <span 
                    className="font-semibold"
                    style={{ color: layer.color }}
                  >
                    {Math.round(dim.value * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${dim.value * 100}%`,
                      backgroundColor: layer.color,
                      opacity: 0.7 + (i === 0 ? 0.3 : 0)
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Average score */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">Layer Average</span>
          <span 
            className="text-lg font-bold"
            style={{ color: layer.color }}
          >
            {Math.round(layer.avgValue * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Multi-Layer Essence Fingerprint Component
 * 
 * Displays 5 overlapping semi-transparent polygons,
 * each representing a different personality layer with
 * varying numbers of vertices based on trait count.
 */
export default function EssenceFingerprint({ 
  essenceVector, 
  size = 300,
  className = '',
  interactive = true
}: EssenceFingerprintProps) {
  const [hoveredLayer, setHoveredLayer] = useState<EssenceLayer | null>(null)
  const [selectedLayer, setSelectedLayer] = useState<EssenceLayer | null>(null)
  
  const layerData = useMemo(
    () => getLayerData(essenceVector), 
    [essenceVector]
  )
  
  const padding = size * 0.1
  const centerX = size / 2
  const centerY = size / 2
  const radius = (size / 2) - padding
  
  const handleLayerClick = (key: EssenceLayer) => {
    if (interactive) {
      setSelectedLayer(key)
    }
  }
  
  const selectedLayerData = selectedLayer 
    ? layerData.find(l => l.key === selectedLayer) 
    : null
  
  return (
    <div className={`relative ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Background */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r={radius + 5} 
          fill="#F5F3EE" 
          opacity={0.3}
        />
        
        {/* Grid circles */}
        <GridCircles centerX={centerX} centerY={centerY} radius={radius} />
        
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={3}
          fill="#D1D5DB"
        />
        
        {/* Layer polygons - rendered in order so later layers appear on top */}
        {layerData.map((layer) => (
          <LayerPolygon
            key={layer.key}
            layer={layer}
            centerX={centerX}
            centerY={centerY}
            radius={radius}
            isHighlighted={hoveredLayer === null || hoveredLayer === layer.key}
            isHovered={hoveredLayer === layer.key}
            onHover={() => interactive && setHoveredLayer(layer.key)}
            onLeave={() => interactive && setHoveredLayer(null)}
            onClick={() => handleLayerClick(layer.key)}
          />
        ))}
      </svg>
      
      {/* Hover tooltip */}
      {interactive && hoveredLayer && !selectedLayer && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-full z-10 pointer-events-none">
          <div 
            className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-center"
            style={{ minWidth: '160px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <span>{LAYER_INFO[hoveredLayer].icon}</span>
              <span className="font-medium text-gray-800">
                {LAYER_INFO[hoveredLayer].name}
              </span>
            </div>
            <div 
              className="text-sm font-semibold mt-0.5"
              style={{ color: LAYER_COLORS[hoveredLayer] }}
            >
              {Math.round(layerData.find(l => l.key === hoveredLayer)!.avgValue * 100)}% avg
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Click for details
            </div>
          </div>
        </div>
      )}
      
      {/* Layer legend */}
      <LayerLegend
        layers={layerData}
        hoveredLayer={hoveredLayer}
        onHover={(key) => interactive && setHoveredLayer(key)}
        onLeave={() => interactive && setHoveredLayer(null)}
        onClick={(key) => handleLayerClick(key)}
        compact={size < 250}
      />
      
      {/* Detail modal */}
      {selectedLayerData && (
        <LayerModal
          layer={selectedLayerData}
          onClose={() => setSelectedLayer(null)}
        />
      )}
    </div>
  )
}
