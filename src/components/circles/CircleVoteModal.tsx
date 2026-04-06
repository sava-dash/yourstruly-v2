'use client'

import { X, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle, ArrowUp, ArrowDown, UserMinus, Shield } from 'lucide-react'

export type VoteType = 'promote' | 'demote' | 'remove' | 'setting_change'
export type VoteStatus = 'active' | 'passed' | 'failed' | 'expired'

interface Vote {
  id: string
  vote_type: VoteType
  target_member_name?: string
  target_member_id?: string
  description?: string
  status: VoteStatus
  yes_votes: number
  no_votes: number
  required_votes: number
  created_by_name: string
  created_at: string
  expires_at: string
  has_voted?: boolean
  my_vote?: 'yes' | 'no' | null
}

interface CircleVoteModalProps {
  vote: Vote
  isAdmin: boolean
  onClose: () => void
  onVote: (voteId: string, decision: 'yes' | 'no') => void
}

export default function CircleVoteModal({
  vote,
  isAdmin,
  onClose,
  onVote
}: CircleVoteModalProps) {

  const getVoteTypeInfo = (type: VoteType) => {
    switch (type) {
      case 'promote':
        return {
          icon: ArrowUp,
          color: 'text-[#2D5A3D]',
          bgColor: 'bg-[#2D5A3D]/10',
          label: 'Promote to Admin'
        }
      case 'demote':
        return {
          icon: ArrowDown,
          color: 'text-[#B8562E]',
          bgColor: 'bg-[#B8562E]/10',
          label: 'Demote to Member'
        }
      case 'remove':
        return {
          icon: UserMinus,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Remove from Circle'
        }
      case 'setting_change':
        return {
          icon: Shield,
          color: 'text-[#2D5A3D]',
          bgColor: 'bg-[#2D5A3D]/10',
          label: 'Change Settings'
        }
    }
  }

  const getStatusBadge = (status: VoteStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-[#C4A235]/20 text-[#8a7c08]">
            <Clock size={14} />
            Voting Open
          </span>
        )
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle size={14} />
            Passed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <XCircle size={14} />
            Failed
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            <Clock size={14} />
            Expired
          </span>
        )
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const typeInfo = getVoteTypeInfo(vote.vote_type)
  const Icon = typeInfo.icon
  const totalVotes = vote.yes_votes + vote.no_votes
  const yesPercent = totalVotes > 0 ? (vote.yes_votes / totalVotes) * 100 : 0
  const progressToPass = (vote.yes_votes / vote.required_votes) * 100
  const canVote = isAdmin && vote.status === 'active' && !vote.has_voted

  return (
    <div className="modal-overlay-page" onClick={onClose}>
      <div className="modal-content-page max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${typeInfo.bgColor} flex items-center justify-center`}>
              <Icon size={24} className={typeInfo.color} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1A1F1C]">{typeInfo.label}</h2>
              {vote.target_member_name && (
                <p className="text-sm text-[#5A6660]">Target: {vote.target_member_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mb-6">
          {getStatusBadge(vote.status)}
          <span className="text-sm text-[#5A6660]">
            Started by {vote.created_by_name}
          </span>
        </div>

        {/* Description */}
        {vote.description && (
          <div className="p-4 bg-[#2D5A3D]/5 rounded-xl mb-6">
            <p className="text-sm text-[#1A1F1C]">{vote.description}</p>
          </div>
        )}

        {/* Vote Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1A1F1C]">Vote Progress</span>
            <span className="text-sm text-[#5A6660]">
              {vote.yes_votes} of {vote.required_votes} needed to pass
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-[#2D5A3D] to-[#8DACAB] transition-all duration-300"
              style={{ width: `${Math.min(progressToPass, 100)}%` }}
            />
          </div>

          {/* Vote counts */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ThumbsUp size={14} className="text-green-600" />
              <span className="text-[#1A1F1C]">{vote.yes_votes} Yes</span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown size={14} className="text-red-500" />
              <span className="text-[#1A1F1C]">{vote.no_votes} No</span>
            </div>
          </div>
        </div>

        {/* Your Vote Status */}
        {vote.has_voted && vote.my_vote && (
          <div className="p-4 bg-[#C4A235]/10 rounded-xl mb-6">
            <p className="text-sm text-[#1A1F1C]">
              You voted: <strong>{vote.my_vote === 'yes' ? '👍 Yes' : '👎 No'}</strong>
            </p>
          </div>
        )}

        {/* Expiration */}
        {vote.status === 'active' && (
          <p className="text-sm text-[#94A09A] mb-6">
            Voting ends: {formatDate(vote.expires_at)}
          </p>
        )}

        {/* Voting Buttons */}
        {canVote && (
          <div className="flex gap-3">
            <button
              onClick={() => onVote(vote.id, 'yes')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 font-medium rounded-xl hover:bg-green-200 transition-colors"
            >
              <ThumbsUp size={18} />
              Vote Yes
            </button>
            <button
              onClick={() => onVote(vote.id, 'no')}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 text-red-600 font-medium rounded-xl hover:bg-red-200 transition-colors"
            >
              <ThumbsDown size={18} />
              Vote No
            </button>
          </div>
        )}

        {!isAdmin && vote.status === 'active' && (
          <div className="p-4 bg-gray-100 rounded-xl text-center">
            <p className="text-sm text-[#5A6660]">Only admins can vote on circle decisions</p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-[#2D5A3D]/10">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
