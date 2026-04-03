'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Save, Loader2, Users, UserPlus, Merge, 
  Check, Search, ChevronRight, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  updateFaceName, 
  linkFaceToContact, 
  mergeFaces,
  getFaces,
  type FaceWithStats 
} from '@/lib/faces'

// ============================================
// Types
// ============================================
interface Contact {
  id: string
  full_name: string
  avatar_url: string | null
  relationship_type: string | null
}

interface FaceManagerProps {
  isOpen: boolean
  onClose: () => void
  face: FaceWithStats | null
  onUpdated: () => void
}

// ============================================
// Main FaceManager Modal
// ============================================
export function FaceManager({ isOpen, onClose, face, onUpdated }: FaceManagerProps) {
  const [mode, setMode] = useState<'edit' | 'link' | 'merge'>('edit')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when face changes
  useEffect(() => {
    if (face) {
      setName(face.name || '')
      setMode('edit')
      setError(null)
    }
  }, [face])

  if (!isOpen || !face) return null

  const handleSaveName = async () => {
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }

    setSaving(true)
    setError(null)

    const success = await updateFaceName(face.id, name.trim())
    
    if (success) {
      onUpdated()
      onClose()
    } else {
      setError('Failed to save name')
    }
    
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-[#2d2d2d]">
            {mode === 'edit' && 'Edit Person'}
            {mode === 'link' && 'Link to Contact'}
            {mode === 'merge' && 'Merge Faces'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Face preview */}
        <div className="flex items-center gap-4 p-4 bg-gray-50">
          {face.thumbnail_url ? (
            <img 
              src={face.thumbnail_url}
              alt={face.name || 'Unknown'}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 
                            flex items-center justify-center text-white shadow">
              <Users size={24} />
            </div>
          )}
          <div>
            <div className="font-medium text-[#2d2d2d]">
              {face.name || 'Unknown Person'}
            </div>
            <div className="text-sm text-[#2D5A3D]">
              {face.face_count} photos • {face.memory_count} memories
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('edit')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
                       ${mode === 'edit' 
                         ? 'border-[#2D5A3D] text-[#2D5A3D]' 
                         : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Rename
          </button>
          <button
            onClick={() => setMode('link')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
                       ${mode === 'link' 
                         ? 'border-[#2D5A3D] text-[#2D5A3D]' 
                         : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Link Contact
          </button>
          <button
            onClick={() => setMode('merge')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors
                       ${mode === 'merge' 
                         ? 'border-[#2D5A3D] text-[#2D5A3D]' 
                         : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Merge
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'edit' && (
            <EditNameForm
              name={name}
              setName={setName}
              saving={saving}
              error={error}
              onSave={handleSaveName}
            />
          )}
          
          {mode === 'link' && (
            <LinkContactForm
              faceId={face.id}
              currentContactId={face.contact_id}
              onLinked={() => {
                onUpdated()
                onClose()
              }}
            />
          )}
          
          {mode === 'merge' && (
            <MergeFacesForm
              faceId={face.id}
              faceName={face.name}
              onMerged={() => {
                onUpdated()
                onClose()
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// Edit Name Form
// ============================================
interface EditNameFormProps {
  name: string
  setName: (name: string) => void
  saving: boolean
  error: string | null
  onSave: () => void
}

function EditNameForm({ name, setName, saving, error, onSave }: EditNameFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name this person
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                     focus:ring-[#2D5A3D] focus:border-transparent"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving || !name.trim()}
        className="w-full py-2.5 bg-[#2D5A3D] text-white rounded-lg font-medium
                   hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}
        Save Name
      </button>
    </div>
  )
}

// ============================================
// Link to Contact Form
// ============================================
interface LinkContactFormProps {
  faceId: string
  currentContactId: string | null
  onLinked: () => void
}

function LinkContactForm({ faceId, currentContactId, onLinked }: LinkContactFormProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(currentContactId)
  
  const supabase = createClient()

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url, relationship_type')
      .eq('user_id', user.id)
      .order('full_name')

    setContacts(data || [])
    setLoading(false)
  }

  const handleLink = async () => {
    if (!selectedId) return

    setLinking(true)
    const success = await linkFaceToContact(faceId, selectedId)
    
    if (success) {
      onLinked()
    }
    
    setLinking(false)
  }

  const filteredContacts = contacts.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D5A3D]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                     focus:ring-[#2D5A3D] focus:border-transparent"
        />
      </div>

      {/* Contact list */}
      <div className="max-h-60 overflow-y-auto space-y-1">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No contacts found
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedId(contact.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                         ${selectedId === contact.id 
                           ? 'bg-[#2D5A3D]/10 border border-[#2D5A3D]' 
                           : 'hover:bg-gray-50 border border-transparent'}`}
            >
              {contact.avatar_url ? (
                <img 
                  src={contact.avatar_url}
                  alt={contact.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] 
                                flex items-center justify-center text-white font-medium">
                  {contact.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="font-medium text-[#2d2d2d]">{contact.full_name}</div>
                {contact.relationship_type && (
                  <div className="text-xs text-gray-500 capitalize">
                    {contact.relationship_type}
                  </div>
                )}
              </div>
              {selectedId === contact.id && (
                <Check size={20} className="text-[#2D5A3D]" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Link button */}
      <button
        onClick={handleLink}
        disabled={linking || !selectedId}
        className="w-full py-2.5 bg-[#2D5A3D] text-white rounded-lg font-medium
                   hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 transition-colors"
      >
        {linking ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <UserPlus size={18} />
        )}
        Link to Contact
      </button>
    </div>
  )
}

// ============================================
// Merge Faces Form
// ============================================
interface MergeFacesFormProps {
  faceId: string
  faceName: string | null
  onMerged: () => void
}

function MergeFacesForm({ faceId, faceName, onMerged }: MergeFacesFormProps) {
  const [faces, setFaces] = useState<FaceWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    loadFaces()
  }, [])

  const loadFaces = async () => {
    const data = await getFaces()
    // Filter out current face
    setFaces(data.filter(f => f.id !== faceId))
    setLoading(false)
  }

  const handleMerge = async () => {
    if (!selectedId) return

    setMerging(true)
    const success = await mergeFaces(faceId, selectedId)
    
    if (success) {
      onMerged()
    }
    
    setMerging(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D5A3D]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Select a face to merge with <strong>{faceName || 'this person'}</strong>. 
        All photos will be combined into one person.
      </p>

      {/* Face list */}
      <div className="max-h-60 overflow-y-auto space-y-2">
        {faces.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No other faces to merge with
          </div>
        ) : (
          faces.map((face) => (
            <button
              key={face.id}
              onClick={() => setSelectedId(face.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                         ${selectedId === face.id 
                           ? 'bg-[#2D5A3D]/10 border border-[#2D5A3D]' 
                           : 'hover:bg-gray-50 border border-transparent'}`}
            >
              {face.thumbnail_url ? (
                <img 
                  src={face.thumbnail_url}
                  alt={face.name || 'Unknown'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 
                                flex items-center justify-center text-white">
                  <Users size={20} />
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="font-medium text-[#2d2d2d]">
                  {face.name || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">
                  {face.face_count} photos • {face.memory_count} memories
                </div>
              </div>
              {selectedId === face.id && (
                <Check size={20} className="text-[#2D5A3D]" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Merge button */}
      <button
        onClick={handleMerge}
        disabled={merging || !selectedId}
        className="w-full py-2.5 bg-[#2D5A3D] text-white rounded-lg font-medium
                   hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 transition-colors"
      >
        {merging ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Merge size={18} />
        )}
        Merge Faces
      </button>
    </div>
  )
}

export default FaceManager
