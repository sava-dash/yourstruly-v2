'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  X, 
  Camera, 
  Upload, 
  Scan, 
  Sparkles, 
  Check, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  ZoomIn,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DetectedPhoto } from '@/lib/photoDigitize'

interface DigitizeModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (memoryId: string, photoCount: number) => void
}

type Step = 'capture' | 'detect' | 'review' | 'process' | 'complete'

export default function DigitizeModal({ isOpen, onClose, onComplete }: DigitizeModalProps) {
  const [step, setStep] = useState<Step>('capture')
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [detectedPhotos, setDetectedPhotos] = useState<DetectedPhoto[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [isDetecting, setIsDetecting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [enhance, setEnhance] = useState(true)
  const [useAI, setUseAI] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ memoryId: string, count: number } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('capture')
        setOriginalImage(null)
        setOriginalFile(null)
        setDetectedPhotos([])
        setSelectedPhotos(new Set())
        setError(null)
        setProgress(0)
        setResult(null)
      }, 300)
    }
  }, [isOpen])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    setError(null)
    setOriginalFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setOriginalImage(ev.target?.result as string)
      setStep('detect')
      runDetection(file)
    }
    reader.readAsDataURL(file)
  }, [])

  const runDetection = async (file: File) => {
    setIsDetecting(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('useAI', useAI.toString())
      
      const response = await fetch('/api/digitize/detect', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Detection failed')
      }
      
      setDetectedPhotos(data.photos)
      // Select all photos by default
      setSelectedPhotos(new Set(data.photos.map((p: DetectedPhoto) => p.id)))
      setStep('review')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const processPhotos = async () => {
    if (!originalFile || selectedPhotos.size === 0) return
    
    setStep('process')
    setIsProcessing(true)
    setProgress(0)
    setError(null)
    
    try {
      const selectedPhotosList = detectedPhotos.filter(p => selectedPhotos.has(p.id))
      
      const formData = new FormData()
      formData.append('image', originalFile)
      formData.append('photos', JSON.stringify(selectedPhotosList))
      formData.append('enhance', enhance.toString())
      
      const response = await fetch('/api/digitize', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Processing failed')
      }
      
      setResult({
        memoryId: data.memoryId,
        count: data.totalSaved
      })
      setStep('complete')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
      setStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = () => {
    if (result) {
      onComplete(result.memoryId, result.count)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-[24px] border border-white/50 rounded-[20px] shadow-[0_4px_16px_rgba(195,95,51,0.06),0_20px_60px_rgba(0,0,0,0.1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/40 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C4A235]/20 flex items-center justify-center">
              <Scan className="w-5 h-5 text-[#8a7c08]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#2d2d2d]">Digitize Printed Photos</h2>
              <p className="text-xs text-[#666]">
                {step === 'capture' && 'Take a photo or upload a scan'}
                {step === 'detect' && 'Detecting individual photos...'}
                {step === 'review' && 'Review detected photos'}
                {step === 'process' && 'Processing your photos...'}
                {step === 'complete' && 'Done!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step: Capture */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="bg-[#f8f6e8] rounded-xl p-4">
                <h3 className="font-medium text-[#2d2d2d] mb-2">How it works</h3>
                <ol className="text-sm text-[#666] space-y-1">
                  <li>1. Take a photo of your printed photos (single or grid layout)</li>
                  <li>2. We'll detect and crop each individual photo</li>
                  <li>3. Optionally enhance with AI upscaling</li>
                  <li>4. Save them to your gallery</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Camera option */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-[#2D5A3D]/30 hover:border-[#2D5A3D] hover:bg-[#2D5A3D]/5 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-[#2D5A3D]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-[#2d2d2d]">Take Photo</p>
                    <p className="text-xs text-[#666]">Use your camera</p>
                  </div>
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Upload option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-[#C4A235]/30 hover:border-[#C4A235] hover:bg-[#C4A235]/5 transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-[#C4A235]/10 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-[#8a7c08]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-[#2d2d2d]">Upload Scan</p>
                    <p className="text-xs text-[#666]">From your device</p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {/* Options */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C4A235]" />
                  <span className="text-sm text-[#2d2d2d]">Use AI for detection</span>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    useAI ? 'bg-[#2D5A3D]' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                    useAI ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          )}
          
          {/* Step: Detecting */}
          {step === 'detect' && (
            <div className="space-y-4">
              {originalImage && (
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  <img 
                    src={originalImage} 
                    alt="Original" 
                    className="w-full max-h-64 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Detecting photos...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              {/* Original with overlays */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100">
                <img 
                  src={originalImage!} 
                  alt="Original" 
                  className="w-full"
                />
                {/* Detection overlays */}
                <svg 
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${detectedPhotos[0]?.width || 100} ${detectedPhotos[0]?.height || 100}`}
                  preserveAspectRatio="none"
                >
                  {/* We'd need original dimensions here - simplified for now */}
                </svg>
              </div>
              
              {/* Detected photos grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-[#2d2d2d]">
                    {detectedPhotos.length} photo{detectedPhotos.length !== 1 ? 's' : ''} detected
                  </h3>
                  <button
                    onClick={() => {
                      if (selectedPhotos.size === detectedPhotos.length) {
                        setSelectedPhotos(new Set())
                      } else {
                        setSelectedPhotos(new Set(detectedPhotos.map(p => p.id)))
                      }
                    }}
                    className="text-sm text-[#2D5A3D] hover:underline"
                  >
                    {selectedPhotos.size === detectedPhotos.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                
                {detectedPhotos.length === 0 ? (
                  <div className="text-center py-8 text-[#666]">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No photos detected</p>
                    <button
                      onClick={() => setStep('capture')}
                      className="mt-2 text-sm text-[#2D5A3D] hover:underline"
                    >
                      Try a different image
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {detectedPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedPhotos.has(photo.id)
                            ? 'border-[#2D5A3D] ring-2 ring-[#2D5A3D]/20'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        {photo.preview ? (
                          <img 
                            src={photo.preview} 
                            alt={`Photo ${photo.id}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        {selectedPhotos.has(photo.id) && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-[#2D5A3D] rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs">
                            {photo.width}×{photo.height}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhancement option */}
              {detectedPhotos.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-[#f8f6e8] rounded-xl">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-[#8a7c08]" />
                    <div>
                      <span className="text-sm text-[#2d2d2d]">Enhance photos</span>
                      <p className="text-xs text-[#666]">2x upscale + sharpen</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnhance(!enhance)}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      enhance ? 'bg-[#2D5A3D]' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${
                      enhance ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Step: Processing */}
          {step === 'process' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#2D5A3D] animate-spin" />
              </div>
              <h3 className="font-semibold text-[#2d2d2d] mb-1">Processing your photos</h3>
              <p className="text-sm text-[#666]">
                Cropping{enhance ? ' and enhancing' : ''} {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''}...
              </p>
            </div>
          )}
          
          {/* Step: Complete */}
          {step === 'complete' && result && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="font-semibold text-[#2d2d2d] mb-1">Photos saved!</h3>
              <p className="text-sm text-[#666]">
                {result.count} photo{result.count !== 1 ? 's have' : ' has'} been added to your gallery
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between">
          {step === 'capture' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#666] hover:text-[#2d2d2d] transition-colors"
            >
              Cancel
            </button>
          )}
          
          {step === 'review' && (
            <>
              <button
                onClick={() => setStep('capture')}
                className="flex items-center gap-1 px-4 py-2 text-[#666] hover:text-[#2d2d2d] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start over
              </button>
              <button
                onClick={processPhotos}
                disabled={selectedPhotos.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#355a48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          {step === 'complete' && (
            <>
              <div />
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#355a48] transition-colors"
              >
                View in Gallery
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
