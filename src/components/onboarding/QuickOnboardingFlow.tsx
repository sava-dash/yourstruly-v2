'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Sparkles,
  Check,
} from 'lucide-react';
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

// Steps visible in progress bar (globe is a transition, not counted)
const PROGRESS_STEPS: QuickStep[] = [
  'name',
  'location',
  'about-you',
  'religion',
  'heartfelt',
  'image-upload',
  'ready',
];

// Full step order
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

// ============================================
// PILL DATA
// ============================================

interface Pill {
  label: string;
  emoji: string;
  category: 'interest' | 'trait';
}

const ABOUT_YOU_PILLS: Pill[] = [
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
// ANIMATED GLOBE
// ============================================

type GlobePhase = 'idle' | 'spin' | 'zoom' | 'pin' | 'done';

function GlobeReveal({
  name,
  location,
  onDone,
}: {
  name: string;
  location: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<GlobePhase>('idle');
  const advancedRef = useRef(false);

  const advance = useCallback(() => {
    if (!advancedRef.current) {
      advancedRef.current = true;
      onDone();
    }
  }, [onDone]);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase('spin'), 200);
    const t1 = setTimeout(() => setPhase('zoom'), 2200);
    const t2 = setTimeout(() => setPhase('pin'), 3600);
    const t3 = setTimeout(() => setPhase('done'), 5000);
    const t4 = setTimeout(() => advance(), 7000); // auto-advance if not clicked
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [advance]);

  const isZoomed = phase === 'zoom' || phase === 'pin' || phase === 'done';
  const showPin = phase === 'pin' || phase === 'done';
  const showContinue = phase === 'done';

  return (
    <div className="globe-scene">
      {/* Deep space background */}
      <div className="space-bg" />

      {/* Globe */}
      <motion.div
        className="globe-wrapper"
        animate={{
          scale: isZoomed ? 14 : phase === 'spin' ? 1 : 0.4,
          opacity: phase === 'done' ? 0 : 1,
        }}
        transition={{
          scale:
            phase === 'zoom'
              ? { duration: 2, ease: [0.12, 1, 0.3, 1] }
              : { duration: 0.8, ease: 'easeOut' },
          opacity: { duration: 0.6, delay: phase === 'done' ? 0 : 0 },
        }}
      >
        <div className="globe">
          {/* Lat/lon grid */}
          <svg
            className="globe-grid"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Latitude rings */}
            <ellipse cx="100" cy="100" rx="90" ry="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" />
            <ellipse cx="100" cy="64" rx="79" ry="7" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
            <ellipse cx="100" cy="136" rx="79" ry="7" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
            <ellipse cx="100" cy="30" rx="45" ry="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
            <ellipse cx="100" cy="170" rx="45" ry="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
            {/* Longitude arcs */}
            <ellipse cx="100" cy="100" rx="90" ry="90" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" />
            <ellipse cx="100" cy="100" rx="64" ry="90" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
            <ellipse cx="100" cy="100" rx="32" ry="90" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />
            <ellipse cx="100" cy="100" rx="5" ry="90" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />
          </svg>
          {/* Specular highlight */}
          <div className="globe-highlight" />
          {/* Dark edge shadow */}
          <div className="globe-edge" />
        </div>
      </motion.div>

      {/* Pin — shows after zoom */}
      <AnimatePresence>
        {showPin && (
          <motion.div
            className="pin-container"
            initial={{ opacity: 0, y: -60, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.3 }}
          >
            {/* Pulse rings */}
            <div className="pulse-ring" />
            <div className="pulse-ring pulse-ring-2" />
            {/* Pin icon */}
            <motion.div
              className="pin-icon"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <MapPin size={40} fill="#ec4899" color="#be185d" strokeWidth={1.5} />
            </motion.div>
            {/* Name card */}
            <motion.div
              className="pin-card"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <p className="pin-name">{name}</p>
              <p className="pin-location">📍 {location}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      <AnimatePresence>
        {showContinue && (
          <motion.button
            className="globe-btn"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={advance}
          >
            Continue <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <style jsx>{`
        .globe-scene {
          position: relative;
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .space-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at 50% 40%, #0e1a3d 0%, #050912 100%);
          z-index: -1;
        }

        /* Stars */
        .space-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1.5px 1.5px at 12% 18%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 8%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 85%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 8% 65%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 52%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 38% 12%, rgba(255,255,255,0.9) 0%, transparent 100%),
            radial-gradient(1px 1px at 67% 42%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 25% 90%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 72% 73%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 48% 55%, rgba(200,220,255,0.6) 0%, transparent 100%);
        }

        .globe-wrapper {
          transform-origin: center center;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .globe {
          width: 260px;
          height: 260px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 32% 32%, #5ab4f5 0%, #1565c0 40%, #0b2a70 75%, #071640 100%);
          box-shadow:
            inset -28px -28px 55px rgba(0, 0, 0, 0.55),
            inset 10px 10px 30px rgba(120, 180, 255, 0.18),
            0 0 90px rgba(30, 90, 255, 0.45),
            0 25px 70px rgba(0, 0, 0, 0.6);
          animation: globePulse 6s ease-in-out infinite;
        }

        @keyframes globePulse {
          0%, 100% {
            box-shadow:
              inset -28px -28px 55px rgba(0,0,0,0.55),
              inset 10px 10px 30px rgba(120,180,255,0.18),
              0 0 90px rgba(30,90,255,0.45),
              0 25px 70px rgba(0,0,0,0.6);
          }
          50% {
            box-shadow:
              inset -22px -22px 55px rgba(0,0,0,0.45),
              inset 16px 12px 30px rgba(120,180,255,0.15),
              0 0 110px rgba(30,90,255,0.55),
              0 25px 70px rgba(0,0,0,0.6);
          }
        }

        .globe-grid {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .globe-highlight {
          position: absolute;
          top: 6%;
          left: 12%;
          width: 42%;
          height: 38%;
          border-radius: 50%;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.28) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        .globe-edge {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle at 70% 70%,
            rgba(0, 0, 30, 0.5) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        /* Pin */
        .pin-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 10;
        }

        .pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid rgba(236, 72, 153, 0.7);
          animation: ringPulse 2.2s ease-out infinite;
          pointer-events: none;
        }

        .pulse-ring-2 {
          animation-delay: 0.8s;
          border-color: rgba(236, 72, 153, 0.35);
        }

        @keyframes ringPulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }

        .pin-icon {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 8px 24px rgba(236, 72, 153, 0.6));
        }

        .pin-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 20px;
          padding: 16px 28px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .pin-name {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0 0 6px;
          letter-spacing: -0.3px;
        }

        .pin-location {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
        }

        .globe-btn {
          margin-top: 40px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 15px 30px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: background 0.2s;
          position: relative;
          z-index: 10;
        }

        .globe-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
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
    // Skip globe going back
    const prevIdx = step === 'about-you' ? ALL_STEPS.indexOf('location') : idx - 1;
    if (prevIdx >= 0) {
      setDirection(-1);
      setStep(ALL_STEPS[prevIdx]);
    }
  }, [step]);

  const progressIdx = PROGRESS_STEPS.indexOf(step);
  const showProgress = step !== 'globe' && step !== 'ready';

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  // Build final data from pills when completing about-you
  const commitPills = useCallback(() => {
    const interests = ABOUT_YOU_PILLS.filter(
      (p) => p.category === 'interest' && selectedPills.has(p.label)
    ).map((p) => p.label);
    const traits = ABOUT_YOU_PILLS.filter(
      (p) => p.category === 'trait' && selectedPills.has(p.label)
    ).map((p) => p.label);
    updateData({ interests, personalityTraits: traits });
  }, [selectedPills, updateData]);

  return (
    <div className="quick-onboarding">
      {/* Progress dots (hidden on globe + ready) */}
      {showProgress && (
        <motion.div
          className="progress-dots"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {PROGRESS_STEPS.filter((s) => s !== 'ready').map((s, i) => (
            <div
              key={s}
              className={`dot ${i === progressIdx ? 'active' : ''} ${
                i < progressIdx ? 'done' : ''
              }`}
            />
          ))}
        </motion.div>
      )}

      {/* Content */}
      <div className="content-area">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="step-wrapper"
          >
            {/* ── NAME ── */}
            {step === 'name' && (
              <NameStep
                value={data.name}
                onChange={(name) => updateData({ name })}
                onContinue={goNext}
              />
            )}

            {/* ── LOCATION ── */}
            {step === 'location' && (
              <LocationStep
                name={data.name}
                value={data.location}
                onChange={(location) => updateData({ location })}
                onContinue={goNext}
                onBack={goBack}
              />
            )}

            {/* ── GLOBE ── */}
            {step === 'globe' && (
              <GlobeReveal
                name={data.name}
                location={data.location || 'somewhere beautiful'}
                onDone={goNext}
              />
            )}

            {/* ── ABOUT YOU ── */}
            {step === 'about-you' && (
              <AboutYouStep
                selected={selectedPills}
                onToggle={(label) => {
                  setSelectedPills((prev) => {
                    const next = new Set(prev);
                    next.has(label) ? next.delete(label) : next.add(label);
                    return next;
                  });
                }}
                onContinue={() => {
                  commitPills();
                  goNext();
                }}
                onBack={goBack}
                onSkip={goNext}
              />
            )}

            {/* ── RELIGION ── */}
            {step === 'religion' && (
              <ReligionStep
                value={data.religion}
                onChange={(religion) => updateData({ religion })}
                onContinue={goNext}
                onBack={goBack}
                onSkip={goNext}
              />
            )}

            {/* ── HEARTFELT ── */}
            {step === 'heartfelt' && (
              <div className="heartfelt-wrapper">
                <HeartfeltConversation
                  whyHere="preserve my memories and life story"
                  whatDrives={data.interests.length > 0 ? data.interests : ['living fully']}
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
              </div>
            )}

            {/* ── IMAGE UPLOAD ── */}
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

            {/* ── READY ── */}
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

      {/* Skip all */}
      {step !== 'globe' && step !== 'ready' && step !== 'heartfelt' && step !== 'image-upload' && onSkipAll && (
        <button className="skip-all-btn" onClick={onSkipAll}>
          Skip setup
        </button>
      )}

      <style jsx>{`
        .quick-onboarding {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(145deg, #12122a 0%, #1a1a3e 50%, #0f1928 100%);
          padding: 24px 20px;
          padding-top: calc(24px + env(safe-area-inset-top));
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        .progress-dots {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 32px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
        }

        .dot.active {
          background: #ec4899;
          width: 24px;
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }

        .dot.done {
          background: rgba(236, 72, 153, 0.4);
        }

        .content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 520px;
          margin: 0 auto;
          width: 100%;
        }

        .step-wrapper {
          width: 100%;
        }

        .heartfelt-wrapper {
          margin: -24px -20px;
        }

        .skip-all-btn {
          display: block;
          margin: 20px auto 0;
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .skip-all-btn:hover {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
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
    <div className="step name-step">
      <motion.div
        className="greeting"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="greeting-emoji">👋</span>
        <p className="greeting-text">Welcome. I'm YoursTruly.</p>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        What's your name?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your first name"
          autoFocus
          autoComplete="given-name"
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onContinue()}
        />
        <button
          className="primary-btn"
          onClick={onContinue}
          disabled={!value.trim()}
        >
          Nice to meet you <ChevronRight size={20} />
        </button>
      </motion.div>

      <style jsx>{`
        .name-step {
          text-align: center;
        }

        .greeting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .greeting-emoji {
          font-size: 28px;
        }

        .greeting-text {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        h2 {
          font-size: 34px;
          font-weight: 700;
          color: white;
          margin: 0 0 32px;
          letter-spacing: -0.5px;
        }

        input {
          display: block;
          width: 100%;
          padding: 22px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          color: white;
          font-size: 26px;
          text-align: center;
          margin-bottom: 20px;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        input:focus {
          outline: none;
          border-color: rgba(111, 111, 210, 0.7);
          background: rgba(111, 111, 210, 0.06);
        }

        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 18px 36px;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          border: none;
          border-radius: 18px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          box-shadow: 0 8px 30px rgba(111, 111, 210, 0.35);
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(111, 111, 210, 0.5);
        }

        .primary-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

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
    <div className="step location-step">
      <motion.div
        className="icon-circle"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        <MapPin size={32} color="#ec4899" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Where are you from, {name}?
      </motion.h2>

      <motion.p
        className="subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        City, state or country — however you'd describe home.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Miami, FL"
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
            Show me on the globe <Sparkles size={18} />
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .location-step {
          text-align: center;
        }

        .icon-circle {
          display: inline-flex;
          padding: 18px;
          background: rgba(236, 72, 153, 0.12);
          border-radius: 50%;
          margin-bottom: 24px;
          border: 1px solid rgba(236, 72, 153, 0.2);
        }

        h2 {
          font-size: 30px;
          font-weight: 700;
          color: white;
          margin: 0 0 10px;
          letter-spacing: -0.3px;
        }

        .subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0 0 32px;
        }

        input {
          display: block;
          width: 100%;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          color: white;
          font-size: 20px;
          text-align: center;
          margin-bottom: 20px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.22);
        }

        input:focus {
          outline: none;
          border-color: rgba(236, 72, 153, 0.6);
          background: rgba(236, 72, 153, 0.04);
        }

        .btn-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .primary-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 6px 24px rgba(111, 111, 210, 0.3);
        }

        .primary-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .primary-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

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
    <div className="step about-step">
      <h2>A little about you</h2>
      <p className="subtitle">Pick anything that fits. This shapes your experience.</p>

      <div className="pill-section">
        <div className="section-label">Interests</div>
        <div className="pill-grid">
          {interests.map((p) => (
            <button
              key={p.label}
              className={`pill ${selected.has(p.label) ? 'selected' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pill-section">
        <div className="section-label">Who you are</div>
        <div className="pill-grid">
          {traits.map((p) => (
            <button
              key={p.label}
              className={`pill ${selected.has(p.label) ? 'selected' : ''}`}
              onClick={() => onToggle(p.label)}
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <button className="primary-btn" onClick={onContinue}>
          {selected.size > 0 ? `Looks good (${selected.size})` : 'Continue'}{' '}
          <ChevronRight size={18} />
        </button>
      </div>
      <button className="skip-btn" onClick={onSkip}>
        Skip for now
      </button>

      <style jsx>{`
        .about-step {
          text-align: center;
        }

        h2 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px;
          letter-spacing: -0.3px;
        }

        .subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0 0 28px;
        }

        .pill-section {
          margin-bottom: 20px;
          text-align: left;
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 10px;
        }

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
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .pill:hover {
          border-color: rgba(111, 111, 210, 0.5);
          color: white;
        }

        .pill.selected {
          background: rgba(111, 111, 210, 0.18);
          border-color: #6f6fd2;
          color: white;
          box-shadow: 0 0 12px rgba(111, 111, 210, 0.25);
        }

        .btn-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 28px;
          margin-bottom: 12px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          flex-shrink: 0;
        }

        .primary-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(111, 111, 210, 0.3);
        }

        .skip-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          cursor: pointer;
          padding: 8px;
          transition: color 0.2s;
        }

        .skip-btn:hover {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}

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
    <div className="step religion-step">
      <h2>Faith & belief</h2>
      <p className="subtitle">
        This helps personalize how we talk about life's deeper moments.
      </p>

      <div className="religion-grid">
        {RELIGION_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`religion-btn ${value === opt ? 'selected' : ''}`}
            onClick={() => onChange(opt)}
          >
            {value === opt && <Check size={14} className="check-icon" />}
            {opt}
          </button>
        ))}
      </div>

      <div className="btn-row">
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <button
          className="primary-btn"
          onClick={value ? onContinue : onSkip}
        >
          {value ? 'Continue' : 'Skip'} <ChevronRight size={18} />
        </button>
      </div>

      <style jsx>{`
        .religion-step {
          text-align: center;
        }

        h2 {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px;
        }

        .subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0 0 28px;
        }

        .religion-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-bottom: 28px;
        }

        .religion-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.18s;
        }

        .religion-btn:hover {
          border-color: rgba(111, 111, 210, 0.4);
          color: white;
        }

        .religion-btn.selected {
          background: rgba(111, 111, 210, 0.18);
          border-color: #6f6fd2;
          color: white;
        }

        :global(.check-icon) {
          color: #6f6fd2;
        }

        .btn-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          flex-shrink: 0;
        }

        .primary-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 24px rgba(111, 111, 210, 0.3);
        }
      `}</style>
    </div>
  );
}

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
    <div className="step ready-step">
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
        className="primary-btn"
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
        }

        .check-ring {
          display: inline-flex;
          margin-bottom: 32px;
        }

        .check-inner {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 0 16px rgba(111, 111, 210, 0.1),
            0 0 0 32px rgba(111, 111, 210, 0.05),
            0 20px 60px rgba(111, 111, 210, 0.4);
        }

        h1 {
          font-size: 34px;
          font-weight: 700;
          color: white;
          margin: 0 0 16px;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          margin: 0 0 40px;
        }

        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 20px 44px;
          background: linear-gradient(135deg, #6f6fd2, #ec4899);
          border: none;
          border-radius: 20px;
          color: white;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 12px 40px rgba(111, 111, 210, 0.45);
          letter-spacing: -0.2px;
        }

        .primary-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 50px rgba(111, 111, 210, 0.55);
        }
      `}</style>
    </div>
  );
}
