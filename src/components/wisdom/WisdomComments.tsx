'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Comment {
  id: string
  content: string
  contact_name: string
  contact_id?: string
  contact?: {
    id: string
    name: string
    relationship_type?: string
  }
  created_at: string
}

interface WisdomCommentsProps {
  wisdomId: string
}

export default function WisdomComments({ wisdomId }: WisdomCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
  }, [wisdomId])

  const loadComments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wisdom/${wisdomId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/wisdom/${wisdomId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setNewComment('')
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (deletingId) return
    
    setDeletingId(commentId)
    try {
      const res = await fetch(`/api/wisdom/${wisdomId}/comments?comment_id=${commentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="text-[#4A3552] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#4A3552]/10 flex items-center justify-center">
          <MessageCircle size={16} className="text-[#4A3552]" />
        </div>
        <h3 className="text-sm font-semibold text-[#2d2d2d]">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {comments.map(comment => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-3 group"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A3552] to-[#6a4572] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {getInitials(comment.contact_name)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-[#F5F3EE] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#2d2d2d] text-sm">
                      {comment.contact_name}
                    </span>
                    {comment.contact?.relationship_type && (
                      <span className="px-1.5 py-0.5 bg-[#4A3552]/10 text-[#4A3552] text-[10px] rounded">
                        {comment.contact.relationship_type}
                      </span>
                    )}
                    <span className="text-gray-400 text-xs">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-[#2d2d2d] text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={deletingId === comment.id}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 self-center"
              >
                {deletingId === comment.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {comments.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <MessageCircle size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Share this wisdom and let others leave their thoughts</p>
          </div>
        )}
      </div>

      {/* Add comment form - only visible for demo/owner */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-gray-100">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2.5 bg-[#F5F3EE] border border-gray-200 rounded-xl text-[#2d2d2d] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A3552]/30 focus:border-[#4A3552] transition-all text-sm"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="px-4 py-2.5 bg-[#4A3552] hover:bg-[#5a4562] disabled:bg-gray-300 text-white rounded-xl transition-colors flex items-center gap-2"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  )
}
