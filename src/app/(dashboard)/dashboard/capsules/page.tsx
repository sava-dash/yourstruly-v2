'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles, Search, Filter, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import AlbumCard from '@/components/albums/AlbumCard'
import CreateAlbumModal from '@/components/albums/CreateAlbumModal'
import { MemoryAlbum, AlbumTheme, CAPSULE_THEMES } from '@/types/album'
import '@/styles/page-styles.css'

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<MemoryAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [themeFilter, setThemeFilter] = useState<AlbumTheme | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editAlbum, setEditAlbum] = useState<MemoryAlbum | null>(null)
  
  const supabase = createClient()

  const loadAlbums = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('memory_albums')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (themeFilter !== 'all') {
      query = query.eq('theme', themeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading albums:', error)
    } else {
      setAlbums(data || [])
    }
    setLoading(false)
  }, [supabase, themeFilter])

  useEffect(() => {
    loadAlbums()
  }, [loadAlbums])

  const filteredAlbums = albums.filter(c => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    )
  })

  const handleSaveAlbum = (album: MemoryAlbum) => {
    if (editAlbum) {
      setAlbums(prev => prev.map(c => c.id === album.id ? album : c))
    } else {
      setAlbums(prev => [album, ...prev])
    }
    setEditAlbum(null)
    setShowCreateModal(false)
  }

  const handleDeleteAlbum = async (album: MemoryAlbum) => {
    if (!confirm(`Delete "${album.name}"? This cannot be undone.`)) return
    
    const { error } = await supabase
      .from('memory_albums')
      .delete()
      .eq('id', album.id)

    if (!error) {
      setAlbums(prev => prev.filter(c => c.id !== album.id))
    }
  }

  const handleEditAlbum = (album: MemoryAlbum) => {
    setEditAlbum(album)
    setShowCreateModal(true)
  }

  return (
    <div className="page-container">
      {/* Warm gradient background with blobs */}
      <div className="page-background">
        <div className="page-blob page-blob-1" />
        <div className="page-blob page-blob-2" />
        <div className="page-blob page-blob-3" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="page-header-back">
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="page-header-title">Memory Albums</h1>
                <p className="page-header-subtitle">Curated collections of your precious memories</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setEditAlbum(null); setShowCreateModal(true) }}
              className="btn-primary"
            >
              <Plus size={18} />
              Create Album
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D5A3D]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search" placeholder="Search albums..."
                className="form-input pl-12 w-full"
              />
            </div>

            {/* Theme Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-[#2D5A3D]/50" />
              <select
                value={themeFilter}
                onChange={e => setThemeFilter(e.target.value as AlbumTheme | 'all')}
                className="form-input"
              >
                <option value="all">All Themes</option>
                {CAPSULE_THEMES.map(theme => (
                  <option key={theme.value} value={theme.value}>{theme.icon} {theme.label}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Content */}
        <main>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-white/50 animate-pulse" />
              ))}
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Sparkles size={32} className="text-[#C4A235]" />
              </div>
              {searchQuery || themeFilter !== 'all' ? (
                <>
                  <h3 className="empty-state-title">No albums found</h3>
                  <p className="empty-state-text">Try adjusting your search or filters</p>
                  <button
                    onClick={() => { setSearchQuery(''); setThemeFilter('all') }}
                    className="btn-secondary mx-auto"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3 className="empty-state-title">Create your first album</h3>
                  <p className="empty-state-text">
                    Memory albums let you curate and organize your favorite memories into themed collections — perfect for reliving your best moments.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary mx-auto"
                  >
                    <Plus size={18} />
                    Create Your First Album
                  </button>
                </>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredAlbums.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AlbumCard
                      album={album}
                      onEdit={handleEditAlbum}
                      onDelete={handleDeleteAlbum}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateAlbumModal
              isOpen={showCreateModal}
              onClose={() => { setShowCreateModal(false); setEditAlbum(null) }}
              onCreated={handleSaveAlbum}
              editAlbum={editAlbum}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
