'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, Upload, Check, Loader2, Image as ImageIcon, X, Heart } from 'lucide-react'

export default function MobileUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#2D5A3D]" /></div>}>
      <MobileUploadInner />
    </Suspense>
  )
}

function MobileUploadInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [valid, setValid] = useState<boolean | null>(null)
  const [files, setFiles] = useState<Array<{ file: File; preview: string; status: 'pending' | 'uploading' | 'done' | 'error' }>>([])
  const [uploadedCount, setUploadedCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) {
      setValid(false)
      return
    }
    setValid(true)
  }, [token])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || !token) return
    const newFiles = Array.from(fileList).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }))
    setFiles(prev => [...prev, ...newFiles])

    // Upload each file sequentially
    for (let i = 0; i < newFiles.length; i++) {
      const idx = files.length + i
      setFiles(prev => prev.map((f, j) => j === idx ? { ...f, status: 'uploading' } : f))

      try {
        const formData = new FormData()
        formData.append('token', token)
        formData.append('file', newFiles[i].file)

        const res = await fetch('/api/mobile-upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          setFiles(prev => prev.map((f, j) => j === idx ? { ...f, status: 'done' } : f))
          setUploadedCount(c => c + 1)
        } else {
          setFiles(prev => prev.map((f, j) => j === idx ? { ...f, status: 'error' } : f))
        }
      } catch {
        setFiles(prev => prev.map((f, j) => j === idx ? { ...f, status: 'error' } : f))
      }
    }
  }

  if (valid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAFAF7]">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
          <Heart className="w-10 h-10 mx-auto mb-3 text-[#B8562E]" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link expired</h1>
          <p className="text-sm text-gray-500">
            This upload link is invalid or has expired. Generate a new QR code from your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20">
      <div className="max-w-lg mx-auto p-4">
        <div className="text-center mb-6 pt-4">
          <Heart className="w-8 h-8 mx-auto mb-2 text-[#2D5A3D]" />
          <h1 className="text-xl font-bold text-[#1A1F1C]" style={{ fontFamily: 'var(--font-dm-serif, DM Serif Display, serif)' }}>
            Upload to YoursTruly
          </h1>
          <p className="text-sm text-gray-500 mt-1">Photos and videos will appear in your account</p>
        </div>

        {/* Upload buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#2D5A3D]/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
              <Camera size={24} className="text-[#2D5A3D]" />
            </div>
            <span className="text-sm font-medium text-gray-800">Take Photo</span>
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#2D5A3D]/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[#C4A235]/10 flex items-center justify-center">
              <ImageIcon size={24} className="text-[#C4A235]" />
            </div>
            <span className="text-sm font-medium text-gray-800">From Library</span>
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Upload status */}
        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {uploadedCount} of {files.length} uploaded
            </p>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                {f.file.type.startsWith('image/') ? (
                  <img src={f.preview} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                {f.status === 'uploading' && <Loader2 size={20} className="animate-spin text-[#2D5A3D]" />}
                {f.status === 'done' && <Check size={20} className="text-green-500" />}
                {f.status === 'error' && <X size={20} className="text-red-500" />}
              </div>
            ))}
          </div>
        )}

        {uploadedCount > 0 && uploadedCount === files.length && (
          <div className="mt-6 p-4 bg-[#2D5A3D]/5 border border-[#2D5A3D]/15 rounded-2xl text-center">
            <Check className="w-8 h-8 mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-sm font-medium text-[#2D5A3D]">
              {uploadedCount} {uploadedCount === 1 ? 'file' : 'files'} uploaded successfully
            </p>
            <p className="text-xs text-gray-500 mt-1">
              They&apos;ll appear in your Media tab on your computer.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
