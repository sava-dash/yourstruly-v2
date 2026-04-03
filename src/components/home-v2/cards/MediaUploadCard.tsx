'use client'

import { useState, useRef } from 'react'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

interface MediaUploadCardProps {
  onUpload: (files: { url: string; name: string; type: string }[]) => void
}

export function MediaUploadCard({ onUpload }: MediaUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    setIsUploading(true)

    const uploaded: { url: string; name: string; type: string }[] = []
    for (const file of Array.from(files)) {
      // Create a local preview URL for now
      const url = URL.createObjectURL(file)
      uploaded.push({ url, name: file.name, type: file.type })
    }

    onUpload(uploaded)
    setIsUploading(false)
  }

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A6660] flex items-center gap-1.5">
        <ImageIcon size={12} /> Add Media
      </h3>

      <div
        className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          isDragging ? 'border-[#2D5A3D] bg-[#E6F0EA]' : 'border-[#DDE3DF] hover:border-[#94A09A] bg-[#F5F3EE]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        {isUploading ? (
          <Loader2 size={24} className="text-[#94A09A] animate-spin" />
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
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
