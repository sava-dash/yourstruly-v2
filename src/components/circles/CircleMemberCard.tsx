'use client'

import { useState } from 'react'
import { MoreVertical, UserMinus, ArrowUp, ArrowDown, Shield, Crown, User } from 'lucide-react'

export type CircleRole = 'owner' | 'admin' | 'member'

interface CircleMember {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url?: string
  role: CircleRole
  joined_at: string
}

interface CircleMemberCardProps {
  member: CircleMember
  currentUserRole: CircleRole
  currentUserId: string
  onRemove: (memberId: string) => void
  onInitiateVote: (memberId: string, voteType: 'promote' | 'demote') => void
}

export default function CircleMemberCard({
  member,
  currentUserRole,
  currentUserId,
  onRemove,
  onInitiateVote
}: CircleMemberCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const isCurrentUser = member.user_id === currentUserId
  const canManage = (currentUserRole === 'owner' || currentUserRole === 'admin') && !isCurrentUser

  const getRoleBadge = (role: CircleRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#C4A235]/20 text-[#8a7c08]">
            <Crown size={12} />
            Owner
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#2D5A3D]/15 text-[#2D5A3D]">
            <Shield size={12} />
            Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#8DACAB]/20 text-[#5d8585]">
            <User size={12} />
            Member
          </span>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-[#2D5A3D]/10 rounded-xl hover:bg-[#2D5A3D]/[0.02] transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#8DACAB] flex items-center justify-center text-white font-semibold text-lg">
            {member.full_name.charAt(0)}
          </div>
        )}

        {/* Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#1A1F1C]">
              {member.full_name}
              {isCurrentUser && <span className="text-[#5A6660] font-normal ml-1">(you)</span>}
            </span>
            {getRoleBadge(member.role)}
          </div>
          <p className="text-sm text-[#5A6660]">{member.email}</p>
          <p className="text-xs text-[#94A09A] mt-0.5">Joined {formatDate(member.joined_at)}</p>
        </div>
      </div>

      {/* Actions Menu */}
      {canManage && member.role !== 'owner' && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-[#2D5A3D]/10 py-1 z-20">
                {member.role === 'member' && (
                  <button
                    onClick={() => {
                      onInitiateVote(member.id, 'promote')
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-colors"
                  >
                    <ArrowUp size={16} />
                    Initiate Promote Vote
                  </button>
                )}
                {member.role === 'admin' && currentUserRole === 'owner' && (
                  <button
                    onClick={() => {
                      onInitiateVote(member.id, 'demote')
                      setShowMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#B8562E] hover:bg-[#B8562E]/5 transition-colors"
                  >
                    <ArrowDown size={16} />
                    Initiate Demote Vote
                  </button>
                )}
                <button
                  onClick={() => {
                    onRemove(member.id)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <UserMinus size={16} />
                  Remove from Circle
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
