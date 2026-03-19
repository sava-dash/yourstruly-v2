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
  onShuffle?: () => void
  onPhotoUpload?: () => void
  onPostscript?: () => void
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
  onShuffle,
  onPhotoUpload,
  onPostscript,
  onAddContact,
  onQuickMemory,
}: DashboardSidebarProps) {
  return (
    <aside className="home-sidebar hidden lg:flex">
      {/* Compact Profile Card */}
      <div className="glass-card glass-card-strong p-4">
        {/* Greeting + Streak inline */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#406A56]">
            Hey {profile?.full_name?.split(' ')[0] || 'there'}
          </h2>
          {currentStreakDays > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#D9C61A]/20 to-[#C35F33]/20 rounded-full">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-bold text-[#C35F33]">{currentStreakDays}</span>
            </div>
          )}
        </div>
        
        {/* Stats Row - Compact */}
        <div className="flex items-center justify-between text-center mb-3">
          <Link href="/dashboard/memories" className="flex-1 hover:opacity-70 transition-opacity">
            <div className="text-2xl font-bold text-[#406A56]">{stats.memories}</div>
            <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">Memories</div>
          </Link>
          <Link href="/dashboard/contacts" className="flex-1 hover:opacity-70 transition-opacity border-x border-[#406A56]/10">
            <div className="text-2xl font-bold text-[#406A56]">{stats.contacts}</div>
            <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">People</div>
          </Link>
          <Link href="/dashboard/gallery" className="flex-1 hover:opacity-70 transition-opacity border-r border-[#406A56]/10">
            <div className="text-2xl font-bold text-[#406A56]">{stats.photos}</div>
            <div className="text-[10px] text-[#406A56]/60 uppercase tracking-wide">Photos</div>
          </Link>
          <div className="flex-1">
            <div className={`text-2xl font-bold text-[#D9C61A] ${xpAnimating ? 'animate-pulse' : ''}`}>
              {totalXp.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#D9C61A]/60 uppercase tracking-wide flex items-center justify-center gap-1">
              <span>⚡</span> XP
            </div>
          </div>
        </div>

        {/* Storage Usage - Compact */}
        <div className="pt-3 border-t border-[#406A56]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#406A56]/70 uppercase tracking-wide">Storage</span>
            <span className="text-xs text-gray-500">
              {subscription?.storage 
                ? `${(subscription.storage.total_bytes / (1024*1024*1024)).toFixed(1)} / ${(subscription.storage.limit_bytes / (1024*1024*1024)).toFixed(0)} GB`
                : '0 / 10 GB'
              }
            </span>
          </div>
          <div className="h-2 bg-[#F2F1E5] rounded-full overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(subscription?.storage?.percentage || 0, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ 
                background: (subscription?.storage?.percentage || 0) >= 90 
                  ? 'linear-gradient(90deg, #C35F33, #dc2626)' 
                  : 'linear-gradient(90deg, #406A56, #8DACAB)'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Weekly Challenges */}
      <WeeklyChallenges />

      {/* Quick Actions */}
      {onShuffle && (
        <div className="sidebar-section">
          <QuickActions
            onShuffle={onShuffle}
            onPhotoUpload={onPhotoUpload!}
            onPostscript={onPostscript!}
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
