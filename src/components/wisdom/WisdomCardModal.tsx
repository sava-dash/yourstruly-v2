'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Download, Copy, Check, Share2, Image as ImageIcon, 
  Sparkles, Quote, Sun, Zap, Camera, Loader2, Twitter,
  Facebook, MessageCircle
} from 'lucide-react'
// html2canvas loaded dynamically at call site to reduce bundle size

interface WisdomCardModalProps {
  isOpen: boolean
  onClose: () => void
  wisdomText: string
  wisdomTitle?: string
  userName: string
  userPhoto?: string | null
}

type CardTemplate = 'minimal' | 'warm' | 'bold' | 'photo'

interface TemplateConfig {
  id: CardTemplate
  name: string
  icon: typeof Sun
  description: string
}

const TEMPLATES: TemplateConfig[] = [
  { id: 'minimal', name: 'Minimal', icon: Sparkles, description: 'Clean & elegant' },
  { id: 'warm', name: 'Warm', icon: Sun, description: 'Soft & inviting' },
  { id: 'bold', name: 'Bold', icon: Zap, description: 'Eye-catching' },
  { id: 'photo', name: 'Photo', icon: Camera, description: 'Personal touch' },
]

// Card dimensions (Instagram story friendly 1080x1920, scaled down for preview)
const CARD_WIDTH = 540
const CARD_HEIGHT = 960
const EXPORT_SCALE = 2 // Export at 1080x1920

export default function WisdomCardModal({
  isOpen,
  onClose,
  wisdomText,
  wisdomTitle,
  userName,
  userPhoto,
}: WisdomCardModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>('minimal')
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false)
      setExportSuccess(null)
    }
  }, [isOpen])

  // Truncate text for card display
  const displayText = wisdomText.length > 280 
    ? wisdomText.slice(0, 277) + '...' 
    : wisdomText

  // Generate the card image
  const generateCardImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: EXPORT_SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/png', 1.0)
      })
    } catch (error) {
      console.error('Error generating card:', error)
      return null
    }
  }, [])

  // Download as PNG
  const handleDownload = async () => {
    setIsExporting(true)
    try {
      const blob = await generateCardImage()
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `wisdom-card-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setExportSuccess('Downloaded!')
        setTimeout(() => setExportSuccess(null), 2000)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    setIsExporting(true)
    try {
      const blob = await generateCardImage()
      if (blob && navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopied(true)
        setExportSuccess('Copied to clipboard!')
        setTimeout(() => {
          setCopied(false)
          setExportSuccess(null)
        }, 2000)
      } else {
        // Fallback for browsers that don't support clipboard image
        setExportSuccess('Clipboard not supported, try download')
        setTimeout(() => setExportSuccess(null), 2000)
      }
    } catch (error) {
      console.error('Copy failed:', error)
      setExportSuccess('Copy failed, try download')
      setTimeout(() => setExportSuccess(null), 2000)
    } finally {
      setIsExporting(false)
    }
  }

  // Share to social (opens share dialog where available)
  const handleShare = async () => {
    if (navigator.share) {
      setIsExporting(true)
      try {
        const blob = await generateCardImage()
        if (blob) {
          const file = new File([blob], 'wisdom-card.png', { type: 'image/png' })
          await navigator.share({
            title: wisdomTitle || 'Wisdom from YoursTruly',
            text: displayText,
            files: [file],
          })
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error)
        }
      } finally {
        setIsExporting(false)
      }
    }
  }

  if (!isOpen) return null

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A3552] to-[#D9C61A] flex items-center justify-center">
                <ImageIcon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#2d2d2d]">Share as Card</h3>
                <p className="text-sm text-gray-500">Create a beautiful shareable image</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Card Preview */}
              <div className="flex-1 flex items-center justify-center">
                <div 
                  className="relative shadow-2xl rounded-2xl overflow-hidden"
                  style={{ width: CARD_WIDTH / 2, height: CARD_HEIGHT / 2 }}
                >
                  {/* Actual card element for export - hidden but positioned */}
                  <div 
                    ref={cardRef}
                    className="absolute top-0 left-0 origin-top-left"
                    style={{ 
                      width: CARD_WIDTH,
                      height: CARD_HEIGHT,
                      transform: 'scale(0.5)',
                    }}
                  >
                    <CardContent
                      template={selectedTemplate}
                      text={displayText}
                      userName={userName}
                      userPhoto={userPhoto}
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="lg:w-72 space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-[#2d2d2d] mb-3">
                    Choose Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map((template) => {
                      const Icon = template.icon
                      const isSelected = selectedTemplate === template.id
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-[#4A3552] bg-[#4A3552]/5'
                              : 'border-gray-200 hover:border-[#4A3552]/30'
                          }`}
                        >
                          <Icon 
                            size={20} 
                            className={isSelected ? 'text-[#4A3552]' : 'text-gray-400'} 
                          />
                          <div className={`mt-1 text-sm font-medium ${
                            isSelected ? 'text-[#4A3552]' : 'text-gray-700'
                          }`}>
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {template.description}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Export Options */}
                <div>
                  <label className="block text-sm font-medium text-[#2d2d2d] mb-3">
                    Export Options
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={handleDownload}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4A3552] hover:bg-[#5a4562] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {isExporting ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Download size={18} />
                      )}
                      Download PNG
                    </button>

                    <button
                      onClick={handleCopyToClipboard}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F2F1E5] hover:bg-[#e8e7db] text-[#2d2d2d] rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {copied ? (
                        <>
                          <Check size={18} className="text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          Copy to Clipboard
                        </>
                      )}
                    </button>

                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={handleShare}
                        disabled={isExporting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 hover:bg-gray-50 text-[#2d2d2d] rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        <Share2 size={18} />
                        Share...
                      </button>
                    )}
                  </div>
                </div>

                {/* Success Message */}
                <AnimatePresence>
                  {exportSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center font-medium"
                    >
                      {exportSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tips */}
                <div className="p-4 bg-[#F2F1E5] rounded-xl">
                  <p className="text-sm text-[#4A3552]">
                    <strong>💡 Tip:</strong> These cards are sized perfectly for Instagram Stories (1080×1920). Share your wisdom with the world!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}

// Card Content Component - renders the actual card design
interface CardContentProps {
  template: CardTemplate
  text: string
  userName: string
  userPhoto?: string | null
}

function CardContent({ template, text, userName, userPhoto }: CardContentProps) {
  // Common styles
  const baseStyles = "w-full h-full flex flex-col items-center justify-center p-12 relative overflow-hidden"

  switch (template) {
    case 'minimal':
      return (
        <div className={`${baseStyles} bg-white`}>
          {/* Subtle decorative elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4A3552] via-[#D9C61A] to-[#C35F33]" />
          
          {/* Quote mark */}
          <div className="absolute top-20 left-10 opacity-10">
            <Quote size={120} className="text-[#4A3552]" />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center max-w-[420px]">
            <p 
              className="text-[#2d2d2d] leading-relaxed mb-8"
              style={{ 
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: text.length > 200 ? '24px' : text.length > 100 ? '28px' : '32px',
                fontWeight: 400,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{text}&rdquo;
            </p>

            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-px bg-[#4A3552]/30" />
              <p 
                className="text-[#4A3552] text-lg"
                style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
              >
                {userName}
              </p>
              <div className="w-12 h-px bg-[#4A3552]/30" />
            </div>
          </div>

          {/* Branding */}
          <div className="absolute bottom-8 flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A3552] to-[#D9C61A]" />
            <span className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}>
              YoursTruly
            </span>
          </div>
        </div>
      )

    case 'warm':
      return (
        <div 
          className={`${baseStyles}`}
          style={{ 
            background: 'linear-gradient(180deg, #FDF8F3 0%, #F5EDE4 50%, #EDE3D6 100%)'
          }}
        >
          {/* Paper texture overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Decorative corner flourishes */}
          <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-[#C35F33]/30 rounded-tl-xl" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-r-4 border-b-4 border-[#C35F33]/30 rounded-br-xl" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-[400px]">
            {/* Decorative quote */}
            <div className="text-[#C35F33] text-6xl mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              ❝
            </div>

            <p 
              className="text-[#3d3d3d] leading-relaxed mb-8"
              style={{ 
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: text.length > 200 ? '22px' : text.length > 100 ? '26px' : '30px',
                fontWeight: 400,
              }}
            >
              {text}
            </p>

            <div className="text-[#C35F33] text-6xl mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              ❞
            </div>

            <p 
              className="text-[#C35F33] text-xl font-medium"
              style={{ fontFamily: 'var(--font-handwritten), cursive' }}
            >
              — {userName}
            </p>
          </div>

          {/* Branding */}
          <div className="absolute bottom-8 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#C35F33]" />
            <span 
              className="text-sm text-[#8a7a6a]"
              style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
            >
              YoursTruly
            </span>
          </div>
        </div>
      )

    case 'bold':
      return (
        <div 
          className={`${baseStyles}`}
          style={{ 
            background: 'linear-gradient(135deg, #4A3552 0%, #6a4572 50%, #8a5592 100%)'
          }}
        >
          {/* Geometric accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D9C61A]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C35F33]/20 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-[420px]">
            {/* Quote marks */}
            <div className="text-[#D9C61A] text-8xl leading-none mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              "
            </div>

            <p 
              className="text-white leading-relaxed mb-8"
              style={{ 
                fontFamily: 'var(--font-inter-tight), sans-serif',
                fontSize: text.length > 200 ? '22px' : text.length > 100 ? '26px' : '30px',
                fontWeight: 600,
                textShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {text}
            </p>

            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-1 bg-[#D9C61A]" />
              <p 
                className="text-[#D9C61A] text-xl font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
              >
                {userName}
              </p>
              <div className="w-16 h-1 bg-[#D9C61A]" />
            </div>
          </div>

          {/* Branding */}
          <div className="absolute bottom-8 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#D9C61A]" />
            </div>
            <span className="text-sm text-white/70" style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}>
              YoursTruly
            </span>
          </div>
        </div>
      )

    case 'photo':
      return (
        <div className={`${baseStyles} bg-[#2d2d2d]`}>
          {/* Photo background */}
          {userPhoto ? (
            <img 
              src={userPhoto} 
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            /* Decorative gradient if no photo */
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #406A56 0%, #4A3552 50%, #C35F33 100%)'
              }}
            />
          )}

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-[400px]">
            <div className="mb-6">
              <Quote size={48} className="text-white/30 mx-auto" />
            </div>

            <p 
              className="text-white leading-relaxed mb-8"
              style={{ 
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: text.length > 200 ? '22px' : text.length > 100 ? '26px' : '30px',
                fontWeight: 400,
                fontStyle: 'italic',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              &ldquo;{text}&rdquo;
            </p>

            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-px bg-white/50" />
              <p 
                className="text-white text-lg font-medium"
                style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
              >
                {userName}
              </p>
              <div className="w-10 h-px bg-white/50" />
            </div>
          </div>

          {/* Branding */}
          <div className="absolute bottom-8 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D9C61A]" />
            </div>
            <span className="text-sm text-white/60" style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}>
              YoursTruly
            </span>
          </div>
        </div>
      )

    default:
      return null
  }
}
