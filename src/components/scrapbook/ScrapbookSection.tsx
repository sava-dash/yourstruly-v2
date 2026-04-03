'use client'

import { cn } from '@/lib/utils'

interface ScrapbookSectionProps {
  children: React.ReactNode
  color?: 'cream' | 'purple' | 'terracotta' | 'green'
  className?: string
  withTornEdge?: boolean
}

const colorStyles = {
  cream: 'bg-[#F5F3EE] text-gray-800',
  purple: 'bg-[#4A3552] text-white',
  terracotta: 'bg-[#B8562E] text-white',
  green: 'bg-[#2D5A3D] text-white',
}

export function ScrapbookSection({ 
  children, 
  color = 'cream',
  className,
  withTornEdge = false
}: ScrapbookSectionProps) {
  return (
    <section 
      className={cn(
        'relative py-12 px-6',
        colorStyles[color],
        withTornEdge && 'torn-paper',
        className
      )}
    >
      {children}
    </section>
  )
}

// Accent bar like the yellow "ARCHIVE YOUR MEDIA" bar
interface AccentBarProps {
  children: React.ReactNode
  color?: 'yellow' | 'blue' | 'green' | 'terracotta'
  className?: string
}

const accentColors = {
  yellow: 'bg-[#C4A235] text-black',
  blue: 'bg-[#8DACAB] text-black',
  green: 'bg-[#2D5A3D] text-white',
  terracotta: 'bg-[#B8562E] text-white',
}

export function AccentBar({ children, color = 'yellow', className }: AccentBarProps) {
  return (
    <div className={cn(
      'py-2 px-4 text-xs font-semibold uppercase tracking-widest flex items-center gap-2',
      accentColors[color],
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {children}
    </div>
  )
}

// Step number circle
interface StepNumberProps {
  number: number
  className?: string
}

export function StepNumber({ number, className }: StepNumberProps) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center w-7 h-7 bg-[#C4A235] text-black font-bold text-sm rounded-full',
      className
    )}>
      {number}
    </span>
  )
}

// Scrapbook card with optional tape
interface ScrapbookCardProps {
  children: React.ReactNode
  withTape?: boolean
  tapeColor?: 'brown' | 'blue'
  className?: string
}

export function ScrapbookCard({ 
  children, 
  withTape = false,
  tapeColor = 'brown',
  className 
}: ScrapbookCardProps) {
  return (
    <div className={cn(
      'bg-[#F5F3EE] rounded-sm p-5 shadow-md relative',
      withTape && 'card-taped',
      className
    )}>
      {children}
    </div>
  )
}

// Sticky note component
interface StickyNoteProps {
  children: React.ReactNode
  color?: 'yellow' | 'pink' | 'blue' | 'green'
  rotation?: number
  className?: string
}

const stickyColors = {
  yellow: 'bg-[#fff8b8]',
  pink: 'bg-[#ffd4e0]',
  blue: 'bg-[#d4e8ff]',
  green: 'bg-[#d4ffd8]',
}

export function StickyNote({ 
  children, 
  color = 'yellow',
  rotation = -1,
  className 
}: StickyNoteProps) {
  return (
    <div 
      className={cn(
        'p-4 shadow-md relative',
        stickyColors[color],
        className
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-black/5 to-transparent" />
      {children}
    </div>
  )
}
