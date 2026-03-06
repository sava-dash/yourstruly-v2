'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { GalleryMediaItem as MediaItem } from '@/types/gallery'

interface GalleryGlobeProps {
  media: MediaItem[]
  onSelectMedia?: (media: MediaItem) => void
  selectedTimeframe?: { yearRange?: [number, number] } | null
}

export default function GalleryGlobe({ media, onSelectMedia, selectedTimeframe }: GalleryGlobeProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const spinEnabledRef = useRef(true)
  const [loaded, setLoaded] = useState(false)
  const [webglError, setWebglError] = useState(false)

  // Filter media by year range
  const filteredMedia = selectedTimeframe?.yearRange
    ? media.filter(m => {
        if (!m.taken_at) return false
        const year = new Date(m.taken_at).getFullYear()
        const [startYear, endYear] = selectedTimeframe.yearRange!
        return year >= startYear && year <= endYear
      })
    : media

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
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: 'globe',
        zoom: 1.5,
        center: [0, 20],
        pitch: 0,
      })

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e)
        if (e.error?.message?.includes('WebGL')) {
          setWebglError(true)
        }
      })

      map.current.on('style.load', () => {
        map.current?.setFog({
          color: 'rgb(20, 20, 30)',
          'high-color': 'rgb(40, 40, 60)',
          'horizon-blend': 0.1,
          'space-color': 'rgb(10, 10, 15)',
          'star-intensity': 0.6,
        })
        setLoaded(true)
      })

      // Slow rotation
      const secondsPerRevolution = 240
      const maxSpinZoom = 5
      let userInteracting = false

      function spinGlobe() {
        if (!map.current) return
        const zoom = map.current.getZoom()
        if (spinEnabledRef.current && !userInteracting && zoom < maxSpinZoom) {
          let distancePerSecond = 360 / secondsPerRevolution
          if (zoom > maxSpinZoom - 1) {
            distancePerSecond *= (maxSpinZoom - zoom)
          }
          const center = map.current.getCenter()
          center.lng -= distancePerSecond / 60
          map.current.easeTo({ center, duration: 1000, easing: (n) => n })
        }
      }

      map.current.on('mousedown', () => { userInteracting = true })
      map.current.on('mouseup', () => { userInteracting = false; spinGlobe() })
      map.current.on('dragend', () => { userInteracting = false; spinGlobe() })
      map.current.on('pitchend', spinGlobe)
      map.current.on('rotateend', spinGlobe)
      map.current.on('moveend', spinGlobe)

      spinGlobe()
    } catch (err) {
      console.error('Failed to initialize map:', err)
      setWebglError(true)
    }

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Simple clustering function
  const clusterMedia = useCallback((items: MediaItem[]) => {
    const mediaWithLocation = items.filter(m => m.location_lat && m.location_lng)
    const clusters: { center: [number, number]; items: MediaItem[] }[] = []
    const used = new Set<string>()

    // Simple distance-based clustering
    const clusterRadius = 5 // degrees

    mediaWithLocation.forEach(item => {
      if (used.has(item.id)) return

      const cluster = {
        center: [item.location_lng!, item.location_lat!] as [number, number],
        items: [item]
      }

      // Find nearby items
      mediaWithLocation.forEach(other => {
        if (used.has(other.id) || other.id === item.id) return

        const dist = Math.sqrt(
          Math.pow(item.location_lat! - other.location_lat!, 2) +
          Math.pow(item.location_lng! - other.location_lng!, 2)
        )

        if (dist < clusterRadius) {
          cluster.items.push(other)
          used.add(other.id)
        }
      })

      used.add(item.id)
      clusters.push(cluster)
    })

    return clusters
  }, [])

  // Add markers when media changes
  useEffect(() => {
    if (!map.current || !loaded) return

    // Remove existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const clusters = clusterMedia(filteredMedia)

    clusters.forEach((cluster) => {
      const coverItem = cluster.items[0]
      const isCluster = cluster.items.length > 1

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'gallery-marker'
      const size = isCluster ? 50 : 44
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid ${isCluster ? '#D9C61A' : '#406A56'};
        background-size: cover;
        background-position: center;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        transition: box-shadow 0.15s ease-out;
        position: relative;
        will-change: box-shadow;
        contain: layout style;
      `

      if (coverItem.file_url) {
        el.style.backgroundImage = `url(${coverItem.file_url})`
      } else {
        el.style.backgroundColor = '#1f2937'
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:18px;">📍</div>'
      }

      // Cluster count badge
      if (isCluster) {
        const badge = document.createElement('div')
        badge.style.cssText = `
          position: absolute;
          top: -6px;
          right: -6px;
          width: 22px;
          height: 22px;
          background: #D9C61A;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #1a1a2e;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `
        badge.textContent = cluster.items.length > 99 ? '99+' : cluster.items.length.toString()
        el.appendChild(badge)
      }

      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = '0 6px 25px rgba(0,0,0,0.6), 0 0 0 3px rgba(64,106,86,0.3)'
        el.style.borderColor = '#D9C61A'
      })
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)'
        el.style.borderColor = isCluster ? '#D9C61A' : '#406A56'
      })
      el.addEventListener('click', (e) => {
        // Stop propagation to prevent map from handling the click
        e.stopPropagation()
        
        // Pause globe spin briefly to prevent jarring movement
        spinEnabledRef.current = false
        
        // Stop any ongoing map animation
        if (map.current) {
          map.current.stop()
        }
        
        // Re-enable spin after a short delay
        setTimeout(() => {
          spinEnabledRef.current = true
        }, 500)
        
        if (isCluster && cluster.items.length <= 5) {
          // For small clusters, show first item
          onSelectMedia?.(cluster.items[0])
        } else {
          onSelectMedia?.(coverItem)
        }
      })

      // Create popup
      const popupContent = isCluster
        ? `
          <div style="padding: 8px; min-width: 120px;">
            <p style="font-weight: 600; color: white; margin: 0 0 4px 0;">${cluster.items.length} Photos</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">Click to view</p>
          </div>
        `
        : `
          <div style="padding: 8px; max-width: 200px;">
            <p style="font-weight: 600; color: white; margin: 0 0 4px 0;">${coverItem.memory?.title || 'Photo'}</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">${coverItem.memory?.location_name || ''}</p>
            ${coverItem.taken_at ? `<p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${new Date(coverItem.taken_at).toLocaleDateString()}</p>` : ''}
          </div>
        `

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setHTML(popupContent)

      const marker = new mapboxgl.Marker(el)
        .setLngLat(cluster.center)
        .setPopup(popup)
        .addTo(map.current!)

      markersRef.current.push(marker)
    })

  }, [filteredMedia, loaded, onSelectMedia, clusterMedia])

  // Stats
  const mediaWithLocation = filteredMedia.filter(m => m.location_lat && m.location_lng)
  const uniqueLocations = new Set(mediaWithLocation.map(m => `${m.location_lat?.toFixed(1)},${m.location_lng?.toFixed(1)}`))

  // Show fallback if WebGL not available
  if (webglError) {
    return (
      <div className="gallery-globe-section flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#406A56]/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#406A56]">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Globe View Unavailable</h3>
          <p className="text-gray-400 text-sm mb-4">
            Your browser doesn&apos;t support WebGL, which is needed for the 3D globe.
            Try using the Timeline view instead, or update your browser.
          </p>
          <p className="text-gray-500 text-xs">
            {filteredMedia.length} photos • {new Set(filteredMedia.filter(m => m.location_lat).map(m => `${m.location_lat?.toFixed(1)}`)).size} locations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gallery-globe-section">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="gallery-globe-overlay" />

      {/* Stats overlay */}
      <div className="globe-stats-overlay">
        <div className="globe-stat-card">
          <div className="globe-stat-value">{mediaWithLocation.length}</div>
          <div className="globe-stat-label">Photos on Map</div>
        </div>
        <div className="globe-stat-card">
          <div className="globe-stat-value">{uniqueLocations.size}</div>
          <div className="globe-stat-label">Locations</div>
        </div>
        <div className="globe-stat-card">
          <div className="globe-stat-value">{filteredMedia.length - mediaWithLocation.length}</div>
          <div className="globe-stat-label">No Location</div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => map.current?.zoomIn()}
          className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all"
          title="Zoom in"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => map.current?.zoomOut()}
          className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all"
          title="Zoom out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => {
            map.current?.flyTo({ center: [0, 20], zoom: 1.5, pitch: 0 })
          }}
          className="w-10 h-10 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all"
          title="Reset view"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
