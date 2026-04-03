'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import OnThisDay from '@/components/dashboard/OnThisDay'
import { QuickActions } from './QuickActions'

const WeeklyChallenges = dynamic(() => import('@/components/dashboard/WeeklyChallenges'), { ssr: false })
import type { DashboardStats } from '../hooks/useDashboardData'
import type { CompletedTile } from '../hooks/useXpState'

interface DashboardSidebarProps {
  profile: any
  stats: DashboardStats
  totalXp: number
  xpAnimating: boolean
  completedTiles: CompletedTile[]
  currentStreakDays: number
  subscription: any
  onPhotoUpload?: () => void
  onAddContact?: () => void
  onQuickMemory?: () => void
}

export function DashboardSidebar({
  profile,
  stats,
  totalXp,
  xpAnimating,
  completedTiles,
  currentStreakDays,
  subscription,
  onPhotoUpload,
  onAddContact,
  onQuickMemory,
}: DashboardSidebarProps) {
  return (
    <aside className="home-sidebar hidden lg:flex">
      {/* Compact Profile Card */}
      <div className="glass-card glass-card-strong p-4">
        {/* Greeting + Streak inline */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#2D5A3D]">
            Hey {profile?.full_name?.split(' ')[0] || 'there'}
          </h2>
          {currentStreakDays > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#C4A235]/20 to-[#B8562E]/20 rounded-full">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold text-[#B8562E]">{currentStreakDays}</span>
            </div>
          )}
        </div>
        
        {/* Stats Row - Compact */}
        <div className="flex items-center justify-between text-center mb-3">
          <Link href="/dashboard/memories" className="flex-1 hover:opacity-70 transition-opacity">
            <div className="text-2xl font-bold text-[#2D5A3D]">{stats.memories}</div>
            <div className="text-[10px] text-[#2D5A3D]/60 uppercase tracking-wide">Memories</div>
          </Link>
          <Link href="/dashboard/contacts" className="flex-1 hover:opacity-70 transition-opacity border-x border-[#2D5A3D]/10">
            <div className="text-2xl font-bold text-[#2D5A3D]">{stats.contacts}</div>
            <div className="text-[10px] text-[#2D5A3D]/60 uppercase tracking-wide">People</div>
          </Link>
          <Link href="/dashboard/gallery" className="flex-1 hover:opacity-70 transition-opacity border-r border-[#2D5A3D]/10">
            <div className="text-2xl font-bold text-[#2D5A3D]">{stats.photos}</div>
            <div className="text-[10px] text-[#2D5A3D]/60 uppercase tracking-wide">Photos</div>
          </Link>
          <div className="flex-1">
            <div className={`text-2xl font-bold text-[#C4A235] ${xpAnimating ? 'animate-pulse' : ''}`}>
              {totalXp.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#C4A235]/60 uppercase tracking-wide flex items-center justify-center gap-1">
              <span>⚡</span> XP
            </div>
          </div>
        </div>

        {/* Storage Usage - Compact */}
        <div className="pt-3 border-t border-[#2D5A3D]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#2D5A3D]/70 uppercase tracking-wide">Storage</span>
            <span className="text-xs text-gray-500">
              {subscription?.storage 
                ? `${(subscription.storage.total_bytes / (1024*1024*1024)).toFixed(1)} / ${(subscription.storage.limit_bytes / (1024*1024*1024)).toFixed(0)} GB`
                : '0 / 10 GB'
              }
            </span>
          </div>
          <div className="h-2 bg-[#F5F3EE] rounded-full overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(subscription?.storage?.percentage || 0, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ 
                background: (subscription?.storage?.percentage || 0) >= 90 
                  ? 'linear-gradient(90deg, #B8562E, #dc2626)' 
                  : 'linear-gradient(90deg, #2D5A3D, #8DACAB)'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Weekly Challenges */}
      <WeeklyChallenges />

      {/* Quick Actions */}
      {onPhotoUpload && (
        <div className="sidebar-section">
          <QuickActions
            onPhotoUpload={onPhotoUpload}
            onAddContact={onAddContact!}
            onQuickMemory={onQuickMemory!}
          />
        </div>
      )}
      
      {/* On This Day */}
      <div className="sidebar-section">
        <OnThisDay />
      </div>
    </aside>
  )
}
