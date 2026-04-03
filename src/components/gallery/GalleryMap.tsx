'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { X, Calendar, Layers } from 'lucide-react'
import dynamic from 'next/dynamic'
import { GalleryMediaItem as MediaItem } from '@/types/gallery'

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

interface GalleryMapProps {
  media: MediaItem[]
  onSelectMedia?: (media: MediaItem) => void
  selectedTimeframe?: { yearRange?: [number, number] } | null
}

// Map styles
const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
}

export default function GalleryMap({ media, onSelectMedia, selectedTimeframe }: GalleryMapProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [mapStyle, setMapStyle] = useState<'light' | 'dark'>('dark')
  const [customIcon, setCustomIcon] = useState<any>(null)

  // Handle SSR
  useEffect(() => {
    setMounted(true)
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
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #B8562E, #E07A4A);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28],
        })
        setCustomIcon(icon)
      })
    }
  }, [])

  // Filter media by year range and location
  const filteredMedia = useMemo(() => {
    return media.filter(m => {
      if (!m.exif_lat || !m.exif_lng) return false
      if (selectedTimeframe?.yearRange && m.taken_at) {
        const year = new Date(m.taken_at).getFullYear()
        const [startYear, endYear] = selectedTimeframe.yearRange
        if (year < startYear || year > endYear) return false
      }
      return true
    })
  }, [media, selectedTimeframe])

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (filteredMedia.length === 0) return undefined
    const lats = filteredMedia.map(m => m.exif_lat!)
    const lngs = filteredMedia.map(m => m.exif_lng!)
    return [
      [Math.min(...lats) - 1, Math.min(...lngs) - 1],
      [Math.max(...lats) + 1, Math.max(...lngs) + 1],
    ] as [[number, number], [number, number]]
  }, [filteredMedia])

  const handleMarkerClick = useCallback((item: MediaItem) => {
    setSelectedMedia(item)
    if (onSelectMedia) {
      onSelectMedia(item)
    }
  }, [onSelectMedia])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-gray-400">Loading map...</div>
      </div>
    )
  }

  if (filteredMedia.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl text-center p-8">
        <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
          <Calendar size={28} className="text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No photos with location data</h3>
        <p className="text-gray-400 text-sm max-w-xs">
          Photos with GPS coordinates will appear on this map. Add locations to your photos to see them here.
        </p>
      </div>
    )
  }

  const tileLayer = TILE_LAYERS[mapStyle]

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden">
      {/* Style Toggle */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setMapStyle(prev => prev === 'dark' ? 'light' : 'dark')}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors"
          title={`Switch to ${mapStyle === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Layers size={18} className="text-gray-700" />
        </button>
      </div>

      <MapContainer
        bounds={bounds}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
        />
        
        {customIcon && filteredMedia.map((item) => (
          <Marker
            key={item.id}
            position={[item.exif_lat!, item.exif_lng!]}
            icon={customIcon}
            eventHandlers={{
              click: () => handleMarkerClick(item),
            }}
          >
            <Popup>
              <div className="w-48">
                <img 
                  src={item.file_url} 
                  alt="" 
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                {item.taken_at && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(item.taken_at)}
                  </p>
                )}
                {item.memory?.location_name && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {item.memory.location_name}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Selected Media Preview */}
      {selectedMedia && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3">
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={16} className="text-gray-500" />
          </button>
          <div className="flex gap-3">
            <img 
              src={selectedMedia.file_url} 
              alt="" 
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              {selectedMedia.taken_at && (
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(selectedMedia.taken_at)}
                </p>
              )}
              {selectedMedia.memory?.location_name && (
                <p className="text-xs text-gray-500 truncate">
                  {selectedMedia.memory.location_name}
                </p>
              )}
              {selectedMedia.memory?.title && (
                <p className="text-xs text-[#2D5A3D] mt-1 truncate">
                  {selectedMedia.memory.title}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs">
        {filteredMedia.length} photo{filteredMedia.length !== 1 ? 's' : ''} with location
      </div>
    </div>
  )
}
