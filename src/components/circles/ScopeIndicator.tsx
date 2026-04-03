'use client'

import { Lock, Users } from 'lucide-react'

export interface ScopeIndicatorProps {
  isPrivate?: boolean
  circleIds?: string[]
  circleNames?: string[] // Pass actual circle names
  size?: 'sm' | 'md' | 'lg'
  variant?: 'badge' | 'inline' | 'minimal'
  className?: string
}

export function ScopeIndicator({
  isPrivate = true,
  circleIds = [],
  circleNames = [],
  size = 'sm',
  variant = 'badge',
  className = ''
}: ScopeIndicatorProps) {
  // Use provided names, or show count if we only have IDs
  const displayNames = circleNames.length > 0 
    ? circleNames 
    : circleIds.map(() => 'Circle')
  
  const hasCircles = (circleNames.length > 0 || circleIds.length > 0) && !isPrivate

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 10,
    },
    md: {
      container: 'px-2.5 py-1 text-sm gap-1.5',
      icon: 12,
    },
    lg: {
      container: 'px-3 py-1.5 text-sm gap-2',
      icon: 14,
    },
  }

  const { container, icon } = sizeClasses[size]

  // Format circle names for display
  const getDisplayText = () => {
    if (!hasCircles) return 'Private'
    if (displayNames.length === 1) return displayNames[0]
    if (displayNames.length === 2) return displayNames.join(' & ')
    return `${displayNames[0]} +${displayNames.length - 1}`
  }

  if (variant === 'minimal') {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-gray-400 ${className}`}
        title={hasCircles ? displayNames.join(', ') : 'Private'}
      >
        {hasCircles ? (
          <Users size={icon} />
        ) : (
          <Lock size={icon} />
        )}
      </span>
    )
  }

  if (variant === 'inline') {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-gray-500 text-xs ${className}`}
        title={hasCircles ? displayNames.join(', ') : 'Private'}
      >
        {hasCircles ? (
          <>
            <Users size={icon} className="text-[#2D5A3D]" />
            <span>{getDisplayText()}</span>
          </>
        ) : (
          <>
            <Lock size={icon} />
            <span>Private</span>
          </>
        )}
      </span>
    )
  }

  // Default badge variant
  return (
    <span 
      className={`inline-flex items-center rounded-full ${container} ${
        hasCircles
          ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
          : 'bg-gray-100 text-gray-500'
      } ${className}`}
      title={hasCircles ? displayNames.join(', ') : 'Private'}
    >
      {hasCircles ? (
        <>
          <Users size={icon} />
          <span className="truncate max-w-[100px]">{getDisplayText()}</span>
        </>
      ) : (
        <>
          <Lock size={icon} />
          <span>Private</span>
        </>
      )}
    </span>
  )
}

export default ScopeIndicator
