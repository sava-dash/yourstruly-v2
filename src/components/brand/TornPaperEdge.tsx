'use client'

import React from 'react'

/**
 * Available torn paper edge variants from brand assets
 * Variant 4 is the most horizontal (455x218) - best for horizontal edges
 */
type EdgeVariant = 1 | 2 | 3 | 4 | 5 | 6

interface TornPaperEdgeProps {
  /** Which torn edge variant to use (1-6). Default 4 (horizontal) */
  variant?: EdgeVariant
  /** Position of the torn edge */
  position?: 'top' | 'bottom'
  /** Color to fill the torn edge area */
  color?: string
  /** Height of the edge element in pixels */
  height?: number
  /** Additional classes */
  className?: string
  /** Mirror the edge horizontally for variety */
  flip?: boolean
}

// Hand-crafted torn paper edge paths - organic irregular shapes
// These create realistic torn paper effects with varied jagged edges
const TORN_PATHS: Record<EdgeVariant, { viewBox: string; path: string }> = {
  // Variant 1: Sharp dramatic tears
  1: {
    viewBox: '0 0 200 25',
    path: `M0 25 L0 12 L4 8 L8 14 L12 5 L18 11 L22 3 L28 9 L34 6 L38 12 L44 4 L50 10 
           L54 2 L60 8 L66 5 L72 13 L76 7 L82 11 L88 4 L94 9 L98 6 L104 14 
           L108 8 L114 12 L120 3 L126 10 L130 5 L136 11 L142 7 L148 13 L152 4 
           L158 9 L164 6 L170 12 L176 8 L182 14 L186 5 L192 10 L198 7 L200 11 L200 25 Z`
  },
  // Variant 2: Medium irregular tears
  2: {
    viewBox: '0 0 200 25', 
    path: `M0 25 L0 10 L5 6 L11 12 L16 4 L23 9 L28 7 L35 13 L41 5 L48 10 L53 3 
           L60 8 L67 6 L73 14 L78 9 L85 11 L92 4 L98 7 L105 12 L111 6 L118 10 
           L124 5 L130 13 L137 8 L143 11 L150 3 L156 9 L163 6 L169 12 L175 7 
           L182 14 L188 5 L195 10 L200 8 L200 25 Z`
  },
  // Variant 3: Subtle wavy tears
  3: {
    viewBox: '0 0 200 25',
    path: `M0 25 L0 11 L6 8 L13 12 L19 6 L26 10 L32 7 L39 13 L45 9 L52 11 L58 5 
           L65 8 L71 12 L78 7 L84 10 L91 6 L97 13 L104 8 L110 11 L117 5 L123 9 
           L130 12 L136 7 L143 10 L149 6 L156 13 L162 9 L169 11 L175 5 L182 8 
           L188 12 L195 7 L200 10 L200 25 Z`
  },
  // Variant 4: Wide horizontal torn edge (most versatile)
  4: {
    viewBox: '0 0 300 30',
    path: `M0 30 L0 14 L4 10 L9 16 L14 7 L20 12 L25 5 L32 11 L37 8 L44 15 L49 6 
           L56 10 L62 4 L68 12 L74 7 L81 14 L86 9 L93 11 L99 3 L105 8 L112 13 
           L118 6 L125 10 L130 5 L137 12 L143 8 L150 15 L156 7 L163 11 L169 4 
           L175 9 L182 14 L188 6 L195 10 L200 5 L207 12 L213 8 L220 14 L226 7 
           L232 11 L239 4 L245 9 L252 13 L258 6 L265 10 L271 5 L278 12 L284 8 
           L291 14 L297 10 L300 12 L300 30 Z`
  },
  // Variant 5: Aggressive rips
  5: {
    viewBox: '0 0 200 30',
    path: `M0 30 L0 15 L6 8 L10 18 L16 4 L22 14 L26 6 L34 12 L38 3 L46 10 L50 5 
           L58 15 L62 7 L70 13 L74 2 L82 9 L86 6 L94 16 L98 8 L106 12 L110 4 
           L118 14 L122 7 L130 11 L134 3 L142 10 L146 6 L154 15 L158 8 L166 13 
           L170 5 L178 12 L182 7 L190 14 L194 9 L200 11 L200 30 Z`
  },
  // Variant 6: Gentle natural tears
  6: {
    viewBox: '0 0 200 25',
    path: `M0 25 L0 13 L7 9 L14 14 L21 7 L28 11 L35 8 L42 13 L49 10 L56 15 L63 9 
           L70 12 L77 6 L84 10 L91 8 L98 14 L105 11 L112 7 L119 12 L126 9 L133 14 
           L140 8 L147 11 L154 6 L161 10 L168 13 L175 9 L182 12 L189 7 L196 11 
           L200 9 L200 25 Z`
  }
}

/**
 * TornPaperEdge - Renders torn paper effect using simplified brand-inspired SVG paths
 * 
 * Uses inline SVG for maximum reliability across browsers.
 * The paths are derived from the brand SVG assets but optimized for use as edge decorations.
 */
export default function TornPaperEdge({
  variant = 4,
  position = 'bottom',
  color = '#F5F3EE',
  height = 20,
  className = '',
  flip = false,
}: TornPaperEdgeProps) {
  const { viewBox, path } = TORN_PATHS[variant]
  
  // Build transform for position and flip
  const transforms: string[] = []
  // For top position, flip vertically so torn edge points up
  if (position === 'top') {
    transforms.push('scaleY(-1)')
  }
  if (flip) {
    transforms.push('scaleX(-1)')
  }

  return (
    <svg 
      className={`w-full block pointer-events-none ${className}`}
      viewBox={viewBox}
      preserveAspectRatio="none"
      style={{
        height,
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      }}
      aria-hidden="true"
    >
      <path d={path} fill={color} />
    </svg>
  )
}

/**
 * BrandTornEdge - Uses actual brand SVG files as CSS masks
 * This preserves the exact organic shapes from the brand assets.
 * Note: May have browser compatibility issues with complex SVG masks.
 */
export function BrandTornEdge({
  variant = 4,
  position = 'bottom',
  color = '#E8DFD0',
  height = 24,
  className = '',
  flip = false,
}: TornPaperEdgeProps) {
  const maskUrl = `/assets/brand/blackpaper${variant}.svg`
  
  const transforms: string[] = []
  if (position === 'bottom') {
    transforms.push('scaleY(-1)')
  }
  if (flip) {
    transforms.push('scaleX(-1)')
  }

  return (
    <div 
      className={`w-full overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
      style={{
        height,
        backgroundColor: color,
        maskImage: `url("${maskUrl}")`,
        WebkitMaskImage: `url("${maskUrl}")`,
        maskSize: '100% auto',
        WebkitMaskSize: '100% auto',
        maskRepeat: 'repeat-x',
        WebkitMaskRepeat: 'repeat-x',
        maskPosition: 'top center',
        WebkitMaskPosition: 'top center',
        transform: transforms.length > 0 ? transforms.join(' ') : undefined,
      }}
    />
  )
}

/**
 * TornPaperDivider - A decorative torn paper divider between sections
 */
export function TornPaperDivider({
  variant = 4,
  topColor = '#FFFEF9',
  bottomColor = '#F5F3EE',
  height = 24,
  className = '',
}: {
  variant?: EdgeVariant
  topColor?: string
  bottomColor?: string
  height?: number
  className?: string
}) {
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: topColor }}
      />
      <TornPaperEdge 
        variant={variant}
        position="bottom"
        color={bottomColor}
        height={height}
        className="absolute inset-0"
      />
    </div>
  )
}

/**
 * TornPaperCard - Card with torn paper edges using brand assets
 */
export function TornPaperCard({
  children,
  className = '',
  tornTop = false,
  tornBottom = true,
  topVariant = 4,
  bottomVariant = 4,
  paperColor = '#FFFEF9',
  edgeColor = '#E8DFD0',
  edgeHeight = 16,
}: {
  children: React.ReactNode
  className?: string
  tornTop?: boolean
  tornBottom?: boolean
  topVariant?: EdgeVariant
  bottomVariant?: EdgeVariant
  paperColor?: string
  edgeColor?: string
  edgeHeight?: number
}) {
  return (
    <div className={`relative ${className}`}>
      {tornTop && (
        <TornPaperEdge 
          variant={topVariant} 
          position="top" 
          color={edgeColor}
          height={edgeHeight}
        />
      )}
      
      <div style={{ backgroundColor: paperColor }}>
        {children}
      </div>
      
      {tornBottom && (
        <TornPaperEdge 
          variant={bottomVariant} 
          position="bottom" 
          color={edgeColor}
          height={edgeHeight}
        />
      )}
    </div>
  )
}
