'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Loader2, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Photo {
  mediaId: string
  fileUrl: string
  memoryId: string
  createdAt: string
  memoryTitle?: string
  memoryDate?: string
  location?: string
}

export default function SmartAlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albumInfo, setAlbumInfo] = useState<{
    name: string
    avatarUrl?: string
    photoCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadAlbumPhotos()
  }, [resolvedParams.id])

  const loadAlbumPhotos = async () => {
    setIsLoading(true)
    try {
      // Get face tags for this contact
      const res = await fetch(`/api/contacts/${resolvedParams.id}/photos`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data.photos || [])
        setAlbumInfo(data.albumInfo)
      } else {
        // Fallback: check if it's a predefined album like "family"
        const smartRes = await fetch(`/api/smart-albums?type=${resolvedParams.id}`)
        if (smartRes.ok) {
          const data = await smartRes.json()
          if (data.albums && data.albums.length > 0) {
            const album = data.albums[0]
            setPhotos(album.photos || [])
            setAlbumInfo({
              name: album.albumName || 'Album',
              photoCount: album.photoCount || 0,
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to load album photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3] p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link 
          href="/dashboard/smart-albums"
          className="inline-flex items-center gap-2 text-[#406A56] hover:text-[#4a7a64] transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Smart Albums
        </Link>
        
        {albumInfo && (
          <div className="flex items-center gap-4 mb-4">
            {albumInfo.avatarUrl ? (
              <img
                src={albumInfo.avatarUrl}
                alt={albumInfo.name}
                className="w-20 h-20 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#406A56]/10 flex items-center justify-center shadow-lg">
                <User size={32} className="text-[#406A56]" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-[#406A56]">{albumInfo.name}</h1>
              <p className="text-[#406A56]/70">
                {albumInfo.photoCount} {albumInfo.photoCount === 1 ? 'photo' : 'photos'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Photos Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="text-[#406A56] animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20">
            <User size={64} className="mx-auto text-[#406A56]/30 mb-4" />
            <h3 className="text-xl font-bold text-[#406A56] mb-2">No photos yet</h3>
            <p className="text-[#406A56]/70">Tag this person in photos to add them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.mediaId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/memories/${photo.memoryId}`}
                  className="block aspect-square relative bg-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:scale-105"
                >
                  <img
                    src={photo.fileUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    {photo.memoryDate && (
                      <div className="flex items-center gap-1 text-white text-xs mb-1">
                        <Calendar size={12} />
                        {new Date(photo.memoryDate).toLocaleDateString()}
                      </div>
                    )}
                    {photo.location && (
                      <div className="flex items-center gap-1 text-white text-xs">
                        <MapPin size={12} />
                        {photo.location}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
