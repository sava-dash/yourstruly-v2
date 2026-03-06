'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { X, Calendar, MapPin, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Locate, Globe2, Map as MapIcon, Layers, Filter } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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
  showGlobeToggle?: boolean
  onToggleGlobe?: () => void
  isGlobeMode?: boolean
}

interface ClusterFeature {
  type: 'Feature'
  properties: {
    cluster: boolean
    cluster_id?: number
    point_count?: number
    point_count_abbreviated?: string
    memory?: Memory
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

// YoursTruly brand colors
const BRAND_COLORS = {
  forest: '#406A56',
  gold: '#D9C61A',
  coral: '#C35F33',
  cream: '#FFF8F0',
}

export default function MapView({ 
  memories, 
  onSelectMemory,
  showGlobeToggle = true,
  onToggleGlobe,
  isGlobeMode = false
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [webglError, setWebglError] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<Memory[] | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'light'>('light')
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showDateFilter, setShowDateFilter] = useState(false)

  // Filter memories by date
  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      if (!m.location_lat || !m.location_lng) return false
      if (dateFilter.start && m.memory_date < dateFilter.start) return false
      if (dateFilter.end && m.memory_date > dateFilter.end) return false
      return true
    })
  }, [memories, dateFilter])

  // Convert memories to GeoJSON
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredMemories.map(memory => ({
      type: 'Feature' as const,
      properties: {
        id: memory.id,
        title: memory.title,
        date: memory.memory_date,
        location: memory.location_name,
        thumbnail: memory.memory_media?.find(m => m.is_cover)?.file_url || memory.memory_media?.[0]?.file_url,
        category: memory.ai_category,
        mood: memory.mood,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [memory.location_lng, memory.location_lat] as [number, number]
      }
    }))
  }), [filteredMemories])

  // Map style URLs
  const styleUrls = {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Check WebGL support first
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      console.warn('WebGL not supported, showing fallback')
      setWebglError(true)
      return
    }

    try {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrls[mapStyle],
        zoom: 2,
        center: [0, 30],
        pitch: 0,
        maxZoom: 18,
        minZoom: 1,
      })

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        if (e.error?.message?.includes('WebGL')) {
          setWebglError(true)
        }
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right')

      // Add touch gestures for mobile
      map.current.touchZoomRotate.enable()
      map.current.touchPitch.enable()
      map.current.dragPan.enable()

      map.current.on('load', () => {
        setLoaded(true)
      })
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setWebglError(true)
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map style
  useEffect(() => {
    if (!map.current || !loaded) return
    map.current.setStyle(styleUrls[mapStyle])
    
    // Re-add sources and layers after style change
    map.current.once('style.load', () => {
      addSourcesAndLayers()
    })
  }, [mapStyle])

  // Add clustering sources and layers
  const addSourcesAndLayers = useCallback(() => {
    if (!map.current) return

    // Remove existing source if present
    if (map.current.getSource('memories')) {
      map.current.removeLayer('clusters')
      map.current.removeLayer('cluster-count')
      map.current.removeLayer('unclustered-point')
      map.current.removeLayer('unclustered-point-border')
      map.current.removeSource('memories')
    }

    // Add source with clustering
    map.current.addSource('memories', {
      type: 'geojson',
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    })

    // Cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'memories',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          BRAND_COLORS.forest,  // < 10
          10, BRAND_COLORS.gold,  // 10-50
          50, BRAND_COLORS.coral   // 50+
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,  // < 10
          10, 28,  // 10-50
          50, 36   // 50+
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      }
    })

    // Cluster count label
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'memories',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      }
    })

    // Individual unclustered points - outer border
    map.current.addLayer({
      id: 'unclustered-point-border',
      type: 'circle',
      source: 'memories',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 14,
        'circle-color': '#ffffff',
      }
    })

    // Individual unclustered points
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'memories',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 10,
        'circle-color': BRAND_COLORS.forest,
        'circle-stroke-width': 2,
        'circle-stroke-color': BRAND_COLORS.gold,
      }
    })

    // Add click handlers
    map.current.on('click', 'clusters', handleClusterClick)
    map.current.on('click', 'unclustered-point', handlePointClick)

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer'
    })
    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = ''
    })
    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer'
    })
    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = ''
    })
  }, [geojsonData])

  // Update data when memories change
  useEffect(() => {
    if (!map.current || !loaded) return
    addSourcesAndLayers()
  }, [loaded, addSourcesAndLayers])

  // Handle cluster click - zoom in or show photos
  const handleClusterClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current) return
    
    const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (!features.length) return

    const clusterId = features[0].properties?.cluster_id
    const source = map.current.getSource('memories') as mapboxgl.GeoJSONSource

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || !map.current) return

      const coordinates = (features[0].geometry as any).coordinates.slice()
      
      // If we're already zoomed in enough, show the cluster contents
      if (zoom && map.current.getZoom() >= zoom - 1) {
        // Get cluster leaves (individual points)
        source.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
          if (err || !leaves) return
          
          const clusterMemories = leaves
            .map((leaf: any) => {
              const id = leaf.properties.id
              return filteredMemories.find(m => m.id === id)
            })
            .filter(Boolean) as Memory[]
          
          setSelectedCluster(clusterMemories)
          setSidebarOpen(true)
          setSelectedMemory(null)
        })
      } else {
        // Zoom to cluster
        map.current.easeTo({
          center: coordinates,
          zoom: zoom || map.current.getZoom() + 2,
          duration: 500
        })
      }
    })
  }, [filteredMemories])

  // Handle individual point click
  const handlePointClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current) return
    
    const features = map.current.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })
    if (!features.length) return

    const id = features[0].properties?.id
    const memory = filteredMemories.find(m => m.id === id)
    
    if (memory) {
      setSelectedMemory(memory)
      setSelectedCluster(null)
      setSidebarOpen(true)
      setCurrentPhotoIndex(0)

      // Center map on point
      const coordinates = (features[0].geometry as any).coordinates.slice()
      map.current.easeTo({
        center: coordinates,
        zoom: Math.max(map.current.getZoom(), 12),
        duration: 500
      })
    }
  }, [filteredMemories])

  // Fit bounds to all markers
  const fitToBounds = useCallback(() => {
    if (!map.current || filteredMemories.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    filteredMemories.forEach(m => {
      if (m.location_lat && m.location_lng) {
        bounds.extend([m.location_lng, m.location_lat])
      }
    })

    map.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: sidebarOpen ? 400 : 50 },
      maxZoom: 15,
      duration: 1000
    })
  }, [filteredMemories, sidebarOpen])

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Navigate photos in sidebar
  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!selectedMemory?.memory_media?.length) return
    const count = selectedMemory.memory_media.length
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => (prev - 1 + count) % count)
    } else {
      setCurrentPhotoIndex(prev => (prev + 1) % count)
    }
  }

  // Clear date filter
  const clearDateFilter = () => {
    setDateFilter({ start: '', end: '' })
  }

  // Show fallback if WebGL not available
  if (webglError) {
    return (
      <div className="relative w-full h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#406A56]/10 flex items-center justify-center">
            <MapPin size={32} className="text-[#406A56]" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Map View Unavailable</h3>
          <p className="text-gray-600 text-sm mb-4">
            Your browser doesn&apos;t support WebGL, which is needed for the interactive map.
            Try updating your browser or using a different device.
          </p>
          <p className="text-gray-500 text-xs">
            {filteredMemories.length} memories with locations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[calc(100vh-200px)] min-h-[500px] rounded-2xl overflow-hidden shadow-xl">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        {/* View Toggle (Map/Globe) */}
        {showGlobeToggle && onToggleGlobe && (
          <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-1">
            <button
              onClick={() => !isGlobeMode && onToggleGlobe()}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                !isGlobeMode ? 'bg-[#406A56] text-white' : 'text-[#406A56] hover:bg-[#406A56]/10'
              }`}
            >
              <MapIcon size={16} />
              Map
            </button>
            <button
              onClick={() => isGlobeMode && onToggleGlobe()}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isGlobeMode ? 'bg-[#406A56] text-white' : 'text-[#406A56] hover:bg-[#406A56]/10'
              }`}
            >
              <Globe2 size={16} />
              Globe
            </button>
          </div>
        )}

        {/* Style Selector */}
        <div className="relative">
          <button
            onClick={() => setMapStyle(prev => 
              prev === 'light' ? 'streets' : prev === 'streets' ? 'satellite' : 'light'
            )}
            className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg text-sm font-medium text-[#406A56] hover:bg-white transition-all"
          >
            <Layers size={16} />
            <span className="hidden sm:inline capitalize">{mapStyle}</span>
          </button>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg text-sm font-medium transition-all ${
              dateFilter.start || dateFilter.end ? 'bg-[#D9C61A] text-white' : 'text-[#406A56] hover:bg-white'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">
              {dateFilter.start || dateFilter.end ? 'Filtered' : 'Filter'}
            </span>
          </button>
          
          <AnimatePresence>
            {showDateFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-xl p-4 min-w-[280px] z-20"
              >
                <h4 className="text-sm font-semibold text-[#2d2d2d] mb-3">Filter by Date</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#406A56]/60 block mb-1">From</label>
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#406A56]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#406A56]/60 block mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#406A56]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#406A56]/30"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearDateFilter}
                      className="flex-1 px-3 py-2 text-sm text-[#C35F33] hover:bg-[#C35F33]/10 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="flex-1 px-3 py-2 text-sm bg-[#406A56] text-white rounded-lg hover:bg-[#406A56]/90 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Map Controls (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => map.current?.zoomIn()}
          className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-[#406A56] hover:bg-white transition-all"
          aria-label="Zoom in"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={() => map.current?.zoomOut()}
          className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-[#406A56] hover:bg-white transition-all"
          aria-label="Zoom out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={fitToBounds}
          className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-[#406A56] hover:bg-white transition-all"
          aria-label="Fit all markers"
          title="Fit all markers"
        >
          <Locate size={20} />
        </button>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#406A56]">
            <MapPin size={16} />
            <span className="text-sm font-medium">{filteredMemories.length}</span>
          </div>
          <span className="text-[#406A56]/40">|</span>
          <span className="text-xs text-[#406A56]/60">
            {memories.filter(m => !m.location_lat).length} without location
          </span>
        </div>
      </div>

      {/* Sidebar for Selected Cluster/Memory */}
      <AnimatePresence>
        {sidebarOpen && (selectedCluster || selectedMemory) && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-20 overflow-hidden flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#406A56]/10">
              <h3 className="text-lg font-semibold text-[#2d2d2d]">
                {selectedCluster 
                  ? `${selectedCluster.length} Memories at this Location`
                  : selectedMemory?.title || 'Memory Details'
                }
              </h3>
              <button
                onClick={() => {
                  setSidebarOpen(false)
                  setSelectedCluster(null)
                  setSelectedMemory(null)
                }}
                className="p-2 hover:bg-[#406A56]/10 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X size={20} className="text-[#406A56]" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Single Memory View */}
              {selectedMemory && !selectedCluster && (
                <div>
                  {/* Photo Carousel */}
                  {selectedMemory.memory_media && selectedMemory.memory_media.length > 0 && (
                    <div className="relative aspect-video bg-[#f5f0eb]">
                      <img
                        src={selectedMemory.memory_media[currentPhotoIndex]?.file_url}
                        alt={selectedMemory.title}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Photo Navigation */}
                      {selectedMemory.memory_media.length > 1 && (
                        <>
                          <button
                            onClick={() => navigatePhoto('prev')}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={() => navigatePhoto('next')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                            aria-label="Next photo"
                          >
                            <ChevronRight size={20} />
                          </button>
                          
                          {/* Photo Dots */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                            {selectedMemory.memory_media.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentPhotoIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  idx === currentPhotoIndex 
                                    ? 'bg-white w-4' 
                                    : 'bg-white/50 hover:bg-white/70'
                                }`}
                                aria-label={`Go to photo ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Memory Info */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-[#406A56]/70">
                      <Calendar size={14} />
                      <span>{formatDate(selectedMemory.memory_date)}</span>
                    </div>
                    
                    {selectedMemory.location_name && (
                      <div className="flex items-start gap-2 text-sm text-[#406A56]/70">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{selectedMemory.location_name}</span>
                      </div>
                    )}

                    {selectedMemory.description && (
                      <p className="text-sm text-[#2d2d2d]/80 leading-relaxed">
                        {selectedMemory.description}
                      </p>
                    )}

                    {selectedMemory.ai_summary && (
                      <div className="bg-[#f5f0eb] rounded-xl p-3">
                        <p className="text-xs text-[#406A56]/60 mb-1">AI Summary</p>
                        <p className="text-sm text-[#2d2d2d]/70">{selectedMemory.ai_summary}</p>
                      </div>
                    )}

                    <Link
                      href={`/dashboard/memories/${selectedMemory.id}`}
                      className="block w-full py-3 bg-[#406A56] text-white text-center rounded-xl font-medium hover:bg-[#406A56]/90 transition-colors"
                    >
                      View Full Memory
                    </Link>
                  </div>
                </div>
              )}

              {/* Cluster View (Multiple Memories) */}
              {selectedCluster && (
                <div className="p-4 space-y-3">
                  {selectedCluster.map((memory) => (
                    <button
                      key={memory.id}
                      onClick={() => {
                        setSelectedMemory(memory)
                        setSelectedCluster(null)
                        setCurrentPhotoIndex(0)
                      }}
                      className="w-full flex items-start gap-3 p-3 bg-[#f5f0eb] hover:bg-[#f0e8df] rounded-xl transition-colors text-left group"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#406A56]/10">
                        {memory.memory_media?.[0] ? (
                          <img
                            src={memory.memory_media.find(m => m.is_cover)?.file_url || memory.memory_media[0].file_url}
                            alt={memory.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin size={20} className="text-[#406A56]/40" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#2d2d2d] truncate">
                          {memory.title || 'Untitled Memory'}
                        </h4>
                        <p className="text-xs text-[#406A56]/60 mt-1">
                          {formatDate(memory.memory_date)}
                        </p>
                        {memory.ai_category && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#406A56]/10 text-[#406A56] text-xs rounded-full">
                            {memory.ai_category}
                          </span>
                        )}
                      </div>
                      
                      <ChevronRight size={16} className="text-[#406A56]/40 mt-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Overlay (shown when no memories) */}
      {filteredMemories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f5f0eb]/80 backdrop-blur-sm">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#406A56]/10 flex items-center justify-center">
              <MapPin size={28} className="text-[#406A56]/50" />
            </div>
            <h3 className="text-lg font-semibold text-[#2d2d2d] mb-2">
              {dateFilter.start || dateFilter.end 
                ? 'No memories in this date range' 
                : 'No geotagged memories yet'
              }
            </h3>
            <p className="text-sm text-[#406A56]/60 max-w-xs mx-auto">
              {dateFilter.start || dateFilter.end 
                ? 'Try adjusting your date filter to see more memories'
                : 'Add locations to your memories to see them on the map'
              }
            </p>
            {(dateFilter.start || dateFilter.end) && (
              <button
                onClick={clearDateFilter}
                className="mt-4 px-4 py-2 bg-[#406A56] text-white rounded-lg text-sm font-medium hover:bg-[#406A56]/90 transition-colors"
              >
                Clear Date Filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
