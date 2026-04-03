'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft,
  User,
  Heart,
  Sparkles,
  BookOpen,
  Briefcase,
  Brain,
  ArrowRight,
  Target,
  Palette,
  MapPin,
  Quote,
  Trophy
} from 'lucide-react';
import { PillSelector } from './PillSelector';
import { HeartfeltConversation } from './HeartfeltConversation';
import { OnboardingStepExplanation } from './OnboardingStepExplanation';
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

type OnboardingStep = 
  | 'welcome'
  | 'name'
  | 'interests'
  | 'hobbies'
  | 'skills'
  | 'personality'
  | 'life-goals'
  | 'religion'
  | 'location'
  | 'favorite-quote'
  | 'background'
  | 'heartfelt-question'
  | 'image-upload'
  | 'celebration';

interface EnhancedOnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkipAll?: () => void;
}

// ============================================
// SUGGESTIONS DATA
// ============================================

const INTEREST_SUGGESTIONS = [
  'Reading', 'Writing', 'Music', 'Art', 'Photography', 'Cooking', 'Gardening',
  'Fitness', 'Yoga', 'Hiking', 'Travel', 'Technology', 'Gaming', 'Movies',
  'TV Shows', 'Sports', 'Fashion', 'DIY Projects', 'Nature', 'Animals',
  'Spirituality', 'Community', 'Politics', 'Science', 'History'
];

const HOBBY_SUGGESTIONS = [
  'Photography', 'Gardening', 'Cooking', 'Baking', 'Writing', 'Painting',
  'Drawing', 'Crafts', 'Knitting', 'Woodworking', 'Gaming', 'Chess',
  'Running', 'Swimming', 'Cycling', 'Hiking', 'Camping', 'Fishing',
  'Playing Music', 'Singing', 'Dancing', 'Collecting', 'Bird Watching',
  'Meditation', 'Volunteering'
];

const SKILL_SUGGESTIONS = [
  'Leadership', 'Communication', 'Problem Solving', 'Creativity', 'Organization',
  'Teaching', 'Writing', 'Public Speaking', 'Empathy', 'Listening',
  'Negotiation', 'Adaptability', 'Critical Thinking', 'Teamwork', 'Mentoring',
  'Technical Skills', 'Project Management', 'Storytelling', 'Patience', 'Resilience'
];

const PERSONALITY_SUGGESTIONS = [
  'Introverted', 'Extroverted', 'Analytical', 'Creative', 'Empathetic',
  'Adventurous', 'Pragmatic', 'Optimistic', 'Reflective', 'Spontaneous',
  'Nurturing', 'Driven', 'Calm', 'Curious', 'Loyal', 'Independent',
  'Humorous', 'Thoughtful', 'Ambitious', 'Patient'
];

const LIFE_GOAL_SUGGESTIONS = [
  'Leave a family legacy', 'Career achievement', 'Travel the world',
  'Financial freedom', 'Help others', 'Create meaningful work',
  'Continuous learning', 'Health & wellness', 'Strong relationships',
  'Spiritual growth', 'Live adventurously', 'Inner peace',
  'Make a difference', 'Build a business', 'Write a book'
];

const RELIGION_OPTIONS = [
  'Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism',
  'Spiritual but not religious', 'Agnostic', 'Atheist', 'Other', 'Prefer not to say'
];

// ============================================
// MAIN COMPONENT
// ============================================

export function EnhancedOnboardingFlow({ onComplete, onSkipAll }: EnhancedOnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
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

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Step navigation
  const stepOrder: OnboardingStep[] = [
    'welcome', 'name', 'interests', 'hobbies', 'skills', 
    'personality', 'life-goals', 'religion', 'location', 
    'favorite-quote', 'background', 'heartfelt-question', 
    'image-upload', 'celebration'
  ];
  
  const currentIndex = stepOrder.indexOf(step);
  const progress = (currentIndex / (stepOrder.length - 1)) * 100;

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex]);
    }
  }, [currentIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex]);
    }
  }, [currentIndex]);

  const handleHeartfeltComplete = useCallback((conversation: ConversationMessage[]) => {
    // Format the full conversation with questions and answers
    let formattedConversation = '';
    
    conversation.forEach((msg, index) => {
      if (msg.role === 'assistant') {
        formattedConversation += `**Q${Math.floor(index / 2) + 1}:** ${msg.content}\n\n`;
      } else {
        formattedConversation += `**A${Math.floor(index / 2) + 1}:** ${msg.content}\n\n---\n\n`;
      }
    });
    
    // Also keep just user responses for backward compatibility
    const userResponses = conversation
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n');
    
    setData(prev => ({ 
      ...prev, 
      // Save formatted conversation with Q&A pairs
      heartfeltAnswer: formattedConversation.trim() || userResponses,
      heartfeltConversation: conversation,
    }));
    setStep('image-upload');
  }, []);

  const handleImageUploadComplete = useCallback((uploadedCount: number) => {
    setData(prev => ({ 
      ...prev, 
      uploadedImagesCount: uploadedCount,
    }));
    setStep('celebration');
  }, []);

  const handleFinalComplete = useCallback(() => {
    onComplete(data);
  }, [data, onComplete]);

  return (
    <div className="min-h-screen bg-[#FAFAF7] relative overflow-hidden flex items-center justify-center p-4">
      <div className="home-background" />
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />

      {/* Progress bar */}
      {step !== 'celebration' && step !== 'welcome' && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-200/50 z-50">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#2D5A3D] to-[#8DACAB]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Main Content - Split Layout for Desktop */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row lg:items-start lg:gap-8 xl:gap-12">
        {/* Explanation Panel (Desktop: Left, Mobile: Top) */}
        {step !== 'welcome' && step !== 'celebration' && (
          <>
            {/* Mobile: Top */}
            <OnboardingStepExplanation step={step} showForMobile={true} />
            {/* Desktop: Left */}
            <OnboardingStepExplanation step={step} showForMobile={false} />
          </>
        )}

        {/* Form Panel */}
        <div className="w-full lg:flex-1 max-w-lg mx-auto lg:mx-0">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <WelcomeStep key="welcome" onContinue={() => setStep('name')} />
          )}

          {step === 'name' && (
            <NameStep
              key="name"
              value={data.name}
              onChange={(name) => updateData({ name })}
              onBack={() => setStep('welcome')}
              onContinue={goNext}
            />
          )}

          {step === 'interests' && (
            <PillStep
              key="interests"
              title="What are you interested in?"
              subtitle="Select or add your interests"
              icon={<Heart size={28} className="text-[#B8562E]" />}
              suggestions={INTEREST_SUGGESTIONS}
              selected={data.interests}
              onChange={(interests) => updateData({ interests })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'hobbies' && (
            <PillStep
              key="hobbies"
              title="What do you enjoy doing?"
              subtitle="Your hobbies and pastimes"
              icon={<Palette size={28} className="text-[#C4A235]" />}
              suggestions={HOBBY_SUGGESTIONS}
              selected={data.hobbies}
              onChange={(hobbies) => updateData({ hobbies })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'skills' && (
            <PillStep
              key="skills"
              title="What are your strengths?"
              subtitle="Skills you're proud of"
              icon={<Briefcase size={28} className="text-[#2D5A3D]" />}
              suggestions={SKILL_SUGGESTIONS}
              selected={data.skills}
              onChange={(skills) => updateData({ skills })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'personality' && (
            <PillStep
              key="personality"
              title="How would you describe yourself?"
              subtitle="Pick traits that fit you"
              icon={<Brain size={28} className="text-[#8DACAB]" />}
              suggestions={PERSONALITY_SUGGESTIONS}
              selected={data.personalityTraits}
              onChange={(personalityTraits) => updateData({ personalityTraits })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'life-goals' && (
            <PillStep
              key="life-goals"
              title="What matters most in life?"
              subtitle="Your aspirations and goals"
              icon={<Target size={28} className="text-[#B8562E]" />}
              suggestions={LIFE_GOAL_SUGGESTIONS}
              selected={data.lifeGoals}
              onChange={(lifeGoals) => updateData({ lifeGoals })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'religion' && (
            <SingleSelectStep
              key="religion"
              title="Faith & Spirituality"
              subtitle="This helps personalize your experience"
              icon={<Sparkles size={28} className="text-[#C4A235]" />}
              options={RELIGION_OPTIONS}
              selected={data.religion}
              onChange={(religion) => updateData({ religion })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'location' && (
            <TextInputStep
              key="location"
              title="Where do you call home?"
              subtitle="City, state, or country"
              icon={<MapPin size={28} className="text-[#2D5A3D]" />}
              placeholder="e.g., New York, NY"
              value={data.location}
              onChange={(location) => updateData({ location })}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {step === 'favorite-quote' && (
            <TextInputStep
              key="favorite-quote"
              title="A quote you live by?"
              subtitle="Words that inspire you"
              icon={<Quote size={28} className="text-[#8DACAB]" />}
              placeholder="Enter your favorite quote..."
              value={data.favoriteQuote}
              onChange={(favoriteQuote) => updateData({ favoriteQuote })}
              onBack={goBack}
              onContinue={goNext}
              multiline
            />
          )}

          {step === 'background' && (
            <BackgroundStep
              key="background"
              value={data.background}
              onChange={(background) => updateData({ background })}
              onBack={goBack}
              onContinue={() => setStep('heartfelt-question')}
            />
          )}

          {step === 'heartfelt-question' && (
            <motion.div
              key="heartfelt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <HeartfeltConversation
                whyHere={data.background}
                whatDrives={data.lifeGoals}
                userName={data.name}
                onComplete={handleHeartfeltComplete}
                onSkip={() => setStep('image-upload')}
              />
            </motion.div>
          )}

          {step === 'image-upload' && (
            <ImageUploadStep
              key="image-upload"
              onBack={() => setStep('heartfelt-question')}
              onContinue={handleImageUploadComplete}
              onSkip={() => setStep('celebration')}
            />
          )}

          {step === 'celebration' && (
            <CelebrationStep
              key="celebration"
              userName={data.name}
              onComplete={handleFinalComplete}
            />
          )}
        </AnimatePresence>
        
        {/* Skip option for testing/development */}
        {onSkipAll && step !== 'celebration' && (
          <div className="text-center mt-6">
            <button
              onClick={onSkipAll}
              className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
            >
              Skip onboarding for now
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card glass-card-strong p-8 text-center"
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#C4A235] 
                   flex items-center justify-center mx-auto mb-6"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl font-bold text-[#2d2d2d] mb-4 font-playfair">
        Welcome to YoursTruly
      </h1>

      <p className="text-gray-600 mb-6 leading-relaxed">
        Let's get to know you a little better so we can help you capture 
        and preserve your most meaningful stories.
      </p>

      <p className="text-sm text-gray-500 mb-8">
        Takes about 2-3 minutes. Skip any question you'd rather not answer.
      </p>

      <button
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 
                   bg-[#2D5A3D] text-white rounded-xl font-medium
                   hover:bg-[#355a48] transition-all"
      >
        Let's Begin
        <ArrowRight size={18} />
      </button>
    </motion.div>
  );
}

function NameStep({ value, onChange, onBack, onContinue }: { 
  value: string; 
  onChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-8"
    >
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-[#2D5A3D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={28} className="text-[#2D5A3D]" />
        </div>
        <h2 className="text-2xl font-semibold text-[#2d2d2d] font-playfair">What should we call you?</h2>
        <p className="text-gray-500 mt-2 text-sm">This is how you'll appear to family members</p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 
                   text-[#2d2d2d] placeholder-gray-400 text-center text-lg
                   focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 mb-6"
        placeholder="Enter your name"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onContinue()}
      />

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D]">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          onClick={onContinue}
          disabled={!value.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium 
                     hover:bg-[#355a48] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function PillStep({ title, subtitle, icon, suggestions, selected, onChange, onBack, onContinue }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  suggestions: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-6"
    >
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>

      <PillSelector
        selected={selected}
        onChange={onChange}
        suggestions={suggestions}
        placeholder="Or add a custom option..."
      />

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D]">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onContinue} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48]"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SingleSelectStep({ title, subtitle, icon, options, selected, onChange, onBack, onContinue }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  options: string[];
  selected: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-6"
    >
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left text-sm
              ${selected === option
                ? 'border-[#2D5A3D] bg-[#2D5A3D]/10 text-[#2D5A3D]'
                : 'border-gray-200 bg-white text-gray-600 hover:border-[#2D5A3D]/30 hover:bg-gray-50'
              }`}
          >
            <span>{option}</span>
            {selected === option && <div className="w-2 h-2 rounded-full bg-[#2D5A3D]" />}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D]">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onContinue} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48]"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TextInputStep({ title, subtitle, icon, placeholder, value, onChange, onBack, onContinue, multiline = false }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
  multiline?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-6"
    >
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 
                     text-[#2d2d2d] placeholder-gray-400 resize-none
                     focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 mb-4"
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 
                     text-[#2d2d2d] placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 mb-4"
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && onContinue()}
        />
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D]">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onContinue} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48]"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function BackgroundStep({ value, onChange, onBack, onContinue }: {
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const quickOptions = [
    "I'm starting a family and want to capture these precious moments",
    "I'm reflecting on my career and the lessons I've learned",
    "I want to preserve my parents' stories before they're lost",
    "I'm at a transitional moment and processing big changes",
    "I want to create something meaningful for my children",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="glass-card glass-card-strong p-6"
    >
      <div className="text-center mb-5">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <BookOpen size={28} className="text-[#8DACAB]" />
        </div>
        <h2 className="text-xl font-semibold text-[#2d2d2d] font-playfair">What brings you here?</h2>
        <p className="text-gray-500 text-sm mt-1">This helps us create meaningful prompts for you</p>
      </div>

      <div className="space-y-2 mb-4">
        {quickOptions.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full text-left p-3 rounded-xl text-sm transition-all border
              ${value === option
                ? 'bg-[#2D5A3D]/10 text-[#2D5A3D] border-[#2D5A3D]/30'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            {option}
          </button>
        ))}
      </div>

      <textarea
        value={quickOptions.includes(value) ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 
                   text-[#2d2d2d] placeholder-gray-400 resize-none
                   focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 mb-4"
        placeholder="Or share in your own words..."
        rows={3}
      />

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-[#2D5A3D]">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onContinue} className="px-4 py-2 text-gray-400 hover:text-gray-600 text-sm">
            Skip
          </button>
          <button
            onClick={onContinue}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#2D5A3D] text-white rounded-xl font-medium hover:bg-[#355a48]"
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CelebrationStep({ userName, onComplete }: { userName: string; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card glass-card-strong p-8 text-center"
    >
      <motion.div 
        className="relative inline-flex items-center justify-center mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.div 
          className="absolute inset-0 rounded-full bg-[#C4A235]/30 blur-xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#C4A235] to-[#B8562E] flex items-center justify-center shadow-lg">
          <Trophy size={40} className="text-white" />
        </div>
      </motion.div>

      <h2 className="text-2xl font-bold text-[#2d2d2d] mb-3 font-playfair">
        Welcome, {userName || 'Friend'}!
      </h2>

      <p className="text-gray-600 mb-6">
        You've taken the first step in preserving your story for generations to come.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: '📸', label: 'Capture Memories' },
          { icon: '💭', label: 'Share Stories' },
          { icon: '👨‍👩‍👧‍👦', label: 'Connect Family' },
          { icon: '📚', label: 'Build Legacy' },
        ].map((feature, i) => (
          <motion.div
            key={feature.label}
            className="flex items-center gap-2 p-3 bg-white/80 rounded-xl shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <span className="text-lg">{feature.icon}</span>
            <span className="text-sm font-medium text-gray-700">{feature.label}</span>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onComplete}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 
                   bg-[#2D5A3D] text-white rounded-xl font-medium
                   hover:bg-[#355a48] transition-all shadow-md"
      >
        Enter Your Dashboard
        <ArrowRight size={18} />
      </button>
    </motion.div>
  );
}
