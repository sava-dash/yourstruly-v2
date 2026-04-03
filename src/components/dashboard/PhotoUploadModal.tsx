'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, X, Upload, Check, Loader2, User, Tag, MapPin, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

type UploadState = 'select' | 'uploading' | 'preview' | 'creating'

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number }
  confidence: number
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
  autoTagged?: boolean
}

interface UploadedPhoto {
  file: File
  previewUrl: string
  s3Url?: string
  fileKey?: string
  exifDate?: string
  exifLocation?: { lat: number; lng: number; name?: string }
  cameraMake?: string
  cameraModel?: string
  faces: DetectedFace[]
  width?: number
  height?: number
}

export default function PhotoUploadModal({ isOpen, onClose }: PhotoUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>('select')
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Array<{ id: string; full_name: string; avatar_url?: string }>>([])
  const [faceTags, setFaceTags] = useState<FaceTag[]>([])
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const router = useRouter()

  // Load contacts for manual tagging
  useEffect(() => {
    if (uploadState === 'preview') {
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
      
      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setPhoto(prev => prev ? { ...prev, width: img.width, height: img.height } : null)
      }
      img.src = url
    }
    reader.readAsDataURL(file)

    try {
      // Upload to temporary storage and analyze
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await fetch(`/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload photo')
      }

      const result = await uploadRes.json()
      
      // Parse EXIF data from response
      const photoData: UploadedPhoto = {
        file,
        previewUrl: URL.createObjectURL(file),
        s3Url: result.url,
        fileKey: result.path,
        faces: result.faces || [],
        exifDate: result.exif?.takenAt,
        exifLocation: result.exif?.lat && result.exif?.lng ? {
          lat: result.exif.lat,
          lng: result.exif.lng,
          name: result.exif.locationName,
        } : undefined,
        cameraMake: result.exif?.cameraMake,
        cameraModel: result.exif?.cameraModel,
      }

      setPhoto(photoData)

      // Auto-apply face suggestions
      const autoTags: FaceTag[] = []
      photoData.faces.forEach((face, index) => {
        if (face.suggestions && face.suggestions.length > 0) {
          const topMatch = face.suggestions[0]
          // Auto-tag if confidence > 85%
          if (topMatch.similarity >= 85) {
            autoTags.push({
              faceIndex: index,
              contactId: topMatch.contactId,
              contactName: topMatch.contactName,
              autoTagged: true,
            })
          }
        }
      })
      setFaceTags(autoTags)

      setUploadState('preview')

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
        return prev.map(t => t.faceIndex === faceIndex ? { faceIndex, contactId, contactName, autoTagged: false } : t)
      }
      return [...prev, { faceIndex, contactId, contactName, autoTagged: false }]
    })
    setSelectedFaceIndex(null)
  }

  const handleRemoveFaceTag = (faceIndex: number) => {
    setFaceTags(prev => prev.filter(t => t.faceIndex !== faceIndex))
  }

  const handleSave = async () => {
    if (!photo) return

    setUploadState('creating')
    setError(null)

    try {
      // Create memory with actual EXIF data (not today's date!)
      const memoryRes = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: photo.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          memory_date: photo.exifDate?.split('T')[0] || null, // null if no EXIF date
          memory_type: 'moment',
          location_lat: photo.exifLocation?.lat,
          location_lng: photo.exifLocation?.lng,
          location_name: photo.exifLocation?.name,
        }),
      })

      if (!memoryRes.ok) {
        throw new Error('Failed to create memory')
      }

      const { memory } = await memoryRes.json()

      // Attach the uploaded photo to memory
      const attachRes = await fetch(`/api/memories/${memory.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: photo.s3Url,
          file_key: photo.fileKey,
          file_type: 'image',
          mime_type: photo.file.type,
          file_size: photo.file.size,
          width: photo.width,
          height: photo.height,
          exif_lat: photo.exifLocation?.lat,
          exif_lng: photo.exifLocation?.lng,
          taken_at: photo.exifDate,
          camera_make: photo.cameraMake,
          camera_model: photo.cameraModel,
        }),
      })

      if (!attachRes.ok) {
        throw new Error('Failed to attach photo to memory')
      }

      const { media } = await attachRes.json()

      // Save face tags
      for (const tag of faceTags) {
        const face = photo.faces[tag.faceIndex]
        await fetch('/api/face-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId: media.id,
            contactId: tag.contactId,
            boundingBox: face.boundingBox,
          }),
        })
      }

      // Navigate to memory editor
      router.push(`/dashboard/memories/${memory.id}`)
      handleClose()

    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      setUploadState('preview')
    }
  }

  const handleClose = () => {
    setUploadState('select')
    setPhoto(null)
    setError(null)
    setFaceTags([])
    setSelectedFaceIndex(null)
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Upload Photo</h2>
          <button
            onClick={handleClose}
            disabled={uploadState === 'creating'}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {uploadState === 'select' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-[#2D5A3D] hover:bg-gray-50 transition-all"
            >
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">Click to upload a photo</p>
              <p className="text-sm text-gray-500">JPG, PNG, or HEIC up to 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {uploadState === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#2D5A3D] mb-4" />
              <p className="text-lg font-medium text-gray-700">Analyzing photo...</p>
              <p className="text-sm text-gray-500 mt-2">Extracting date, location, and detecting faces</p>
            </div>
          )}

          {uploadState === 'preview' && photo && (
            <div className="space-y-6">
              {/* Photo Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img
                  ref={imageRef}
                  src={photo.previewUrl}
                  alt="Preview"
                  className="w-full h-auto"
                />
                {/* Face bounding boxes */}
                {photo.faces.map((face, index) => {
                  const tag = faceTags.find(t => t.faceIndex === index)
                  const isSelected = selectedFaceIndex === index
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedFaceIndex(isSelected ? null : index)}
                      className={`absolute border-2 cursor-pointer transition-all ${
                        tag
                          ? tag.autoTagged
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-blue-500 bg-blue-500/20'
                          : isSelected
                          ? 'border-yellow-500 bg-yellow-500/20'
                          : 'border-red-500 bg-red-500/20'
                      }`}
                      style={{
                        left: `${face.boundingBox.x * 100}%`,
                        top: `${face.boundingBox.y * 100}%`,
                        width: `${face.boundingBox.width * 100}%`,
                        height: `${face.boundingBox.height * 100}%`,
                      }}
                    >
                      {tag && (
                        <div className="absolute -top-8 left-0 bg-white px-2 py-1 rounded shadow-lg text-xs font-medium whitespace-nowrap flex items-center gap-1">
                          {tag.autoTagged && <Check size={12} className="text-green-600" />}
                          {tag.contactName}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveFaceTag(index)
                            }}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* EXIF Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {photo.exifDate
                      ? new Date(photo.exifDate).toLocaleDateString()
                      : <span className="text-gray-400 italic">No date found</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {photo.exifLocation?.name || <span className="text-gray-400 italic">No location found</span>}
                  </span>
                </div>
              </div>

              {/* Face Tagging */}
              {photo.faces.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <User size={18} />
                    Tag People ({faceTags.length}/{photo.faces.length})
                  </h3>
                  
                  {selectedFaceIndex !== null && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 mb-3">Who is this?</p>
                      {photo.faces[selectedFaceIndex].suggestions && photo.faces[selectedFaceIndex].suggestions!.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 mb-2">Suggestions:</p>
                          {photo.faces[selectedFaceIndex].suggestions!.map((suggestion) => (
                            <button
                              key={suggestion.contactId}
                              onClick={() => handleTagFace(selectedFaceIndex, suggestion.contactId, suggestion.contactName)}
                              className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                            >
                              <span className="font-medium text-gray-900">{suggestion.contactName}</span>
                              <span className="text-xs text-gray-500">{suggestion.similarity}% match</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3">
                        <select
                          onChange={(e) => {
                            const contact = contacts.find(c => c.id === e.target.value)
                            if (contact) {
                              handleTagFace(selectedFaceIndex, contact.id, contact.full_name)
                            }
                          }}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5A3D] focus:border-[#2D5A3D]"
                        >
                          <option value="">Or select from contacts...</option>
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {faceTags.filter(t => t.autoTagged).length > 0 && (
                      <span className="text-green-600">✓ {faceTags.filter(t => t.autoTagged).length} auto-tagged • </span>
                    )}
                    Click on untagged faces to identify them
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {uploadState === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#2D5A3D] mb-4" />
              <p className="text-lg font-medium text-gray-700">Creating memory...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {uploadState === 'preview' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#2D5A3D] hover:bg-[#355a48] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Check size={18} />
              Save Memory
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
