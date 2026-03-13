'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Heart,
  Globe,
  Camera,
  Check,
} from 'lucide-react';

// Import existing components we'll reuse
import { MapboxGlobeReveal } from './MapboxGlobeReveal';
import { ImageUploadStep } from './ImageUploadStep';
import { ConversationEngine } from '@/components/conversation-engine';

// ============================================
// TYPES
// ============================================

interface OnboardingData {
  name: string;
  birthday: string;
  location: string;
  interests: string[];
  personalityTraits: string[];
  religion: string;
  background: string;
  heartfeltAnswer?: string;
  heartfeltConversation?: Array<{ role: 'assistant' | 'user'; content: string }>;
  uploadedImagesCount?: number;
}

type Step =
  | 'welcome'
  | 'basics'
  | 'location'
  | 'interests'
  | 'religion'
  | 'story'
  | 'heartfelt'
  | 'photos'
  | 'complete';

const STEPS: Step[] = [
  'welcome',
  'basics',
  'location',
  'interests',
  'religion',
  'story',
  'heartfelt',
  'photos',
  'complete',
];

// ============================================
// PILLS DATA
// ============================================

const INTERESTS = [
  { label: 'Family', emoji: '👨‍👩‍👧' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Music', emoji: '🎵' },
  { label: 'Cooking', emoji: '🍳' },
  { label: 'Reading', emoji: '📚' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Technology', emoji: '💻' },
  { label: 'Fitness', emoji: '💪' },
  { label: 'Photography', emoji: '📷' },
  { label: 'Gardening', emoji: '🌱' },
  { label: 'Volunteering', emoji: '🤲' },
];

const TRAITS = [
  { label: 'Creative', emoji: '✨' },
  { label: 'Adventurous', emoji: '🏔️' },
  { label: 'Empathetic', emoji: '💛' },
  { label: 'Curious', emoji: '🔍' },
  { label: 'Optimistic', emoji: '☀️' },
  { label: 'Loyal', emoji: '🤝' },
  { label: 'Calm', emoji: '🌊' },
  { label: 'Driven', emoji: '🚀' },
];

const RELIGIONS = [
  'Christianity',
  'Islam',
  'Judaism',
  'Hinduism',
  'Buddhism',
  'Spiritual',
  'Agnostic',
  'Atheist',
  'Other',
  'Prefer not to say',
];

// ============================================
// MAIN COMPONENT
// ============================================

interface Props {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  firstName: string;
}

export function HeroOnboardingFlow({ onComplete, onSkip, firstName }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [data, setData] = useState<Partial<OnboardingData>>({});

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [stepIndex]);

  const prevStep = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [stepIndex]);

  const handleComplete = () => {
    onComplete(data as OnboardingData);
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F3] via-[#FFFFFF] to-[#F5F5F5] relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#406A56]/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#8DACAB]/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Progress bar */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-gray-200">
            <motion.div
              className="h-full bg-gradient-to-r from-[#406A56] to-[#8DACAB]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Skip button */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <button
          onClick={onSkip}
          className="fixed top-6 right-6 z-50 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>
      )}

      {/* Step content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-2xl"
          >
            {/* Welcome */}
            {currentStep === 'welcome' && (
              <WelcomeStep firstName={firstName} onNext={nextStep} />
            )}

            {/* Basics */}
            {currentStep === 'basics' && (
              <BasicsStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Location */}
            {currentStep === 'location' && (
              <LocationStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Interests */}
            {currentStep === 'interests' && (
              <InterestsStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Religion */}
            {currentStep === 'religion' && (
              <ReligionStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Story */}
            {currentStep === 'story' && (
              <StoryStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Heartfelt */}
            {currentStep === 'heartfelt' && (
              <HeartfeltStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Photos */}
            {currentStep === 'photos' && (
              <PhotosStep
                data={data}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {/* Complete */}
            {currentStep === 'complete' && (
              <CompleteStep onFinish={handleComplete} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function WelcomeStep({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-24 h-24 mx-auto bg-gradient-to-br from-[#406A56] to-[#8DACAB] rounded-full flex items-center justify-center"
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <h1 className="text-5xl font-bold text-[#2D2D2D] mb-4">
          Welcome, {firstName}!
        </h1>
        <p className="text-xl text-gray-600 max-w-lg mx-auto">
          Let's create something special together. This will only take a few minutes.
        </p>
      </div>

      <button
        onClick={onNext}
        className="group px-8 py-4 bg-gradient-to-r from-[#406A56] to-[#8DACAB] text-white rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 inline-flex items-center gap-2"
      >
        Let's begin
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

// (Continue with other step components...)
// Due to length constraints, I'll create a separate file for the step components

export default HeroOnboardingFlow;
