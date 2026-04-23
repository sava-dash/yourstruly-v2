'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, Loader2, Check, AlertCircle } from 'lucide-react'

interface UploadedFile {
  url: string
  name: string
  type: string
  /** Storage path */
  path?: string
  /** Detected faces from Rekognition */
  faces?: any[]
  /** memory_media row ID — created during upload for face tagging */
  mediaId?: string
  /** Focal point (0-1) computed from the primary face — keeps the face in-frame under object-fit: cover */
  displayPosition?: { x: number; y: number } | null
}

interface MediaUploadCardProps {
  onUpload: (files: UploadedFile[]) => void
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function MediaUploadCard({ onUpload }: MediaUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadedCount, setUploadedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    setStatus('uploading')
    setErrorMessage(null)
    const total = files.length
    setProgress({ current: 0, total })

    const uploaded: UploadedFile[] = []
    const failures: string[] = []

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'memories')

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          failures.push(err.error || `Failed: ${file.name}`)
          continue
        }
        const data = await res.json()
        if (data.url) {
          uploaded.push({
            url: data.url,
            name: file.name,
            type: file.type,
            path: data.path,
            faces: data.faces,
            mediaId: data.mediaId,
            displayPosition: data.displayPosition ?? null,
          })
        }
      } catch (err: any) {
        failures.push(err?.message || `Failed: ${file.name}`)
      }
      setProgress(prev => ({ ...prev, current: prev.current + 1 }))
    }

    if (uploaded.length > 0) {
      onUpload(uploaded)
      setUploadedCount(prev => prev + uploaded.length)
    }

    if (failures.length > 0 && uploaded.length === 0) {
      setStatus('error')
      setErrorMessage(failures[0] || 'Upload failed')
    } else if (failures.length > 0) {
      setStatus('success')
      setErrorMessage(`${failures.length} of ${total} failed to upload`)
    } else {
      setStatus('success')
    }

    // Reset after 2.5 seconds back to idle so users can upload more
    setTimeout(() => {
      setStatus('idle')
      setErrorMessage(null)
      setProgress({ current: 0, total: 0 })
    }, 2500)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
        <ImageIcon size={12} /> Add Media
      </h3>

      <div
        className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          status === 'success'
            ? 'border-[#2D5A3D] bg-[#E6F0EA]'
            : status === 'error'
            ? 'border-[#B8562E] bg-[#FBF0EB]'
            : isDragging
            ? 'border-[#2D5A3D] bg-[#E6F0EA]'
            : 'border-[#DDE3DF] hover:border-[#94A09A] bg-[#F5F3EE]'
        }`}
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (status === 'idle') setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (status !== 'uploading') handleFiles(e.dataTransfer.files)
        }}
      >
        {status === 'uploading' ? (
          <>
            <Loader2 size={24} className="text-[#2D5A3D] animate-spin mb-2" />
            <p className="text-xs text-[#5A6660] text-center">
              Uploading {progress.current} of {progress.total}…
            </p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-12 h-12 rounded-full bg-[#2D5A3D] flex items-center justify-center mb-2">
              <Check size={22} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-xs font-semibold text-[#2D5A3D] text-center">
              {uploadedCount === 1 ? 'Photo uploaded!' : `${uploadedCount} photos uploaded!`}
            </p>
            {errorMessage && (
              <p className="text-[10px] text-[#B8562E] text-center mt-1">{errorMessage}</p>
            )}
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle size={24} className="text-[#B8562E] mb-2" />
            <p className="text-xs font-semibold text-[#B8562E] text-center">Upload failed</p>
            {errorMessage && (
              <p className="text-[10px] text-[#5A6660] text-center mt-1 px-4">{errorMessage}</p>
            )}
            <p className="text-[10px] text-[#94A09A] text-center mt-2">Tap to try again</p>
          </>
        ) : (
          <>
            <Upload size={24} className="text-[#94A09A] mb-2" />
            <p className="text-xs text-[#94A09A] text-center">
              Drop photos/videos here<br />or tap to browse
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          // Reset the input so the same file can be picked again
          e.target.value = ''
        }}
      />
    </div>
  )
}
