'use client'

import React, { useEffect, useId } from 'react'

interface TornPaperProps {
  children: React.ReactNode
  className?: string
  // Paper appearance
  paperColor?: string
  showTexture?: boolean
  // Torn edge settings
  tornTop?: boolean
  tornBottom?: boolean
  tornLeft?: boolean
  tornRight?: boolean
  // Effect intensity
  tornIntensity?: number // 1-20, default 10
  textureIntensity?: number // 1-10, default 3
  seed?: number
}

/**
 * TornPaper - Creates a realistic torn paper effect using SVG filters
 * Uses feTurbulence + feDisplacementMap for organic torn edges
 */
export default function TornPaper({
  children,
  className = '',
  paperColor = '#FFFEF9',
  showTexture = true,
  tornTop = false,
  tornBottom = true,
  tornLeft = false,
  tornRight = false,
  tornIntensity = 10,
  textureIntensity = 3,
  seed,
}: TornPaperProps) {
  const filterId = useId().replace(/:/g, '')
  const actualSeed = seed ?? Math.floor(Math.random() * 10000)

  // Generate mask path based on which edges are torn
  const getMaskPath = () => {
    // Standard rectangle with torn edges replaced by turbulence-displaced paths
    // We use clip-path for basic shape, filter does the rest
    return 'inset(0)'
  }

  return (
    <>
      {/* Hidden SVG with filter definitions */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={`torn-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            {/* Paper texture noise */}
            {showTexture && (
              <>
                <feTurbulence 
                  type="fractalNoise" 
                  baseFrequency="0.04" 
                  numOctaves="5" 
                  seed={actualSeed}
                  result="paperNoise"
                />
                <feDiffuseLighting 
                  in="paperNoise" 
                  lightingColor={paperColor}
                  surfaceScale={textureIntensity}
                  result="paperTexture"
                >
                  <feDistantLight azimuth="45" elevation="60" />
                </feDiffuseLighting>
              </>
            )}
            
            {/* Torn edge displacement */}
            <feTurbulence 
              type="turbulence" 
              baseFrequency="0.02" 
              numOctaves="3" 
              seed={actualSeed + 1}
              result="edgeNoise"
            />
            
            {/* Apply displacement to edges */}
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="edgeNoise" 
              scale={tornIntensity}
              xChannelSelector="R" 
              yChannelSelector="G"
              result="displaced"
            />
            
            {/* Combine paper texture with content */}
            {showTexture ? (
              <>
                <feComposite in="paperTexture" in2="displaced" operator="in" result="texturedPaper" />
                <feBlend mode="multiply" in="texturedPaper" in2="displaced" />
              </>
            ) : (
              <feComposite in="SourceGraphic" in2="displaced" operator="in" />
            )}
          </filter>
          
          {/* Edge-only torn filter (for decorative edges) */}
          <filter id={`torn-edge-${filterId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence 
              type="turbulence" 
              baseFrequency="0.05" 
              numOctaves="4" 
              seed={actualSeed}
              result="noise"
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale={tornIntensity * 0.8}
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div 
        className={`relative ${className}`}
        style={{
          filter: `url(#torn-${filterId})`,
          backgroundColor: paperColor,
        }}
      >
        {children}
      </div>
    </>
  )
}

/**
 * TornEdgeDecoration - Just the torn edge visual (no container)
 * Use as a decorative divider between sections
 */
export function TornEdgeDecoration({
  color = '#F5F3EE',
  height = 20,
  position = 'bottom',
  intensity = 8,
  seed,
  className = '',
}: {
  color?: string
  height?: number
  position?: 'top' | 'bottom'
  intensity?: number
  seed?: number
  className?: string
}) {
  const filterId = useId().replace(/:/g, '')
  const actualSeed = seed ?? Math.floor(Math.random() * 10000)

  return (
    <>
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={`torn-deco-${filterId}`} x="-20%" y="-50%" width="140%" height="200%">
            <feTurbulence 
              type="turbulence" 
              baseFrequency="0.03 0.01" 
              numOctaves="5" 
              seed={actualSeed}
              result="noise"
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale={intensity}
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      
      <div 
        className={`w-full ${className}`}
        style={{
          height,
          backgroundColor: color,
          filter: `url(#torn-deco-${filterId})`,
          transform: position === 'top' ? 'scaleY(-1)' : undefined,
        }}
      />
    </>
  )
}

/**
 * TornPaperCard - Pre-styled card with torn paper effect
 */
export function TornPaperCard({
  children,
  className = '',
  tornEdges = ['bottom'],
  showTexture = true,
}: {
  children: React.ReactNode
  className?: string
  tornEdges?: ('top' | 'bottom' | 'left' | 'right')[]
  showTexture?: boolean
}) {
  return (
    <TornPaper
      tornTop={tornEdges.includes('top')}
      tornBottom={tornEdges.includes('bottom')}
      tornLeft={tornEdges.includes('left')}
      tornRight={tornEdges.includes('right')}
      showTexture={showTexture}
      className={`bg-[#FFFEF9] rounded-lg shadow-md ${className}`}
    >
      {children}
    </TornPaper>
  )
}
