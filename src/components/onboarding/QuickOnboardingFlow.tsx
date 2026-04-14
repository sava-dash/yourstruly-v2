'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Upload,
  Camera,
  Loader2,
  X,
  Check,
  Shield,
  Heart,
} from 'lucide-react';
import { OnboardingStepExplanation } from './OnboardingStepExplanation';
import { OnboardingCards } from './OnboardingCards';
import { ConversationEngine } from '@/components/conversation-engine';
import { BubblePickerInterests, BubblePickerTraits, ALL_INTERESTS as BUBBLE_INTERESTS, TRAIT_ITEMS as BUBBLE_TRAITS } from './BubblePicker';
import { CURATED_TRAITS, CURATED_INTERESTS } from './curated-options';
import { GoogleContactsImport } from '@/components/contacts';
import type {
  ConversationMessage,
  OnboardingData,
  QuickStep,
  Pill,
  InterestCategory,
  ReligionCategory,
  GlobeSubPhase,
  QuickOnboardingFlowProps,
} from './quick/types';
import {
  ALL_STEPS,
  PROGRESS_STEPS,
  TILE_KEY,
  INTEREST_CATEGORIES,
  ALL_INTERESTS,
  PERSONALITY_TRAITS,
  ABOUT_YOU_PILLS,
  RELIGION_CATEGORIES,
  RELIGION_OPTIONS,
  MONTHS,
  WHY_OPTIONS,
} from './quick/constants';
import { generateHeartfeltQuestion, titleCaseName, delay } from './quick/helpers';
import { WhyHerePanel } from './quick/globe/WhyHerePanel';
import { InterestsPanel } from './quick/globe/InterestsPanel';
import { ContactsPanel } from './quick/globe/ContactsPanel';
import { PhotoUploadPanel, type UploadedPhoto } from './quick/globe/PhotoUploadPanel';
import { PlacesLivedPanel } from './quick/globe/PlacesLivedPanel';
import { SHARED } from './quick/shared-styles';
import { ReadyStep } from './quick/steps/ReadyStep';
import { BirthInfoStep } from './quick/steps/BirthInfoStep';
import { ReligionStep } from './quick/steps/ReligionStep';
import { WhyHereStep } from './quick/steps/WhyHereStep';
import { MapboxGlobeReveal } from './quick/globe/MapboxGlobeReveal';

// ============================================
// MAIN FLOW
// ============================================

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
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Migrate old 'about-you' step to new 'interests' step
      if (parsed.step === 'about-you') parsed.step = 'interests';
      return parsed;
    } catch { return null; }
  };

  const savedProgress = getSavedProgress();
  
  const [step, setStep] = useState<QuickStep>(savedProgress?.step || 'birth-info');
  const [direction, setDirection] = useState<1 | -1>(1);
  // Globe-collected data for engagement cards
  const [globeCollected, setGlobeCollected] = useState<{
    places: string[];
    contacts: { name: string; relationship: string }[];
    interests: string[];
    whyHere: string[];
    whyHereText: string;
    uploadedPhotosCount?: number;
    uploadedPhotos?: { id: string; preview: string; fileUrl?: string; locationName?: string | null }[];
  }>({ places: [], contacts: [], interests: [], whyHere: [], whyHereText: '' });
  const [data, setData] = useState<OnboardingData>(savedProgress?.data || {
    name: initialName ? titleCaseName(initialName) : '',
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
    const idx = ALL_STEPS.indexOf(step);
    if (idx > 0) setStep(ALL_STEPS[idx - 1]);
  }, [step]);

  const commitPills = useCallback(() => {
    const allInterestLabels = [...BUBBLE_INTERESTS.map(i => i.label), ...CURATED_INTERESTS.map(i => i.label)];
    const allTraitLabels = [...BUBBLE_TRAITS.map(t => t.label), ...CURATED_TRAITS.map(t => t.label)];
    const interests = Array.from(selectedPills).filter(l => allInterestLabels.includes(l));
    const traits = Array.from(selectedPills).filter(l => allTraitLabels.includes(l));
    // Anything not in either list is a custom entry — save as interest
    const custom = Array.from(selectedPills).filter(l => !allInterestLabels.includes(l) && !allTraitLabels.includes(l));
    updateData({ interests: [...interests, ...custom], personalityTraits: traits });
  }, [selectedPills, updateData]);

  // Bubble picker toggle handler (must be before any early returns)
  const handleBubbleToggle = useCallback((label: string) => {
    setSelectedPills((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }, []);

  const interestCount = Array.from(selectedPills).filter(l => BUBBLE_INTERESTS.some(i => i.label === l)).length;
  const traitCount = Array.from(selectedPills).filter(l => BUBBLE_TRAITS.some(t => t.label === l)).length;

  // Globe sub-phase for progress bar
  const [globeSubPhase, setGlobeSubPhase] = useState<GlobeSubPhase>('map');

  // Globe step progress: map → places → contacts → interests → why-here
  const GLOBE_SUB_STEPS: { key: GlobeSubPhase; label: string }[] = [
    { key: 'map', label: 'Map' },
    { key: 'places-lived', label: 'Places' },
    { key: 'contacts', label: 'People' },
    { key: 'interests', label: 'Interests' },
    { key: 'why-here', label: 'Why' },
    { key: 'photo-upload', label: 'Photos' },
  ];
  const globeSubIdx = GLOBE_SUB_STEPS.findIndex(s => s.key === globeSubPhase);

  const progressIdx = PROGRESS_STEPS.indexOf(step);
  const progressPercent = step === 'ready' ? 100 : ((progressIdx + 1) / PROGRESS_STEPS.length) * 100;
  const tileKey = TILE_KEY[step];

  // Unified progress steps: birth-info (done) + globe sub-steps + post-globe steps
  const UNIFIED_STEPS: { key: string; label: string }[] = [
    { key: 'birth-info', label: 'Basics' },
    ...GLOBE_SUB_STEPS.map(s => ({ key: `globe-${s.key}`, label: s.label })),
    { key: 'ready', label: 'Done' },
  ];

  // Full-screen globe step — with unified progress bar overlay
  if (step === 'globe') {
    // birth-info is always done (index 0), globe sub-steps start at index 1
    const unifiedCurrentIdx = 1 + globeSubIdx; // 1 = birth-info offset

    return (
      <>
        {/* Unified progress bar */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '16px 20px 12px',
          background: 'linear-gradient(to bottom, rgba(8, 8, 18, 0.7) 60%, transparent)',
        }}>
          {UNIFIED_STEPS.map((s, i) => {
            const isCompleted = i < unifiedCurrentIdx;
            const isCurrent = i === unifiedCurrentIdx;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
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
                    transition: 'all 0.3s ease',
                  }}>
                    {isCompleted ? <Check size={10} strokeWidth={3} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCompleted || isCurrent ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < UNIFIED_STEPS.length - 1 && (
                  <div style={{
                    width: 16,
                    height: 2,
                    background: isCompleted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s ease',
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
          onDone={(gd) => {
            commitPills();
            if (gd) {
              setGlobeCollected(gd);
              if (gd.uploadedPhotosCount) {
                updateData({ uploadedImagesCount: gd.uploadedPhotosCount });
              }
            }
            // Globe complete — go to ready (final step)
            setStep('ready');
            setDirection(1);
          }}
          selectedPills={selectedPills}
          onTogglePill={handleBubbleToggle}
          onSubPhaseChange={setGlobeSubPhase}
        />
      </>
    );
  }

  // Three-column About You step
  if (step === 'interests') {
    return (
      <BubblePickerInterests
        mode="interests"
        selected={selectedPills}
        onToggle={handleBubbleToggle}
        onContinue={goNext}
        onBack={goBack}
        onSkip={goNext}
        totalSelected={interestCount}
      />
    );
  }

  if (step === 'traits') {
    return (
      <BubblePickerTraits
        mode="traits"
        selected={selectedPills}
        onToggle={handleBubbleToggle}
        onContinue={() => { commitPills(); goNext(); }}
        onBack={goBack}
        onSkip={() => { commitPills(); goNext(); }}
        totalSelected={traitCount}
      />
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  };

  const isFullWidthStep =
    step === 'ready';

  return (
    <div className="yt-onboard-root">
      {/* Decorative blobs (matching v1) */}
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />

      {/* Unified Progress Bar (same steps as globe view) */}
      <div className="step-progress-bar">
        {UNIFIED_STEPS.map((s, i) => {
          // Map current non-globe step to unified index
          const unifiedCurrentIdx = (() => {
            if (step === 'birth-info') return 0;
            // Globe sub-steps all done if we're past globe
            // heartfelt step removed
            if (step === 'ready') return UNIFIED_STEPS.length - 1;
            return 0;
          })();
          const isCompleted = i < unifiedCurrentIdx;
          const isCurrent = i === unifiedCurrentIdx;
          return (
            <div key={s.key} className="step-progress-item">
              <div className={`step-dot ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-current' : ''}`}>
                {isCompleted && <Check size={10} strokeWidth={3} />}
              </div>
              {i < UNIFIED_STEPS.length - 1 && (
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
                  <OnboardingCards
                    name={data.name}
                    places={globeCollected.places}
                    contacts={globeCollected.contacts}
                    interests={globeCollected.interests}
                    uploadedPhotos={globeCollected.uploadedPhotos || []}
                    onComplete={(answeredCount) => {
                      if (answeredCount > 0) {
                        updateData({
                          heartfeltAnswer: `Answered ${answeredCount} engagement cards during onboarding`,
                        });
                      }
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
          true &&
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
            #FAFAF7 0%,
            #f5ede5 50%,
            #FAFAF7 100%
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
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          border: 2px solid rgba(64, 106, 86, 0.2);
          color: rgba(64, 106, 86, 0.35);
          background: white;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .step-dot.step-current {
          border-color: #2D5A3D;
          color: #2D5A3D;
          background: rgba(64, 106, 86, 0.08);
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.1);
        }

        .step-dot.step-completed {
          border-color: #2D5A3D;
          background: #2D5A3D;
          color: white;
        }

        .step-num {
          line-height: 1;
        }

        .step-line {
          width: 12px;
          height: 2px;
          background: rgba(64, 106, 86, 0.15);
          transition: background 0.3s ease;
        }

        .step-line-done {
          background: #2D5A3D;
        }

        @media (max-width: 480px) {
          .step-progress-bar {
            padding: 12px 12px 10px;
          }
          .step-dot {
            width: 14px;
            height: 14px;
            font-size: 7px;
          }
          .step-line {
            width: 6px;
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


