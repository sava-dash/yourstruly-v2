'use client'

import { useEffect, useRef } from 'react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MiniMapProps {
  lat: number
  lng: number
  location: string
}

export default function MiniMap({ lat, lng, location }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [lng, lat],
        zoom: 12,
        interactive: false, // Static map
      })

      // Add marker
      new mapboxgl.Marker({ color: '#B8562E' })
        .setLngLat([lng, lat])
        .addTo(map.current)
    }

    initMap()

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [lat, lng])

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#f5f5f5',
      }} 
    />
  )
}
