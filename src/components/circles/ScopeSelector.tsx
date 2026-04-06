'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Users, Check, Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface Circle {
  id: string
  name: string
  memberCount?: number
  color?: string
}

export interface ScopeSelection {
  isPrivate: boolean
  circleIds: string[]
}

interface ScopeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (selection: ScopeSelection) => void
  initialSelection?: ScopeSelection
  contentType?: 'memory' | 'knowledge' | 'conversation'
  title?: string
}

// Generate consistent color from circle name
function getCircleColor(name: string): string {
  const colors = ['#2D5A3D', '#B8562E', '#C4A235', '#8DACAB', '#244B32', '#2C5F7C'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ScopeSelector({
  isOpen,
  onClose,
  onSave,
  initialSelection,
  contentType = 'memory',
  title = 'Who should see this?'
}: ScopeSelectorProps) {
  const [isPrivate, setIsPrivate] = useState(true)
  const [selectedCircles, setSelectedCircles] = useState<string[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  // Fetch user's circles
  useEffect(() => {
    if (!isOpen) return
    
    const fetchCircles = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get circles where user is a member
        const { data: memberships } = await supabase
          .from('circle_members')
          .select(`
            circle:circles (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('invite_status', 'accepted')

        if (memberships) {
          const userCircles: Circle[] = memberships
            .filter(m => m.circle)
            .map(m => {
              const circle = Array.isArray(m.circle) ? m.circle[0] : m.circle
              return {
                id: circle.id,
                name: circle.name,
                color: getCircleColor(circle.name)
              }
            })
          setCircles(userCircles)
        }
      } catch (error) {
        console.error('Error fetching circles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCircles()
  }, [isOpen, supabase])
  
  // Initialize from props
  useEffect(() => {
    if (initialSelection) {
      setIsPrivate(initialSelection.isPrivate)
      setSelectedCircles(initialSelection.circleIds)
    } else {
      // Default to private
      setIsPrivate(true)
      setSelectedCircles([])
    }
  }, [initialSelection, isOpen])

  // Handle ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen])

  const handleDismiss = useCallback(() => {
    // Dismissed without explicit save → default to private
    onSave({ isPrivate: true, circleIds: [] })
    onClose()
  }, [onSave, onClose])

  const handlePrivateToggle = useCallback(() => {
    setIsPrivate(true)
    setSelectedCircles([])
  }, [])

  const handleCircleToggle = useCallback((circleId: string) => {
    setSelectedCircles(prev => {
      const newSelection = prev.includes(circleId)
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
      
      // If any circles selected, not private
      if (newSelection.length > 0) {
        setIsPrivate(false)
      }
      return newSelection
    })
  }, [])

  const handleSave = useCallback(() => {
    onSave({
      isPrivate: isPrivate || selectedCircles.length === 0,
      circleIds: selectedCircles
    })
    onClose()
  }, [isPrivate, selectedCircles, onSave, onClose])

  const getContentLabel = () => {
    switch (contentType) {
      case 'memory': return 'memory'
      case 'knowledge': return 'insight'
      case 'conversation': return 'story'
      default: return 'content'
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-xl border border-[#2D5A3D]/10 w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#2D5A3D]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#8DACAB] flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-[#1A1F1C] font-semibold text-lg">{title}</h3>
                <p className="text-gray-500 text-sm">Choose who sees this {getContentLabel()}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-[#1A1F1C] transition-colors p-2 hover:bg-[#2D5A3D]/5 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Options */}
          <div className="p-5 space-y-3">
            {/* Private Option */}
            <button
              onClick={handlePrivateToggle}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                isPrivate && selectedCircles.length === 0
                  ? 'bg-[#2D5A3D]/10 border-2 border-[#2D5A3D]/30'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isPrivate && selectedCircles.length === 0
                  ? 'bg-[#2D5A3D]'
                  : 'bg-gray-200'
              }`}>
                <Lock size={20} className={isPrivate && selectedCircles.length === 0 ? 'text-white' : 'text-gray-500'} />
              </div>
              <div className="flex-1">
                <p className="text-[#1A1F1C] font-medium">Private</p>
                <p className="text-gray-500 text-sm">Only visible to you</p>
              </div>
              {isPrivate && selectedCircles.length === 0 && (
                <div className="w-6 h-6 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#2D5A3D]" />
              </div>
            )}

            {/* Circles Section */}
            {!loading && circles.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">
                    Share with Circles
                  </span>
                </div>

                {circles.map(circle => (
                  <button
                    key={circle.id}
                    onClick={() => handleCircleToggle(circle.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                      selectedCircles.includes(circle.id)
                        ? 'bg-[#2D5A3D]/10 border-2 border-[#2D5A3D]/30'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: circle.color || '#2D5A3D' }}
                    >
                      <Users size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1A1F1C] font-medium">{circle.name}</p>
                      {circle.memberCount && (
                        <p className="text-gray-500 text-sm">
                          {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
                        </p>
                      )}
                    </div>
                    {selectedCircles.includes(circle.id) && (
                      <div className="w-6 h-6 rounded-full bg-[#2D5A3D] flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* No circles message */}
            {!loading && circles.length === 0 && (
              <div className="text-center py-6">
                <Users size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Create a circle for the people closest to you</p>
                <p className="text-gray-400 text-xs mt-1">Circles let you share with family and friends</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#2D5A3D]/10 flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-[#1A1F1C] rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-[#2D5A3D] hover:bg-[#355a48] text-white rounded-xl font-medium transition-all"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ScopeSelector
