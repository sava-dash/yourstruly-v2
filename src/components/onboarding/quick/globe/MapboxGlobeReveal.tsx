'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronRight, MapPin, Upload, Check } from 'lucide-react';
import { delay } from '../helpers';
import type { GlobeSubPhase } from '../types';
import { WhyHerePanel } from './WhyHerePanel';
import { InterestsPanel } from './InterestsPanel';
import { ContactsPanel } from './ContactsPanel';
import { PhotoUploadPanel, type UploadedPhoto } from './PhotoUploadPanel';
import { PlacesLivedPanel } from './PlacesLivedPanel';

// ============================================
// GEOCODING
// ============================================

async function geocodeLocation(
  location: string
): Promise<{ lng: number; lat: number }> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat };
    }
  } catch (e) {
    console.error('Geocode failed:', e);
  }
  return { lng: -74.006, lat: 40.7128 }; // NYC fallback
}

// ============================================
// MAPBOX GLOBE STEP
// ============================================

export function MapboxGlobeReveal({
  name,
  birthday,
  location,
  onDone,
  selectedPills,
  onTogglePill,
  onSubPhaseChange,
}: {
  name: string;
  birthday: string;
  location: string;
  onDone: (globeData?: {
    places: string[];
    contacts: { name: string; relationship: string }[];
    interests: string[];
    whyHere: string[];
    whyHereText: string;
    uploadedPhotosCount?: number;
    uploadedPhotos?: { id: string; preview: string; fileUrl?: string; locationName?: string | null }[];
  }) => void;
  selectedPills: Set<string>;
  onTogglePill: (label: string) => void;
  onSubPhaseChange?: (subPhase: GlobeSubPhase) => void;
}) {
  const formatBirthday = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  const formattedBirthday = formatBirthday(birthday);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapboxglRef = useRef<any>(null);
  const advancedRef = useRef(false);
  const [phase, setPhase] = useState<'loading' | 'spinning' | 'flying' | 'pinned' | 'places-lived' | 'places-flying' | 'globe-spin-out' | 'adventure-message' | 'contacts' | 'interests' | 'why-here' | 'photo-upload' | 'photo-map' | 'lets-go'>('loading');

  // Places-lived state
  const [placeInput, setPlaceInput] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [placeWhen, setPlaceWhen] = useState('');
  const [placesAdded, setPlacesAdded] = useState<{ city: string; lat: number; lng: number; when: string }[]>([]);
  const placesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersRef = useRef<any[]>([]);
  // Track the last pin coordinates for drawing arcs
  const lastCoordsRef = useRef<{ lng: number; lat: number } | null>(null);
  const arcCountRef = useRef(0);

  // Custom options for interests
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customInterests, setCustomInterests] = useState<{ label: string; emoji: string }[]>([]);

  // Contacts (family/friends) state
  const [contactEntries, setContactEntries] = useState<{ name: string; relationship: string }[]>([]);
  // Names that were imported via Google (already persisted to DB by GoogleContactsImport) — skip in saveContacts to avoid duplicates
  const [googleImportedNames, setGoogleImportedNames] = useState<Set<string>>(new Set());
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  // Why are you here
  const [whyHereText, setWhyHereText] = useState('');
  const [whyHereSelections, setWhyHereSelections] = useState<Set<string>>(new Set());

  // CTA reveal states - panels only show after user clicks the CTA
  const [showContactsPanel, setShowContactsPanel] = useState(false);
  const [showInterestsPanel, setShowInterestsPanel] = useState(false);
  const [showWhyHerePanel, setShowWhyHerePanel] = useState(false);

  // Photo upload state
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const photoMarkersRef = useRef<any[]>([]);

  // Fetch place suggestions from Mapbox
  const fetchPlaceSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setPlaceSuggestions([]); return; }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&types=address,place,locality,region`
      );
      const data = await res.json();
      setPlaceSuggestions(
        data.features?.map((f: any) => ({ place_name: f.place_name, center: f.center })) || []
      );
    } catch { setPlaceSuggestions([]); }
  }, []);

  const handlePlaceInputChange = (val: string) => {
    setPlaceInput(val);
    if (placesDebounce.current) clearTimeout(placesDebounce.current);
    placesDebounce.current = setTimeout(() => fetchPlaceSuggestions(val), 300);
  };

  // Draw a curved arc between two points on the map
  const drawArc = useCallback((from: { lng: number; lat: number }, to: { lng: number; lat: number }) => {
    const map = mapRef.current;
    if (!map) return;

    const steps = 80;
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lng = from.lng + (to.lng - from.lng) * t;
      const lat = from.lat + (to.lat - from.lat) * t;
      // Add curve height based on distance
      const dist = Math.sqrt((to.lng - from.lng) ** 2 + (to.lat - from.lat) ** 2);
      const arcHeight = Math.min(dist * 0.15, 8);
      const curve = Math.sin(t * Math.PI) * arcHeight;
      coords.push([lng, lat + curve]);
    }

    const sourceId = `arc-${arcCountRef.current++}`;
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
    });
    // Outer glow layer (3x wider)
    map.addLayer({
      id: `${sourceId}-glow`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#C4A235',
        'line-width': 36,
        'line-opacity': 0.12,
        'line-blur': 16,
      },
    });
    // Mid glow (3x wider)
    map.addLayer({
      id: `${sourceId}-mid`,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#C4A235',
        'line-width': 18,
        'line-opacity': 0.35,
        'line-blur': 6,
      },
    });
    // Core ribbon (3x wider)
    map.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#F5E642',
        'line-width': 9,
        'line-opacity': 0.9,
      },
    });

    // Traveling pulse layer (animated dot along the arc)
    const pulseSourceId = `${sourceId}-pulse`;
    map.addSource(pulseSourceId, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords[0] } },
    });
    map.addLayer({
      id: pulseSourceId,
      type: 'circle',
      source: pulseSourceId,
      paint: {
        'circle-radius': 8,
        'circle-color': '#FFFFFF',
        'circle-opacity': 0.9,
        'circle-blur': 0.4,
      },
    });
    // Glow around pulse dot
    map.addLayer({
      id: `${pulseSourceId}-glow`,
      type: 'circle',
      source: pulseSourceId,
      paint: {
        'circle-radius': 18,
        'circle-color': '#F5E642',
        'circle-opacity': 0.25,
        'circle-blur': 1,
      },
    });

    // Animate the pulse along the arc
    let frame = 0;
    const totalFrames = coords.length;
    const animatePulse = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      try {
        if (!currentMap.getSource(pulseSourceId)) return;
        const idx = frame % totalFrames;
        (currentMap.getSource(pulseSourceId) as any).setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: coords[idx] },
        });
        frame++;
        requestAnimationFrame(animatePulse);
      } catch {
        // Map may have been removed/destroyed — stop animating
        return;
      }
    };
    // Start animation after a short delay
    setTimeout(animatePulse, 300);
  }, []);

  // Add a place: fly to it, drop pin, draw arc
  const handleAddPlace = useCallback(async (cityName: string, coords?: [number, number]) => {
    if (!cityName.trim()) return;

    const map = mapRef.current;
    if (!map) return;

    setPhase('places-flying');

    // Geocode if no coords provided
    let lng: number, lat: number;
    if (coords) {
      [lng, lat] = coords;
    } else {
      const result = await geocodeLocation(cityName);
      lng = result.lng;
      lat = result.lat;
    }

    // Draw arc from previous location
    if (lastCoordsRef.current) {
      drawArc(lastCoordsRef.current, { lng, lat });
    }

    // Fly to new location
    map.flyTo({
      center: [lng, lat],
      zoom: 11,
      pitch: 45,
      bearing: Math.random() * 30 - 15,
      duration: 3000,
      essential: true,
    });

    map.once('moveend', () => {
      // Drop pin
      const el = document.createElement('div');
      el.className = 'yt-map-marker';
      const displayDate = placeWhen.trim() ? `<p class="marker-loc">${placeWhen}</p>` : '';
      el.innerHTML = `
        <div class="marker-wrapper">
          <div class="marker-pulse"></div>
          <div class="marker-pulse marker-pulse-2"></div>
          <div class="marker-pin">
            <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 20 14 20S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#B8562E"/>
              <circle cx="14" cy="13" r="5.5" fill="white"/>
            </svg>
          </div>
          <div class="marker-card">
            <p class="marker-name">${name} moved to ${cityName.split(',')[0]}</p>
            ${displayDate}
          </div>
        </div>
      `;

      const mapboxgl = mapboxglRef.current;
      if (!mapboxgl) return;
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.push(marker);

      lastCoordsRef.current = { lng, lat };
      setPlacesAdded(prev => [...prev, { city: cityName, lat, lng, when: placeWhen }]);
      setPlaceInput('');
      setPlaceWhen('');
      setPlaceSuggestions([]);
      setPhase('places-lived');
    });
  }, [name, placeWhen, drawArc]);

  // Save places to Supabase
  const placesSavedRef = useRef(false);
  const savePlaces = useCallback(async () => {
    if (placesAdded.length === 0) return;
    if (placesSavedRef.current) return;
    placesSavedRef.current = true;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = placesAdded.map((p, i) => ({
        user_id: user.id,
        city: p.city.split(',')[0].trim(),
        country: p.city.includes(',') ? p.city.split(',').pop()?.trim() || '' : '',
        latitude: p.lat,
        longitude: p.lng,
        moved_in_date: null, // free text stored in notable_memories
        notable_memories: p.when || null,
        life_stage: null,
      }));

      await supabase.from('location_history').insert(rows);

      // Create one memory per place (deduplicated — skip if already exists)
      for (const p of placesAdded) {
        const cityName = p.city.split(',')[0].trim();
        const title = `I lived in ${cityName}`;
        
        // Check if memory already exists for this place
        const { data: existing } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', title)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from('memories').insert({
            user_id: user.id,
            title,
            description: p.when ? `Moved there ${p.when}` : 'A place I called home.',
            memory_date: new Date().toISOString(),
            location_name: p.city,
            location_lat: p.lat,
            location_lng: p.lng,
            tags: ['places-lived', 'location'],
          });
        }
      }
    } catch (err) {
      console.error('Failed to save places:', err);
    }
  }, [placesAdded]);

  // Zoom out and spin the globe, then transition to traits
  // Keep globe spinning ref so we can maintain rotation across phases
  const globeSpinRef = useRef<{ spinning: boolean; lng: number }>({ spinning: false, lng: 0 });

  const startGlobeSpin = useCallback(() => {
    if (globeSpinRef.current.spinning) return;
    const map = mapRef.current;
    if (!map) return;
    globeSpinRef.current.spinning = true;
    globeSpinRef.current.lng = map.getCenter().lng;
    // 20 seconds per revolution = 360/20 = 18 deg/s ≈ 0.3 deg/frame at 60fps
    const degreesPerFrame = 18 / 60;
    const rotate = () => {
      if (!globeSpinRef.current.spinning || !mapRef.current) return;
      globeSpinRef.current.lng += degreesPerFrame;
      // Rotate by moving the center longitude (proper Earth spin axis)
      const center = mapRef.current.getCenter();
      mapRef.current.setCenter([globeSpinRef.current.lng % 360, center.lat]);
      requestAnimationFrame(rotate);
    };
    rotate();
  }, []);

  const spinOutAndContinue = useCallback(async () => {
    await savePlaces();
    setPhase('globe-spin-out');
    const map = mapRef.current;
    if (map) {
      // Zoom out to show full globe with all trails
      map.flyTo({
        center: [0, 20],
        zoom: 1.8,
        pitch: 0,
        bearing: 0,
        duration: 3000,
        essential: true,
      });

      // Start spinning after zoom-out completes
      setTimeout(() => startGlobeSpin(), 3000);

      // Show adventure info box after zoom-out
      setTimeout(() => setPhase('adventure-message'), 3500);
    } else {
      setTimeout(() => setPhase('adventure-message'), 500);
    }
  }, [savePlaces, startGlobeSpin]);

  // Save contacts to Supabase (skip Google-imported entries — those are already persisted by GoogleContactsImport)
  const saveContacts = useCallback(async () => {
    const manualEntries = contactEntries.filter(c => !googleImportedNames.has(c.name));
    if (manualEntries.length === 0) return;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = manualEntries.map(c => ({
        user_id: user.id,
        full_name: c.name,
        relationship_type: c.relationship.toLowerCase().replace(/ /g, '_'),
      }));

      await supabase.from('contacts').insert(rows);
    } catch (err) {
      console.error('Failed to save contacts:', err);
    }
  }, [contactEntries, googleImportedNames]);

  // Save why-here as a memory (selections + freeform text)
  const saveWhyHere = useCallback(async () => {
    const selections = Array.from(whyHereSelections);
    if (!whyHereText.trim() && selections.length === 0) return;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const parts: string[] = [];
      if (selections.length > 0) parts.push('Goals: ' + selections.join(', '));
      if (whyHereText.trim()) parts.push(whyHereText.trim());

      await supabase.from('memories').insert({
        user_id: user.id,
        title: 'Why I\'m Here',
        description: parts.join('\n\n'),
        memory_date: new Date().toISOString(),
        tags: ['onboarding', 'why-here', 'reflection', ...selections.map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-'))],
      });
    } catch (err) {
      console.error('Failed to save why-here:', err);
    }
  }, [whyHereText, whyHereSelections]);

  // Notify parent of sub-phase changes for progress bar
  useEffect(() => {
    if (!onSubPhaseChange) return;
    if (phase === 'places-lived' || phase === 'places-flying') {
      onSubPhaseChange('places-lived');
    } else if (phase === 'contacts' || phase === 'adventure-message' || phase === 'globe-spin-out') {
      onSubPhaseChange('contacts');
    } else if (phase === 'interests') {
      onSubPhaseChange('interests');
    } else if (phase === 'why-here') {
      onSubPhaseChange('why-here');
    } else if (phase === 'photo-upload' || phase === 'photo-map') {
      onSubPhaseChange('photo-upload');
    } else {
      onSubPhaseChange('map');
    }
  }, [phase, onSubPhaseChange]);

  // Add photo thumbnail markers when entering photo-map phase
  useEffect(() => {
    if (phase !== 'photo-map') return;
    const map = mapRef.current;
    if (!map || photoMarkersRef.current.length > 0) return;

    const geoPhotos = uploadedPhotos.filter(p => p.status === 'done' && p.lat != null && p.lng != null);
    if (geoPhotos.length === 0) return;

    // Stop globe spinning if active
    globeSpinRef.current.spinning = false;

    // Enable user interaction so they can drag/spin the globe
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();

    // Zoom out to show all photo + place locations
    const mapboxgl = mapboxglRef.current;
    if (!mapboxgl) return;
    const bounds = new mapboxgl.LngLatBounds();
    geoPhotos.forEach(p => bounds.extend([p.lng!, p.lat!]));
    placesAdded.forEach(p => bounds.extend([p.lng, p.lat]));

    map.flyTo({
      center: bounds.getCenter(),
      zoom: geoPhotos.length === 1 ? 4 : 1.8,
      pitch: 0,
      bearing: 0,
      duration: 2500,
      essential: true,
    });

    // Add photo thumbnail markers with staggered animation
    geoPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'yt-photo-marker';
        el.innerHTML = `
          <div class="photo-marker-wrapper">
            <div class="photo-marker-ring"></div>
            <img src="${photo.preview}" class="photo-marker-thumb" />
            ${photo.locationName ? `<div class="photo-marker-label">${photo.locationName.split(',')[0]}</div>` : ''}
          </div>
        `;

        const mbgl = mapboxglRef.current;
        if (!mbgl) return;
        const marker = new mbgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([photo.lng!, photo.lat!])
          .addTo(map);
        photoMarkersRef.current.push(marker);
      }, 800 + idx * 300); // Stagger each pin by 300ms after initial 800ms
    });

    return () => {
      // Cleanup markers on phase exit
      photoMarkersRef.current.forEach(m => m.remove());
      photoMarkersRef.current = [];
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (!advancedRef.current) {
      advancedRef.current = true;
      // Transition to places-lived after welcome card
      setPhase('places-lived');
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      mapboxglRef.current = mapboxgl;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: 'globe',
        zoom: 1.8,
        center: [0, 20],
        interactive: false,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      mapRef.current = map;

    // Slow auto-rotation before fly-in
    let rotating = true;
    let bearing = 0;
    const rotate = () => {
      if (!rotating) return;
      bearing += 0.12;
      map.setBearing(bearing % 360);
      requestAnimationFrame(rotate);
    };

    map.on('style.load', async () => {
      map.setFog({
        color: 'rgb(15, 15, 25)',
        'high-color': 'rgb(35, 40, 60)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(8, 8, 18)',
        'star-intensity': 0.8,
      });

      setPhase('spinning');
      rotate();

      // Pause on globe for 1.5s then fly in
      await delay(1500);
      rotating = false;

      const coords = await geocodeLocation(location);
      setPhase('flying');

      map.flyTo({
        center: [coords.lng, coords.lat],
        zoom: 13,
        pitch: 50,
        bearing: -15,
        duration: 5000,
        essential: true,
        curve: 1.6,
        speed: 0.6,
      });

      map.once('moveend', () => {
        // Drop custom marker
        const el = document.createElement('div');
        el.className = 'yt-map-marker';
        el.innerHTML = `
          <div class="marker-wrapper">
            <div class="marker-pulse"></div>
            <div class="marker-pulse marker-pulse-2"></div>
            <div class="marker-pin">
              <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
                <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 20 14 20S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#2D5A3D"/>
                <circle cx="14" cy="13" r="5.5" fill="white"/>
              </svg>
            </div>
            <div class="marker-card">
              <p class="marker-name">${name}'s adventure began</p>
              <p class="marker-loc">${formattedBirthday}</p>
            </div>
          </div>
        `;

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);

        markerRef.current = marker;
        lastCoordsRef.current = { lng: coords.lng, lat: coords.lat };
        setPhase('pinned');
        // User must click Continue to advance (no auto-advance)
      });
    });
    };

    initMap();

    return () => {
      markerRef.current?.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="globe-fullscreen">
      <div ref={mapContainer} className="map-canvas" />

      {/* Loading state */}
      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div
            className="globe-overlay-center"
            exit={{ opacity: 0 }}
          >
            <div className="loading-globe">
              <div className="loading-dot" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying indicator */}
      <AnimatePresence>
        {phase === 'flying' && (
          <motion.div
            className="globe-status-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="status-chip">
              <div className="status-dot" />
              Finding {location}…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned — welcome message + continue */}
      <AnimatePresence>
        {phase === 'pinned' && (
          <motion.div
            className="globe-bottom-panel"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 180, damping: 22 }}
          >
            {/* Welcome message card */}
            <div className="globe-welcome-card">
              {/* Subtle gradient bar at top */}
              <div className="globe-welcome-bar" />

              <div className="globe-welcome-body">
                <motion.p
                  className="globe-welcome-greeting"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  Hi {name} 👋
                </motion.p>
                <motion.h2
                  className="globe-welcome-headline"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  We look forward to hearing more about this adventure.
                </motion.h2>
                <motion.div
                  className="globe-location-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <MapPin size={14} color="#2D5A3D" />
                  <span>{location}</span>
                </motion.div>
              </div>

              <motion.button
                className="globe-continue-btn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                onClick={advance}
              >
                Let's begin <ChevronRight size={18} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase: Places Lived — location input card (bottom center) ── */}
      <AnimatePresence>
        {(phase === 'places-lived' || phase === 'places-flying') && (
          <PlacesLivedPanel
            phase={phase}
            placeInput={placeInput}
            setPlaceInput={setPlaceInput}
            placeWhen={placeWhen}
            setPlaceWhen={setPlaceWhen}
            placeSuggestions={placeSuggestions}
            setPlaceSuggestions={setPlaceSuggestions}
            placesAdded={placesAdded}
            onPlaceInputChange={handlePlaceInputChange}
            onAddPlace={handleAddPlace}
            onSpinOutAndContinue={spinOutAndContinue}
          />
        )}
      </AnimatePresence>

      {/* ── Persistent Summary Panel — floating LEFT (only show collected data, hide at lets-go) ── */}
      <AnimatePresence>
        {(phase === 'places-lived' || phase === 'places-flying' || phase === 'globe-spin-out' || phase === 'adventure-message' || phase === 'contacts' || phase === 'interests' || phase === 'why-here' || phase === 'photo-upload') && (
          <motion.div
            key="summary-panel"
            className="globe-floating-panel globe-floating-left globe-summary-panel"
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-120%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <div className="globe-side-panel-header" style={{ paddingBottom: '12px', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '18px' }}>📋 Your Story So Far</h3>
            </div>
            <div className="summary-panel-content">
              {/* Name — always show (we always have it at this point) */}
              {name && (
                <div className="summary-section">
                  <div className="summary-label">👤 Name</div>
                  <div className="summary-value">{name}</div>
                </div>
              )}

              {/* Birthday — always show (collected in birth-info step) */}
              {birthday && (
                <div className="summary-section">
                  <div className="summary-label">🎂 Birthday</div>
                  <div className="summary-value">
                    {(() => {
                      const d = new Date(birthday + 'T00:00:00');
                      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    })()}
                  </div>
                </div>
              )}

              {/* Birthplace — always show (collected in birth-info step) */}
              {location && (
                <div className="summary-section">
                  <div className="summary-label">📍 Born in</div>
                  <div className="summary-value">{location}</div>
                </div>
              )}

              {/* Places Lived — only show once user has added at least one */}
              {placesAdded.length > 0 && (
                <div className="summary-section">
                  <div className="summary-label">🗺️ Places Lived</div>
                  <div className="summary-list">
                    {placesAdded.map((p, i) => (
                      <div key={i} className="summary-list-item">
                        {p.city.split(',')[0].trim()}
                        {p.when && <span className="summary-list-meta"> · {p.when}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close People — only show once user has added at least one */}
              {contactEntries.length > 0 && (
                <div className="summary-section">
                  <div className="summary-label">👥 Close People</div>
                  <div className="summary-list">
                    {contactEntries.map((c, i) => (
                      <div key={i} className="summary-list-item">
                        {c.name} <span className="summary-list-meta">· {c.relationship}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests — only show once user has selected at least one */}
              {selectedPills.size > 0 && (
                <div className="summary-section">
                  <div className="summary-label">💛 Interests</div>
                  <div className="summary-pills">
                    {Array.from(selectedPills).slice(0, 8).map(label => (
                      <span key={label} className="summary-pill">{label}</span>
                    ))}
                    {selectedPills.size > 8 && (
                      <span className="summary-pill summary-pill-more">+{selectedPills.size - 8}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Why I'm Here — only show once user has answered */}
              {(whyHereSelections.size > 0 || whyHereText.trim()) && (
                <div className="summary-section">
                  <div className="summary-label">💭 Why I&apos;m Here</div>
                  <div className="summary-value" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                    {whyHereText.trim() || Array.from(whyHereSelections).join(', ')}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase: Adventure message → Contacts intro ── */}
      <AnimatePresence>
        {phase === 'adventure-message' && (
          <motion.div
            key="adventure-msg-bottom"
            className="globe-bottom-panel"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          >
            <div className="globe-welcome-card">
              <div className="globe-welcome-bar" />
              <div className="globe-welcome-body">
                <motion.p
                  className="globe-welcome-greeting"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  You&apos;ve lived in some incredible places.
                </motion.p>
                <motion.h2
                  className="globe-welcome-headline"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{ fontSize: '18px', lineHeight: '1.5' }}
                >
                  Every place holds a story, and most of those stories include someone.
                  <br />The people you shared life with are part of what makes those moments live on.
                </motion.h2>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <button
                  className="globe-continue-btn"
                  style={{ margin: 0, width: '100%' }}
                  onClick={() => { setPhase('contacts'); }}
                >
                  Add your people <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setPhase('interests')}
                  style={{
                    padding: '10px',
                    border: 'none',
                    background: 'none',
                    color: 'rgba(45,45,45,0.5)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  I&apos;ll do this later
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contacts panel — floating on the right ── */}
      <AnimatePresence>
        {phase === 'contacts' && (
          <ContactsPanel
            contactEntries={contactEntries}
            setContactEntries={setContactEntries}
            setGoogleImportedNames={setGoogleImportedNames}
            contactName={contactName}
            setContactName={setContactName}
            contactRelation={contactRelation}
            setContactRelation={setContactRelation}
            onContinue={async () => { await saveContacts(); setPhase('interests'); }}
          />
        )}
      </AnimatePresence>

      {/* ── Interests panel — floating on the right (auto-show) ── */}
      <AnimatePresence>
        {phase === 'interests' && (
          <InterestsPanel
            selectedPills={selectedPills}
            onTogglePill={onTogglePill}
            customInterests={customInterests}
            setCustomInterests={setCustomInterests}
            customInterestInput={customInterestInput}
            setCustomInterestInput={setCustomInterestInput}
            onContinue={() => { setPhase('why-here'); }}
          />
        )}
      </AnimatePresence>

      {/* ── Why-here panel — floating on the right (auto-show) ── */}
      <AnimatePresence>
        {phase === 'why-here' && (
          <WhyHerePanel
            whyHereText={whyHereText}
            setWhyHereText={setWhyHereText}
            whyHereSelections={whyHereSelections}
            setWhyHereSelections={setWhyHereSelections}
            onContinue={async () => {
              await saveWhyHere();
              setPhase('photo-upload');
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Phase: Photo Upload — floating right panel ── */}
      <AnimatePresence>
        {phase === 'photo-upload' && (
          <PhotoUploadPanel
            uploadedPhotos={uploadedPhotos}
            setUploadedPhotos={setUploadedPhotos}
            onUploadComplete={(hasGeo) => {
              setPhase(hasGeo ? 'photo-map' : 'lets-go');
            }}
            onSkipEmpty={() => setPhase('lets-go')}
          />
        )}
      </AnimatePresence>

      {/* ── Phase: Photo Map — show geotagged photos as pins on globe ── */}
      <AnimatePresence>
        {phase === 'photo-map' && (() => {
          // Wait for all photo markers to land before showing the panel
          const geoCount = uploadedPhotos.filter(p => p.lat != null && p.lng != null).length;
          const allPinsLandedDelay = Math.max(2.0, (0.8 + geoCount * 0.3 + 0.5)); // 800ms base + 300ms per photo + 500ms buffer
          const panelDelay = allPinsLandedDelay;
          const textDelay = panelDelay + 0.5;
          const subtextDelay = panelDelay + 0.8;
          const buttonDelay = panelDelay + 1.2;
          return (
          <>
            {/* Bottom panel — waits for all photo pins to land */}
            <motion.div
              key="photo-map-bottom"
              className="globe-bottom-panel"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: panelDelay }}
            >
              <div className="globe-welcome-card">
                <div className="globe-welcome-bar" />
                <div className="globe-welcome-body">
                  <motion.p
                    className="globe-welcome-greeting"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: textDelay }}
                  >
                    Your memories around the world 🌍
                  </motion.p>
                  <motion.h2
                    className="globe-welcome-headline"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: subtextDelay }}
                    style={{ fontSize: '16px', lineHeight: '1.5' }}
                  >
                    {geoCount} photo{geoCount !== 1 ? 's' : ''} placed on your map.
                    {uploadedPhotos.filter(p => p.status === 'done' && p.lat == null).length > 0 && (
                      <span style={{ fontSize: '13px', opacity: 0.6, display: 'block', marginTop: '4px' }}>
                        {uploadedPhotos.filter(p => p.status === 'done' && p.lat == null).length} without location — you can add those later.
                      </span>
                    )}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: subtextDelay + 0.3 }}
                    style={{ fontSize: '13px', color: '#666', margin: '8px 0 0' }}
                  >
                    Take a moment to explore your map — drag to spin the globe!
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: buttonDelay }}
                  style={{ padding: '0 24px 20px' }}
                >
                  <button
                    className="globe-continue-btn"
                    style={{ margin: 0, width: '100%' }}
                    onClick={() => {
                      setPhase('lets-go');
                    }}
                  >
                    I&apos;m ready to continue <ChevronRight size={18} />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </>
          );
        })()}
      </AnimatePresence>

      {/* ── "Let's bring this to life" — transition popup after why-here ── */}
      <AnimatePresence>
        {phase === 'lets-go' && (
          <motion.div
            key="lets-go-overlay"
            className="globe-overlay-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="globe-welcome-card"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              style={{ maxWidth: '440px', width: '90%' }}
            >
              <div className="globe-welcome-bar" />
              <div className="globe-welcome-body" style={{ textAlign: 'center' }}>
                <p className="globe-welcome-greeting">
                  Let&apos;s bring this to life.
                </p>
                <h2 className="globe-welcome-headline" style={{ fontSize: '18px', lineHeight: '1.5' }}>
                  You&apos;ve set your focus. Now see how easy it is to start capturing what matters.
                </h2>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                <button
                  className="globe-continue-btn"
                  style={{ margin: 0, width: '100%' }}
                  onClick={() => {
                    globeSpinRef.current.spinning = false;
                    onDone({
                      places: placesAdded.map(p => p.city.split(',')[0].trim()),
                      contacts: contactEntries,
                      interests: Array.from(selectedPills),
                      whyHere: Array.from(whyHereSelections),
                      whyHereText,
                      uploadedPhotosCount: uploadedPhotos.filter(p => p.status === 'done').length,
                      uploadedPhotos: uploadedPhotos
                        .filter(p => p.status === 'done')
                        .map(p => ({ id: p.id, preview: p.preview, fileUrl: p.fileUrl, locationName: p.locationName })),
                    });
                  }}
                >
                  Start <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .globe-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: #080812;
        }

        .map-canvas {
          width: 100%;
          height: 100%;
        }

        .globe-overlay-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 8, 18, 0.6);
        }

        .loading-globe {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid rgba(64, 106, 86, 0.3);
          border-top-color: #2D5A3D;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .globe-status-bar {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 100px;
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #C4A235;
          animation: statusPulse 1.2s ease-in-out infinite;
        }

        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }

        .globe-bottom-panel {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          padding: 0 20px 32px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
        }

        .globe-welcome-card {
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px 24px 20px 20px;
          box-shadow:
            0 -4px 30px rgba(0, 0, 0, 0.15),
            0 20px 60px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          max-width: 480px;
          margin: 0 auto;
        }

        .globe-welcome-bar {
          height: 4px;
          background: linear-gradient(90deg, #2D5A3D, #8DACAB, #B8562E);
        }

        .globe-welcome-body {
          padding: 22px 24px 16px;
        }

        .globe-welcome-greeting {
          font-size: 14px;
          font-weight: 600;
          color: #2D5A3D;
          margin: 0 0 6px;
          letter-spacing: 0.1px;
        }

        .globe-welcome-headline {
          font-size: 22px;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 12px;
          font-family: var(--font-playfair), Georgia, serif;
          line-height: 1.25;
          letter-spacing: -0.3px;
        }

        .globe-location-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .globe-location-row span {
          font-size: 13px;
          color: rgba(45, 45, 45, 0.5);
        }

        .globe-continue-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 24px;
          margin: 0 24px 20px;
          background: #2D5A3D;
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(64, 106, 86, 0.35);
          transition: transform 0.2s, box-shadow 0.2s;
          width: calc(100% - 48px);
        }

        .globe-continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(64, 106, 86, 0.45);
        }

        /* Custom marker */
        .yt-map-marker {
          cursor: default;
        }

        .marker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid rgba(64, 106, 86, 0.7);
          animation: markerPulse 2.2s ease-out infinite;
          pointer-events: none;
        }

        .marker-pulse-2 {
          animation-delay: 0.9s;
          border-color: rgba(64, 106, 86, 0.35);
        }

        @keyframes markerPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }

        .marker-pin {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(64, 106, 86, 0.5));
          animation: pinBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pinBounce {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .marker-card {
          margin-top: 6px;
          background: white;
          border-radius: 12px;
          padding: 8px 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          text-align: center;
          min-width: 120px;
          animation: cardFadeIn 0.4s ease 0.3s both;
        }

        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .marker-name {
          font-size: 14px;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 2px;
        }

        .marker-loc {
          font-size: 11px;
          color: rgba(45, 45, 45, 0.55);
          margin: 0;
        }

        /* ── Photo thumbnail markers ── */
        .yt-photo-marker {
          cursor: default;
        }

        .photo-marker-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          animation: photoMarkerAppear 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes photoMarkerAppear {
          from { transform: scale(0) translateY(-20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .photo-marker-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.4);
          animation: photoRingPulse 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes photoRingPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }

        .photo-marker-thumb {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid white;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2);
          position: relative;
          z-index: 1;
        }

        .photo-marker-label {
          margin-top: 4px;
          padding: 2px 8px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Hide mapbox logo on this step */
        .globe-fullscreen .mapboxgl-ctrl-logo {
          opacity: 0.4;
        }

        /* ── Floating Panel (traits / interests) ── */
        .globe-floating-panel {
          position: absolute;
          top: 60px;
          bottom: 24px;
          width: min(420px, 80vw);
          z-index: 20;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .globe-floating-right {
          right: 40px;
        }

        .globe-floating-left {
          left: 40px;
        }

        .globe-panel-wide {
          width: min(420px, 38vw);
          overflow-x: hidden;
        }

        /* Why-here option rows */
        .why-here-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-size: 14px;
          color: #2d2d2d;
          margin-bottom: 6px;
        }
        .why-here-option:hover {
          border-color: rgba(64,106,86,0.3);
          background: rgba(64,106,86,0.04);
        }
        .why-here-selected {
          border-color: #2D5A3D;
          background: rgba(64,106,86,0.08);
        }
        .why-here-emoji {
          font-size: 20px;
          flex-shrink: 0;
        }
        .why-here-text {
          flex: 1;
          line-height: 1.4;
        }
        .why-here-check {
          color: #2D5A3D;
          flex-shrink: 0;
        }

        .globe-floating-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(480px, 90vw);
          max-height: min(500px, 70vh);
          z-index: 20;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .globe-side-panel-header {
          padding: 32px 24px 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .globe-side-panel-header h3 {
          font-size: 22px;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 4px;
          font-family: var(--font-playfair), Georgia, serif;
        }

        .globe-side-panel-header p {
          font-size: 14px;
          color: rgba(45, 45, 45, 0.5);
          margin: 0;
        }

        .globe-side-panel-items {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-content: flex-start;
          -webkit-overflow-scrolling: touch;
        }

        .globe-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 100px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.02);
          color: #2d2d2d;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .globe-pill:hover {
          border-color: rgba(64, 106, 86, 0.3);
          background: rgba(64, 106, 86, 0.05);
        }

        .globe-pill.selected {
          border-color: #2D5A3D;
          background: rgba(64, 106, 86, 0.1);
          color: #2D5A3D;
          font-weight: 600;
        }

        .globe-side-panel-footer {
          padding: 16px 24px 24px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .globe-side-panel-footer .globe-continue-btn {
          margin: 0;
          width: 100%;
        }

        /* Custom input row */
        .globe-custom-input-row {
          display: flex;
          gap: 8px;
          padding: 0 20px 12px;
        }

        .globe-custom-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: rgba(0, 0, 0, 0.02);
          font-size: 14px;
          color: #2d2d2d;
          outline: none;
          transition: border-color 0.2s;
        }

        .globe-custom-input:focus {
          border-color: #2D5A3D;
        }

        .globe-custom-add-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: none;
          background: #2D5A3D;
          color: white;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .globe-custom-add-btn:hover {
          background: #234A31;
        }

        .globe-custom-add-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        /* Google import row — sits above the manual contact entry */
        .contact-google-import-row {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 6px;
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 14px;
          background: rgba(245, 243, 238, 0.6);
          border: 1px solid rgba(64, 106, 86, 0.15);
        }
        .contact-google-import-row .btn-secondary {
          width: 100%;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid rgba(64, 106, 86, 0.25);
          background: #ffffff;
          color: #2D5A3D;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .contact-google-import-row .btn-secondary:hover {
          background: rgba(64, 106, 86, 0.06);
          border-color: rgba(64, 106, 86, 0.4);
        }
        .contact-google-import-hint {
          font-size: 12px;
          color: rgba(45, 45, 45, 0.5);
          text-align: center;
        }

        /* Contact entry rows */
        .contact-entry-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(64, 106, 86, 0.05);
          margin-bottom: 6px;
          transition: background 0.15s;
        }
        .contact-entry-row:hover {
          background: rgba(64, 106, 86, 0.1);
        }
        .contact-entry-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .contact-entry-name {
          font-weight: 600;
          font-size: 15px;
          color: #2d2d2d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .contact-entry-relation {
          font-size: 13px;
          color: rgba(45, 45, 45, 0.5);
          white-space: nowrap;
        }
        .contact-entry-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #bbb;
          font-size: 18px;
          line-height: 1;
          padding: 4px;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .contact-entry-remove:hover {
          color: #e53e3e;
          background: rgba(229, 62, 62, 0.08);
        }

        /* Add contact row */
        .contact-add-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          padding: 8px 0;
          margin-top: 4px;
          border-top: 1px solid rgba(0,0,0,0.06);
          width: 100%;
          box-sizing: border-box;
        }
        .contact-add-input {
          height: 40px;
          padding: 0 10px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(0,0,0,0.02);
          font-size: 13px;
          color: #2d2d2d;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
          min-width: 0;
        }
        .contact-add-input:focus {
          border-color: #2D5A3D;
        }
        .contact-add-name {
          flex: 1 1 40%;
          min-width: 80px;
        }
        .contact-add-select {
          flex: 1 1 35%;
          min-width: 80px;
          appearance: auto;
        }
        .contact-add-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: none;
          background: #2D5A3D;
          color: white;
          font-size: 22px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s;
        }
        .contact-add-btn:hover {
          background: #234A31;
        }
        .contact-add-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        /* ── Summary Panel (left) ── */
        .globe-summary-panel {
          width: min(300px, 25vw);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          bottom: auto !important;
          height: auto !important;
        }

        .summary-panel-content {
          overflow-y: auto;
          padding: 4px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .summary-section {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .summary-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(45, 45, 45, 0.45);
        }

        .summary-value {
          font-size: 14px;
          font-weight: 500;
          color: #2d2d2d;
          line-height: 1.4;
        }

        .summary-empty {
          color: rgba(45, 45, 45, 0.25);
          font-style: italic;
          font-weight: 400;
        }

        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-list-item {
          font-size: 13px;
          color: #2d2d2d;
          padding: 2px 0;
        }

        .summary-list-meta {
          color: rgba(45, 45, 45, 0.4);
          font-size: 12px;
        }

        .summary-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .summary-pill {
          display: inline-block;
          padding: 3px 10px;
          background: rgba(64, 106, 86, 0.08);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
          color: #2D5A3D;
        }

        .summary-pill-more {
          background: rgba(64, 106, 86, 0.15);
          font-weight: 600;
        }

        /* Mobile: floating panels go full-width centered */
        @media (max-width: 640px) {
          .globe-floating-panel {
            left: 8px !important;
            right: 8px !important;
            width: auto;
            top: 48px;
            bottom: 16px;
          }
          /* Hide summary panel on mobile */
          .globe-summary-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
