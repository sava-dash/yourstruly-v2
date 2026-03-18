'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface FeedMapProps {
  activities: Array<{
    id: string
    title: string
    description: string
    timestamp: string
    thumbnail?: string
    link: string
    metadata?: {
      lat?: number
      lng?: number
      location?: string
    }
  }>
  onLocationClick?: (location: string) => void
}

export default function FeedMap({ activities, onLocationClick }: FeedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Debug: log activities with location data
  useEffect(() => {
    console.log('FeedMap received activities:', activities.length)
    console.log('Activities with lat/lng:', activities.filter(a => a.metadata?.lat && a.metadata?.lng).length)
  }, [activities])

  const [geocodedFeatures, setGeocodedFeatures] = useState<any[]>([])

  // Geocode activities that have location names but no lat/lng
  useEffect(() => {
    const geocodeActivities = async () => {
      const features: any[] = []
      const geocodeCache: Record<string, [number, number] | null> = {}

      for (const activity of activities) {
        let coords: [number, number] | null = null

        if (activity.metadata?.lng && activity.metadata?.lat) {
          coords = [activity.metadata.lng, activity.metadata.lat]
        } else if (activity.metadata?.location) {
          const locKey = activity.metadata.location.trim().toLowerCase()
          if (locKey in geocodeCache) {
            coords = geocodeCache[locKey]
          } else {
            try {
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(activity.metadata.location)}.json?access_token=${mapboxgl.accessToken}&limit=1`
              )
              const data = await res.json()
              if (data.features?.length > 0) {
                coords = data.features[0].center as [number, number]
              }
            } catch (err) {
              console.warn('Geocode failed for:', activity.metadata.location)
            }
            geocodeCache[locKey] = coords
          }
        }

        if (coords) {
          features.push({
            type: 'Feature',
            properties: {
              id: activity.id,
              title: activity.title,
              description: activity.description,
              timestamp: activity.timestamp,
              thumbnail: activity.thumbnail,
              location: activity.metadata?.location,
            },
            geometry: {
              type: 'Point',
              coordinates: coords
            }
          })
        }
      }

      setGeocodedFeatures(features)
    }

    geocodeActivities()
  }, [activities])

  // GeoJSON from geocoded features
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: geocodedFeatures
  }), [geocodedFeatures])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not found! Set NEXT_PUBLIC_MAPBOX_TOKEN')
      return
    }

    console.log('Initializing FeedMap with globe projection')

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        zoom: 3,
        center: [-80, 35],
        maxZoom: 18,
        minZoom: 1,
        projection: 'globe' as any
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

      map.current.on('load', () => {
        console.log('Map loaded successfully')
        // Wait a tick to ensure style is fully ready
        setTimeout(() => setLoaded(true), 100)
      })

      map.current.on('style.load', () => {
        console.log('Map style loaded successfully')
        setTimeout(() => setLoaded(true), 100)
      })

      map.current.on('error', (e) => {
        console.error('Map error:', e)
      })
    } catch (err) {
      console.error('Failed to initialize map:', err)
    }

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Add clustering sources and layers
  const addSourcesAndLayers = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('Map or style not ready yet')
      return
    }

    console.log('Adding sources and layers. GeoJSON features:', geojsonData.features.length)

    // Remove existing source if present
    if (map.current.getSource('activities')) {
      try {
        map.current.removeLayer('clusters')
        map.current.removeLayer('cluster-count')
        map.current.removeLayer('unclustered-point')
        map.current.removeLayer('unclustered-point-border')
        map.current.removeSource('activities')
      } catch (err) {
        console.warn('Error removing existing layers:', err)
      }
    }

    // Add source with clustering
    map.current.addSource('activities', {
      type: 'geojson',
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    })

    console.log('Source added with', geojsonData.features.length, 'features')

    try {
      // Cluster circles
      map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'activities',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#406A56',  // < 10
          10, '#D9C61A',  // 10-50
          50, '#C35F33'   // 50+
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
      source: 'activities',
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
      source: 'activities',
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
      source: 'activities',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 10,
        'circle-color': '#406A56',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#D9C61A',
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
    } catch (err) {
      console.error('Error adding layers:', err)
    }
  }, [geojsonData])

  // Update data when activities change
  useEffect(() => {
    if (!map.current || !loaded || !map.current.isStyleLoaded()) {
      console.log('Waiting for map/style to load before adding sources')
      return
    }
    
    addSourcesAndLayers()

    // Fit bounds to geocoded markers
    if (geocodedFeatures.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      geocodedFeatures.forEach(f => {
        bounds.extend(f.geometry.coordinates as [number, number])
      })
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 8,
          duration: 2000
        })
      }
    }
  }, [loaded, addSourcesAndLayers, geocodedFeatures])

  // Handle cluster click - zoom in
  const handleClusterClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current) return
    
    const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (!features.length) return

    const clusterId = features[0].properties?.cluster_id
    const source = map.current.getSource('activities') as mapboxgl.GeoJSONSource

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err || !map.current) return

      const coordinates = (features[0].geometry as any).coordinates.slice()
      map.current.easeTo({
        center: coordinates,
        zoom: zoom || map.current.getZoom() + 2,
        duration: 500
      })
    })
  }, [])

  // Handle individual point click - open popup
  const handlePointClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    if (!map.current) return
    
    const features = map.current.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })
    if (!features.length) return

    const props = features[0].properties
    if (!props) return
    
    const coordinates = (features[0].geometry as any).coordinates.slice()

    const locationName = props.location || ''
    const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setLngLat(coordinates)
      .setHTML(`
        <div class="feed-map-popup">
          ${props.thumbnail ? `<img src="${props.thumbnail}" alt="" />` : ''}
          <div class="popup-content">
            <h4>${props.title}</h4>
            <p>${props.description.substring(0, 100)}${props.description.length > 100 ? '...' : ''}</p>
            <div class="popup-meta">
              <span>${new Date(props.timestamp).toLocaleDateString()}</span>
              ${locationName ? `<span>• ${locationName}</span>` : ''}
            </div>
            ${locationName ? `<button class="popup-filter-btn" data-location="${locationName.replace(/"/g, '&quot;')}">Show all from here →</button>` : ''}
            <a href="${activities.find(a => a.id === props.id)?.link}" class="popup-link">View Details →</a>
          </div>
        </div>
      `)
      .addTo(map.current)

    // Attach click handler for filter button
    const popupEl = popup.getElement()
    const filterBtn = popupEl?.querySelector('.popup-filter-btn')
    if (filterBtn && onLocationClick) {
      filterBtn.addEventListener('click', () => {
        onLocationClick(locationName)
        popup.remove()
      })
    }
  }, [activities])

  // Show empty state if no activities with location
  if (activities.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f5f5',
        borderRadius: '16px'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1A1A1A', marginBottom: '8px' }}>
            No locations to display
          </h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Activities in this category don't have location data
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style jsx global>{`
        .mapboxgl-popup-content {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .feed-map-popup {
          max-width: 280px;
        }

        .feed-map-popup img {
          width: 100%;
          height: 140px;
          object-fit: cover;
        }

        .popup-content {
          padding: 12px;
        }

        .popup-content h4 {
          margin: 0 0 6px;
          font-size: 14px;
          font-weight: 600;
          color: #1A1A1A;
          line-height: 1.3;
        }

        .popup-content p {
          margin: 0 0 8px;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .popup-meta {
          font-size: 10px;
          color: #888;
          display: flex;
          gap: 4px;
          margin-bottom: 8px;
        }

        .popup-link {
          display: inline-block;
          font-size: 12px;
          color: #FF5C34;
          text-decoration: none;
          font-weight: 500;
        }

        .popup-link:hover {
          text-decoration: underline;
        }

        .popup-filter-btn {
          display: block;
          width: 100%;
          padding: 8px 12px;
          margin-bottom: 6px;
          background: #C35F33;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .popup-filter-btn:hover {
          background: #a84e2a;
        }

        .mapboxgl-popup-close-button {
          font-size: 20px;
          padding: 4px 8px;
        }
      `}</style>
    </>
  )
}
