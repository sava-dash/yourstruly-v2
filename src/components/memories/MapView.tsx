'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { X, Calendar, MapPin, ChevronLeft, ChevronRight, Layers, Filter } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

// Dynamic import for Leaflet (SSR incompatible)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)

interface Memory {
  id: string
  title: string
  description?: string
  memory_date: string
  memory_type?: string
  location_name: string
  location_lat: number
  location_lng: number
  ai_summary?: string
  ai_mood?: string
  ai_category?: string
  mood?: string | null
  memory_media?: {
    id?: string
    file_url: string
    file_type?: string
    is_cover: boolean
  }[]
}

interface MapViewProps {
  memories: Memory[]
  onSelectMemory?: (memory: Memory) => void
}

// Map styles
const TILE_LAYERS = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

export default function MapView({ memories, onSelectMemory }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [mapStyle, setMapStyle] = useState<'default' | 'light' | 'dark'>('light')
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [customIcon, setCustomIcon] = useState<any>(null)

  // Handle SSR
  useEffect(() => {
    setMounted(true)
    // Create custom icon after mount (Leaflet needs window)
    if (typeof window !== 'undefined') {
      import('leaflet').then(L => {
        // Fix Leaflet default icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        
        // Custom marker icon
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #406A56, #5A8A72);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })
        setCustomIcon(icon)
      })
    }
  }, [])

  // Filter memories by date and location
  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      if (!m.location_lat || !m.location_lng) return false
      if (dateFilter.start && m.memory_date < dateFilter.start) return false
      if (dateFilter.end && m.memory_date > dateFilter.end) return false
      return true
    })
  }, [memories, dateFilter])

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (filteredMemories.length === 0) return undefined
    const lats = filteredMemories.map(m => m.location_lat)
    const lngs = filteredMemories.map(m => m.location_lng)
    return [
      [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
      [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
    ] as [[number, number], [number, number]]
  }, [filteredMemories])

  const handleMarkerClick = useCallback((memory: Memory) => {
    setSelectedMemory(memory)
    setCurrentPhotoIndex(0)
    if (onSelectMemory) {
      onSelectMemory(memory)
    }
  }, [onSelectMemory])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getCoverImage = (memory: Memory) => {
    return memory.memory_media?.find(m => m.is_cover)?.file_url || memory.memory_media?.[0]?.file_url
  }

  // Get unique locations for stats
  const uniqueLocations = new Set(filteredMemories.map(m => m.location_name)).size

  if (!mounted) {
    return (
      <div className="relative w-full h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden shadow-xl bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden shadow-xl">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        integrity="sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w=="
        crossOrigin="anonymous"
      />

      {/* Map */}
      <MapContainer
        center={[30, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        bounds={bounds}
        scrollWheelZoom={true}
      >
        <TileLayer
          url={TILE_LAYERS[mapStyle].url}
          attribution={TILE_LAYERS[mapStyle].attribution}
        />
        
        {filteredMemories.map(memory => (
          <Marker
            key={memory.id}
            position={[memory.location_lat, memory.location_lng]}
            icon={customIcon}
            eventHandlers={{
              click: () => handleMarkerClick(memory),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                {getCoverImage(memory) && (
                  <img
                    src={getCoverImage(memory)}
                    alt={memory.title}
                    className="w-full h-32 object-cover rounded-t-lg mb-2"
                  />
                )}
                <h3 className="font-semibold text-gray-800 text-sm">{memory.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{formatDate(memory.memory_date)}</p>
                {memory.location_name && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin size={10} />
                    {memory.location_name}
                  </p>
                )}
                <Link
                  href={`/dashboard/memories/${memory.id}`}
                  className="mt-2 block text-center text-xs text-[#406A56] font-medium hover:underline"
                >
                  View Memory →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top Controls */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        {/* Style Selector */}
        <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1">
          <button
            onClick={() => setMapStyle('light')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapStyle === 'light' ? 'bg-[#406A56] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapStyle === 'dark' ? 'bg-[#406A56] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setMapStyle('default')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              mapStyle === 'default' ? 'bg-[#406A56] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Street
          </button>
        </div>

        {/* Date Filter */}
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={`flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg text-sm font-medium transition-all ${
            showDateFilter ? 'bg-[#406A56] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Filter size={16} />
          Filter
        </button>
      </div>

      {/* Date Filter Panel */}
      <AnimatePresence>
        {showDateFilter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4"
          >
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              {(dateFilter.start || dateFilter.end) && (
                <button
                  onClick={() => setDateFilter({ start: '', end: '' })}
                  className="text-xs text-[#406A56] hover:underline mt-5"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="font-semibold text-[#406A56]">{filteredMemories.length}</span>
              <span className="text-gray-500 ml-1">memories</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div>
              <span className="font-semibold text-[#406A56]">{uniqueLocations}</span>
              <span className="text-gray-500 ml-1">locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Memory Detail */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 bottom-4 w-80 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedMemory(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={16} />
            </button>

            {/* Photo carousel */}
            {selectedMemory.memory_media && selectedMemory.memory_media.length > 0 && (
              <div className="relative h-48">
                <img
                  src={selectedMemory.memory_media[currentPhotoIndex]?.file_url}
                  alt={selectedMemory.title}
                  className="w-full h-full object-cover"
                />
                {selectedMemory.memory_media.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => Math.max(0, i - 1))}
                      disabled={currentPhotoIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPhotoIndex(i => Math.min(selectedMemory.memory_media!.length - 1, i + 1))}
                      disabled={currentPhotoIndex === selectedMemory.memory_media.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {selectedMemory.memory_media.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${i === currentPhotoIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedMemory.title}</h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar size={14} />
                <span>{formatDate(selectedMemory.memory_date)}</span>
              </div>

              {selectedMemory.location_name && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <MapPin size={14} />
                  <span>{selectedMemory.location_name}</span>
                </div>
              )}

              {selectedMemory.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {selectedMemory.description}
                </p>
              )}

              <Link
                href={`/dashboard/memories/${selectedMemory.id}`}
                className="block w-full text-center py-2.5 bg-[#406A56] text-white rounded-xl font-medium hover:bg-[#355a48] transition-colors"
              >
                View Full Memory
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
