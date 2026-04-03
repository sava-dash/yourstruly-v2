'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, ChevronLeft, Camera, Edit2, UserCheck, 
  MoreVertical, Merge, EyeOff, Trash2 
} from 'lucide-react'
import { getFaces, getMemoriesWithFace, type FaceWithStats } from '@/lib/faces'
import MemoryCard from './MemoryCard'

interface FaceBrowserProps {
  onSelectFace?: (faceId: string) => void
  showMemories?: boolean
}

export function FaceBrowser({ onSelectFace, showMemories = true }: FaceBrowserProps) {
  const [faces, setFaces] = useState<FaceWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFace, setSelectedFace] = useState<FaceWithStats | null>(null)
  const [faceMemories, setFaceMemories] = useState<any[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)

  // Fetch faces on mount
  useEffect(() => {
    loadFaces()
  }, [])

  const loadFaces = async () => {
    setLoading(true)
    const data = await getFaces()
    setFaces(data)
    setLoading(false)
  }

  // Load memories for selected face
  const handleSelectFace = async (face: FaceWithStats) => {
    setSelectedFace(face)
    onSelectFace?.(face.id)
    
    if (showMemories) {
      setLoadingMemories(true)
      const memories = await getMemoriesWithFace(face.id)
      setFaceMemories(memories)
      setLoadingMemories(false)
    }
  }

  const handleBack = () => {
    setSelectedFace(null)
    setFaceMemories([])
  }

  // Generate thumbnail placeholder
  const getThumbnailBg = (index: number) => {
    const colors = [
      'from-pink-400 to-rose-500',
      'from-blue-400 to-cyan-500',
      'from-purple-400 to-violet-500',
      'from-green-400 to-emerald-500',
      'from-yellow-400 to-amber-500',
      'from-indigo-400 to-blue-500',
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading faces...</div>
      </div>
    )
  }

  // Show selected face's memories
  if (selectedFace && showMemories) {
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleBack}
            className="page-header-back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            {selectedFace.thumbnail_url ? (
              <img 
                src={selectedFace.thumbnail_url} 
                alt={selectedFace.name || 'Unknown'}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getThumbnailBg(0)} 
                               flex items-center justify-center text-white font-semibold text-lg shadow-md`}>
                <Users size={20} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#2d2d2d]">
                {selectedFace.name || 'Unknown Person'}
              </h2>
              <p className="text-sm text-[#2D5A3D]">
                {selectedFace.memory_count} memories • {selectedFace.face_count} photos
              </p>
            </div>
          </div>
        </div>

        {/* Memories grid */}
        {loadingMemories ? (
          <div className="loading-container">
            <div className="loading-text">Loading memories...</div>
          </div>
        ) : faceMemories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Camera size={32} className="text-[#2D5A3D]/50" />
            </div>
            <h3 className="empty-state-title">No memories linked yet</h3>
            <p className="empty-state-text">
              Tag this face in your memories to see them here
            </p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {faceMemories.map((memory, idx) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <MemoryCard memory={memory} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  // Show faces grid
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2D5A3D]" />
          <span className="text-sm text-[#2D5A3D]">
            {faces.length} {faces.length === 1 ? 'person' : 'people'} detected
          </span>
        </div>
      </div>

      {faces.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={32} className="text-[#2D5A3D]/50" />
          </div>
          <h3 className="empty-state-title">No faces detected yet</h3>
          <p className="empty-state-text">
            Upload photos and we'll automatically detect and group faces
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4"
        >
          {faces.map((face, idx) => (
            <FaceCard
              key={face.id}
              face={face}
              index={idx}
              onClick={() => handleSelectFace(face)}
              getThumbnailBg={getThumbnailBg}
            />
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ============================================
// Face Card Component
// ============================================
interface FaceCardProps {
  face: FaceWithStats
  index: number
  onClick: () => void
  getThumbnailBg: (index: number) => string
}

function FaceCard({ face, index, onClick, getThumbnailBg }: FaceCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className="group relative"
    >
      <button
        onClick={onClick}
        className="flex flex-col items-center text-center w-full"
      >
        {/* Avatar */}
        <div className="relative mb-2">
          {face.thumbnail_url ? (
            <img 
              src={face.thumbnail_url} 
              alt={face.name || 'Unknown'}
              className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-lg 
                         group-hover:scale-105 group-hover:shadow-xl transition-all duration-300"
            />
          ) : (
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getThumbnailBg(index)} 
                             flex items-center justify-center text-white font-bold text-xl shadow-lg
                             group-hover:scale-105 group-hover:shadow-xl transition-all duration-300`}>
              <Users size={24} />
            </div>
          )}
          
          {/* Memory count badge */}
          {face.memory_count > 0 && (
            <div className="absolute -bottom-1 -right-1 min-w-[24px] h-6 px-1.5 
                            bg-[#C4A235] rounded-full flex items-center justify-center
                            text-xs font-bold text-[#2d2d2d] shadow-md
                            group-hover:scale-110 transition-transform">
              {face.memory_count}
            </div>
          )}

          {/* Linked to contact indicator */}
          {face.contact_id && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#2D5A3D] rounded-full
                            flex items-center justify-center">
              <UserCheck size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="text-sm font-medium text-[#2d2d2d] line-clamp-1 max-w-full px-1
                         group-hover:text-[#2D5A3D] transition-colors">
          {face.name || 'Unknown'}
        </span>
        
        {/* Photo count */}
        <span className="text-xs text-[#2D5A3D]/60">
          {face.face_count} photos
        </span>
      </button>

      {/* Quick actions on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="absolute top-0 right-0 p-1 rounded-full bg-white/80 shadow opacity-0 
                   group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={14} className="text-gray-600" />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-8 right-0 z-10 bg-white rounded-lg shadow-lg border py-1 min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
              <Edit2 size={14} />
              Rename
            </button>
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
              <Merge size={14} />
              Merge with...
            </button>
            <button className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2">
              <EyeOff size={14} />
              Hide
            </button>
            <button className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
              <Trash2 size={14} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default FaceBrowser
