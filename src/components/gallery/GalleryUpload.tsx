'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Loader2, Check, MapPin, Calendar, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import exifr from 'exifr'

interface UploadingFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'complete' | 'error'
  progress: number
  exif?: {
    date?: Date
    lat?: number
    lng?: number
  }
  error?: string
}

interface GalleryUploadProps {
  onUploadComplete: () => void
}

export default function GalleryUpload({ onUploadComplete }: GalleryUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const extractExif = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) return {}
      const exif = await exifr.parse(file, {
        // Don't use pick — it can exclude GPSLatitudeRef/GPSLongitudeRef needed for hemisphere
        gps: true,
      })
      if (!exif) return {}
      return {
        date: exif.DateTimeOriginal || exif.CreateDate,
        lat: exif.latitude,
        lng: exif.longitude,
      }
    } catch {
      return {}
    }
  }

  const handleFileSelect = useCallback(async (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    const newFiles: UploadingFile[] = await Promise.all(
      validFiles.map(async file => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        progress: 0,
        exif: await extractExif(file)
      }))
    )
    setFiles(prev => [...prev, ...newFiles])
    if (newFiles.length > 0) setIsExpanded(true)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(Array.from(e.dataTransfer.files))
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(Array.from(e.target.files || []))
  }, [handleFileSelect])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      if (newFiles.length === 0) setIsExpanded(false)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) return
    setIsUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Please sign in')
      setIsUploading(false)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i]
      if (uploadFile.status !== 'pending') continue

      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[i].status = 'uploading'
        return newFiles
      })

      try {
        const memoryRes = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: uploadFile.file.name.replace(/\.[^/.]+$/, ''),
            memory_date: uploadFile.exif?.date 
              ? new Date(uploadFile.exif.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            memory_type: 'moment',
            location_lat: uploadFile.exif?.lat,
            location_lng: uploadFile.exif?.lng,
          }),
        })

        const { memory } = await memoryRes.json()
        if (!memory?.id) throw new Error('Failed to create memory')

        const formData = new FormData()
        formData.append('file', uploadFile.file)
        if (uploadFile.exif) {
          formData.append('exif_lat', uploadFile.exif.lat?.toString() || '')
          formData.append('exif_lng', uploadFile.exif.lng?.toString() || '')
          formData.append('taken_at', uploadFile.exif.date?.toISOString() || '')
        }

        const uploadRes = await fetch(`/api/memories/${memory.id}/media`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) throw new Error('Upload failed')

        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i].status = 'complete'
          newFiles[i].progress = 100
          return newFiles
        })
      } catch (err) {
        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i].status = 'error'
          newFiles[i].error = err instanceof Error ? err.message : 'Failed'
          return newFiles
        })
      }
    }

    setIsUploading(false)
    const allComplete = files.every(f => f.status === 'complete' || f.status === 'error')
    if (allComplete) {
      setTimeout(() => {
        setFiles(prev => {
          prev.forEach(f => URL.revokeObjectURL(f.preview))
          return []
        })
        setIsExpanded(false)
        onUploadComplete()
      }, 1000)
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const completedCount = files.filter(f => f.status === 'complete').length
  const hasGPS = files.filter(f => f.exif?.lat).length

  return (
    <div className="mb-4">
      {/* Compact Upload Bar */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging 
            ? 'border-[#C4A235] bg-[#C4A235]/10' 
            : 'border-[#2D5A3D]/30 bg-white/50 hover:border-[#2D5A3D]/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="w-10 h-10 rounded-lg bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
          <Plus size={20} className="text-[#2D5A3D]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#2d2d2d]">
            {isDragging ? 'Drop files here' : 'Upload photos & videos'}
          </p>
          <p className="text-xs text-[#666]">EXIF data extracted automatically</p>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-[#666] bg-[#2D5A3D]/10 px-2 py-1 rounded">
              {completedCount}/{files.length}
            </span>
            {pendingCount > 0 && !isUploading && (
              <button
                onClick={(e) => { e.stopPropagation(); uploadFiles() }}
                className="px-3 py-1.5 bg-[#2D5A3D] text-white text-xs font-medium rounded-lg hover:bg-[#355a48] transition-colors flex items-center gap-1"
              >
                <Upload size={12} />
                Upload
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded File Preview */}
      {isExpanded && files.length > 0 && (
        <div className="mt-3 p-3 bg-white/60 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-xs text-[#666]">
              <span>{files.length} files</span>
              {hasGPS > 0 && (
                <span className="flex items-center gap-1 text-[#2D5A3D]">
                  <MapPin size={10} /> {hasGPS} with GPS
                </span>
              )}
            </div>
            <button
              onClick={() => { setFiles([]); setIsExpanded(false) }}
              className="text-xs text-[#666] hover:text-red-500"
            >
              Clear all
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {files.map((f, i) => (
              <div key={i} className="relative flex-shrink-0 w-16 h-16 group">
                <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={f.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {f.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={16} className="text-white animate-spin" />
                    </div>
                  )}
                  {f.status === 'complete' && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </div>
                {f.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-white" />
                  </button>
                )}
                {f.exif?.lat && (
                  <div className="absolute bottom-0.5 left-0.5 w-3 h-3 bg-[#C4A235] rounded-full flex items-center justify-center">
                    <MapPin size={6} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
