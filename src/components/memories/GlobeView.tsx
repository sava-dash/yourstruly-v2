'use client'

import { useEffect, useRef, useState } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Memory {
  id: string
  title: string
  location_name: string
  location_lat: number
  location_lng: number
  memory_date: string
  memory_media?: {
    id?: string
    file_url: string
    file_type?: string
    is_cover: boolean
  }[]
}

interface GlobeViewProps {
  memories: Memory[]
  onSelectMemory?: (memory: Memory) => void
}

export default function GlobeView({ memories, onSelectMemory }: GlobeViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.5,
      center: [0, 20],
      pitch: 0,
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
    let spinEnabled = true

    function spinGlobe() {
      if (!map.current) return
      const zoom = map.current.getZoom()
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution
        if (zoom > maxSpinZoom - 1) {
          distancePerSecond *= (maxSpinZoom - zoom)
        }
        const center = map.current.getCenter()
        center.lng -= distancePerSecond / 60
        map.current.easeTo({ center, duration: 1000, easing: (n: number) => n })
      }
    }

    map.current.on('mousedown', () => { userInteracting = true })
    map.current.on('mouseup', () => { userInteracting = false; spinGlobe() })
    map.current.on('dragend', () => { userInteracting = false; spinGlobe() })
    map.current.on('pitchend', spinGlobe)
    map.current.on('rotateend', spinGlobe)
    map.current.on('moveend', spinGlobe)

    spinGlobe()
    }

    initMap()

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add markers when memories change
  useEffect(() => {
    if (!map.current || !loaded) return

    const addMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      // Remove existing markers
      const existingMarkers = document.querySelectorAll('.memory-marker')
      existingMarkers.forEach(m => m.remove())

      // Add markers for memories with coordinates
      const memoriesWithLocation = memories.filter(m => m.location_lat && m.location_lng)

      memoriesWithLocation.forEach((memory) => {
        const coverMedia = memory.memory_media?.find(m => m.is_cover) || memory.memory_media?.[0]

        // Create custom marker element
        const el = document.createElement('div')
        el.className = 'memory-marker'
        el.style.cssText = `
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid #f59e0b;
          background-size: cover;
          background-position: center;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          transition: transform 0.2s;
        `

        if (coverMedia) {
          el.style.backgroundImage = `url(${coverMedia.file_url})`
        } else {
          el.style.backgroundColor = '#1f2937'
          el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:16px;">📍</div>'
        }

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)'
        })
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)'
        })
        el.addEventListener('click', () => {
          onSelectMemory?.(memory)
        })

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
          .setHTML(`
            <div style="padding: 8px; max-width: 200px;">
              <p style="font-weight: 600; color: white; margin: 0 0 4px 0;">${memory.title || 'Memory'}</p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">${memory.location_name || ''}</p>
              ${memory.memory_date ? `<p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${new Date(memory.memory_date).toLocaleDateString()}</p>` : ''}
            </div>
          `)

        new mapboxgl.Marker(el)
          .setLngLat([memory.location_lng, memory.location_lat])
          .setPopup(popup)
          .addTo(map.current!)
      })
    }

    addMarkers()
  }, [memories, loaded, onSelectMemory])

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-white text-sm font-medium">
          {memories.filter(m => m.location_lat && m.location_lng).length} memories on the map
        </p>
        <p className="text-gray-400 text-xs">
          {memories.filter(m => !m.location_lat).length} without location
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-gray-400 text-xs">Drag to explore • Click markers to view</p>
      </div>
    </div>
  )
}
