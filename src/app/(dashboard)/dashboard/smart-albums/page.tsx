'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Users, Calendar, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SmartAlbum {
  contactId?: string
  contactName?: string
  avatarUrl?: string
  relationship?: string
  albumId?: string
  albumName?: string
  photoCount: number
  coverPhoto: string
  photos: Array<{
    mediaId: string
    fileUrl: string
    memoryId: string
    createdAt: string
  }>
}

export default function SmartAlbumsPage() {
  const [albums, setAlbums] = useState<SmartAlbum[]>([])
  const [albumType, setAlbumType] = useState<'people' | 'family' | 'events'>('people')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadAlbums(albumType)
  }, [albumType])

  const loadAlbums = async (type: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/smart-albums?type=${type}`)
      if (res.ok) {
        const data = await res.json()
        setAlbums(data.albums || [])
      }
    } catch (error) {
      console.error('Failed to load smart albums:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const albumTypes = [
    { id: 'people', label: 'People', icon: User },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF7] p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[#2D5A3D] hover:text-[#234A31] transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        
        <h1 className="text-4xl font-bold text-[#2D5A3D] mb-2">Smart Albums</h1>
        <p className="text-[#2D5A3D]/70">Photos automatically organized by people, family, and events</p>
      </div>

      {/* Album Type Selector */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex gap-2">
          {albumTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setAlbumType(type.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  albumType === type.id
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-white text-[#2D5A3D] hover:bg-[#2D5A3D]/10'
                }`}
              >
                <Icon size={18} />
                {type.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Albums Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="text-[#2D5A3D] animate-spin" />
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-20">
            <User size={64} className="mx-auto text-[#2D5A3D]/30 mb-4" />
            <h3 className="text-xl font-bold text-[#2D5A3D] mb-2">No albums yet</h3>
            <p className="text-[#2D5A3D]/70 mb-4">
              {albumType === 'people' && 'Tag people in your photos to create smart albums'}
              {albumType === 'family' && 'Tag family members in your photos'}
              {albumType === 'events' && 'Event detection coming soon'}
            </p>
            <Link
              href="/dashboard/gallery"
              className="inline-block px-6 py-3 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#234A31] transition-colors"
            >
              Go to Gallery
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album, index) => (
              <motion.div
                key={album.contactId || album.albumId || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/dashboard/smart-albums/${album.contactId || album.albumId}`}
                  className="block bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  {/* Cover Photo */}
                  <div className="aspect-square relative bg-gray-200">
                    <img
                      src={album.coverPhoto}
                      alt={album.contactName || album.albumName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Photo Count */}
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                    </div>
                  </div>

                  {/* Album Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {album.avatarUrl ? (
                        <img
                          src={album.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center">
                          <User size={20} className="text-[#2D5A3D]" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#2D5A3D]">
                          {album.contactName || album.albumName}
                        </h3>
                        {album.relationship && (
                          <p className="text-xs text-[#2D5A3D]/60 capitalize">
                            {album.relationship}
                          </p>
                        )}
                      </div>
                    </div>
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
