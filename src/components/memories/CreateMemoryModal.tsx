'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, Calendar, MapPin, Sparkles, Loader2, Image as ImageIcon, Check, Users, ChevronRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

interface CreateMemoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface UploadedFile {
  file: File
  preview: string
  uploading: boolean
  uploaded: boolean
  analysis?: {
    labels: any[]
    faces: any[]
  }
}

interface Contact {
  id: string
  full_name: string
  relationship_type: string
}

const MEMORY_TYPES = [
  { id: 'moment', label: 'Moment' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'trip', label: 'Trip' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'everyday', label: 'Everyday' },
]

export default function CreateMemoryModal({ isOpen, onClose, onCreated }: CreateMemoryModalProps) {
  const [step, setStep] = useState(1)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [memoryType, setMemoryType] = useState('moment')
  const [locationName, setLocationName] = useState('')
  const [creating, setCreating] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    title?: string
    description?: string
    category?: string
  } | null>(null)

  // Sharing state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [showShareSection, setShowShareSection] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Load contacts for sharing
  useEffect(() => {
    if (isOpen) {
      loadContacts()
    }
  }, [isOpen])

  const loadContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, relationship_type')
      .eq('user_id', user.id)
      .order('full_name')

    if (data) {
      setContacts(data)
    }
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    
    const newFiles: UploadedFile[] = droppedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) {
        next.delete(contactId)
      } else {
        next.add(contactId)
      }
      return next
    })
  }

  const handleCreate = async () => {
    if (files.length === 0) return

    setCreating(true)

    try {
      // 1. Create the memory
      const memoryRes = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || aiSuggestions?.title || 'Untitled Memory',
          description: description || aiSuggestions?.description,
          memory_date: memoryDate || new Date().toISOString().split('T')[0],
          memory_type: memoryType,
          location_name: locationName,
        }),
      })

      const { memory } = await memoryRes.json()
      if (!memory?.id) throw new Error('Failed to create memory')

      // 2. Upload each file
      for (let i = 0; i < files.length; i++) {
        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i].uploading = true
          return newFiles
        })

        const formData = new FormData()
        formData.append('file', files[i].file)

        const uploadRes = await fetch(`/api/memories/${memory.id}/media`, {
          method: 'POST',
          body: formData,
        })

        const { analysis } = await uploadRes.json()

        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i].uploading = false
          newFiles[i].uploaded = true
          newFiles[i].analysis = analysis
          return newFiles
        })

        // Get AI suggestions from first image
        if (i === 0 && analysis) {
          const topLabels = analysis.labels?.slice(0, 3).map((l: any) => l.name) || []
          setAiSuggestions({
            title: topLabels.length > 0 ? topLabels.join(', ') : undefined,
            category: analysis.labels?.[0]?.categories?.[0],
          })
        }
      }

      // 3. Share with selected contacts
      if (selectedContacts.size > 0) {
        await fetch(`/api/memories/${memory.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_ids: Array.from(selectedContacts),
          }),
        })
      }

      // 4. Done!
      onCreated()
      resetForm()
    } catch (error) {
      console.error('Error creating memory:', error)
      alert('Failed to create memory')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview))
    setFiles([])
    setTitle('')
    setDescription('')
    setMemoryDate('')
    setMemoryType('moment')
    setLocationName('')
    setStep(1)
    setAiSuggestions(null)
    setSelectedContacts(new Set())
    setShowShareSection(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Memory" maxWidth="max-w-2xl" showDone={false}>
      {step === 1 ? (
        /* Step 1: Upload Photos */
        <div>
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 hover:bg-white/5 transition-all"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Upload photos or videos. Drop files here or click to browse."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select photos or videos to upload"
            />
            <Upload size={32} className="mx-auto text-white/40 mb-3" aria-hidden="true" />
            <p className="text-white font-medium mb-1">Drop photos or videos here</p>
            <p className="text-white/40 text-sm">or click to browse</p>
          </div>

          {/* Preview Grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              {files.map((file, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img
                    src={file.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {file.uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={24} className="text-amber-500 animate-spin" />
                    </div>
                  )}
                  {file.uploaded && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <Check size={24} className="text-green-500" />
                    </div>
                  )}
                  {!file.uploading && !file.uploaded && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove file ${i + 1}`}
                    >
                      <X size={14} className="text-white" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          {files.length > 0 && (
            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all"
            >
              Continue ({files.length} {files.length === 1 ? 'file' : 'files'})
            </button>
          )}
        </div>
      ) : (
        /* Step 2: Details */
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {files.slice(0, 5).map((file, i) => (
              <img
                key={i}
                src={file.preview}
                alt=""
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
            ))}
            {files.length > 5 && (
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">+{files.length - 5}</span>
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {aiSuggestions && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-amber-500 text-sm mb-2">
                <Sparkles size={14} />
                AI Suggestions
              </div>
              {aiSuggestions.title && !title && (
                <button
                  onClick={() => setTitle(aiSuggestions.title!)}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Title: "{aiSuggestions.title}" — <span className="text-amber-500">use this</span>
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="memory-title" className="block text-white/50 text-sm mb-1">Title</label>
            <input
              id="memory-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this memory a name..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="memory-description" className="block text-white/50 text-sm mb-1">Description (optional)</label>
            <textarea
              id="memory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? How did you feel?"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
            />
          </div>

          {/* Date & Type Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="memory-date" className="block text-white/50 text-sm mb-1">Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
                <input
                  id="memory-date"
                  type="date"
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label htmlFor="memory-type" className="block text-white/50 text-sm mb-1">Type</label>
              <select
                id="memory-type"
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              >
                {MEMORY_TYPES.map((type) => (
                  <option key={type.id} value={type.id} className="bg-gray-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="memory-location" className="block text-white/50 text-sm mb-1">Location (optional)</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
              <input
                id="memory-location"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Where was this?"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>

          {/* Share with Contacts */}
          <div className="border-t border-white/10 pt-4">
            <button
              onClick={() => setShowShareSection(!showShareSection)}
              className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users size={18} className="text-amber-500" />
                <span className="text-white">Share with Contacts</span>
                {selectedContacts.size > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                    {selectedContacts.size} selected
                  </span>
                )}
              </div>
              <ChevronRight 
                size={18} 
                className={`text-white/50 transition-transform ${showShareSection ? 'rotate-90' : ''}`} 
              />
            </button>

            {showShareSection && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 max-h-48 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-4">
                    No contacts yet. Add contacts from the Contacts page.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-white/50 text-xs mb-2">
                      Shared contacts can leave comments and add their own photos
                    </p>
                    {contacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                          className="w-4 h-4 rounded border-white/30 bg-white/5 text-amber-500 focus:ring-amber-500/50"
                        />
                        <div>
                          <div className="text-white text-sm">{contact.full_name}</div>
                          {contact.relationship_type && (
                            <div className="text-white/40 text-xs">{contact.relationship_type}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 text-white/50 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Create Memory
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
