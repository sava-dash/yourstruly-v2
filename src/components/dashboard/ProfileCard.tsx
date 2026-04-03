'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Plus, Pencil, Camera, Image, Users, Mail, FolderOpen, Mic } from 'lucide-react'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getCache, setCache, CACHE_KEYS } from '@/lib/cache'
import Link from 'next/link'

interface Stats {
  memories: number
  contacts: number
  postscripts: number
  albums: number
  interviews: number
}

interface Profile {
  id: string
  full_name: string
  date_of_birth: string
  occupation: string
  biography: string
  avatar_url: string
  gender: string
}

interface ProfileCardProps {
  profile: Profile | null
  onUpdate: (field: string, value: string) => void
  compact?: boolean
}

export default function ProfileCard({ profile, onUpdate, compact = false }: ProfileCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState<Stats>(() => getCache<Stats>(CACHE_KEYS.STATS) || { memories: 0, contacts: 0, postscripts: 0, albums: 0, interviews: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Load stats (with cache)
  useEffect(() => {
    const cachedStats = getCache<Stats>(CACHE_KEYS.STATS)
    if (cachedStats) return // Use cached data
    
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [mem, con, ps, alb, int] = await Promise.all([
        supabase.from('memories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('postscripts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('memory_albums').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('interview_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const newStats = {
        memories: mem.count || 0,
        contacts: con.count || 0,
        postscripts: ps.count || 0,
        albums: alb.count || 0,
        interviews: int.count || 0,
      }
      setStats(newStats)
      setCache(CACHE_KEYS.STATS, newStats)
    }
    loadStats()
  }, [])

  const statItems = [
    { label: 'Memories', count: stats.memories, icon: Image, href: '/dashboard/memories', color: 'text-blue-400' },
    { label: 'Contacts', count: stats.contacts, icon: Users, href: '/dashboard/contacts', color: 'text-green-400' },
    { label: 'PostScripts', count: stats.postscripts, icon: Mail, href: '/dashboard/postscripts', color: 'text-purple-400' },
    { label: 'Gallery', count: stats.albums, icon: FolderOpen, href: '/dashboard/gallery', color: 'text-amber-400' },
    { label: 'Interviews', count: stats.interviews, icon: Mic, href: '/dashboard/journalist', color: 'text-pink-400' },
  ]

  const startEdit = (field: string, value: string) => {
    setEditingField(field)
    setTempValue(value || '')
  }

  const saveEdit = () => {
    if (editingField) {
      onUpdate(editingField, tempValue)
      setEditingField(null)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to 'avatars' bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        // Check if bucket doesn't exist
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          alert('Storage not configured. Please create an "avatars" bucket in Supabase with public access.')
        } else {
          alert(`Upload failed: ${uploadError.message}`)
        }
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      onUpdate('avatar_url', publicUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo. Check console for details.')
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const genderIcon = profile?.gender === 'Male' ? '♂' : profile?.gender === 'Female' ? '♀' : profile?.gender ? '⚧' : null

  return (
    <div className="w-full lg:w-80 bg-gray-900/90 rounded-3xl border border-white/10 p-4 sm:p-6">
      {/* Gender Icon */}
      {genderIcon && (
        <div className="flex justify-center mb-2">
          <span className="text-white/60 text-2xl">{genderIcon}</span>
        </div>
      )}

      {/* Birthday */}
      <button 
        onClick={() => startEdit('date_of_birth', profile?.date_of_birth || '')}
        className="flex items-center justify-center gap-2 w-full py-2 text-white/70 hover:text-white transition-colors"
      >
        <Calendar size={16} />
        <span className="text-sm">
          {profile?.date_of_birth ? formatDate(profile.date_of_birth) : 'add your birthday'}
        </span>
      </button>

      {/* Avatar */}
      <div className="flex justify-center my-4">
        <div className="relative group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border-4 border-white/30 flex items-center justify-center overflow-hidden hover:border-white/50 transition-colors"
          >
            {profile?.avatar_url ? (
              <>
                <NextImage src={profile.avatar_url}
                alt="User avatar" width={128} height={128} className="w-full h-full object-cover" unoptimized />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="text-white" size={24} />
                </div>
              </>
            ) : (
              <div className="text-center text-white/50">
                {uploading ? (
                  <span className="text-xs">Uploading...</span>
                ) : (
                  <>
                    <Plus size={24} className="mx-auto mb-1" />
                    <span className="text-xs">Upload Photo</span>
                  </>
                )}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Name */}
      {editingField === 'full_name' ? (
        <input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          autoFocus
          className="w-full text-center text-2xl font-semibold text-white bg-transparent border-b border-white/30 focus:outline-none focus:border-white/60 pb-1"
        />
      ) : (
        <h2 
          onClick={() => startEdit('full_name', profile?.full_name || '')}
          className="text-center text-2xl font-semibold text-white cursor-pointer hover:text-white/80"
        >
          {profile?.full_name || 'Your Name'}
        </h2>
      )}

      {/* What I Do (occupation) */}
      {editingField === 'occupation' ? (
        <input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
          autoFocus
          placeholder="Designer, Developer, Teacher..."
          className="w-full text-center text-sm text-white/70 bg-transparent border-b border-white/30 focus:outline-none mt-2"
        />
      ) : (
        <button 
          onClick={() => startEdit('occupation', profile?.occupation || '')}
          className="block mx-auto mt-2 px-4 py-1 bg-gray-900/80 rounded-full text-white/70 text-sm transition-colors"
        >
          {profile?.occupation || 'What I do'}
        </button>
      )}

      {/* Bio - Full section clickable */}
      <div 
        onClick={() => !editingField && startEdit('biography', profile?.biography || '')}
        className="mt-6 bg-gray-900/80 rounded-xl p-4 cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70 text-sm font-medium">Bio</span>
          <Pencil size={14} className="text-white/50" />
        </div>
        {editingField === 'biography' ? (
          <textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={saveEdit}
            autoFocus
            rows={4}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm text-white/80 bg-transparent border border-white/10 rounded-lg p-2 focus:outline-none focus:border-white/40 resize-none"
          />
        ) : (
          <p className="text-sm text-white/80 leading-relaxed">
            {profile?.biography || (
              <span className="text-white/40 flex items-center gap-2">
                <Plus size={16} />
                Add your bio
              </span>
            )}
          </p>
        )}
      </div>

      {/* Life Data Stats - Compact Row */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          {statItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-white/5 transition-colors group"
              title={item.label}
            >
              <item.icon size={16} className={`${item.color} group-hover:scale-110 transition-transform`} />
              <span className="text-white font-semibold text-sm">{item.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Date Edit Modal */}
      {editingField === 'date_of_birth' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingField(null)}>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-4">Your Birthday</h3>
            <input
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingField(null)} className="px-4 py-2 text-gray-400">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
