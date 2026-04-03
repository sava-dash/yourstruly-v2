'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Calendar, MapPin, Lock, Clock, Eye, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface Memory {
  id: string
  title: string
  description?: string
  date?: string
  location?: string
  memory_media: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
    width?: number
    height?: number
  }[]
  profiles: {
    full_name: string
    avatar_url?: string
  }
}

interface Wisdom {
  id: string
  title: string
  content: string
  category?: string
  created_at: string
  profiles: {
    full_name: string
    avatar_url?: string
  }
}

interface ViewerData {
  access: 'granted'
  contentType: 'memory' | 'wisdom'
  content: Memory | Wisdom
  sharedBy?: {
    full_name: string
    avatar_url?: string
  }
  viewer: {
    isLoggedIn: boolean
    userId?: string
  }
}

interface ErrorData {
  error: string
  reason?: string
  message?: string
}

export default function QRViewerPage() {
  const params = useParams()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ViewerData | null>(null)
  const [error, setError] = useState<ErrorData | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(`/api/qr/${token}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result)
        } else {
          setData(result)
        }
      } catch (err) {
        setError({ error: 'Failed to load content' })
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading shared content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return <AccessDeniedView error={error} />
  }

  if (!data) {
    return <AccessDeniedView error={{ error: 'Content not found' }} />
  }

  return data.contentType === 'memory' 
    ? <MemoryViewer 
        memory={data.content as Memory} 
        sharedBy={data.sharedBy} 
        currentImageIndex={currentImageIndex}
        setCurrentImageIndex={setCurrentImageIndex}
      />
    : <WisdomViewer 
        wisdom={data.content as Wisdom} 
        sharedBy={data.sharedBy} 
      />
}

function AccessDeniedView({ error }: { error: ErrorData }) {
  const getIcon = () => {
    switch (error.reason) {
      case 'Token expired':
        return <Clock className="w-16 h-16 text-amber-500" />
      case 'Max views reached':
        return <Eye className="w-16 h-16 text-amber-500" />
      case 'Not authorized':
        return <Lock className="w-16 h-16 text-red-400" />
      default:
        return <AlertCircle className="w-16 h-16 text-red-400" />
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          {getIcon()}
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {error.error || 'Access Denied'}
        </h1>
        <p className="text-gray-600 mb-6">
          {error.message || 'This content is not available.'}
        </p>
        <Link 
          href="/"
          className="inline-flex items-center gap-2 bg-brand-green text-white px-6 py-3 rounded-full hover:bg-brand-green/90 transition-colors"
        >
          <Heart className="w-5 h-5" />
          Visit YoursTruly
        </Link>
      </div>
    </div>
  )
}

function MemoryViewer({ 
  memory, 
  sharedBy,
  currentImageIndex,
  setCurrentImageIndex
}: { 
  memory: Memory
  sharedBy?: { full_name: string; avatar_url?: string }
  currentImageIndex: number
  setCurrentImageIndex: (index: number) => void
}) {
  const images = memory.memory_media?.filter(m => m.file_type?.startsWith('image/')) || []
  const coverImage = images.find(m => m.is_cover) || images[0]

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((currentImageIndex + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-brand-green" fill="currentColor" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Shared via YoursTruly</p>
                {sharedBy && (
                  <p className="text-sm font-medium text-gray-800">by {sharedBy.full_name}</p>
                )}
              </div>
            </div>
            <Link 
              href="/"
              className="text-sm text-brand-green hover:underline font-medium"
            >
              Create your own
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Photo Gallery */}
        {images.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="relative aspect-[4/3] bg-gray-100">
              <Image
                src={images[currentImageIndex]?.file_url || coverImage.file_url}
                alt={memory.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                  </button>
                  
                  {/* Dots indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Memory Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{memory.title}</h1>
          
          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mb-4">
            {memory.date && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">
                  {new Date(memory.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            {memory.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{memory.location}</span>
              </div>
            )}
          </div>

          {memory.description && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {memory.description}
            </p>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">
            Create your own memory collection with YoursTruly
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-green text-white px-8 py-3 rounded-full hover:bg-brand-green/90 transition-colors font-medium"
          >
            <Heart className="w-5 h-5" />
            Get Started Free
          </Link>
          <p className="text-brand-green/40 text-xs mt-4 italic tracking-wide">Live on.</p>
        </div>
      </div>
    </div>
  )
}

function WisdomViewer({ 
  wisdom, 
  sharedBy 
}: { 
  wisdom: Wisdom
  sharedBy?: { full_name: string; avatar_url?: string }
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-brand-green" fill="currentColor" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Shared via YoursTruly</p>
                {sharedBy && (
                  <p className="text-sm font-medium text-gray-800">by {sharedBy.full_name}</p>
                )}
              </div>
            </div>
            <Link 
              href="/"
              className="text-sm text-brand-green hover:underline font-medium"
            >
              Create your own
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
          {/* Decorative quote marks */}
          <div className="absolute top-4 left-4 text-8xl text-brand-green/10 font-serif leading-none">
            &ldquo;
          </div>
          <div className="absolute bottom-4 right-4 text-8xl text-brand-green/10 font-serif leading-none rotate-180">
            &ldquo;
          </div>

          <div className="relative">
            {wisdom.category && (
              <span className="inline-block px-3 py-1 bg-brand-green/10 text-brand-green text-sm rounded-full mb-4">
                {wisdom.category}
              </span>
            )}
            
            <h1 className="text-2xl font-bold text-gray-800 mb-6">{wisdom.title}</h1>
            
            <div className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
              {wisdom.content}
            </div>

            {wisdom.profiles && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
                {wisdom.profiles.avatar_url ? (
                  <Image
                    src={wisdom.profiles.avatar_url}
                    alt={wisdom.profiles.full_name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-brand-green" fill="currentColor" />
                  </div>
                )}
                <span className="font-medium text-gray-800">{wisdom.profiles.full_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">
            Capture and share your wisdom with YoursTruly
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-green text-white px-8 py-3 rounded-full hover:bg-brand-green/90 transition-colors font-medium"
          >
            <Heart className="w-5 h-5" />
            Get Started Free
          </Link>
          <p className="text-brand-green/40 text-xs mt-4 italic tracking-wide">Live on.</p>
        </div>
      </div>
    </div>
  )
}
