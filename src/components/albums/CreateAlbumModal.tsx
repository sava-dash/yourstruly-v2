'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface CreateAlbumModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (album: any) => void
  editAlbum?: any
}

// Placeholder component - to be implemented
export default function CreateAlbumModal({ isOpen, onClose, onCreated, editAlbum }: CreateAlbumModalProps) {
  const [title, setTitle] = useState(editAlbum?.title || '')
  
  if (!isOpen) return null
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreated?.({ id: Date.now().toString(), title })
    onClose()
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{editAlbum ? 'Edit Album' : 'Create Album'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Album title"
            className="w-full p-3 border rounded-xl mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-[#2D5A3D] text-white rounded-lg">
              {editAlbum ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
