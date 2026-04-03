'use client'

import React from 'react'

// Torn edge SVG variations - organic triangular teeth
export type TornEdgeVariant = 'a' | 'b' | 'c' | 'd' | 'e'

interface TornEdgeProps {
  variant?: TornEdgeVariant
  position?: 'top' | 'bottom' | 'left' | 'right'
  color?: string
  height?: number
  className?: string
}

// Generate different torn edge patterns
const tornPaths: Record<TornEdgeVariant, string> = {
  // Variant A: Small even teeth
  a: 'M0,8 L5,0 L10,7 L15,1 L20,8 L25,0 L30,6 L35,1 L40,8 L45,0 L50,7 L55,1 L60,8 L65,0 L70,6 L75,2 L80,8 L85,0 L90,7 L95,1 L100,8 L100,8 L0,8 Z',
  
  // Variant B: Irregular varied teeth
  b: 'M0,8 L4,0 L9,5 L14,1 L18,7 L24,0 L28,6 L34,2 L39,8 L44,1 L50,5 L55,0 L61,7 L66,2 L72,6 L77,0 L83,8 L88,3 L94,6 L100,0 L100,8 L0,8 Z',
  
  // Variant C: Larger jagged teeth
  c: 'M0,10 L7,0 L14,8 L21,2 L28,10 L35,0 L42,7 L50,1 L57,10 L64,0 L71,8 L78,2 L85,10 L92,0 L100,8 L100,10 L0,10 Z',
  
  // Variant D: Soft wavy tears
  d: 'M0,8 L3,2 L8,6 L12,1 L17,5 L22,2 L27,7 L33,1 L38,6 L43,2 L48,8 L53,1 L58,5 L63,2 L68,7 L74,1 L79,6 L84,2 L89,7 L95,1 L100,6 L100,8 L0,8 Z',
  
  // Variant E: Sharp dramatic rips
  e: 'M0,12 L6,0 L11,9 L16,2 L22,11 L27,0 L33,8 L40,1 L46,12 L52,0 L58,9 L65,3 L71,11 L77,0 L84,10 L90,2 L96,12 L100,4 L100,12 L0,12 Z',
}

export default function TornEdge({ 
  variant = 'a', 
  position = 'bottom', 
  color = '#F5F3EE',
  height = 8,
  className = ''
}: TornEdgeProps) {
  const path = tornPaths[variant]
  const viewBoxHeight = variant === 'c' ? 10 : variant === 'e' ? 12 : 8
  
  const transforms: Record<string, string> = {
    top: 'scaleY(-1)',
    bottom: '',
    left: 'rotate(90)',
    right: 'rotate(-90)',
  }

  return (
    <svg 
      className={`torn-edge torn-edge-${position} ${className}`}
      viewBox={`0 0 100 ${viewBoxHeight}`}
      preserveAspectRatio="none"
      style={{
        width: position === 'left' || position === 'right' ? height : '100%',
        height: position === 'left' || position === 'right' ? '100%' : height,
        display: 'block',
        transform: transforms[position],
      }}
    >
      <path d={path} fill={color} />
    </svg>
  )
}

// Torn edge wrapper component for cards
interface TornCardProps {
  children: React.ReactNode
  topEdge?: TornEdgeVariant | false
  bottomEdge?: TornEdgeVariant | false
  edgeColor?: string
  className?: string
  cardClassName?: string
}

export function TornCard({ 
  children, 
  topEdge = false, 
  bottomEdge = 'a',
  edgeColor = '#E8E4D6',
  className = '',
  cardClassName = ''
}: TornCardProps) {
  return (
    <div className={`relative ${className}`}>
      {topEdge && (
        <div className="absolute top-0 left-0 right-0 -translate-y-full">
          <TornEdge variant={topEdge} position="top" color={edgeColor} />
        </div>
      )}
      <div className={cardClassName}>
        {children}
      </div>
      {bottomEdge && (
        <div className="absolute bottom-0 left-0 right-0 translate-y-full">
          <TornEdge variant={bottomEdge} position="bottom" color={edgeColor} />
        </div>
      )}
    </div>
  )
}

// CSS-based torn edge using clip-path (alternative approach)
export function TornEdgeCSS({ 
  position = 'bottom',
  className = ''
}: { 
  position?: 'top' | 'bottom'
  className?: string 
}) {
  const clipPath = position === 'bottom'
    ? 'polygon(0% 0%, 5% 100%, 10% 20%, 15% 90%, 20% 10%, 25% 100%, 30% 30%, 35% 95%, 40% 15%, 45% 100%, 50% 25%, 55% 90%, 60% 10%, 65% 100%, 70% 20%, 75% 85%, 80% 5%, 85% 100%, 90% 15%, 95% 90%, 100% 0%)'
    : 'polygon(0% 100%, 5% 0%, 10% 80%, 15% 10%, 20% 90%, 25% 0%, 30% 70%, 35% 5%, 40% 85%, 45% 0%, 50% 75%, 55% 10%, 60% 90%, 65% 0%, 70% 80%, 75% 15%, 80% 95%, 85% 0%, 90% 85%, 95% 10%, 100% 100%)'

  return (
    <div 
      className={`h-3 w-full ${className}`}
      style={{ clipPath }}
    />
  )
}
