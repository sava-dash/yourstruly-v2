'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  Heart,
  Shield,
  Info,
  Send,
  Mic,
  Volume2,
  Check,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const TOTAL_STEPS = 6;

interface OnboardingData {
  name: string;
  birthday: string;
  birthplace: string;
  interests: string[];
  traits: string[];
  beliefs: string[];
  journey: string;
  journeyCustom: string;
  heartfelt: string;
}

interface Props {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  firstName: string;
}

// ============================================
// DATA
// ============================================

const INTERESTS = [
  { emoji: '👨‍👩‍👦', label: 'Family' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '💪', label: 'Fitness' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🌿', label: 'Nature' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '💻', label: 'Technology' },
  { emoji: '🙏', label: 'Spirituality' },
  { emoji: '📷', label: 'Photography' },
  { emoji: '🌱', label: 'Gardening' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🎬', label: 'Movies & TV' },
  { emoji: '✍️', label: 'Writing' },
  { emoji: '👗', label: 'Fashion' },
  { emoji: '🔧', label: 'DIY & Crafts' },
  { emoji: '🐾', label: 'Animals & Pets' },
  { emoji: '🤝', label: 'Volunteering' },
  { emoji: '📜', label: 'History' },
  { emoji: '🔬', label: 'Science' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '💃', label: 'Dancing' },
  { emoji: '🍷', label: 'Food & Wine' },
];

const TRAITS = [
  { emoji: '🏔️', label: 'Adventurous' },
  { emoji: '✨', label: 'Creative' },
  { emoji: '💛', label: 'Empathetic' },
  { emoji: '☀️', label: 'Optimistic' },
  { emoji: '🔍', label: 'Curious' },
  { emoji: '🤝', label: 'Loyal' },
  { emoji: '😄', label: 'Humorous' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🚀', label: 'Driven' },
  { emoji: '🌸', label: 'Nurturing' },
  { emoji: '💪', label: 'Independent' },
  { emoji: '🔮', label: 'Reflective' },
  { emoji: '📊', label: 'Analytical' },
  { emoji: '⚡', label: 'Spontaneous' },
  { emoji: '🌳', label: 'Resilient' },
  { emoji: '⌛', label: 'Patient' },
  { emoji: '🔥', label: 'Ambitious' },
  { emoji: '💖', label: 'Passionate' },
  { emoji: '🧩', label: 'Pragmatic' },
  { emoji: '🌙', label: 'Thoughtful' },
  { emoji: '🌟', label: 'Extroverted' },
  { emoji: '📚', label: 'Introverted' },
];

// Categorized beliefs/religions
const BELIEF_CATEGORIES = [
  {
    category: 'Major World Religions',
    options: ['Christianity', 'Islam', 'Judaism', 'Hinduism', 'Buddhism', 'Sikhism'],
  },
  {
    category: 'Eastern Traditions',
    options: ['Taoism', 'Confucianism', 'Shinto', 'Jainism'],
  },
  {
    category: 'Modern Spirituality',
    options: ['New Age spirituality', 'Meditation traditions', 'Yoga philosophy', 'Stoicism'],
  },
  {
    category: 'Philosophical',
    options: ['Humanism', 'Agnostic', 'Atheist', 'Spiritual but not religious'],
  },
  {
    category: 'Other',
    options: ['Other', 'Prefer not to say'],
  },
];

// Flat list for simple selection
const BELIEFS = BELIEF_CATEGORIES.flatMap(c => c.options);

const JOURNEY_OPTIONS = [
  { emoji: '🧠', label: "I want to reflect on my life experiences and personal growth" },
  { emoji: '💼', label: "I'm reflecting on my career and the lessons I've learned" },
  { emoji: '💙', label: "I want to preserve my parents' stories before they're lost" },
  { emoji: '🔄', label: "I'm at a transitional moment and processing big changes" },
  { emoji: '🌱', label: "I want to create something meaningful for my children" },
  { emoji: '📖', label: "I want to document my life story for future generations" },
];

// ============================================
// UTILITY COMPONENTS
// ============================================

function CheckIcon() {
  return (
    <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} viewBox="0 0 24 24" width="12">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;

        return (
          <div key={n} className="flex items-center">
            <div
              aria-current={active ? 'step' : undefined}
              aria-label={done ? `Step ${n}, completed` : `Step ${n}${active ? ', current' : ''}`}
              className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                done
                  ? 'bg-[#52325d] text-white'
                  : active
                  ? 'bg-[#52325d]/10 ring-2 ring-[#52325d]'
                  : 'bg-[#f4f4f5] ring-1 ring-[#d4d4d8]'
              }`}
            >
              {done && <CheckIcon />}
            </div>
            {n < total && (
              <div className={`h-px w-5 ${n < current ? 'bg-[#52325d]/40' : 'bg-[#d4d4d8]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({
  category,
  icon,
  iconBg,
  title,
  description,
  whyMatters,
}: {
  category: string;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  whyMatters: string;
}) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-8 shadow-[0_8px_40px_rgba(64,106,86,0.08)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-[14px] text-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          <p className="text-[11px] font-semibold tracking-widest text-[#52325d] uppercase">{category}</p>
          <h2 className="text-lg leading-snug font-bold text-[#2D2D2D]">{title}</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[#2D2D2D]/70">{description}</p>

      <div className="rounded-[14px] bg-[#F9FAFB] px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold tracking-wider text-[#2D2D2D]/50 uppercase">
          WHY THIS MATTERS
        </p>
        <p className="text-xs leading-relaxed text-[#2D2D2D]/60">{whyMatters}</p>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
        <Shield size={13} />
        <span>Your data is private and secure. You control who sees your story.</span>
      </div>
    </div>
  );
}

function ToggleChip({
  emoji,
  label,
  selected,
  onToggle,
}: {
  label: string;
  emoji?: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      type="button"
      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm transition-all ${
        selected
          ? 'border-[#52325d] bg-[#52325d]/10 font-medium text-[#52325d]'
          : 'border-[#d4d4d8] bg-[#f4f4f5] text-[#2D2D2D]/70 hover:border-[#52325d]/40'
      }`}
      onClick={onToggle}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      {label}
    </button>
  );
}

function RadioCard({
  emoji,
  label,
  selected,
  onSelect,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      type="button"
      className={`flex w-full items-center gap-3 rounded-[12px] border-2 px-4 py-3 text-left text-sm transition-all ${
        selected
          ? 'border-[#52325d] bg-[#52325d]/8 text-[#2D2D2D]'
          : 'border-[#e4e4e7] bg-[#f4f4f5] text-[#2D2D2D]/70 hover:border-[#52325d]/40'
      }`}
      onClick={onSelect}
    >
      <span aria-hidden className="shrink-0 text-lg">{emoji}</span>
      <span className="flex-1">{label}</span>
      {selected && (
        <span className="ml-auto text-[#52325d]">
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

function StepLayout({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto px-6 pb-10">
      <div className={`w-full ${wide ? 'max-w-[1000px]' : 'max-w-[860px]'}`}>{children}</div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function HeroUIOnboarding({ onComplete, onSkip, firstName }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<Partial<OnboardingData>>({
    interests: [],
    traits: [],
    beliefs: [],
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as Step);
  }, []);

  const back = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1) as Step);
  }, []);

  const handleComplete = () => {
    onComplete(data as OnboardingData);
  };

  return (
    <div className="flex h-screen min-h-[600px] w-full flex-col overflow-hidden bg-white">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#52325d]/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#52325d]/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {step === 1 && (
              <StepYourRoots
                data={data}
                firstName={firstName}
                onUpdate={updateData}
                onNext={next}
                onSkip={onSkip}
              />
            )}
            {step === 2 && (
              <StepPassions
                data={data}
                onUpdate={updateData}
                onNext={next}
                onBack={back}
                onSkip={onSkip}
              />
            )}
            {step === 3 && (
              <StepBeliefs
                data={data}
                onUpdate={updateData}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 4 && (
              <StepJourney
                data={data}
                onUpdate={updateData}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 5 && (
              <StepDeeper
                data={data}
                onUpdate={updateData}
                onNext={next}
              />
            )}
            {step === 6 && (
              <StepComplete
                firstName={firstName}
                birthplace={data.birthplace || ''}
                onComplete={handleComplete}
              />
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

function StepYourRoots({
  data,
  firstName,
  onUpdate,
  onNext,
  onSkip,
}: {
  data: Partial<OnboardingData>;
  firstName: string;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [birthplace, setBirthplace] = useState(data.birthplace || '');

  const handleNext = () => {
    const birthday = month && day && year ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : '';
    onUpdate({ birthday, birthplace, name: firstName });
    onNext();
  };

  return (
    <StepLayout>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="md:w-[300px] md:shrink-0">
          <InfoCard
            category="YOUR ROOTS"
            description="The places we've lived become part of our story. They hold memories of who we were and how we've grown over time."
            icon="📍"
            iconBg="bg-[#f4f4f5]"
            title="Where You Call Home"
            whyMatters="This contextualizes your memories geographically and helps family members understand the settings that shaped your life."
          />
        </div>

        <div className="flex flex-1 flex-col gap-8 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-8 shadow-[0_8px_40px_rgba(64,106,86,0.12)] backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <h1 className="flex items-center gap-3 text-[28px] leading-tight font-medium text-[#2D2D2D]">
              <span aria-label="Location pin" className="text-2xl" role="img">📍</span>
              Where did your story begin, {firstName}?
            </h1>
            <p className="text-sm text-[#71717a]">Your birthday and birthplace help us personalize your journey.</p>
          </div>

          {/* Birthday fields */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold tracking-wider text-[#52525b] uppercase">Birthday</label>
            <div className="flex gap-2">
              <select
                aria-label="Month"
                className="flex-1 appearance-none rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-3 py-2.5 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Month</option>
                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
                  <option key={m} value={m}>{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]}</option>
                ))}
              </select>
              <input
                aria-label="Day"
                type="number"
                min="1"
                max="31"
                className="w-[80px] rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-3 py-2.5 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none"
                placeholder="Day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <input
                aria-label="Year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                className="w-[90px] rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-3 py-2.5 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none"
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          {/* Birthplace */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold tracking-wider text-[#52525b] uppercase">Birthplace</label>
            <input
              type="text"
              className="w-full rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-4 py-2.5 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none"
              placeholder="e.g. Brooklyn, NY"
              value={birthplace}
              onChange={(e) => setBirthplace(e.target.value)}
            />
          </div>

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#52325d] text-base font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
            type="button"
            onClick={handleNext}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button className="text-sm text-[#a1a1aa] transition-colors hover:text-[#2D2D2D]/60" type="button" onClick={onSkip}>
          Skip setup
        </button>
      </div>
    </StepLayout>
  );
}

function StepPassions({
  data,
  onUpdate,
  onNext,
  onBack,
  onSkip,
}: {
  data: Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set(data.interests || []));
  const [selectedTraits, setSelectedTraits] = useState<Set<string>>(new Set(data.traits || []));
  const [customInterest, setCustomInterest] = useState('');
  const [customTrait, setCustomTrait] = useState('');

  const toggleInterest = (label: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleTrait = (label: string) => {
    setSelectedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleNext = () => {
    onUpdate({
      interests: Array.from(selectedInterests),
      traits: Array.from(selectedTraits),
    });
    onNext();
  };

  return (
    <StepLayout wide>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-[260px] lg:shrink-0">
          <InfoCard
            category="YOUR PASSIONS"
            description="The things that spark your curiosity reveal the truest parts of you. Your interests guide the memories you'll want to preserve and the stories worth telling."
            icon="💛"
            iconBg="bg-amber-100"
            title="What Captivates You"
            whyMatters="We use this to suggest relevant prompts, connect you with similar family members, and curate content that truly resonates with you."
          />
        </div>

        <div className="flex flex-1 flex-col gap-6">
          {/* Interests */}
          <div className="flex flex-col gap-4 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-6 shadow-[0_8px_40px_rgba(64,106,86,0.08)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#52325d]" />
              <p className="text-xs font-semibold tracking-wider text-[#2D2D2D]/60 uppercase">Your Interests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(({ emoji, label }) => (
                <ToggleChip
                  key={label}
                  emoji={emoji}
                  label={label}
                  selected={selectedInterests.has(label)}
                  onToggle={() => toggleInterest(label)}
                />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="flex-1 rounded-full border-2 border-dashed border-[#d4d4d8] bg-transparent px-3 py-1.5 text-sm text-[#2D2D2D]/50 placeholder:text-[#2D2D2D]/30 focus:border-[#52325d]/40 focus:outline-none"
                placeholder="Add your own..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
              />
              {customInterest && (
                <button
                  className="text-xs font-medium text-[#52325d] hover:underline"
                  type="button"
                  onClick={() => {
                    if (customInterest.trim()) {
                      toggleInterest(customInterest.trim());
                      setCustomInterest('');
                    }
                  }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          {/* Traits */}
          <div className="flex flex-col gap-4 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-6 shadow-[0_8px_40px_rgba(64,106,86,0.08)] backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#52325d]" />
              <p className="text-xs font-semibold tracking-wider text-[#2D2D2D]/60 uppercase">Who You Are</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAITS.map(({ emoji, label }) => (
                <ToggleChip
                  key={label}
                  emoji={emoji}
                  label={label}
                  selected={selectedTraits.has(label)}
                  onToggle={() => toggleTrait(label)}
                />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="flex-1 rounded-full border-2 border-dashed border-[#d4d4d8] bg-transparent px-3 py-1.5 text-sm text-[#2D2D2D]/50 placeholder:text-[#2D2D2D]/30 focus:border-[#52325d]/40 focus:outline-none"
                placeholder="Describe yourself..."
                value={customTrait}
                onChange={(e) => setCustomTrait(e.target.value)}
              />
              {customTrait && (
                <button
                  className="text-xs font-medium text-[#52325d] hover:underline"
                  type="button"
                  onClick={() => {
                    if (customTrait.trim()) {
                      toggleTrait(customTrait.trim());
                      setCustomTrait('');
                    }
                  }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              className="flex h-10 items-center justify-center rounded-[12px] border-2 border-[#e4e4e7] bg-white px-4 transition-colors hover:bg-[#f9fafb]"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#52325d] text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              type="button"
              onClick={handleNext}
            >
              Continue
              <ChevronRight size={14} />
            </button>
          </div>
          <button className="text-center text-sm text-[#a1a1aa] transition-colors hover:text-[#2D2D2D]/60" type="button" onClick={onSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </StepLayout>
  );
}

// Continuing in next message due to length...

function StepBeliefs({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(data.beliefs || []));

  const toggle = (belief: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(belief)) next.delete(belief);
      else next.add(belief);
      return next;
    });
  };

  const handleNext = () => {
    onUpdate({ beliefs: Array.from(selected) });
    onNext();
  };

  return (
    <StepLayout>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="md:w-[300px] md:shrink-0">
          <InfoCard
            category="FAITH & SPIRITUALITY"
            description="Spirituality often provides the framework for how we understand life's biggest questions. Your beliefs shape your perspective in profound ways."
            icon="🍃"
            iconBg="bg-emerald-100"
            title="Your Beliefs"
            whyMatters="This helps us respectfully personalize prompts around meaning, purpose, and the values you hold most dear."
          />
        </div>

        <div className="flex flex-1 flex-col gap-6 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-8 shadow-[0_8px_40px_rgba(64,106,86,0.12)] backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium text-[#2D2D2D]">Faith & belief</h1>
            <p className="text-sm text-[#71717a]">
              This helps us personalize how we explore life's deeper moments with you. Select all that apply.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {BELIEFS.map((belief) => (
              <ToggleChip key={belief} label={belief} selected={selected.has(belief)} onToggle={() => toggle(belief)} />
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[12px] bg-[#f9fafb] px-4 py-2.5 text-xs text-[#71717a]">
            <Info size={14} />
            <span>Your beliefs are private and never shared.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex h-10 items-center justify-center rounded-[12px] border-2 border-[#e4e4e7] bg-white px-4 transition-colors hover:bg-[#f9fafb]"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#52325d] text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              type="button"
              onClick={handleNext}
            >
              Skip for now
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}

function StepJourney({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(data.journey || null);
  const [ownWords, setOwnWords] = useState(data.journeyCustom || '');

  const handleNext = () => {
    onUpdate({ journey: selected || '', journeyCustom: ownWords });
    onNext();
  };

  return (
    <StepLayout>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="md:w-[300px] md:shrink-0">
          <InfoCard
            category="WHAT BRINGS YOU HERE"
            description="Understanding why you're here helps us support your unique path. Whether you're preserving memories for family or reflecting on your own, your story deserves care."
            icon="📖"
            iconBg="bg-orange-100"
            title="Your Journey"
            whyMatters="This shapes the entire experience—we'll tailor prompts, suggestions, and features to match your specific goals."
          />
        </div>

        <div className="flex flex-1 flex-col gap-5 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-8 shadow-[0_8px_40px_rgba(64,106,86,0.12)] backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium text-[#2D2D2D]">What brings you here?</h1>
            <p className="text-sm text-[#71717a]">
              This shapes the first question we ask you — so be as honest as you like.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {JOURNEY_OPTIONS.map(({ emoji, label }) => (
              <RadioCard
                key={label}
                emoji={emoji}
                label={label}
                selected={selected === label}
                onSelect={() => setSelected(selected === label ? null : label)}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e5e7eb]" />
            <span className="text-xs text-[#a1a1aa]">or in your own words</span>
            <div className="flex-1 h-px bg-[#e5e7eb]" />
          </div>

          <textarea
            className="w-full rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-4 py-3 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none resize-none"
            placeholder="Share what's on your heart..."
            rows={3}
            value={ownWords}
            onChange={(e) => setOwnWords(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <button
              className="flex h-10 items-center justify-center rounded-[12px] border-2 border-[#e4e4e7] bg-white px-4 transition-colors hover:bg-[#f9fafb]"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#52325d] text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              type="button"
              onClick={handleNext}
            >
              Continue
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}

function StepDeeper({
  data,
  onUpdate,
  onNext,
}: {
  data: Partial<OnboardingData>;
  onUpdate: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const [value, setValue] = useState(data.heartfelt || '');

  const handleNext = () => {
    onUpdate({ heartfelt: value });
    onNext();
  };

  return (
    <StepLayout>
      <div className="flex flex-col items-center">
        <div className="flex w-full max-w-[540px] flex-col gap-6 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-10 shadow-[0_8px_40px_rgba(64,106,86,0.12)] backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#52325d] text-2xl">💚</div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-medium text-[#2D2D2D]">Let's Go Deeper</h1>
              <p className="text-sm text-[#71717a]">Share what's on your mind — we'll capture the moments that matter</p>
            </div>
          </div>

          <div className="rounded-[14px] border-2 border-[#e4e4e7] bg-white px-4 py-3 text-sm leading-relaxed text-[#2D2D2D]/80">
            What's a moment in your life that really shaped who you are today?
          </div>

          <div className="flex flex-col gap-2">
            <textarea
              className="w-full rounded-[12px] border-2 border-[#e4e4e7] bg-[#f4f4f5] px-4 py-3 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[#52325d] focus:outline-none resize-none"
              placeholder="Share your thoughts..."
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                aria-label="Listen"
                className="flex size-9 items-center justify-center rounded-[10px] border-2 border-[#e4e4e7] bg-[#f4f4f5] text-[#a1a1aa] transition-colors hover:border-[#52325d]/40"
                type="button"
              >
                <Volume2 size={16} />
              </button>
              <button
                aria-label="Dictate"
                className="flex size-9 items-center justify-center rounded-[10px] border-2 border-[#e4e4e7] bg-[#f4f4f5] text-[#a1a1aa] transition-colors hover:border-[#52325d]/40"
                type="button"
              >
                <Mic size={16} />
              </button>
              <button
                aria-label="Send"
                className="flex size-9 items-center justify-center rounded-[10px] bg-[#52325d] text-white transition-opacity hover:opacity-90"
                type="button"
                onClick={handleNext}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <button
            className="text-center text-sm text-[#a1a1aa] transition-colors hover:text-[#2D2D2D]/60"
            type="button"
            onClick={handleNext}
          >
            Skip for now
          </button>
        </div>
      </div>
    </StepLayout>
  );
}

function StepComplete({
  firstName,
  birthplace,
  onComplete,
}: {
  firstName: string;
  birthplace: string;
  onComplete: () => void;
}) {
  return (
    <StepLayout>
      <div className="flex flex-col items-center justify-center">
        <div className="flex w-full max-w-[480px] flex-col items-center gap-8 rounded-[20px] bg-gradient-to-b from-white/90 to-white/50 p-12 text-center shadow-[0_8px_40px_rgba(64,106,86,0.12)] backdrop-blur-sm">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-[#52325d]/10">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#52325d] text-white shadow-[0_4px_20px_rgba(64,106,86,0.35)]">
              <Check size={28} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] leading-tight font-medium text-[#2D2D2D]">
              You're all set, {firstName}!
            </h1>
            <p className="text-base leading-relaxed text-[#71717a]">
              Your story{birthplace ? ` from ${birthplace}` : ''} is just beginning. Let's make it unforgettable.
            </p>
          </div>

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#52325d] px-8 text-base font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
            type="button"
            onClick={onComplete}
          >
            Enter YoursTruly
            <span aria-hidden className="ml-1">✦</span>
          </button>
        </div>
      </div>
    </StepLayout>
  );
}
