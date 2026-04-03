'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  variant?: 'light' | 'warm' | 'dark'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export default function GlassCard({
  children,
  className = '',
  variant = 'warm',
  hover = false,
  padding = 'md',
  onClick,
}: GlassCardProps) {
  const variantClasses = {
    light: 'bg-white/60 backdrop-blur-xl border-white/40',
    warm: 'bg-[#F5F3EE]/70 backdrop-blur-xl border-[#C4A235]/20',
    dark: 'bg-[#2D5A3D]/80 backdrop-blur-xl border-[#2D5A3D]/40 text-white',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  }

  const baseClasses = `
    rounded-2xl border shadow-lg shadow-black/5
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${hover ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02]' : ''}
    ${className}
  `

  if (onClick || hover) {
    return (
      <motion.div
        className={baseClasses}
        onClick={onClick}
        whileHover={hover ? { y: -2 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={baseClasses}>{children}</div>
}

// Preset: Stats card with icon
interface StatsGlassCardProps {
  icon: ReactNode
  label: string
  value: string | number
  trend?: { value: number; label: string }
}

export function StatsGlassCard({ icon, label, value, trend }: StatsGlassCardProps) {
  return (
    <GlassCard variant="warm" padding="md" hover>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 flex items-center justify-center text-[#2D5A3D]">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-[#2D5A3D]/60">{label}</p>
          <p className="text-2xl font-bold text-[#2D5A3D]">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  )
}

// Preset: Photo memory card
interface PhotoGlassCardProps {
  imageUrl: string
  title: string
  date: string
  category?: string
  onClick?: () => void
}

export function PhotoGlassCard({ imageUrl, title, date, category, onClick }: PhotoGlassCardProps) {
  return (
    <GlassCard variant="light" padding="none" hover onClick={onClick}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
        <img 
          src={imageUrl} 
          alt={title}
          className="w-full h-full object-cover"
        />
        {category && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs capitalize">
              {category}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#2D5A3D] truncate">{title}</h3>
        <p className="text-sm text-[#2D5A3D]/60">{date}</p>
      </div>
    </GlassCard>
  )
}

// Preset: AI Chat bubble
interface AIChatGlassCardProps {
  message: string
  isAI?: boolean
}

export function AIChatGlassCard({ message, isAI = true }: AIChatGlassCardProps) {
  return (
    <GlassCard 
      variant={isAI ? 'warm' : 'light'} 
      padding="md"
      className={isAI ? 'ml-0 mr-12' : 'ml-12 mr-0'}
    >
      {isAI && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#2D5A3D] flex items-center justify-center">
            <span className="text-white text-xs">YT</span>
          </div>
          <span className="text-xs text-[#2D5A3D]/60">YoursTruly AI</span>
        </div>
      )}
      <p className={`text-sm ${isAI ? 'text-[#2D5A3D]' : 'text-[#2D5A3D]/80'}`}>
        {message}
      </p>
    </GlassCard>
  )
}
