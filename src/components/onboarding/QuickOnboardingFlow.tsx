'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Sparkles,
  Check,
  Shield,
  Heart,
} from 'lucide-react';
import { OnboardingStepExplanation } from './OnboardingStepExplanation';
import { ConversationEngine } from '@/components/conversation-engine';
import { ImageUploadStep } from './ImageUploadStep';

// ============================================
// TYPES
// ============================================

interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface OnboardingData {
  name: string;
  birthday: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  lifeGoals: string[];
  personalityTraits: string[];
  religion: string;
  location: string;
  favoriteQuote: string;
  background: string;
  heartfeltAnswer?: string;
  heartfeltConversation?: ConversationMessage[];
  uploadedImagesCount?: number;
}

type QuickStep =
  | 'birth-info'
  | 'globe'
  | 'about-you'
  | 'religion'
  | 'why-here'
  | 'heartfelt'
  | 'image-upload'
  | 'ready';

const ALL_STEPS: QuickStep[] = [
  'birth-info',
  'globe',
  'about-you',
  'religion',
  'why-here',
  'heartfelt',
  'image-upload',
  'ready',
];

// All steps show the progress bar now
const PROGRESS_STEPS: QuickStep[] = [
  'birth-info',
  'globe',
  'about-you',
  'religion',
  'why-here',
  'heartfelt',
  'image-upload',
  'ready',
];

// Map each step to the explanation tile key
const TILE_KEY: Partial<Record<QuickStep, string>> = {
  'birth-info': 'location',
  'about-you': 'interests',
  religion: 'religion',
  'why-here': 'background',
  heartfelt: 'heartfelt-question',
  'image-upload': 'image-upload',
  ready: 'celebration',
};

// ============================================
// PILL DATA — expanded
// ============================================

interface Pill {
  label: string;
  emoji: string;
  category: 'interest' | 'trait';
}

// Categorized interests
interface InterestCategory {
  name: string;
  emoji: string;
  items: string[];
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    name: 'Creative Arts',
    emoji: '🎨',
    items: ['Drawing', 'Painting', 'Photography', 'Writing', 'Music', 'Dancing', 'Theater', 'Film', 'Graphic Design', 'Fashion', 'Interior Design', 'DIY Crafts'],
  },
  {
    name: 'Health & Wellness',
    emoji: '💪',
    items: ['Fitness', 'Yoga', 'Meditation', 'Running', 'Cycling', 'Swimming', 'Martial Arts', 'Nutrition', 'Mindfulness'],
  },
  {
    name: 'Nature & Adventure',
    emoji: '🏔️',
    items: ['Hiking', 'Camping', 'Travel', 'Gardening', 'Fishing', 'Surfing', 'Climbing', 'Snowboarding', 'Birdwatching'],
  },
  {
    name: 'Food & Drink',
    emoji: '🍳',
    items: ['Cooking', 'Baking', 'Food Tasting', 'Wine', 'Coffee', 'Tea', 'Mixology'],
  },
  {
    name: 'Learning & Tech',
    emoji: '💻',
    items: ['Technology', 'Coding', 'Science', 'History', 'Philosophy', 'Psychology', 'Languages', 'Astronomy'],
  },
  {
    name: 'Sports & Games',
    emoji: '⚽',
    items: ['Gaming', 'Soccer', 'Basketball', 'Football', 'Tennis', 'Golf', 'Baseball', 'Pickleball'],
  },
  {
    name: 'Lifestyle',
    emoji: '🏠',
    items: ['Family', 'Parenting', 'Home Improvement', 'Minimalism', 'Collecting', 'Travel Blogging', 'Animals & Pets'],
  },
  {
    name: 'Community',
    emoji: '🤝',
    items: ['Volunteering', 'Community Service', 'Sustainability', 'Animal Care'],
  },
  {
    name: 'Business',
    emoji: '💼',
    items: ['Entrepreneurship', 'Investing', 'Real Estate', 'Personal Finance', 'Public Speaking'],
  },
];

// Flat list of all interests for backward compatibility
const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(c => c.items);

// Personality traits
const PERSONALITY_TRAITS = [
  'Adventurous', 'Ambitious', 'Analytical', 'Authentic', 'Calm', 'Caring', 'Charismatic', 
  'Compassionate', 'Confident', 'Creative', 'Curious', 'Determined', 'Empathetic', 
  'Energetic', 'Extroverted', 'Flexible', 'Friendly', 'Generous', 'Hardworking', 
  'Honest', 'Humble', 'Independent', 'Innovative', 'Introverted', 'Kind', 'Logical', 
  'Loyal', 'Optimistic', 'Organized', 'Patient', 'Persistent', 'Practical', 'Reflective', 
  'Reliable', 'Resilient', 'Resourceful', 'Self-aware', 'Sincere', 'Spontaneous', 
  'Supportive', 'Thoughtful', 'Trustworthy', 'Warm', 'Wise', 'Witty'
];

const ABOUT_YOU_PILLS: Pill[] = [
  // Popular interests (shown first)
  { label: 'Family', emoji: '👨‍👩‍👧', category: 'interest' },
  { label: 'Travel', emoji: '✈️', category: 'interest' },
  { label: 'Music', emoji: '🎵', category: 'interest' },
  { label: 'Cooking', emoji: '🍳', category: 'interest' },
  { label: 'Fitness', emoji: '💪', category: 'interest' },
  { label: 'Reading', emoji: '📚', category: 'interest' },
  { label: 'Nature', emoji: '🌿', category: 'interest' },
  { label: 'Art', emoji: '🎨', category: 'interest' },
  { label: 'Technology', emoji: '💻', category: 'interest' },
  { label: 'Spirituality', emoji: '🙏', category: 'interest' },
  { label: 'Photography', emoji: '📷', category: 'interest' },
  { label: 'Gardening', emoji: '🌱', category: 'interest' },
  { label: 'Sports', emoji: '⚽', category: 'interest' },
  { label: 'Movies & TV', emoji: '🎬', category: 'interest' },
  { label: 'Writing', emoji: '✍️', category: 'interest' },
  { label: 'Fashion', emoji: '👗', category: 'interest' },
  { label: 'DIY & Crafts', emoji: '🛠️', category: 'interest' },
  { label: 'Animals & Pets', emoji: '🐾', category: 'interest' },
  { label: 'Volunteering', emoji: '🤲', category: 'interest' },
  { label: 'History', emoji: '📜', category: 'interest' },
  { label: 'Science', emoji: '🔬', category: 'interest' },
  { label: 'Gaming', emoji: '🎮', category: 'interest' },
  { label: 'Dancing', emoji: '💃', category: 'interest' },
  { label: 'Food & Wine', emoji: '🍷', category: 'interest' },
  // Popular traits
  { label: 'Adventurous', emoji: '🏔️', category: 'trait' },
  { label: 'Creative', emoji: '✨', category: 'trait' },
  { label: 'Empathetic', emoji: '💛', category: 'trait' },
  { label: 'Optimistic', emoji: '☀️', category: 'trait' },
  { label: 'Curious', emoji: '🔍', category: 'trait' },
  { label: 'Loyal', emoji: '🤝', category: 'trait' },
  { label: 'Humorous', emoji: '😄', category: 'trait' },
  { label: 'Calm', emoji: '🌊', category: 'trait' },
  { label: 'Driven', emoji: '🚀', category: 'trait' },
  { label: 'Nurturing', emoji: '🌸', category: 'trait' },
  { label: 'Independent', emoji: '🦅', category: 'trait' },
  { label: 'Reflective', emoji: '💭', category: 'trait' },
  { label: 'Analytical', emoji: '🧩', category: 'trait' },
  { label: 'Spontaneous', emoji: '⚡', category: 'trait' },
  { label: 'Resilient', emoji: '🌳', category: 'trait' },
  { label: 'Patient', emoji: '⏳', category: 'trait' },
  { label: 'Ambitious', emoji: '🎯', category: 'trait' },
  { label: 'Passionate', emoji: '🔥', category: 'trait' },
  { label: 'Pragmatic', emoji: '🔧', category: 'trait' },
  { label: 'Thoughtful', emoji: '🌙', category: 'trait' },
  { label: 'Extroverted', emoji: '🎉', category: 'trait' },
  { label: 'Introverted', emoji: '📖', category: 'trait' },
];

// Categorized religion/spiritual options
interface ReligionCategory {
  category: string;
  options: string[];
}

const RELIGION_CATEGORIES: ReligionCategory[] = [
  {
    category: 'Major World Religions',
    options: ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism', 'Baháʼí Faith'],
  },
  {
    category: 'Christian Traditions',
    options: ['Catholicism', 'Protestant Christianity', 'Eastern Orthodoxy', 'Non-denominational Christianity'],
  },
  {
    category: 'Eastern & Dharmic',
    options: ['Taoism', 'Confucianism', 'Shinto', 'Jainism'],
  },
  {
    category: 'Indigenous & Ancestral',
    options: ['Native American spirituality', 'African traditional religions', 'Aboriginal Australian beliefs'],
  },
  {
    category: 'New Thought & Modern',
    options: ['New Age spirituality', 'Meditation traditions', 'Yoga philosophy', 'Stoicism'],
  },
  {
    category: 'Nature-Based',
    options: ['Paganism', 'Wicca', 'Druidry', 'Animism'],
  },
  {
    category: 'Philosophical',
    options: ['Humanism', 'Secular spirituality', 'Agnosticism', 'Atheism', 'Spiritual but not religious'],
  },
  {
    category: 'Other',
    options: ['Other', 'Prefer not to say'],
  },
];

// Flat list for backward compatibility
const RELIGION_OPTIONS = RELIGION_CATEGORIES.flatMap(c => c.options);

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

function MapboxGlobeReveal({
  name,
  birthday,
  location,
  onDone,
}: {
  name: string;
  birthday: string;
  location: string;
  onDone: () => void;
}) {
  const formatBirthday = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  const formattedBirthday = formatBirthday(birthday);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const advancedRef = useRef(false);
  const [phase, setPhase] = useState<'loading' | 'spinning' | 'flying' | 'pinned'>('loading');

  const advance = useCallback(() => {
    if (!advancedRef.current) {
      advancedRef.current = true;
      onDone();
    }
  }, [onDone]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapContainer.current,
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
                <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 20 14 20S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#406A56"/>
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
        setPhase('pinned');
        // User must click Continue to advance (no auto-advance)
      });
    });

    return () => {
      rotating = false;
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
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
                  <MapPin size={14} color="#406A56" />
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
          border-top-color: #406A56;
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
          background: #D9C61A;
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
          background: linear-gradient(90deg, #406A56, #8DACAB, #C35F33);
        }

        .globe-welcome-body {
          padding: 22px 24px 16px;
        }

        .globe-welcome-greeting {
          font-size: 14px;
          font-weight: 600;
          color: #406A56;
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
          background: #406A56;
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

        /* Hide mapbox logo on this step */
        .globe-fullscreen .mapboxgl-ctrl-logo {
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================
// MAIN FLOW
// ============================================

interface QuickOnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkipAll?: () => void;
  userId?: string;
  initialName?: string;
}

export function QuickOnboardingFlow({
  onComplete,
  onSkipAll,
  userId,
  initialName,
}: QuickOnboardingFlowProps) {
  // Restore saved progress from localStorage
  const getSavedProgress = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(`onboarding_progress_${userId}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const savedProgress = getSavedProgress();
  
  const [step, setStep] = useState<QuickStep>(savedProgress?.step || 'birth-info');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<OnboardingData>(savedProgress?.data || {
    name: initialName || '',
    birthday: '',
    interests: [],
    hobbies: [],
    skills: [],
    lifeGoals: [],
    personalityTraits: [],
    religion: '',
    location: '',
    favoriteQuote: '',
    background: '',
  });
  const [selectedPills, setSelectedPills] = useState<Set<string>>(
    new Set(savedProgress?.selectedPills || [])
  );

  // Save progress to localStorage whenever step or data changes
  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return;
    const progress = {
      step,
      data,
      selectedPills: Array.from(selectedPills),
      savedAt: Date.now(),
    };
    localStorage.setItem(`onboarding_progress_${userId}`, JSON.stringify(progress));
  }, [step, data, selectedPills, userId]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx < ALL_STEPS.length - 1) {
      setDirection(1);
      setStep(ALL_STEPS[idx + 1]);
    } else {
      // Clear saved progress on completion
      if (userId) {
        localStorage.removeItem(`onboarding_progress_${userId}`);
      }
      onComplete(data);
    }
  }, [step, data, onComplete, userId]);

  const goBack = useCallback(() => {
    setDirection(-1);
    // Skip globe when going backwards from about-you
    if (step === 'about-you') { setStep('birth-info'); return; }
    const idx = ALL_STEPS.indexOf(step);
    if (idx > 0) setStep(ALL_STEPS[idx - 1]);
  }, [step]);

  const commitPills = useCallback(() => {
    const interests = ABOUT_YOU_PILLS.filter(
      (p) => p.category === 'interest' && selectedPills.has(p.label)
    ).map((p) => p.label);
    const traits = ABOUT_YOU_PILLS.filter(
      (p) => p.category === 'trait' && selectedPills.has(p.label)
    ).map((p) => p.label);
    updateData({ interests, personalityTraits: traits });
  }, [selectedPills, updateData]);

  const progressIdx = PROGRESS_STEPS.indexOf(step);
  const progressPercent = step === 'ready' ? 100 : ((progressIdx + 1) / PROGRESS_STEPS.length) * 100;
  const tileKey = TILE_KEY[step];

  // Full-screen globe step — with progress bar overlay
  if (step === 'globe') {
    return (
      <>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px 12px',
          background: 'linear-gradient(to bottom, rgba(8, 8, 18, 0.7) 60%, transparent)',
        }}>
          {PROGRESS_STEPS.map((s, i) => {
            const isCompleted = i < progressIdx;
            const isCurrent = i === progressIdx;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  border: `2px solid ${isCompleted || isCurrent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)'}`,
                  color: isCompleted ? '#080812' : isCurrent ? 'white' : 'rgba(255,255,255,0.3)',
                  background: isCompleted ? 'rgba(255,255,255,0.85)' : isCurrent ? 'rgba(255,255,255,0.15)' : 'transparent',
                  flexShrink: 0,
                }}>
                  {isCompleted && <Check size={10} strokeWidth={3} />}
                </div>
                {i < PROGRESS_STEPS.length - 1 && (
                  <div style={{
                    width: 12,
                    height: 2,
                    background: isCompleted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
        <MapboxGlobeReveal
          name={data.name}
          birthday={data.birthday}
          location={data.location || 'somewhere beautiful'}
          onDone={goNext}
        />
      </>
    );
  }

  // Three-column About You step
  if (step === 'about-you') {
    return (
      <div className="yt-onboard-root">
        <div className="home-background" />
        <div className="home-blob home-blob-1" />
        <div className="home-blob home-blob-2" />
        {/* Stepwise Progress Bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 24px 12px',
          background: 'linear-gradient(to bottom, rgba(253, 248, 243, 0.95) 60%, transparent)',
        }}>
          {PROGRESS_STEPS.map((s, i) => {
            const isCompleted = i < progressIdx;
            const isCurrent = i === progressIdx;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  border: `2px solid ${isCompleted ? '#406A56' : isCurrent ? '#406A56' : 'rgba(64,106,86,0.2)'}`,
                  color: isCompleted ? 'white' : isCurrent ? '#406A56' : 'rgba(64,106,86,0.35)',
                  background: isCompleted ? '#406A56' : isCurrent ? 'rgba(64,106,86,0.08)' : 'white',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(64,106,86,0.1)' : 'none',
                  flexShrink: 0,
                }}>
                  {isCompleted && <Check size={10} strokeWidth={3} />}
                </div>
                {i < PROGRESS_STEPS.length - 1 && (
                  <div style={{
                    width: 14,
                    height: 2,
                    background: isCompleted ? '#406A56' : 'rgba(64,106,86,0.15)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
        <ThreeColAboutYou
          selected={selectedPills}
          onToggle={(label) =>
            setSelectedPills((prev) => {
              const next = new Set(prev);
              next.has(label) ? next.delete(label) : next.add(label);
              return next;
            })
          }
          onContinue={() => { commitPills(); goNext(); }}
          onBack={goBack}
          onSkip={goNext}
        />
        <style jsx>{`
          .yt-onboard-root {
            min-height: 100vh;
            min-height: 100dvh;
            background: linear-gradient(135deg, #fdf8f3 0%, #f5ede5 50%, #fdf8f3 100%);
            position: relative;
            overflow-x: hidden;
          }
          /* progress bar rendered inline above */
        `}</style>
      </div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  const isFullWidthStep =
    step === 'heartfelt' || step === 'image-upload' || step === 'ready';

  return (
    <div className="yt-onboard-root">
      {/* Decorative blobs (matching v1) */}
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />

      {/* Stepwise Progress Bar */}
      <div className="step-progress-bar">
        {PROGRESS_STEPS.map((s, i) => {
          const isCompleted = i < progressIdx;
          const isCurrent = i === progressIdx;
          return (
            <div key={s} className="step-progress-item">
              <div className={`step-dot ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-current' : ''}`}>
                {isCompleted && <Check size={10} strokeWidth={3} />}
              </div>
              {i < PROGRESS_STEPS.length - 1 && (
                <div className={`step-line ${isCompleted ? 'step-line-done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="yt-onboard-body">
        {/* Main content area */}
        <div
          className={`yt-onboard-inner ${
            isFullWidthStep ? 'full-width' : ''
          }`}
        >
          {/* Info tile — only for non-full-width steps */}
          {!isFullWidthStep && tileKey && (
            <>
              {/* Mobile: above form */}
              <OnboardingStepExplanation step={tileKey} showForMobile={true} />
              {/* Desktop: left panel */}
              <OnboardingStepExplanation step={tileKey} showForMobile={false} />
            </>
          )}

          {/* Form panel */}
          <div
            className={`form-panel ${isFullWidthStep ? 'form-panel-full' : ''}`}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              >
                {step === 'birth-info' && (
                  <BirthInfoStep
                    name={data.name}
                    birthday={data.birthday}
                    location={data.location}
                    onBirthdayChange={(birthday) => updateData({ birthday })}
                    onLocationChange={(location) => updateData({ location })}
                    onContinue={goNext}
                  />
                )}

                {/* about-you is rendered separately as ThreeColAboutYou */}

                {step === 'religion' && (
                  <ReligionStep
                    value={data.religion}
                    onChange={(religion) => updateData({ religion })}
                    onContinue={goNext}
                    onBack={goBack}
                    onSkip={goNext}
                  />
                )}

                {step === 'why-here' && (
                  <WhyHereStep
                    value={data.background}
                    onChange={(background) => updateData({ background })}
                    onContinue={goNext}
                    onBack={goBack}
                    onSkip={goNext}
                  />
                )}

                {step === 'heartfelt' && (
                  <div className="glass-card glass-card-strong p-6 max-w-2xl mx-auto">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#406A56] to-[#8DACAB] mb-3">
                        <Heart size={20} className="text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-[#2d2d2d] font-playfair">
                        Let&apos;s Go Deeper
                      </h2>
                      <p className="text-gray-500 text-xs mt-1">
                        Share what&apos;s on your mind — we&apos;ll capture the moments that matter
                      </p>
                    </div>
                    <ConversationEngine
                      context="onboarding"
                      userName={data.name}
                      userProfile={{
                        interests: data.interests || [],
                        religion: data.religion || undefined,
                        location: data.location || undefined,
                        whyHere: data.background || undefined,
                      }}
                      initialMessage={`${data.name}, what's a moment in your life that really shaped who you are today?`}
                      onComplete={(state) => {
                        updateData({
                          heartfeltAnswer: state.messages
                            .filter((m) => m.role === 'user')
                            .map((m) => m.content)
                            .join('\n\n'),
                        });
                        goNext();
                      }}
                      onSkip={goNext}
                      showSkip={true}
                      maxHeight="350px"
                    />
                  </div>
                )}

                {step === 'image-upload' && (
                  <ImageUploadStep
                    userId={userId}
                    onBack={goBack}
                    onContinue={(count) => {
                      updateData({ uploadedImagesCount: count });
                      goNext();
                    }}
                    onSkip={goNext}
                  />
                )}

                {step === 'ready' && (
                  <ReadyStep
                    name={data.name}
                    location={data.location}
                    onContinue={() => {
                      if (userId) {
                        localStorage.removeItem(`onboarding_progress_${userId}`);
                      }
                      onComplete(data);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Skip all */}
        {step !== 'ready' &&
          step !== 'heartfelt' &&
          step !== 'image-upload' &&
          onSkipAll && (
            <button className="skip-all-btn" onClick={onSkipAll}>
              Skip setup
            </button>
          )}
      </div>

      <style jsx>{`
        .yt-onboard-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(
            135deg,
            #fdf8f3 0%,
            #f5ede5 50%,
            #fdf8f3 100%
          );
          position: relative;
          overflow-x: hidden;
        }

        .step-progress-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 24px 12px;
          background: linear-gradient(to bottom, rgba(253, 248, 243, 0.95) 60%, transparent);
        }

        .step-progress-item {
          display: flex;
          align-items: center;
        }

        .step-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          border: 2px solid rgba(64, 106, 86, 0.2);
          color: rgba(64, 106, 86, 0.35);
          background: white;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .step-dot.step-current {
          border-color: #406A56;
          color: #406A56;
          background: rgba(64, 106, 86, 0.08);
          box-shadow: 0 0 0 4px rgba(64, 106, 86, 0.1);
        }

        .step-dot.step-completed {
          border-color: #406A56;
          background: #406A56;
          color: white;
        }

        .step-num {
          line-height: 1;
        }

        .step-line {
          width: 20px;
          height: 2px;
          background: rgba(64, 106, 86, 0.15);
          transition: background 0.3s ease;
        }

        .step-line-done {
          background: #406A56;
        }

        @media (max-width: 480px) {
          .step-progress-bar {
            padding: 12px 16px 10px;
          }
          .step-dot {
            width: 20px;
            height: 20px;
            font-size: 9px;
          }
          .step-line {
            width: 12px;
          }
        }

        .yt-onboard-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 56px 20px 24px;
          padding-top: calc(56px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        .yt-onboard-inner {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1100px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 24px;
          margin: auto 0;
        }

        /* Tiles + form side by side on desktop */
        @media (min-width: 1024px) {
          .yt-onboard-inner:not(.full-width) {
            flex-direction: row;
            align-items: flex-start;
            justify-content: center;
          }
        }

        .yt-onboard-inner.full-width {
          max-width: 100%;
          padding: 0;
          margin: -32px -20px;
          width: calc(100% + 40px);
        }

        .form-panel {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }

        @media (min-width: 1024px) {
          .form-panel {
            flex: 1;
            margin: 0;
          }
        }

        .form-panel-full {
          max-width: 100%;
          margin: 0;
        }

        .heartfelt-spacer {
          padding-top: 32px;
          padding-bottom: 24px;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
          padding-left: 20px;
          padding-right: 20px;
        }

        .skip-all-btn {
          margin-top: 24px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: rgba(45, 45, 45, 0.35);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .skip-all-btn:hover {
          color: rgba(45, 45, 45, 0.6);
        }
      `}</style>
    </div>
  );
}

// ============================================
// SHARED STYLES (as a constant for reuse)
// ============================================

const SHARED = `
  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #2d2d2d;
    margin: 0 0 8px;
    font-family: var(--font-playfair), Georgia, serif;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .subtitle {
    font-size: 15px;
    color: rgba(45, 45, 45, 0.55);
    margin: 0 0 28px;
    line-height: 1.5;
  }
  .yt-input {
    display: block;
    width: 100%;
    padding: 18px 20px;
    background: white;
    border: 1.5px solid rgba(64, 106, 86, 0.18);
    border-radius: 16px;
    color: #2d2d2d;
    font-size: 20px;
    text-align: center;
    margin-bottom: 20px;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
    box-shadow: 0 2px 8px rgba(64, 106, 86, 0.06);
  }
  .yt-input::placeholder { color: rgba(45,45,45,0.25); }
  .yt-input:focus {
    outline: none;
    border-color: #406A56;
    box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
  }
  .primary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 28px;
    background: #406A56;
    border: none;
    border-radius: 16px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
    white-space: nowrap;
  }
  .primary-btn:hover:not(:disabled) {
    background: #355948;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(64, 106, 86, 0.36);
  }
  .primary-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: white;
    border: 1.5px solid rgba(64, 106, 86, 0.18);
    border-radius: 14px;
    color: rgba(45, 45, 45, 0.6);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.2s, color 0.2s;
  }
  .back-btn:hover {
    border-color: #406A56;
    color: #406A56;
  }
  .btn-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .btn-row .primary-btn { flex: 1; }
  .skip-link {
    display: block;
    text-align: center;
    margin-top: 14px;
    color: rgba(45, 45, 45, 0.35);
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 6px;
    transition: color 0.2s;
  }
  .skip-link:hover { color: rgba(45, 45, 45, 0.65); }
`;

// ============================================
// STEP: BIRTH INFO (Birthday + Birthplace combined)
// ============================================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function BirthInfoStep({
  name,
  birthday,
  location,
  onBirthdayChange,
  onLocationChange,
  onContinue,
}: {
  name: string;
  birthday: string;
  location: string;
  onBirthdayChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onContinue: () => void;
}) {
  // Parse existing birthday (YYYY-MM-DD) into parts
  const [month, setMonth] = useState(() => {
    if (birthday) { const m = parseInt(birthday.split('-')[1], 10); return m > 0 ? MONTHS[m - 1] : ''; }
    return '';
  });
  const [day, setDay] = useState(() => {
    if (birthday) { const d = parseInt(birthday.split('-')[2], 10); return d > 0 ? String(d) : ''; }
    return '';
  });
  const [year, setYear] = useState(() => {
    if (birthday) { const y = birthday.split('-')[0]; return y !== '0000' ? y : ''; }
    return '';
  });

  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Location autocomplete state
  const [locationInput, setLocationInput] = useState(location);
  const [suggestions, setSuggestions] = useState<{ place_name: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync birthday parts to parent as YYYY-MM-DD
  useEffect(() => {
    const mIdx = MONTHS.indexOf(month);
    if (mIdx >= 0 && day && year && year.length === 4) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = String(parseInt(day, 10)).padStart(2, '0');
      onBirthdayChange(`${year}-${mm}-${dd}`);
    }
  }, [month, day, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (val: string) => {
    setMonth(val);
    if (val) setTimeout(() => dayRef.current?.focus(), 0);
  };

  const handleDayChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    setDay(num);
    if (num.length === 2) setTimeout(() => yearRef.current?.focus(), 0);
  };

  const handleYearChange = (val: string) => {
    setYear(val.replace(/\D/g, '').slice(0, 4));
  };

  // Mapbox autocomplete
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=place,locality,region,country&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features) {
        setSuggestions(data.features.map((f: any) => ({ place_name: f.place_name, id: f.id })));
        setShowSuggestions(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleLocationInput = (val: string) => {
    setLocationInput(val);
    onLocationChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectSuggestion = (placeName: string) => {
    setLocationInput(placeName);
    onLocationChange(placeName);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const hasBirthday = month && day && year && year.length === 4;
  const hasLocation = locationInput.trim().length > 0;
  const canProceed = hasBirthday && hasLocation;

  return (
    <div className="step-card">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📍</span>
          Where did your story begin{name ? `, ${name}` : ''}?
        </h2>
        <p className="subtitle">Your birthday and birthplace help us personalize your journey.</p>
      </motion.div>

      {/* Birthday section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="field-label">Birthday</label>
        <div className="birthday-row">
          <select
            className="bday-select"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            ref={dayRef}
            className="bday-input bday-day"
            type="text"
            inputMode="numeric"
            placeholder="Day"
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
          />
          <input
            ref={yearRef}
            className="bday-input bday-year"
            type="text"
            inputMode="numeric"
            placeholder="Year"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Birthplace section */}
      <motion.div
        className="location-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <label className="field-label">Birthplace</label>
        <div className="location-wrap">
          <input
            className="yt-input location-input"
            type="text"
            value={locationInput}
            onChange={(e) => handleLocationInput(e.target.value)}
            placeholder="e.g. Brooklyn, NY"
            autoComplete="off"
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  className="suggestion-item"
                  onMouseDown={() => selectSuggestion(s.place_name)}
                >
                  <MapPin size={14} />
                  <span>{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          className="primary-btn full-width"
          onClick={onContinue}
          disabled={!canProceed}
        >
          Next <ChevronRight size={18} />
        </button>
      </motion.div>

      <style jsx>{`
        ${SHARED}
        .step-card { text-align: center; }
        .step-icon { font-size: 40px; margin-bottom: 20px; display: block; }
        .full-width { width: 100%; }
        .field-label {
          display: block;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: rgba(45, 45, 45, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .birthday-row {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          max-width: 100%;
        }
        .bday-select {
          flex: 1.5;
          min-width: 0;
          padding: 14px 12px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 12px;
          color: #2d2d2d;
          font-size: 15px;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .bday-select:focus {
          outline: none;
          border-color: #406A56;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
        }
        .bday-input {
          flex: 1;
          min-width: 0;
          padding: 14px 8px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 12px;
          color: #2d2d2d;
          font-size: 15px;
          text-align: center;
          transition: border-color 0.2s;
        }
        .bday-input::placeholder { color: rgba(45, 45, 45, 0.3); }
        .bday-input:focus {
          outline: none;
          border-color: #406A56;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
        }
        .bday-day { width: 70px; flex: none; }
        .bday-year { width: 80px; flex: none; }
        .location-section { margin-bottom: 20px; }
        .location-wrap { position: relative; }
        .location-input { margin-bottom: 0; }
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(64, 106, 86, 0.12);
          z-index: 20;
          overflow: hidden;
        }
        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: white;
          border: none;
          color: #2d2d2d;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }
        .suggestion-item:hover {
          background: rgba(64, 106, 86, 0.08);
          color: #406A56;
        }
        .suggestion-item + .suggestion-item {
          border-top: 1px solid rgba(64, 106, 86, 0.06);
        }
      `}</style>
    </div>
  );
}

// ============================================
// STEP: ABOUT YOU
// ============================================

function AboutYouStep({
  selected,
  onToggle,
  onContinue,
  onBack,
  onSkip,
}: {
  selected: Set<string>;
  onToggle: (label: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customTraitInput, setCustomTraitInput] = useState('');
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [customTraits, setCustomTraits] = useState<string[]>([]);

  const addCustom = (
    input: string,
    setInput: (v: string) => void,
    customs: string[],
    setCustoms: (v: string[]) => void
  ) => {
    const val = input.trim();
    if (!val) return;
    const exists = customs.includes(val) || ABOUT_YOU_PILLS.some((p) => p.label.toLowerCase() === val.toLowerCase());
    if (!exists) {
      const updated = [...customs, val];
      setCustoms(updated);
    }
    // Auto-select it
    onToggle(val);
    setInput('');
  };

  const baseInterests = ABOUT_YOU_PILLS.filter((p) => p.category === 'interest');
  const baseTraits = ABOUT_YOU_PILLS.filter((p) => p.category === 'trait');

  const allInterests = [
    ...baseInterests,
    ...customInterests.map((l) => ({ label: l, emoji: '✏️', category: 'interest' as const })),
  ];
  const allTraits = [
    ...baseTraits,
    ...customTraits.map((l) => ({ label: l, emoji: '✏️', category: 'trait' as const })),
  ];

  return (
    <div className="about-step">
      <div className="about-header">
        <h2>A little about you</h2>
        <p className="subtitle">
          Pick what fits — or add your own. The more you choose, the more personalized your experience.
        </p>
      </div>

      {/* Scrollable pill area */}
      <div className="pill-scroll-area">
        {/* Interests section */}
        <div className="pill-section">
          <div className="section-header">
            <span className="section-dot" style={{ background: '#406A56' }} />
            <span className="section-label">Your Interests</span>
            <span className="section-count">
              {allInterests.filter((p) => selected.has(p.label)).length > 0
                ? `${allInterests.filter((p) => selected.has(p.label)).length} selected`
                : ''}
            </span>
          </div>
          <div className="pill-grid">
            {allInterests.map((p) => (
              <button
                key={p.label}
                className={`pill ${selected.has(p.label) ? 'pill-selected' : ''}`}
                onClick={() => onToggle(p.label)}
              >
                <span className="pill-emoji">{p.emoji}</span>
                {p.label}
                {selected.has(p.label) && <Check size={11} strokeWidth={3} />}
              </button>
            ))}
          </div>
          {/* Custom interest input */}
          <div className="custom-add-row">
            <input
              className="custom-input"
              type="text"
              value={customInterestInput}
              onChange={(e) => setCustomInterestInput(e.target.value)}
              placeholder="Add your own interest…"
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  addCustom(customInterestInput, setCustomInterestInput, customInterests, setCustomInterests);
              }}
            />
            <button
              className="custom-add-btn"
              onClick={() =>
                addCustom(customInterestInput, setCustomInterestInput, customInterests, setCustomInterests)
              }
              disabled={!customInterestInput.trim()}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Traits section */}
        <div className="pill-section">
          <div className="section-header">
            <span className="section-dot" style={{ background: '#406A56' }} />
            <span className="section-label">Who You Are</span>
            <span className="section-count">
              {allTraits.filter((p) => selected.has(p.label)).length > 0
                ? `${allTraits.filter((p) => selected.has(p.label)).length} selected`
                : ''}
            </span>
          </div>
          <div className="pill-grid">
            {allTraits.map((p) => (
              <button
                key={p.label}
                className={`pill ${selected.has(p.label) ? 'pill-selected pill-selected-trait' : ''}`}
                onClick={() => onToggle(p.label)}
              >
                <span className="pill-emoji">{p.emoji}</span>
                {p.label}
                {selected.has(p.label) && <Check size={11} strokeWidth={3} />}
              </button>
            ))}
          </div>
          {/* Custom trait input */}
          <div className="custom-add-row">
            <input
              className="custom-input"
              type="text"
              value={customTraitInput}
              onChange={(e) => setCustomTraitInput(e.target.value)}
              placeholder="Describe yourself…"
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  addCustom(customTraitInput, setCustomTraitInput, customTraits, setCustomTraits);
              }}
            />
            <button
              className="custom-add-btn custom-add-btn-trait"
              onClick={() =>
                addCustom(customTraitInput, setCustomTraitInput, customTraits, setCustomTraits)
              }
              disabled={!customTraitInput.trim()}
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Sticky nav */}
      <div className="about-nav">
        <div className="about-nav-inner">
          <button className="nav-back-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div className="nav-right">
            <button className="nav-continue-btn" onClick={onContinue}>
              {selected.size > 0 ? `Continue  ·  ${selected.size} selected` : 'Continue'}
              <ChevronRight size={18} />
            </button>
            <button className="nav-skip-link" onClick={onSkip}>
              Skip for now
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .about-step {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 80px);
        }
        .about-header {
          padding-bottom: 4px;
        }
        ${SHARED}
        .pill-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 16px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .section-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(45, 45, 45, 0.5);
        }
        .section-count {
          font-size: 11px;
          font-weight: 600;
          color: #406A56;
          margin-left: auto;
        }
        .pill-section {
          margin-bottom: 28px;
        }
        .pill-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }
        .pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 9px 8px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 12px;
          color: rgba(45, 45, 45, 0.65);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          line-height: 1.2;
          text-align: center;
          min-height: 40px;
        }
        .pill-emoji { font-size: 14px; line-height: 1; flex-shrink: 0; }
        .pill:hover {
          border-color: #406A56;
          color: #406A56;
          background: rgba(64, 106, 86, 0.03);
        }
        .pill-selected {
          background: rgba(64, 106, 86, 0.09);
          border-color: #406A56;
          color: #406A56;
          font-weight: 600;
        }
        .pill-selected-trait {
          background: rgba(64, 106, 86, 0.09);
          border-color: #406A56;
          color: #406A56;
        }
        /* Custom add row */
        .custom-add-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .custom-input {
          flex: 1;
          padding: 9px 14px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 100px;
          color: #2d2d2d;
          font-size: 13px;
          transition: border-color 0.2s;
          min-width: 0;
        }
        .custom-input::placeholder { color: rgba(45, 45, 45, 0.3); }
        .custom-input:focus {
          outline: none;
          border-color: #406A56;
          box-shadow: 0 0 0 2px rgba(64, 106, 86, 0.1);
        }
        .custom-add-btn {
          padding: 9px 16px;
          background: rgba(64, 106, 86, 0.08);
          border: 1.5px solid rgba(64, 106, 86, 0.2);
          border-radius: 100px;
          color: #406A56;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .custom-add-btn:hover:not(:disabled) {
          background: rgba(64, 106, 86, 0.14);
          border-color: #406A56;
        }
        .custom-add-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .custom-add-btn-trait {
          background: rgba(64, 106, 86, 0.07);
          border-color: rgba(64, 106, 86, 0.2);
          color: #406A56;
        }
        .custom-add-btn-trait:hover:not(:disabled) {
          background: rgba(64, 106, 86, 0.13);
          border-color: #406A56;
        }
        /* Sticky nav */
        .about-nav {
          position: sticky;
          bottom: 0;
          background: linear-gradient(to bottom, transparent, #fdf8f3 30%);
          padding-top: 20px;
          margin-top: auto;
        }
        .about-nav-inner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .nav-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.55);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s, color 0.2s;
        }
        .nav-back-btn:hover {
          border-color: #406A56;
          color: #406A56;
        }
        .nav-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .nav-continue-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px 20px;
          background: #406A56;
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
          transition: background 0.2s, transform 0.15s;
        }
        .nav-continue-btn:hover {
          background: #355948;
          transform: translateY(-1px);
        }
        .nav-skip-link {
          display: block;
          text-align: center;
          background: transparent;
          border: none;
          color: rgba(45, 45, 45, 0.32);
          font-size: 12px;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        .nav-skip-link:hover { color: rgba(45, 45, 45, 0.6); }
      `}</style>
    </div>
  );
}

// ============================================
// STEP: RELIGION
// ============================================

function ReligionStep({
  value,
  onChange,
  onContinue,
  onBack,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [otherText, setOtherText] = useState('');

  // Parse comma-joined string back to array for multi-select
  const selectedArr = value ? value.split(', ').filter(Boolean) : [];

  const toggleOption = (opt: string) => {
    let next: string[];
    if (opt === 'Other') {
      const hasOther = selectedArr.some(s => s === 'Other' || s.startsWith('Other:'));
      if (hasOther) {
        next = selectedArr.filter(s => s !== 'Other' && !s.startsWith('Other:'));
        setOtherText('');
      } else {
        next = [...selectedArr, 'Other'];
      }
    } else {
      if (selectedArr.includes(opt)) {
        next = selectedArr.filter(s => s !== opt);
      } else {
        next = [...selectedArr, opt];
      }
    }
    onChange(next.join(', '));
  };

  const handleOtherChange = (text: string) => {
    setOtherText(text);
    const withoutOther = selectedArr.filter(s => s !== 'Other' && !s.startsWith('Other:'));
    if (text.trim()) {
      onChange([...withoutOther, `Other: ${text.trim()}`].join(', '));
    } else {
      onChange([...withoutOther, 'Other'].join(', '));
    }
  };

  const isOtherSelected = selectedArr.some(s => s === 'Other' || s.startsWith('Other:'));
  const isOptionSelected = (opt: string) => {
    if (opt === 'Other') return isOtherSelected;
    return selectedArr.includes(opt);
  };

  return (
    <div className="step-card">
      <h2>Faith &amp; belief</h2>
      <p className="subtitle">
        This helps us personalize how we explore life&apos;s deeper moments with you. Select all that apply.
      </p>

      <div className="religion-grid">
        {RELIGION_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`religion-btn ${isOptionSelected(opt) ? 'religion-selected' : ''}`}
            onClick={() => toggleOption(opt)}
          >
            {isOptionSelected(opt) && <Check size={14} />}
            {opt}
          </button>
        ))}
      </div>

      {/* "Other" custom input */}
      {isOtherSelected && (
        <motion.div
          className="other-input-wrap"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <input
            className="other-input"
            type="text"
            value={otherText}
            onChange={(e) => handleOtherChange(e.target.value)}
            placeholder="Please describe your belief or tradition…"
            autoFocus
          />
        </motion.div>
      )}

      {/* Trust badge */}
      <div className="trust-badge">
        <Shield size={14} color="#406A56" />
        <span>Your beliefs are private and never shared.</span>
      </div>

      {/* Sticky nav */}
      <div className="religion-nav">
        <div className="religion-nav-inner">
          <button className="nav-back" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <button className="nav-continue" onClick={value ? onContinue : onSkip}>
            {value ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        ${SHARED}
        .step-card {}
        .religion-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .religion-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 100px;
          color: rgba(45, 45, 45, 0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 4px rgba(64, 106, 86, 0.06);
        }
        .religion-btn:hover {
          border-color: #406A56;
          color: #406A56;
        }
        .religion-selected {
          background: rgba(64, 106, 86, 0.08);
          border-color: #406A56;
          color: #406A56;
          font-weight: 600;
        }
        .other-input-wrap {
          overflow: hidden;
          margin-bottom: 16px;
        }
        .other-input {
          width: 100%;
          padding: 14px 16px;
          background: white;
          border: 1.5px solid #406A56;
          border-radius: 14px;
          color: #2d2d2d;
          font-size: 15px;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.08);
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .other-input::placeholder { color: rgba(45, 45, 45, 0.35); }
        .other-input:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(64, 106, 86, 0.12);
        }
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(64, 106, 86, 0.05);
          border: 1px solid rgba(64, 106, 86, 0.1);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .trust-badge span {
          font-size: 12px;
          color: rgba(64, 106, 86, 0.8);
        }
        /* sticky nav */
        .religion-nav {
          position: sticky;
          bottom: 0;
          background: linear-gradient(to bottom, transparent, #fdf8f3 30%);
          padding-top: 16px;
          padding-bottom: 4px;
        }
        .religion-nav-inner {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .nav-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.55);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s, color 0.2s;
        }
        .nav-back:hover { border-color: #406A56; color: #406A56; }
        .nav-continue {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 15px 20px;
          background: #406A56;
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
          transition: background 0.2s, transform 0.15s;
        }
        .nav-continue:hover { background: #355948; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ============================================
// STEP: READY
// ============================================

function ReadyStep({
  name,
  location,
  onContinue,
}: {
  name: string;
  location: string;
  onContinue: () => void;
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <motion.div
        style={{ display: 'inline-flex', marginBottom: 32 }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
      >
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #406A56, #8DACAB)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 16px rgba(64, 106, 86, 0.08), 0 0 0 32px rgba(64, 106, 86, 0.04), 0 20px 60px rgba(64, 106, 86, 0.3)',
        }}>
          <Check size={48} color="white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: '#2d2d2d',
          margin: '0 0 16px',
          fontFamily: 'var(--font-playfair), Georgia, serif',
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        You&apos;re all set, {name}!
      </motion.h1>

      <motion.p
        style={{
          fontSize: 18,
          color: 'rgba(45, 45, 45, 0.6)',
          lineHeight: 1.6,
          margin: '0 0 40px',
          maxWidth: 380,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {location
          ? `Your story from ${location} is just beginning.`
          : 'Your story is just beginning.'}{' '}
        Let&apos;s make it unforgettable.
      </motion.p>

      <motion.button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 44px',
          background: '#406A56',
          border: 'none',
          borderRadius: 20,
          color: 'white',
          fontSize: 20,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 12px 40px rgba(64, 106, 86, 0.35)',
          letterSpacing: '-0.2px',
        }}
        whileHover={{ y: -3, boxShadow: '0 20px 50px rgba(64, 106, 86, 0.45)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={onContinue}
      >
        Enter YoursTruly <Sparkles size={20} />
      </motion.button>
    </div>
  );
}

// ============================================
// THREE-COLUMN ABOUT YOU
// ============================================

function ThreeColAboutYou({
  selected,
  onToggle,
  onContinue,
  onBack,
  onSkip,
}: {
  selected: Set<string>;
  onToggle: (label: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customTraitInput, setCustomTraitInput] = useState('');
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [customTraits, setCustomTraits] = useState<string[]>([]);

  const addCustom = (
    input: string,
    setInput: (v: string) => void,
    customs: string[],
    setCustoms: (v: string[]) => void
  ) => {
    const val = input.trim();
    if (!val) return;
    const exists =
      customs.includes(val) ||
      ABOUT_YOU_PILLS.some((p) => p.label.toLowerCase() === val.toLowerCase());
    if (!exists) setCustoms([...customs, val]);
    onToggle(val);
    setInput('');
  };

  const baseInterests = ABOUT_YOU_PILLS.filter((p) => p.category === 'interest');
  const baseTraits = ABOUT_YOU_PILLS.filter((p) => p.category === 'trait');
  const allInterests = [
    ...baseInterests,
    ...customInterests.map((l) => ({ label: l, emoji: '✏️', category: 'interest' as const })),
  ];
  const allTraits = [
    ...baseTraits,
    ...customTraits.map((l) => ({ label: l, emoji: '✏️', category: 'trait' as const })),
  ];

  const interestCount = allInterests.filter((p) => selected.has(p.label)).length;
  const traitCount = allTraits.filter((p) => selected.has(p.label)).length;
  const totalCount = interestCount + traitCount;

  return (
    <div className="three-col-root">
      {/* Column 1 — Info tile */}
      <div className="col-info">
        <OnboardingStepExplanation step="interests" showForMobile={false} />
      </div>

      {/* Column 2 — Interests */}
      <div className="col-panel">
        <div className="col-header">
          <span className="col-dot col-dot-green" />
          <span className="col-title">Your Interests</span>
          {interestCount > 0 && <span className="col-count">{interestCount} selected</span>}
        </div>
        <div className="pill-grid-3col">
          {allInterests.map((p) => (
            <button
              key={p.label}
              className={`pill3 ${selected.has(p.label) ? 'pill3-sel' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span className="pill3-emoji">{p.emoji}</span>
              <span className="pill3-label">{p.label}</span>
              {selected.has(p.label) && <Check size={10} strokeWidth={3} className="pill3-check" />}
            </button>
          ))}
        </div>
        <div className="custom-row">
          <input
            className="custom-inp"
            type="text"
            value={customInterestInput}
            onChange={(e) => setCustomInterestInput(e.target.value)}
            placeholder="Add your own…"
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                addCustom(customInterestInput, setCustomInterestInput, customInterests, setCustomInterests);
            }}
          />
          <button
            className="custom-btn custom-btn-green"
            disabled={!customInterestInput.trim()}
            onClick={() =>
              addCustom(customInterestInput, setCustomInterestInput, customInterests, setCustomInterests)
            }
          >
            + Add
          </button>
        </div>
      </div>

      {/* Column 3 — Personality + nav */}
      <div className="col-panel">
        <div className="col-header">
          <span className="col-dot col-dot-rust" />
          <span className="col-title">Who You Are</span>
          {traitCount > 0 && <span className="col-count col-count-rust">{traitCount} selected</span>}
        </div>
        <div className="pill-grid-3col">
          {allTraits.map((p) => (
            <button
              key={p.label}
              className={`pill3 ${selected.has(p.label) ? 'pill3-sel pill3-sel-rust' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span className="pill3-emoji">{p.emoji}</span>
              <span className="pill3-label">{p.label}</span>
              {selected.has(p.label) && <Check size={10} strokeWidth={3} className="pill3-check" />}
            </button>
          ))}
        </div>
        <div className="custom-row">
          <input
            className="custom-inp"
            type="text"
            value={customTraitInput}
            onChange={(e) => setCustomTraitInput(e.target.value)}
            placeholder="Describe yourself…"
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                addCustom(customTraitInput, setCustomTraitInput, customTraits, setCustomTraits);
            }}
          />
          <button
            className="custom-btn custom-btn-rust"
            disabled={!customTraitInput.trim()}
            onClick={() =>
              addCustom(customTraitInput, setCustomTraitInput, customTraits, setCustomTraits)
            }
          >
            + Add
          </button>
        </div>

        {/* Nav lives in col 3 */}
        <div className="col3-nav">
          <button className="col3-back" onClick={onBack} aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <button className="col3-continue" onClick={onContinue}>
            {totalCount > 0 ? `Continue  ·  ${totalCount} selected` : 'Continue'}
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="col3-skip" onClick={onSkip}>Skip for now</button>
      </div>

      <style jsx>{`
        .three-col-root {
          display: grid;
          grid-template-columns: 320px 1fr 1fr;
          gap: 24px;
          align-items: start;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px 32px;
          box-sizing: border-box;
          min-height: calc(100vh - 3px);
        }

        @media (max-width: 1023px) {
          .three-col-root {
            grid-template-columns: 1fr;
            max-width: 520px;
          }
          .col-info { display: none; }
        }

        .col-info {
          position: sticky;
          top: 24px;
        }

        .col-panel {
          background: white;
          border-radius: 20px;
          padding: 22px 20px 18px;
          box-shadow: 0 2px 12px rgba(64, 106, 86, 0.07);
          border: 1px solid rgba(64, 106, 86, 0.08);
          overflow-y: auto;
          max-height: calc(100vh - 80px);
        }

        .col-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .col-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .col-dot-green { background: #406A56; }
        .col-dot-rust { background: #406A56; }

        .col-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(45, 45, 45, 0.45);
          flex: 1;
        }

        .col-count {
          font-size: 11px;
          font-weight: 600;
          color: #406A56;
        }
        .col-count-rust { color: #406A56; }

        .pill-grid-3col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }

        .pill3 {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px 6px 8px;
          background: rgba(64, 106, 86, 0.02);
          border: 1.5px solid rgba(64, 106, 86, 0.13);
          border-radius: 12px;
          color: rgba(45, 45, 45, 0.6);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.13s ease;
          min-height: 56px;
          position: relative;
          text-align: center;
        }

        .pill3:hover {
          border-color: #406A56;
          color: #406A56;
          background: rgba(64, 106, 86, 0.04);
        }

        .pill3-sel {
          background: rgba(64, 106, 86, 0.09);
          border-color: #406A56;
          color: #406A56;
          font-weight: 600;
        }

        .pill3-sel-rust {
          background: rgba(64, 106, 86, 0.09);
          border-color: #406A56;
          color: #406A56;
        }

        .pill3-emoji { font-size: 18px; line-height: 1; }
        .pill3-label { line-height: 1.2; }

        :global(.pill3-check) {
          position: absolute;
          top: 4px;
          right: 4px;
          color: inherit;
        }

        /* Custom add */
        .custom-row {
          display: flex;
          gap: 6px;
          margin-bottom: 4px;
        }

        .custom-inp {
          flex: 1;
          padding: 9px 12px;
          background: rgba(64, 106, 86, 0.02);
          border: 1.5px solid rgba(64, 106, 86, 0.14);
          border-radius: 100px;
          color: #2d2d2d;
          font-size: 12px;
          min-width: 0;
        }
        .custom-inp::placeholder { color: rgba(45, 45, 45, 0.28); }
        .custom-inp:focus {
          outline: none;
          border-color: #406A56;
          box-shadow: 0 0 0 2px rgba(64, 106, 86, 0.09);
        }

        .custom-btn {
          padding: 8px 13px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.13s;
          flex-shrink: 0;
        }
        .custom-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .custom-btn-green {
          background: rgba(64, 106, 86, 0.08);
          border: 1.5px solid rgba(64, 106, 86, 0.2);
          color: #406A56;
        }
        .custom-btn-green:hover:not(:disabled) {
          background: rgba(64, 106, 86, 0.14);
        }

        .custom-btn-rust {
          background: rgba(64, 106, 86, 0.07);
          border: 1.5px solid rgba(64, 106, 86, 0.2);
          color: #406A56;
        }
        .custom-btn-rust:hover:not(:disabled) {
          background: rgba(64, 106, 86, 0.13);
        }

        /* Nav in col 3 */
        .col3-nav {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .col3-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 12px;
          color: rgba(45, 45, 45, 0.5);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s, color 0.15s;
        }
        .col3-back:hover { border-color: #406A56; color: #406A56; }

        .col3-continue {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 13px 16px;
          background: #406A56;
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(64, 106, 86, 0.28);
          transition: background 0.15s, transform 0.12s;
        }
        .col3-continue:hover { background: #355948; transform: translateY(-1px); }

        .col3-skip {
          display: block;
          width: 100%;
          text-align: center;
          background: transparent;
          border: none;
          color: rgba(45, 45, 45, 0.28);
          font-size: 12px;
          cursor: pointer;
          padding: 6px;
          margin-top: 4px;
          transition: color 0.15s;
        }
        .col3-skip:hover { color: rgba(45, 45, 45, 0.55); }
      `}</style>
    </div>
  );
}

// ============================================
// STEP: WHY ARE YOU HERE
// ============================================

const WHY_OPTIONS = [
  { emoji: '🧠', text: "I want to reflect on my life experiences and personal growth" },
  { emoji: '💼', text: "I'm reflecting on my career and the lessons I've learned" },
  { emoji: '❤️', text: "I want to preserve my parents' stories before they're lost" },
  { emoji: '🔄', text: "I'm at a transitional moment and processing big changes" },
  { emoji: '🌱', text: "I want to create something meaningful for my children" },
  { emoji: '📖', text: "I want to document my life story for future generations" },
];

function WhyHereStep({
  value,
  onChange,
  onContinue,
  onBack,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [freeText, setFreeText] = useState('');
  const isOptionSelected = WHY_OPTIONS.some((o) => o.text === value);

  const handleFreeText = (text: string) => {
    setFreeText(text);
    if (text.trim()) onChange(text.trim());
  };

  return (
    <div className="why-step">
      <motion.div
        className="why-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        💭
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>What brings you here?</h2>
        <p className="subtitle">
          This shapes the first question we ask you — so be as honest as you like.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="why-options">
          {WHY_OPTIONS.map((opt) => (
            <button
              key={opt.text}
              className={`why-option ${value === opt.text ? 'why-selected' : ''}`}
              onClick={() => {
                setFreeText('');
                onChange(opt.text);
              }}
            >
              <span className="why-emoji">{opt.emoji}</span>
              <span className="why-text">{opt.text}</span>
              {value === opt.text && <Check size={16} className="why-check" />}
            </button>
          ))}
        </div>

        <div className="why-or">
          <div className="why-or-line" />
          <span>or in your own words</span>
          <div className="why-or-line" />
        </div>

        <textarea
          className="why-textarea"
          value={freeText}
          onChange={(e) => handleFreeText(e.target.value)}
          placeholder="Share what's on your heart…"
          rows={3}
        />
      </motion.div>

      <div className="why-nav">
        <button className="nav-back-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} />
        </button>
        <div className="nav-right">
          <button
            className="nav-continue-btn"
            onClick={value.trim() ? onContinue : onSkip}
          >
            {value.trim() ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        ${SHARED}
        .why-step {}
        .why-icon { font-size: 40px; margin-bottom: 20px; display: block; }
        .why-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .why-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.7);
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 4px rgba(64, 106, 86, 0.05);
          position: relative;
        }
        .why-option:hover {
          border-color: #406A56;
          color: #406A56;
          background: rgba(64, 106, 86, 0.02);
        }
        .why-selected {
          background: rgba(64, 106, 86, 0.07);
          border-color: #406A56;
          color: #406A56;
          font-weight: 500;
        }
        .why-emoji { font-size: 18px; flex-shrink: 0; }
        .why-text { flex: 1; line-height: 1.4; }
        :global(.why-check) {
          color: #406A56;
          flex-shrink: 0;
        }
        .why-or {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          color: rgba(45, 45, 45, 0.35);
          font-size: 12px;
        }
        .why-or-line {
          flex: 1;
          height: 1px;
          background: rgba(64, 106, 86, 0.12);
        }
        .why-textarea {
          width: 100%;
          padding: 14px 16px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 14px;
          color: #2d2d2d;
          font-size: 14px;
          resize: none;
          margin-bottom: 4px;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .why-textarea::placeholder { color: rgba(45, 45, 45, 0.28); }
        .why-textarea:focus {
          outline: none;
          border-color: #406A56;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.09);
        }
        /* Reuse nav styles */
        .why-nav {
          position: sticky;
          bottom: 0;
          background: linear-gradient(to bottom, transparent, #fdf8f3 30%);
          padding-top: 16px;
          padding-bottom: 4px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 12px;
        }
        .nav-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.55);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s, color 0.2s;
        }
        .nav-back-btn:hover { border-color: #406A56; color: #406A56; }
        .nav-right { flex: 1; }
        .nav-continue-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px 20px;
          background: #406A56;
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
          transition: background 0.2s, transform 0.15s;
        }
        .nav-continue-btn:hover { background: #355948; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
