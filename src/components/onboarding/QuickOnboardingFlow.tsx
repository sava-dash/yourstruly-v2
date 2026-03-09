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
} from 'lucide-react';
import { OnboardingStepExplanation } from './OnboardingStepExplanation';
import { HeartfeltConversation } from './HeartfeltConversation';
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
  | 'name'
  | 'location'
  | 'globe'
  | 'about-you'
  | 'religion'
  | 'heartfelt'
  | 'image-upload'
  | 'ready';

const ALL_STEPS: QuickStep[] = [
  'name',
  'location',
  'globe',
  'about-you',
  'religion',
  'heartfelt',
  'image-upload',
  'ready',
];

// Steps that show the progress bar (no globe/ready)
const PROGRESS_STEPS: QuickStep[] = [
  'name',
  'location',
  'about-you',
  'religion',
  'heartfelt',
  'image-upload',
];

// Map each step to the explanation tile key
const TILE_KEY: Partial<Record<QuickStep, string>> = {
  name: 'name',
  location: 'location',
  'about-you': 'interests',
  religion: 'religion',
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

const ABOUT_YOU_PILLS: Pill[] = [
  // Interests
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
  // Traits
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

const RELIGION_OPTIONS = [
  'Christianity',
  'Islam',
  'Judaism',
  'Hinduism',
  'Buddhism',
  'Sikhism',
  'Spiritual but not religious',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say',
];

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
  location,
  onDone,
}: {
  name: string;
  location: string;
  onDone: () => void;
}) {
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

      // Pause on globe for 2.5s then fly in
      await delay(2500);
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
              <p class="marker-name">${name}</p>
              <p class="marker-loc">${location}</p>
            </div>
          </div>
        `;

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);

        markerRef.current = marker;
        setPhase('pinned');

        // Auto-advance after showing pin
        setTimeout(advance, 6000);
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

      {/* Pinned — name card + continue */}
      <AnimatePresence>
        {phase === 'pinned' && (
          <motion.div
            className="globe-bottom-panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 24 }}
          >
            <div className="globe-name-card">
              <div className="globe-name-icon">
                <MapPin size={18} color="#406A56" />
              </div>
              <div>
                <p className="globe-name">{name}</p>
                <p className="globe-loc">{location}</p>
              </div>
            </div>
            <motion.button
              className="globe-continue-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={advance}
            >
              Continue <ChevronRight size={18} />
            </motion.button>
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
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: calc(100% - 48px);
          max-width: 420px;
        }

        .globe-name-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 22px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
          width: 100%;
        }

        .globe-name-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(64, 106, 86, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .globe-name {
          font-size: 18px;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 2px;
          font-family: var(--font-playfair), Georgia, serif;
        }

        .globe-loc {
          font-size: 13px;
          color: rgba(45, 45, 45, 0.55);
          margin: 0;
        }

        .globe-continue-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 32px;
          background: #406A56;
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(64, 106, 86, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          width: 100%;
          justify-content: center;
        }

        .globe-continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(64, 106, 86, 0.5);
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
}

export function QuickOnboardingFlow({
  onComplete,
  onSkipAll,
  userId,
}: QuickOnboardingFlowProps) {
  const [step, setStep] = useState<QuickStep>('name');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<OnboardingData>({
    name: '',
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
  const [selectedPills, setSelectedPills] = useState<Set<string>>(new Set());

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx < ALL_STEPS.length - 1) {
      setDirection(1);
      setStep(ALL_STEPS[idx + 1]);
    } else {
      onComplete(data);
    }
  }, [step, data, onComplete]);

  const goBack = useCallback(() => {
    const idx = ALL_STEPS.indexOf(step);
    // Skip globe when going backwards
    const targetIdx =
      step === 'about-you' ? ALL_STEPS.indexOf('location') : idx - 1;
    if (targetIdx >= 0) {
      setDirection(-1);
      setStep(ALL_STEPS[targetIdx]);
    }
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
  const tileKey = TILE_KEY[step];

  // Full-screen globe step — render outside normal layout
  if (step === 'globe') {
    return (
      <MapboxGlobeReveal
        name={data.name}
        location={data.location || 'somewhere beautiful'}
        onDone={goNext}
      />
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

      {/* Progress bar */}
      {progressIdx >= 0 && (
        <div className="progress-track">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{
              width: `${((progressIdx + 1) / PROGRESS_STEPS.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

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
                {step === 'name' && (
                  <NameStep
                    value={data.name}
                    onChange={(name) => updateData({ name })}
                    onContinue={goNext}
                  />
                )}

                {step === 'location' && (
                  <LocationStep
                    name={data.name}
                    value={data.location}
                    onChange={(location) => updateData({ location })}
                    onContinue={goNext}
                    onBack={goBack}
                  />
                )}

                {step === 'about-you' && (
                  <AboutYouStep
                    selected={selectedPills}
                    onToggle={(label) =>
                      setSelectedPills((prev) => {
                        const next = new Set(prev);
                        next.has(label) ? next.delete(label) : next.add(label);
                        return next;
                      })
                    }
                    onContinue={() => {
                      commitPills();
                      goNext();
                    }}
                    onBack={goBack}
                    onSkip={goNext}
                  />
                )}

                {step === 'religion' && (
                  <ReligionStep
                    value={data.religion}
                    onChange={(religion) => updateData({ religion })}
                    onContinue={goNext}
                    onBack={goBack}
                    onSkip={goNext}
                  />
                )}

                {step === 'heartfelt' && (
                  <HeartfeltConversation
                    whyHere="preserve my memories and life story"
                    whatDrives={
                      data.interests.length > 0
                        ? data.interests
                        : ['living fully']
                    }
                    userName={data.name}
                    onComplete={(conversation) => {
                      const lastUser = [...conversation]
                        .reverse()
                        .find((m) => m.role === 'user');
                      updateData({
                        heartfeltConversation: conversation,
                        heartfeltAnswer: lastUser?.content ?? '',
                      });
                      goNext();
                    }}
                    onSkip={goNext}
                  />
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
                    onContinue={() => onComplete(data)}
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

        .progress-track {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(64, 106, 86, 0.12);
          z-index: 50;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #406a56, #8dacab);
          border-radius: 0 2px 2px 0;
        }

        .yt-onboard-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          padding: 32px 20px 24px;
          padding-top: calc(32px + env(safe-area-inset-top));
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
          flex: 1;
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
// STEP: NAME
// ============================================

function NameStep({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="step-card">
      <motion.div
        className="step-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        👋
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>What's your name?</h2>
        <p className="subtitle">
          Just your first name. It's how everyone will know you here.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <input
          className="yt-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your first name"
          autoFocus
          autoComplete="given-name"
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onContinue()}
        />
        <button
          className="primary-btn full-width"
          onClick={onContinue}
          disabled={!value.trim()}
        >
          Nice to meet you <ChevronRight size={18} />
        </button>
      </motion.div>

      <style jsx>{`
        ${SHARED}
        .step-card { text-align: center; }
        .step-icon { font-size: 40px; margin-bottom: 20px; display: block; }
        .full-width { width: 100%; }
      `}</style>
    </div>
  );
}

// ============================================
// STEP: LOCATION
// ============================================

function LocationStep({
  name,
  value,
  onChange,
  onContinue,
  onBack,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="step-card">
      <motion.div
        className="step-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        📍
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>Where are you from, {name}?</h2>
        <p className="subtitle">
          City, state or country — however you'd describe home.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <input
          className="yt-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Miami, FL"
          autoFocus
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onContinue()}
        />
        <div className="btn-row">
          <button className="back-btn" onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
          <button
            className="primary-btn"
            onClick={onContinue}
            disabled={!value.trim()}
          >
            Show me on the map <Sparkles size={16} />
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        ${SHARED}
        .step-card { text-align: center; }
        .step-icon { font-size: 40px; margin-bottom: 20px; display: block; }
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
  const interests = ABOUT_YOU_PILLS.filter((p) => p.category === 'interest');
  const traits = ABOUT_YOU_PILLS.filter((p) => p.category === 'trait');

  return (
    <div className="step-card">
      <h2>A little about you</h2>
      <p className="subtitle">
        Pick anything that fits — the more you choose, the more personalized your experience.
      </p>

      <div className="pill-section">
        <div className="section-label">✦ Your Interests</div>
        <div className="pill-grid">
          {interests.map((p) => (
            <button
              key={p.label}
              className={`pill ${selected.has(p.label) ? 'pill-selected' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span>{p.emoji}</span>
              {p.label}
              {selected.has(p.label) && <Check size={12} />}
            </button>
          ))}
        </div>
      </div>

      <div className="pill-section">
        <div className="section-label">✦ Who You Are</div>
        <div className="pill-grid">
          {traits.map((p) => (
            <button
              key={p.label}
              className={`pill ${selected.has(p.label) ? 'pill-selected' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span>{p.emoji}</span>
              {p.label}
              {selected.has(p.label) && <Check size={12} />}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row action-row">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <button className="primary-btn" onClick={onContinue}>
          {selected.size > 0
            ? `Continue (${selected.size} selected)`
            : 'Continue'}
          <ChevronRight size={18} />
        </button>
      </div>
      <button className="skip-link" onClick={onSkip}>
        Skip for now
      </button>

      <style jsx>{`
        ${SHARED}
        .step-card {}
        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #406A56;
          margin-bottom: 10px;
        }
        .pill-section { margin-bottom: 24px; }
        .pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 8px 14px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 100px;
          color: rgba(45, 45, 45, 0.7);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 4px rgba(64, 106, 86, 0.06);
        }
        .pill:hover {
          border-color: #406A56;
          color: #406A56;
        }
        .pill-selected {
          background: rgba(64, 106, 86, 0.08);
          border-color: #406A56;
          color: #406A56;
          font-weight: 600;
        }
        .action-row { margin-top: 24px; margin-bottom: 8px; }
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
  return (
    <div className="step-card">
      <h2>Faith &amp; belief</h2>
      <p className="subtitle">
        This helps us personalize how we explore life's deeper moments with you.
      </p>

      <div className="religion-grid">
        {RELIGION_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`religion-btn ${value === opt ? 'religion-selected' : ''}`}
            onClick={() => onChange(opt)}
          >
            {value === opt && <Check size={14} />}
            {opt}
          </button>
        ))}
      </div>

      {/* Trust badge */}
      <div className="trust-badge">
        <Shield size={14} color="#406A56" />
        <span>Your beliefs are private and never shared.</span>
      </div>

      <div className="btn-row action-row">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <button className="primary-btn" onClick={value ? onContinue : onSkip}>
          {value ? 'Continue' : 'Skip'} <ChevronRight size={18} />
        </button>
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
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(64, 106, 86, 0.05);
          border: 1px solid rgba(64, 106, 86, 0.1);
          border-radius: 12px;
          margin-bottom: 4px;
        }
        .trust-badge span {
          font-size: 12px;
          color: rgba(64, 106, 86, 0.8);
        }
        .action-row { margin-top: 20px; }
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
    <div className="ready-step">
      <motion.div
        className="check-ring"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
      >
        <div className="check-inner">
          <Check size={48} color="white" strokeWidth={2.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        You're all set, {name}! 🎉
      </motion.h1>

      <motion.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {location
          ? `Your story from ${location} starts now.`
          : 'Your story starts now.'}{' '}
        We'll be with you every step of the way.
      </motion.p>

      <motion.button
        className="ready-btn"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        onClick={onContinue}
      >
        Enter YoursTruly <Sparkles size={20} />
      </motion.button>

      <style jsx>{`
        .ready-step {
          text-align: center;
          padding: 40px 20px;
          min-height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .check-ring { display: inline-flex; margin-bottom: 32px; }
        .check-inner {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #406A56, #8DACAB);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 16px rgba(64, 106, 86, 0.08),
            0 0 0 32px rgba(64, 106, 86, 0.04),
            0 20px 60px rgba(64, 106, 86, 0.3);
        }
        h1 {
          font-size: 34px;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 16px;
          font-family: var(--font-playfair), Georgia, serif;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 18px;
          color: rgba(45, 45, 45, 0.6);
          line-height: 1.6;
          margin: 0 0 40px;
          max-width: 380px;
        }
        .ready-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 20px 44px;
          background: #406A56;
          border: none;
          border-radius: 20px;
          color: white;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 12px 40px rgba(64, 106, 86, 0.35);
          letter-spacing: -0.2px;
        }
        .ready-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 50px rgba(64, 106, 86, 0.45);
        }
      `}</style>
    </div>
  );
}
