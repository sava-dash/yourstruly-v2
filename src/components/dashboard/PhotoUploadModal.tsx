'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, Upload, Check, Clock, Loader2, User, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

type UploadState = 'select' | 'uploading' | 'tagging' | 'creating'

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  age?: { low: number; high: number }
  gender?: string
  expression?: string
  suggestions?: Array<{
    contactId: string
    contactName: string
    similarity: number
  }>
}

interface FaceTag {
  faceIndex: number
  contactId: string
  contactName: string
}

export default function PhotoUploadModal({ isOpen, onClose }: PhotoUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>('select')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedMedia, setUploadedMedia] = useState<{ 
    id: string
    memoryId: string
    faces: DetectedFace[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([])
  const [faceTags, setFaceTags] = useState<FaceTag[]>([])
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const router = useRouter()

  // Load user contacts
  useEffect(() => {
    if (uploadState === 'tagging') {
      loadContacts()
    }
  }, [uploadState])

  const loadContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts || [])
      }
    } catch (e) {
      console.error('Failed to load contacts:', e)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploadState('uploading')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      setPreviewUrl(url)
      
      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height })
      }
      img.src = url
    }
    reader.readAsDataURL(file)

    try {
      // Create a memory first
      const memoryRes = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          memory_date: new Date().toISOString().split('T')[0],
          memory_type: 'moment',
        }),
      })

      if (!memoryRes.ok) {
        throw new Error('Failed to create memory')
      }

      const { memory } = await memoryRes.json()
      if (!memory?.id) {
        throw new Error('No memory ID returned')
      }

      // Upload the photo with face detection
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch(`/api/memories/${memory.id}/media`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload photo')
      }

      const { media, faces } = await uploadRes.json()
      
      setUploadedMedia({ 
        id: media?.id, 
        memoryId: memory.id,
        faces: faces || []
      })

      // If faces detected, show tagging UI; otherwise go straight to preview
      if (faces && faces.length > 0) {
        setUploadState('tagging')
      } else {
        setUploadState('creating')
        router.push(`/dashboard/memories/${memory.id}`)
        handleClose()
      }

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('select')
    }
  }

  const handleTagFace = (faceIndex: number, contactId: string, contactName: string) => {
    setFaceTags(prev => {
      const existing = prev.find(t => t.faceIndex === faceIndex)
      if (existing) {
        return prev.map(t => t.faceIndex === faceIndex ? { faceIndex, contactId, contactName } : t)
      }
      return [...prev, { faceIndex, contactId, contactName }]
    })
    setSelectedFaceIndex(null)
  }

  const handleRemoveFaceTag = (faceIndex: number) => {
    setFaceTags(prev => prev.filter(t => t.faceIndex !== faceIndex))
  }

  const handleSaveTags = async () => {
    if (!uploadedMedia) return

    try {
      // Save all face tags
      for (const tag of faceTags) {
        const face = uploadedMedia.faces[tag.faceIndex]
        await fetch('/api/face-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId: uploadedMedia.id,
            contactId: tag.contactId,
            boundingBox: face.boundingBox,
          }),
        })
      }

      // Navigate to memory editor
      setUploadState('creating')
      router.push(`/dashboard/memories/${uploadedMedia.memoryId}`)
      handleClose()
    } catch (err) {
      console.error('Failed to save tags:', err)
      setError('Failed to save tags')
    }
  }

  const handleSkipTagging = () => {
    if (!uploadedMedia) return
    setUploadState('creating')
    router.push(`/dashboard/memories/${uploadedMedia.memoryId}`)
    handleClose()
  }

  const handleClose = () => {
    setUploadState('select')
    setPreviewUrl(null)
    setUploadedMedia(null)
    setError(null)
    setFaceTags([])
    setSelectedFaceIndex(null)
    setImageSize(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  // Calculate face box position in rendered image
  const getFaceBoxStyle = (face: DetectedFace) => {
    if (!imageRef.current) return {}
    
    const imgElement = imageRef.current
    const displayWidth = imgElement.clientWidth
    const displayHeight = imgElement.clientHeight
    
    return {
      left: `${face.boundingBox.x * displayWidth}px`,
      top: `${face.boundingBox.y * displayHeight}px`,
      width: `${face.boundingBox.width * displayWidth}px`,
      height: `${face.boundingBox.height * displayHeight}px`,
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#FDF8F3] rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#406A56]">
                {uploadState === 'tagging' && 'Tag People in Photo'}
                {uploadState === 'select' && 'Add Photos'}
                {uploadState === 'uploading' && 'Uploading...'}
                {uploadState === 'creating' && 'Creating Memory...'}
              </h3>
              <button 
                onClick={handleClose} 
                className="p-2 hover:bg-[#406A56]/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-[#406A56]" />
              </button>
            </div>

            {/* Content based on state */}
            {uploadState === 'select' && (
              <>
                <p className="text-[#406A56]/70 mb-4">Upload a photo to create a new memory</p>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="border-2 border-dashed border-[#406A56]/30 rounded-xl p-8 text-center hover:border-[#406A56]/50 transition-colors cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="photo-upload-input"
                    onChange={handleFileSelect}
                  />
                  <label htmlFor="photo-upload-input" className="cursor-pointer">
                    <ImageIcon size={48} className="mx-auto text-[#406A56]/40 mb-3" />
                    <p className="text-[#406A56] font-medium">Click to upload a photo</p>
                    <p className="text-sm text-[#406A56]/50 mt-1">JPG, PNG, HEIC supported</p>
                  </label>
                </div>
              </>
            )}

            {uploadState === 'uploading' && (
              <div className="py-8 text-center">
                <Loader2 size={48} className="mx-auto text-[#406A56] animate-spin mb-4" />
                <p className="text-[#406A56] font-medium">Uploading photo and detecting faces...</p>
                {previewUrl && (
                  <div className="mt-4 rounded-xl overflow-hidden max-h-48">
                    <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover opacity-50" />
                  </div>
                )}
              </div>
            )}

            {uploadState === 'tagging' && previewUrl && uploadedMedia && (
              <>
                <p className="text-[#406A56]/70 mb-4">
                  {uploadedMedia.faces.length} {uploadedMedia.faces.length === 1 ? 'face' : 'faces'} detected. Click on a face to tag someone.
                </p>

                {/* Photo with face boxes */}
                <div className="relative mb-4 rounded-xl overflow-hidden">
                  <img 
                    ref={imageRef}
                    src={previewUrl} 
                    alt="Uploaded" 
                    className="w-full h-auto"
                  />
                  
                  {/* Face boxes overlay */}
                  {uploadedMedia.faces.map((face, index) => {
                    const isTagged = faceTags.some(t => t.faceIndex === index)
                    const tag = faceTags.find(t => t.faceIndex === index)
                    const isSelected = selectedFaceIndex === index
                    
                    return (
                      <div
                        key={index}
                        className={`absolute border-4 cursor-pointer transition-all ${
                          isTagged 
                            ? 'border-green-500 bg-green-500/10' 
                            : isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-yellow-400 bg-yellow-400/10 hover:border-yellow-500'
                        }`}
                        style={getFaceBoxStyle(face)}
                        onClick={() => setSelectedFaceIndex(isSelected ? null : index)}
                      >
                        {isTagged && tag && (
                          <div className="absolute -bottom-8 left-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                            {tag.contactName}
                          </div>
                        )}
                        {!isTagged && (
                          <div className="absolute -bottom-8 left-0 bg-yellow-400 text-black px-2 py-1 rounded text-xs font-medium">
                            Click to tag
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Contact selector (shown when a face is selected) */}
                {selectedFaceIndex !== null && (
                  <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <User size={18} className="text-blue-600" />
                      <p className="font-medium text-blue-900">Who is this?</p>
                    </div>
                    
                    {/* AI Suggestions (if any) */}
                    {uploadedMedia.faces[selectedFaceIndex].suggestions && 
                     uploadedMedia.faces[selectedFaceIndex].suggestions!.length > 0 && (
                      <>
                        <div className="mb-3 pb-3 border-b border-blue-200">
                          <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">AI Suggestions</p>
                          <div className="space-y-2">
                            {uploadedMedia.faces[selectedFaceIndex].suggestions!.map((suggestion) => (
                              <button
                                key={suggestion.contactId}
                                onClick={() => handleTagFace(selectedFaceIndex, suggestion.contactId, suggestion.contactName)}
                                className="w-full flex items-center justify-between p-2 bg-white hover:bg-blue-100 rounded-lg transition-colors border border-blue-300"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
                                    <User size={16} className="text-blue-600" />
                                  </div>
                                  <span className="text-sm text-blue-900 font-medium">{suggestion.contactName}</span>
                                </div>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                  {suggestion.similarity}% match
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">All Contacts</p>
                      </>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {contacts.map(contact => (
                        <button
                          key={contact.id}
                          onClick={() => handleTagFace(selectedFaceIndex, contact.id, contact.full_name)}
                          className="flex items-center gap-2 p-2 hover:bg-blue-100 rounded-lg transition-colors text-left"
                        >
                          {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
                              <User size={16} className="text-blue-600" />
                            </div>
                          )}
                          <span className="text-sm text-blue-900 font-medium">{contact.full_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSkipTagging}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#406A56]/20 text-[#406A56] rounded-xl hover:bg-[#406A56]/5 transition-colors font-medium"
                  >
                    <Clock size={18} />
                    Skip
                  </button>
                  <button
                    onClick={handleSaveTags}
                    disabled={faceTags.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#406A56] text-white rounded-xl hover:bg-[#4a7a64] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Tag size={18} />
                    Save {faceTags.length > 0 && `(${faceTags.length})`}
                  </button>
                </div>
              </>
            )}

            {uploadState === 'creating' && (
              <div className="py-8 text-center">
                <Loader2 size={48} className="mx-auto text-[#406A56] animate-spin mb-4" />
                <p className="text-[#406A56] font-medium">Opening memory editor...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
