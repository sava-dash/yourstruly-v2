'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  BarChart3, Plus, X, Check, Clock, Users, 
  ChevronRight, AlertCircle, Lock, Trash2
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface PollOption {
  id: string
  text: string
  votes: string[] // Array of voter IDs
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  createdBy: string
  createdByName: string
  createdAt: Date
  expiresAt?: Date
  isMultipleChoice: boolean
  isAnonymous: boolean
  status: 'active' | 'closed'
  totalVoters: number
}

interface CirclePollingProps {
  circleId: string
  currentUserId: string
  memberCount: number
  polls: Poll[]
  onCreatePoll: (poll: Omit<Poll, 'id' | 'createdAt' | 'totalVoters' | 'status'>) => void
  onVote: (pollId: string, optionId: string) => void
  onClosePoll: (pollId: string) => void
  onDeletePoll: (pollId: string) => void
}

// ============================================
// CREATE POLL MODAL
// ============================================
function CreatePollModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void
  onCreate: (data: { 
    question: string
    options: { id: string; text: string; votes: string[] }[]
    isMultipleChoice: boolean
    isAnonymous: boolean
    expiresAt?: Date
  }) => void
}) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isMultipleChoice, setIsMultipleChoice] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiryDays, setExpiryDays] = useState(7)

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    setOptions(options.map((opt, i) => i === index ? value : opt))
  }

  const handleSubmit = () => {
    const validOptions = options.filter(o => o.trim())
    if (!question.trim() || validOptions.length < 2) return
    
    onCreate({
      question: question.trim(),
      options: validOptions.map((text, i) => ({ 
        id: `new-${i}`, 
        text: text.trim(), 
        votes: [] 
      })),
      isMultipleChoice,
      isAnonymous,
      expiresAt: hasExpiry ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined
    })
  }

  const validOptionsCount = options.filter(o => o.trim()).length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1A1F1C]">Create Poll</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg">
            <X size={20} className="text-[#5A6660]" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm text-[#5A6660] mb-1.5">Question *</label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className="form-input"
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#5A6660]">Options *</label>
              <span className="text-xs text-[#94A09A]">{validOptionsCount}/10</span>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center text-xs font-medium text-[#2D5A3D]">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={e => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="form-input flex-1"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-2 text-sm text-[#2D5A3D] hover:text-[#234A31] flex items-center gap-1"
              >
                <Plus size={14} />
                Add Option
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-4 border-t border-[#2D5A3D]/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isMultipleChoice}
                onChange={e => setIsMultipleChoice(e.target.checked)}
                className="w-4 h-4 rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <span className="text-sm text-[#1A1F1C]">Allow multiple selections</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#5A6660]" />
                <span className="text-sm text-[#1A1F1C]">Anonymous voting</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={e => setHasExpiry(e.target.checked)}
                className="w-4 h-4 rounded border-[#2D5A3D]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <span className="text-sm text-[#1A1F1C]">Set expiration</span>
            </label>

            {hasExpiry && (
              <div className="ml-7 flex items-center gap-2">
                <span className="text-sm text-[#5A6660]">Expires in</span>
                <select
                  value={expiryDays}
                  onChange={e => setExpiryDays(Number(e.target.value))}
                  className="form-select w-32"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!question.trim() || validOptionsCount < 2}
            className="btn-primary flex-1"
          >
            <BarChart3 size={16} />
            Create Poll
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// POLL CARD
// ============================================
function PollCard({ 
  poll, 
  currentUserId,
  onVote,
  onClose,
  onDelete
}: { 
  poll: Poll
  currentUserId: string
  onVote: (optionId: string) => void
  onClose: () => void
  onDelete: () => void
}) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0)
  const hasVoted = poll.options.some(opt => opt.votes.includes(currentUserId))
  const isCreator = poll.createdBy === currentUserId
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date()
  const isClosed = poll.status === 'closed' || isExpired

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0
    return Math.round((votes / totalVotes) * 100)
  }

  const getMyVotes = () => {
    return poll.options
      .filter(opt => opt.votes.includes(currentUserId))
      .map(opt => opt.id)
  }

  const handleVote = (optionId: string) => {
    if (isClosed) return
    onVote(optionId)
  }

  return (
    <div className="content-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[#1A1F1C]">{poll.question}</h3>
            {poll.isAnonymous && (
              <span title="Anonymous poll">
                <Lock size={14} className="text-[#5A6660]" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[#5A6660]">
            <span>by {poll.createdByName}</span>
            <span>·</span>
            <span>{format(poll.createdAt, 'MMM d')}</span>
            {poll.expiresAt && !isClosed && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-[#B8562E]">
                  <Clock size={12} />
                  Ends {format(poll.expiresAt, 'MMM d')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2">
          {isClosed ? (
            <span className="status-badge status-badge-red">Closed</span>
          ) : (
            <span className="status-badge status-badge-green">Active</span>
          )}
          
          {isCreator && !isClosed && (
            <div className="flex gap-1">
              <button
                onClick={onClose}
                className="p-1.5 text-[#5A6660] hover:bg-[#2D5A3D]/10 rounded-lg"
                title="Close poll"
              >
                <Lock size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                title="Delete poll"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map(option => {
          const percentage = getPercentage(option.votes.length)
          const isMyVote = option.votes.includes(currentUserId)
          
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isClosed || (hasVoted && !poll.isMultipleChoice)}
              className={`w-full relative overflow-hidden rounded-xl border transition-all ${
                isMyVote
                  ? 'border-[#2D5A3D] bg-[#2D5A3D]/5'
                  : 'border-[#2D5A3D]/10 bg-white hover:border-[#2D5A3D]/30'
              } ${isClosed || (hasVoted && !poll.isMultipleChoice) ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {/* Progress bar background */}
              <div 
                className={`absolute inset-y-0 left-0 transition-all ${
                  isMyVote ? 'bg-[#2D5A3D]/10' : 'bg-[#2D5A3D]/5'
                }`}
                style={{ width: `${percentage}%` }}
              />
              
              {/* Content */}
              <div className="relative flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {isMyVote ? (
                    <div className="w-5 h-5 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#2D5A3D]/30" />
                  )}
                  <span className={`text-sm ${isMyVote ? 'font-medium text-[#2D5A3D]' : 'text-[#1A1F1C]'}`}>
                    {option.text}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#5A6660]">
                    {percentage}%
                  </span>
                  <span className="text-xs text-[#94A09A]">
                    ({option.votes.length})
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[#2D5A3D]/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#5A6660]">
          <Users size={12} />
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {poll.isMultipleChoice && (
            <span className="text-[#2D5A3D]">· Multiple choice</span>
          )}
        </div>
        
        {!hasVoted && !isClosed && (
          <span className="text-xs text-[#B8562E] flex items-center gap-1">
            <AlertCircle size={12} />
            You haven't voted
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CirclePolling({
  circleId,
  currentUserId,
  memberCount,
  polls,
  onCreatePoll,
  onVote,
  onClosePoll,
  onDeletePoll
}: CirclePollingProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')

  const filteredPolls = polls.filter(p => {
    if (filter === 'all') return true
    const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date()
    const isClosed = p.status === 'closed' || isExpired
    if (filter === 'active') return !isClosed
    return isClosed
  })

  const handleCreate = (data: any) => {
    onCreatePoll({
      ...data,
      createdBy: currentUserId,
      createdByName: 'You'
    })
    setShowCreateModal(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="section-header mb-4">
        <div className="section-title">
          <div className="section-title-icon bg-[#2D5A3D]/10">
            <BarChart3 size={18} className="text-[#2D5A3D]" />
          </div>
          <span>Polls</span>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={16} />
          Create Poll
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
        >
          All ({polls.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`filter-btn ${filter === 'active' ? 'filter-btn-active' : ''}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`filter-btn ${filter === 'closed' ? 'filter-btn-active' : ''}`}
        >
          Closed
        </button>
      </div>

      {/* Polls List */}
      {filteredPolls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <BarChart3 size={32} className="text-[#2D5A3D]" />
          </div>
          <h3 className="empty-state-title">No Polls Yet</h3>
          <p className="empty-state-text">
            Create a poll to get everyone's opinion on decisions.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-4">
            <Plus size={16} />
            Create First Poll
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              currentUserId={currentUserId}
              onVote={(optionId) => onVote(poll.id, optionId)}
              onClose={() => onClosePoll(poll.id)}
              onDelete={() => onDeletePoll(poll.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePollModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
