'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'

interface CreateCircleModalProps {
  onClose: () => void
  onSave: (circle: { name: string; description: string }) => void
}

export default function CreateCircleModal({ onClose, onSave }: CreateCircleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay-page" onClick={onClose}>
      <div className="modal-content-page" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 flex items-center justify-center">
              <Users size={20} className="text-[#2D5A3D]" />
            </div>
            <h2 className="text-xl font-semibold text-[#2d2d2d]">Create Circle</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#2D5A3D]/50 hover:text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#666] mb-1.5">Circle Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input"
              placeholder="Family, Close Friends, Work..."
              autoFocus
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm text-[#666] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="What is this circle about? (optional)"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-[#888] mt-1">{description.length}/200</p>
          </div>

          <div className="p-4 bg-[#2D5A3D]/5 rounded-xl">
            <p className="text-sm text-[#2D5A3D]">
              <strong>You'll be the Owner</strong> of this circle and can invite others, manage members, and configure settings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#2D5A3D]/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-primary"
            >
              {saving ? 'Creating...' : 'Create Circle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
