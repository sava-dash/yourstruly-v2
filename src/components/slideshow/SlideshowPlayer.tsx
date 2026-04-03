'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Play, Pause, SkipBack, SkipForward, 
  Download, Volume2, VolumeX, Maximize, Minimize,
  Music, ChevronLeft, ChevronRight, Loader2, Check
} from 'lucide-react'
import Image from 'next/image'
// FFmpeg loaded dynamically to avoid 25MB WASM in client bundle
// import { FFmpeg } from '@ffmpeg/ffmpeg' — loaded on demand
// import { fetchFile, toBlobURL } from '@ffmpeg/util' — loaded on demand

type FFmpegType = import('@ffmpeg/ffmpeg').FFmpeg

// Singleton FFmpeg instance for reuse
let ffmpegInstance: FFmpegType | null = null

interface SlideItem {
  id: string
  url: string
  title?: string
  description?: string
  date?: string
}

interface MusicTrack {
  id: string
  name: string
  url: string
  duration?: string
}

interface SlideshowPlayerProps {
  items: SlideItem[]
  title?: string
  isOpen: boolean
  onClose: () => void
  voiceRecordingUrl?: string
  backgroundMusicUrl?: string
  autoPlay?: boolean
  slideDuration?: number
  showDownload?: boolean
}

// Available music tracks
const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'none', name: 'No Music', url: '' },
  { id: 'piano', name: 'Gentle Piano', url: '/audio/slideshow/gentle-piano.mp3', duration: '3:24' },
  { id: 'acoustic', name: 'Soft Acoustic', url: '/audio/slideshow/soft-acoustic.mp3', duration: '2:58' },
  { id: 'strings', name: 'Warm Strings', url: '/audio/slideshow/warm-strings.mp3', duration: '4:12' },
  { id: 'memories', name: 'Precious Memories', url: '/audio/slideshow/precious-memories.mp3', duration: '3:45' },
  { id: 'family', name: 'Family Moments', url: '/audio/slideshow/family-moments.mp3', duration: '3:30' },
]

export default function SlideshowPlayer({
  items,
  title,
  isOpen,
  onClose,
  voiceRecordingUrl,
  backgroundMusicUrl,
  autoPlay = true,
  slideDuration = 5,
  showDownload = true,
}: SlideshowPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack>(
    backgroundMusicUrl 
      ? { id: 'custom', name: 'Custom', url: backgroundMusicUrl }
      : MUSIC_TRACKS[0]
  )
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStage, setExportStage] = useState<'recording' | 'converting' | 'done'>('recording')
  const [audioError, setAudioError] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const voiceRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const totalSlides = items.length + 1
  const isLastSlide = currentIndex === items.length

  // Handle slide progression
  useEffect(() => {
    if (!isOpen || !isPlaying || isExporting) return

    if (timerRef.current) clearTimeout(timerRef.current)
    if (progressRef.current) clearInterval(progressRef.current)

    setProgress(0)
    const progressStep = 100 / (slideDuration * 20)
    progressRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + progressStep, 100))
    }, 50)

    timerRef.current = setTimeout(() => {
      if (currentIndex < items.length) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setIsPlaying(false)
      }
    }, slideDuration * 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [currentIndex, isPlaying, isOpen, slideDuration, items.length, isExporting])

  // Handle audio playback
  useEffect(() => {
    if (!isOpen) return

    const audio = voiceRecordingUrl ? voiceRef.current : audioRef.current
    if (audio && selectedTrack.url) {
      setAudioError(null)
      audio.muted = isMuted
      audio.src = selectedTrack.url
      
      // Handle load errors
      audio.onerror = () => {
        setAudioError('Music file not found')
        console.warn(`Audio file not available: ${selectedTrack.url}`)
      }
      
      if (isPlaying && !isExporting) {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') {
            setAudioError('Could not play audio')
          }
        })
      } else {
        audio.pause()
      }
    }
  }, [isOpen, isPlaying, isMuted, voiceRecordingUrl, selectedTrack, isExporting])

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0)
      setProgress(0)
      setIsPlaying(autoPlay)
      setShowMusicPicker(false)
      setIsExporting(false)
      if (audioRef.current) audioRef.current.pause()
      if (voiceRef.current) voiceRef.current.pause()
    }
  }, [isOpen, autoPlay])

  // Keyboard controls
  useEffect(() => {
    if (!isOpen || isExporting) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'm':
          setIsMuted(prev => !prev)
          break
        case 'f':
          toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isExporting])

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
    setProgress(0)
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(items.length, prev + 1))
    setProgress(0)
  }, [items.length])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Load FFmpeg instance (lazy, singleton)
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegInstance && ffmpegInstance.loaded) {
      return ffmpegInstance
    }
    
    // Dynamic import to avoid 25MB WASM in initial bundle
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()

    // Progress callback for conversion
    ffmpeg.on('progress', ({ progress }) => {
      setExportProgress(Math.round(progress * 100))
    })

    // Load from local files (faster than CDN)
    const baseURL = '/ffmpeg'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    
    ffmpegInstance = ffmpeg
    return ffmpeg
  }, [])

  // Convert WebM to MP4 using FFmpeg
  const convertWebMToMP4 = useCallback(async (webmBlob: Blob): Promise<Blob> => {
    setExportStage('converting')
    setExportProgress(0)
    
    const ffmpeg = await loadFFmpeg()
    
    // Write input file
    const { fetchFile } = await import('@ffmpeg/util')
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob))
    
    // Convert to MP4 with H.264 codec for maximum compatibility
    // Using -movflags +faststart for web/mobile streaming
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      'output.mp4'
    ])
    
    // Read output file
    const mp4Data = await ffmpeg.readFile('output.mp4')
    
    // Cleanup
    await ffmpeg.deleteFile('input.webm')
    await ffmpeg.deleteFile('output.mp4')
    
    // Convert FileData (Uint8Array) to Blob
    const mp4Buffer = mp4Data instanceof Uint8Array ? mp4Data : new TextEncoder().encode(mp4Data)
    return new Blob([mp4Buffer as BlobPart], { type: 'video/mp4' })
  }, [loadFFmpeg])

  // Export as MP4
  const handleExport = useCallback(async () => {
    if (items.length === 0) return
    
    setIsExporting(true)
    setExportProgress(0)
    setExportStage('recording')
    setIsPlaying(false)

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Set video dimensions
      canvas.width = 1920
      canvas.height = 1080

      // Prepare MediaRecorder
      const stream = canvas.captureStream(30)
      
      // Add audio track if music selected
      if (selectedTrack.url && audioRef.current) {
        try {
          const audioCtx = new AudioContext()
          const source = audioCtx.createMediaElementSource(audioRef.current)
          const dest = audioCtx.createMediaStreamDestination()
          source.connect(dest)
          source.connect(audioCtx.destination)
          stream.addTrack(dest.stream.getAudioTracks()[0])
        } catch (e) {
          console.log('Could not add audio track:', e)
        }
      }

      const chunks: Blob[] = []
      
      // Try MP4 first (Safari), fall back to WebM (Chrome/Firefox)
      const mimeTypes = [
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm'
      ]
      const supportedMimeType = mimeTypes.find(mt => MediaRecorder.isTypeSupported(mt)) || 'video/webm'
      const isNativeMP4 = supportedMimeType.includes('mp4')
      
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        videoBitsPerSecond: 5000000
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      const recordingComplete = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
      })

      recorder.start()

      // Load and draw all images
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = document.createElement('img')
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = url
        })
      }

      // Draw each slide
      for (let i = 0; i <= items.length; i++) {
        setExportProgress(Math.round((i / (items.length + 1)) * 100))

        if (i < items.length) {
          // Photo slide
          const item = items[i]
          try {
            const img = await loadImage(item.url)
            
            // Fill background
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Calculate dimensions to fit image
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            ) * 0.85

            const w = img.width * scale
            const h = img.height * scale
            const x = (canvas.width - w) / 2
            const y = (canvas.height - h) / 2

            // Draw rounded rectangle clip path
            ctx.save()
            ctx.beginPath()
            const radius = 16
            ctx.roundRect(x, y, w, h, radius)
            ctx.clip()
            ctx.drawImage(img, x, y, w, h)
            ctx.restore()

            // Draw title if exists
            if (item.title || item.date) {
              ctx.fillStyle = 'rgba(0,0,0,0.5)'
              ctx.fillRect(0, canvas.height - 120, canvas.width, 120)
              
              ctx.fillStyle = '#ffffff'
              ctx.font = 'bold 32px sans-serif'
              ctx.textAlign = 'center'
              if (item.title) {
                ctx.fillText(item.title, canvas.width / 2, canvas.height - 70)
              }
              if (item.date) {
                ctx.font = '24px sans-serif'
                ctx.fillStyle = 'rgba(255,255,255,0.7)'
                ctx.fillText(item.date, canvas.width / 2, canvas.height - 35)
              }
            }
          } catch (e) {
            console.error('Failed to load image:', item.url, e)
            ctx.fillStyle = '#1a1a1a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
        } else {
          // Final logo slide
          // Brand gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          gradient.addColorStop(0, '#F2F1E5')
          gradient.addColorStop(0.5, '#E8E4D6')
          gradient.addColorStop(1, '#DED8C8')
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw logo text (since we can't easily load SVG)
          ctx.fillStyle = '#406A56'
          ctx.font = 'italic bold 72px Georgia, serif'
          ctx.textAlign = 'center'
          ctx.fillText('YoursTruly', canvas.width / 2, canvas.height / 2 - 20)
          
          ctx.fillStyle = '#406A56'
          ctx.globalAlpha = 0.6
          ctx.font = '28px sans-serif'
          ctx.fillText('Document Your Life', canvas.width / 2, canvas.height / 2 + 40)
          
          ctx.globalAlpha = 0.4
          ctx.font = '20px sans-serif'
          ctx.fillText('yourstruly.love', canvas.width / 2, canvas.height / 2 + 80)
          ctx.globalAlpha = 1
        }

        // Hold each frame for slide duration
        await new Promise(resolve => setTimeout(resolve, slideDuration * 1000))
      }

      recorder.stop()
      await recordingComplete

      // Create blob from recorded chunks
      let finalBlob = new Blob(chunks, { type: supportedMimeType })
      let finalExt = isNativeMP4 ? 'mp4' : 'webm'
      
      // If recorded as WebM, convert to MP4 for universal compatibility
      if (!isNativeMP4) {
        try {
          setExportStage('converting')
          setExportProgress(0)
          finalBlob = await convertWebMToMP4(finalBlob)
          finalExt = 'mp4'
        } catch (conversionError) {
          console.warn('MP4 conversion failed, falling back to WebM:', conversionError)
          // Keep WebM if conversion fails
        }
      }
      
      setExportStage('done')

      // Create download link
      const url = URL.createObjectURL(finalBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'slideshow'}-${Date.now()}.${finalExt}`
      a.click()
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setExportStage('recording')
    }
  }, [items, title, slideDuration, selectedTrack, convertWebMToMP4])

  if (!isOpen) return null

  // Portal target — ensures fixed overlay escapes any transformed ancestor
  // (e.g. framer-motion animated parents with overflow-hidden)
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  if (items.length === 0) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      >
        <p className="text-white/60 text-lg mb-4">No photos in this album</p>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          Close
        </button>
      </motion.div>,
      portalTarget
    )
  }

  const currentItem = items[currentIndex]

  return createPortal(
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Audio Elements */}
      <audio ref={audioRef} loop />
      {voiceRecordingUrl && <audio ref={voiceRef} src={voiceRecordingUrl} />}

      {/* Export Progress Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
          <p className="text-white text-lg mb-2">
            {exportStage === 'recording' && 'Recording slideshow...'}
            {exportStage === 'converting' && 'Converting to MP4...'}
            {exportStage === 'done' && 'Preparing download...'}
          </p>
          <p className="text-white/50 text-sm mb-3">
            {exportStage === 'converting' && 'This ensures your video works on iOS, WhatsApp & social media'}
          </p>
          <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#406A56] transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-white/60 text-sm mt-2">{exportProgress}%</p>
        </div>
      )}

      {/* Header - Always visible close button */}
      <div className="absolute top-0 left-0 right-0 z-[60] pt-4 px-4 pb-6 bg-gradient-to-b from-black/90 via-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-white/30 hover:bg-white/40 text-white transition-colors shadow-xl border border-white/20"
              aria-label="Close slideshow (Esc)"
              title="Close (Esc)"
            >
              <X size={28} strokeWidth={2.5} />
            </button>
            {title && <h2 className="text-white font-semibold text-lg">{title}</h2>}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {totalSlides}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {isLastSlide ? (
            // Final Logo Slide - Brand background with centered logo
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F2F1E5 0%, #E8E4D6 50%, #DED8C8 100%)'
              }}
            >
              <div className="text-center">
                <h1 
                  className="text-6xl md:text-7xl font-bold italic mb-4"
                  style={{ 
                    color: '#406A56',
                    fontFamily: 'Georgia, serif'
                  }}
                >
                  YoursTruly
                </h1>
                <p className="text-xl text-[#406A56]/60 mb-2">Document Your Life</p>
                <p className="text-sm text-[#406A56]/40">yourstruly.love</p>
              </div>
            </motion.div>
          ) : (
            // Photo Slide
            <motion.div
              key={currentItem?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="relative w-full h-full flex items-center justify-center p-8"
            >
              <img
                src={currentItem?.url}
                alt={currentItem?.title || ''}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              
              {(currentItem?.title || currentItem?.date) && (
                <div className="absolute bottom-16 left-0 right-0 px-8">
                  <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto text-center">
                    {currentItem?.title && (
                      <h3 className="text-white font-semibold mb-1">{currentItem.title}</h3>
                    )}
                    {currentItem?.date && (
                      <p className="text-white/70 text-sm">{currentItem.date}</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={goToNext}
          disabled={isLastSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Music Picker Modal */}
      <AnimatePresence>
        {showMusicPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowMusicPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Music size={20} />
                Select Music
              </h3>
              <div className="space-y-2">
                {MUSIC_TRACKS.map(track => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedTrack(track)
                      setShowMusicPicker(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedTrack.id === track.id
                        ? 'bg-[#406A56] text-white'
                        : 'bg-white/5 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    <span>{track.name}</span>
                    <div className="flex items-center gap-2">
                      {track.duration && (
                        <span className="text-sm opacity-60">{track.duration}</span>
                      )}
                      {selectedTrack.id === track.id && <Check size={16} />}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-xs mt-4 text-center">
                Music will play during the slideshow
              </p>
              {audioError && (
                <p className="text-red-400 text-xs mt-2 text-center">
                  ⚠️ {audioError} — add audio files to /public/audio/slideshow/
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="absolute bottom-20 left-8 right-8">
        <div className="flex gap-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div 
              key={i}
              className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden cursor-pointer"
              onClick={() => {
                setCurrentIndex(i)
                setProgress(0)
              }}
            >
              <div 
                className="h-full bg-white transition-all duration-100"
                style={{ 
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="p-4 rounded-full bg-white text-black hover:bg-white/90 transition-colors"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          
          <button
            onClick={goToNext}
            disabled={isLastSlide}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
          >
            <SkipForward size={20} />
          </button>

          <div className="w-px h-6 bg-white/20 mx-2" />

          {/* Music Button */}
          <button
            onClick={() => setShowMusicPicker(true)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
              selectedTrack.id !== 'none' ? 'text-[#406A56]' : 'text-white'
            }`}
            title="Select music"
          >
            <Music size={20} />
          </button>

          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          {showDownload && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors disabled:opacity-50"
              title="Export as video"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      </div>
    </motion.div>,
    portalTarget
  )
}

/**
 * PlayButton overlay component for albums/memories
 */
export function PlayButtonOverlay({
  onClick,
  size = 'md',
  className = '',
}: {
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`
        absolute inset-0 flex items-center justify-center 
        bg-black/30 opacity-0 hover:opacity-100 
        transition-opacity duration-200
        ${className}
      `}
    >
      <div className={`
        ${sizes[size]} 
        rounded-full bg-white/90 backdrop-blur-sm 
        flex items-center justify-center
        shadow-lg hover:scale-110 transition-transform
      `}>
        <Play size={iconSizes[size]} className="text-[#406A56] ml-1" />
      </div>
    </button>
  )
}
