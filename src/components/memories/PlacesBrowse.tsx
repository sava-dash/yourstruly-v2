'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, ChevronLeft, Globe, Building2, Map } from 'lucide-react'
import { motion } from 'framer-motion'
import MemoryCard from './MemoryCard'

interface Memory {
  id: string
  title: string
  description: string
  memory_date: string
  memory_type: string
  location_name: string
  location_lat: number
  location_lng: number
  ai_summary: string
  ai_mood: string
  ai_category: string
  ai_labels: string[]
  is_favorite: boolean
  memory_media?: {
    id: string
    file_url: string
    file_type: string
    is_cover: boolean
  }[]
}

interface LocationGroup {
  name: string
  city: string
  country: string
  memories: Memory[]
  coverUrl?: string
}

interface PlacesBrowseProps {
  memories: Memory[]
}

// Parse location_name into city/country components
function parseLocation(locationName: string | null): { city: string; country: string } {
  if (!locationName) return { city: 'Unknown', country: 'Unknown' }
  
  const parts = locationName.split(',').map(p => p.trim())
  
  if (parts.length >= 2) {
    // Last part is usually country or state
    const country = parts[parts.length - 1]
    const city = parts.length >= 3 ? parts[parts.length - 2] : parts[0]
    return { city, country }
  }
  
  return { city: locationName, country: 'Unknown' }
}

export function PlacesBrowse({ memories }: PlacesBrowseProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationGroup | null>(null)
  const [groupBy, setGroupBy] = useState<'city' | 'country'>('country')

  // Group memories by location
  const locationGroups = useMemo(() => {
    const groups: Record<string, LocationGroup> = {}
    
    memories.forEach(memory => {
      if (!memory.location_name) return
      
      const { city, country } = parseLocation(memory.location_name)
      const key = groupBy === 'country' ? country : city
      
      if (!groups[key]) {
        const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
        groups[key] = {
          name: key,
          city,
          country,
          memories: [],
          coverUrl: coverMedia?.file_url
        }
      }
      groups[key].memories.push(memory)
      
      // Update cover if this memory has one and group doesn't
      if (!groups[key].coverUrl) {
        const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]
        if (coverMedia) groups[key].coverUrl = coverMedia.file_url
      }
    })
    
    // Sort by memory count
    return Object.values(groups).sort((a, b) => b.memories.length - a.memories.length)
  }, [memories, groupBy])

  // Memories without location
  const memoriesWithoutLocation = memories.filter(m => !m.location_name)

  // Get unique countries for stats
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>()
    memories.forEach(m => {
      if (m.location_name) {
        const { country } = parseLocation(m.location_name)
        if (country !== 'Unknown') countries.add(country)
      }
    })
    return countries.size
  }, [memories])

  // Show filtered memories for selected location
  if (selectedLocation) {
    return (
      <div>
        {/* Back header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedLocation(null)}
            className="page-header-back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2D5A3D] to-[#5A8A72] flex items-center justify-center shadow-md">
              <MapPin size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2d2d2d]">
                Memories in {selectedLocation.name}
              </h2>
              <p className="text-sm text-[#2D5A3D]">
                {selectedLocation.memories.length} memories
              </p>
            </div>
          </div>
        </div>

        {/* Memories grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
        >
          {selectedLocation.memories.map((memory, idx) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <MemoryCard memory={memory} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  // Show places grid
  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="glass-card-page px-4 py-2 flex items-center gap-2">
            <Globe size={18} className="text-[#2D5A3D]" />
            <span className="text-sm font-medium text-[#2d2d2d]">
              {uniqueCountries} {uniqueCountries === 1 ? 'country' : 'countries'}
            </span>
          </div>
          <div className="glass-card-page px-4 py-2 flex items-center gap-2">
            <MapPin size={18} className="text-[#C4A235]" />
            <span className="text-sm font-medium text-[#2d2d2d]">
              {locationGroups.length} {locationGroups.length === 1 ? 'place' : 'places'}
            </span>
          </div>
        </div>
        
        {/* Group by toggle */}
        <div className="glass-card-page p-1 flex">
          <button
            onClick={() => setGroupBy('country')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              groupBy === 'country' ? 'bg-[#2D5A3D] text-white' : 'text-[#2D5A3D]/60 hover:text-[#2D5A3D]'
            }`}
          >
            <Globe size={14} />
            Country
          </button>
          <button
            onClick={() => setGroupBy('city')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              groupBy === 'city' ? 'bg-[#2D5A3D] text-white' : 'text-[#2D5A3D]/60 hover:text-[#2D5A3D]'
            }`}
          >
            <Building2 size={14} />
            City
          </button>
        </div>
      </div>

      {locationGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Map size={32} className="text-[#2D5A3D]/50" />
          </div>
          <h3 className="empty-state-title">No locations tagged yet</h3>
          <p className="empty-state-text">
            Add locations to your memories to explore them by place
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        >
          {locationGroups.map((location, idx) => (
            <motion.button
              key={location.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setSelectedLocation(location)}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/80 shadow-md
                         hover:shadow-xl transition-all duration-300"
            >
              {/* Background image */}
              {location.coverUrl ? (
                <img 
                  src={location.coverUrl} 
                  alt={location.name}
                  className="absolute inset-0 w-full h-full object-cover 
                             group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#2D5A3D]/20 to-[#C4A235]/20 
                                flex items-center justify-center">
                  <MapPin size={32} className="text-[#2D5A3D]/30" />
                </div>
              )}
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <div className="flex items-center gap-1.5 text-white/80 text-xs mb-1">
                  <MapPin size={12} />
                  <span>{groupBy === 'country' ? 'Country' : 'City'}</span>
                </div>
                <h3 className="text-white font-semibold text-base leading-tight line-clamp-1">
                  {location.name}
                </h3>
              </div>
              
              {/* Memory count badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm 
                              rounded-full text-white text-xs font-medium">
                {location.memories.length} {location.memories.length === 1 ? 'memory' : 'memories'}
              </div>
              
              {/* Hover glow */}
              <div className="absolute inset-0 bg-[#C4A235]/0 group-hover:bg-[#C4A235]/10 transition-colors" />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Unlocated memories section */}
      {memoriesWithoutLocation.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 text-sm text-[#2D5A3D]/60 mb-4">
            <Map size={16} />
            <span>{memoriesWithoutLocation.length} memories without location</span>
          </div>
        </div>
      )}
    </div>
  )
}
