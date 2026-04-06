'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'
import { 
  Image as ImageIcon, BookOpen, FileText, Clock, User, Heart, 
  MessageCircle, Share2, MoreVertical, Filter, Grid, List,
  ChevronDown, Eye
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface SharedContent {
  id: string
  type: 'memory' | 'wisdom'
  title: string
  description?: string
  previewImage?: string
  sharedById: string
  sharedByName: string
  sharedByAvatar?: string
  sharedAt: Date
  originalCreatedAt?: Date
  likes: number
  comments: number
  hasLiked?: boolean
  tags?: string[]
}

interface CircleContentFeedProps {
  content: SharedContent[]
  currentUserId: string
  onViewContent: (contentId: string) => void
  onLikeContent: (contentId: string) => void
  onCommentContent: (contentId: string) => void
}

// ============================================
// CONTENT CARD
// ============================================
function ContentCard({ 
  content, 
  currentUserId,
  viewMode,
  onView,
  onLike,
  onComment
}: { 
  content: SharedContent
  currentUserId: string
  viewMode: 'grid' | 'list'
  onView: () => void
  onLike: () => void
  onComment: () => void
}) {
  const isMe = content.sharedById === currentUserId

  const formatSharedTime = (date: Date) => {
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true })
    }
    if (isYesterday(date)) {
      return 'Yesterday'
    }
    if (isThisWeek(date)) {
      return format(date, 'EEEE')
    }
    return format(date, 'MMM d, yyyy')
  }

  const initials = content.sharedByName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (viewMode === 'grid') {
    return (
      <div 
        onClick={onView}
        className="content-card content-card-interactive group cursor-pointer"
      >
        {/* Preview Image */}
        {content.previewImage ? (
          <div className="relative h-40 -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl">
            <img 
              src={content.previewImage} 
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                content.type === 'memory'
                  ? 'bg-[#B8562E]/80 text-white'
                  : 'bg-[#2D5A3D]/80 text-white'
              }`}>
                {content.type === 'memory' ? 'Memory' : 'Wisdom'}
              </span>
            </div>
          </div>
        ) : (
          <div className={`relative h-32 -mx-5 -mt-5 mb-4 flex items-center justify-center rounded-t-2xl ${
            content.type === 'memory'
              ? 'bg-gradient-to-br from-[#B8562E]/20 to-[#C4A235]/20'
              : 'bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/20'
          }`}>
            {content.type === 'memory' ? (
              <ImageIcon size={32} className="text-[#B8562E]/50" />
            ) : (
              <BookOpen size={32} className="text-[#2D5A3D]/50" />
            )}
            <div className="absolute bottom-3 left-4">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                content.type === 'memory'
                  ? 'bg-[#B8562E]/80 text-white'
                  : 'bg-[#2D5A3D]/80 text-white'
              }`}>
                {content.type === 'memory' ? 'Memory' : 'Wisdom'}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <h3 className="font-semibold text-[#1A1F1C] mb-1 line-clamp-1">{content.title}</h3>
        {content.description && (
          <p className="text-sm text-[#5A6660] line-clamp-2 mb-3">{content.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2D5A3D]/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#8DACAB]/30 flex items-center justify-center text-[8px] font-semibold text-[#2D5A3D]">
              {initials}
            </div>
            <span className="text-xs text-[#5A6660]">{isMe ? 'You' : content.sharedByName.split(' ')[0]}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#94A09A]">
            <span className="flex items-center gap-1">
              <Heart size={12} className={content.hasLiked ? 'fill-red-400 text-red-400' : ''} />
              {content.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={12} />
              {content.comments}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="content-card content-card-interactive">
      <div className="flex gap-4">
        {/* Preview */}
        {content.previewImage ? (
          <div 
            onClick={onView}
            className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
          >
            <img 
              src={content.previewImage} 
              alt={content.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </div>
        ) : (
          <div 
            onClick={onView}
            className={`w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer ${
              content.type === 'memory'
                ? 'bg-[#B8562E]/10'
                : 'bg-[#2D5A3D]/10'
            }`}
          >
            {content.type === 'memory' ? (
              <ImageIcon size={24} className="text-[#B8562E]" />
            ) : (
              <BookOpen size={24} className="text-[#2D5A3D]" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 
                onClick={onView}
                className="font-semibold text-[#1A1F1C] hover:text-[#2D5A3D] cursor-pointer line-clamp-1"
              >
                {content.title}
              </h3>
              <span className={`text-xs font-medium ${
                content.type === 'memory' ? 'text-[#B8562E]' : 'text-[#2D5A3D]'
              }`}>
                {content.type === 'memory' ? 'Memory' : 'Wisdom'}
              </span>
            </div>
            <button className="p-1.5 hover:bg-[#2D5A3D]/10 rounded-lg flex-shrink-0">
              <MoreVertical size={16} className="text-[#5A6660]" />
            </button>
          </div>

          {content.description && (
            <p className="text-sm text-[#5A6660] line-clamp-1 mb-2">{content.description}</p>
          )}

          {/* Meta & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#5A6660]">
              <span className="flex items-center gap-1">
                <User size={12} />
                {isMe ? 'You' : content.sharedByName}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatSharedTime(content.sharedAt)}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onLike(); }}
                className={`p-2 rounded-lg transition-colors ${
                  content.hasLiked 
                    ? 'text-red-400 bg-red-50' 
                    : 'text-[#5A6660] hover:bg-[#2D5A3D]/10'
                }`}
              >
                <Heart size={14} className={content.hasLiked ? 'fill-current' : ''} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onComment(); }}
                className="p-2 text-[#5A6660] hover:bg-[#2D5A3D]/10 rounded-lg"
              >
                <MessageCircle size={14} />
              </button>
              <button 
                onClick={onView}
                className="p-2 text-[#5A6660] hover:bg-[#2D5A3D]/10 rounded-lg"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CircleContentFeed({
  content,
  currentUserId,
  onViewContent,
  onLikeContent,
  onCommentContent
}: CircleContentFeedProps) {
  const [filter, setFilter] = useState<'all' | 'memory' | 'wisdom'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showFilters, setShowFilters] = useState(false)

  // Filter and sort content
  let filteredContent = content.filter(c => {
    if (filter === 'all') return true
    return c.type === filter
  })

  if (sortBy === 'popular') {
    filteredContent = [...filteredContent].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
  } else {
    filteredContent = [...filteredContent].sort((a, b) => b.sharedAt.getTime() - a.sharedAt.getTime())
  }

  // Stats
  const memoryCount = content.filter(c => c.type === 'memory').length
  const wisdomCount = content.filter(c => c.type === 'wisdom').length

  return (
    <div>
      {/* Header */}
      <div className="section-header mb-4">
        <div className="section-title">
          <div className="section-title-icon bg-[#2D5A3D]/10">
            <FileText size={18} className="text-[#2D5A3D]" />
          </div>
          <span>Shared Content</span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-[#2D5A3D]/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-[#2D5A3D]' : 'text-[#5A6660]'
              }`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-[#2D5A3D]' : 'text-[#5A6660]'
              }`}
            >
              <Grid size={16} />
            </button>
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-[#2D5A3D] text-white' : 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
            }`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="content-card mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs text-[#5A6660] block mb-1">Type</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`filter-btn text-xs ${filter === 'all' ? 'filter-btn-active' : ''}`}
                >
                  All ({content.length})
                </button>
                <button
                  onClick={() => setFilter('memory')}
                  className={`filter-btn text-xs ${filter === 'memory' ? 'filter-btn-active' : ''}`}
                >
                  <ImageIcon size={12} className="inline mr-1" />
                  Memories ({memoryCount})
                </button>
                <button
                  onClick={() => setFilter('wisdom')}
                  className={`filter-btn text-xs ${filter === 'wisdom' ? 'filter-btn-active' : ''}`}
                >
                  <BookOpen size={12} className="inline mr-1" />
                  Wisdom ({wisdomCount})
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-[#5A6660] block mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'recent' | 'popular')}
                className="form-select text-sm py-1.5"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filters (always visible) */}
      {!showFilters && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`filter-btn ${filter === 'all' ? 'filter-btn-active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('memory')}
            className={`filter-btn ${filter === 'memory' ? 'filter-btn-active' : ''}`}
          >
            <ImageIcon size={12} className="inline mr-1" />
            Memories
          </button>
          <button
            onClick={() => setFilter('wisdom')}
            className={`filter-btn ${filter === 'wisdom' ? 'filter-btn-active' : ''}`}
          >
            <BookOpen size={12} className="inline mr-1" />
            Wisdom
          </button>
        </div>
      )}

      {/* Content List */}
      {filteredContent.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={32} className="text-[#2D5A3D]" />
          </div>
          <h3 className="empty-state-title">No Content Yet</h3>
          <p className="empty-state-text">
            Memories and wisdom shared with this circle will appear here.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContent.map(item => (
            <ContentCard
              key={item.id}
              content={item}
              currentUserId={currentUserId}
              viewMode="grid"
              onView={() => onViewContent(item.id)}
              onLike={() => onLikeContent(item.id)}
              onComment={() => onCommentContent(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContent.map(item => (
            <ContentCard
              key={item.id}
              content={item}
              currentUserId={currentUserId}
              viewMode="list"
              onView={() => onViewContent(item.id)}
              onLike={() => onLikeContent(item.id)}
              onComment={() => onCommentContent(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
