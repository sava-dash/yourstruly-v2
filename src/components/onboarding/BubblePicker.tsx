'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

// ============================================
// DATA
// ============================================

const INTEREST_DATA: { name: string; emoji: string; items: { label: string; emoji: string }[] }[] = [
  {
    name: 'Creative Arts',
    emoji: '🎨',
    items: [
      { label: 'Drawing', emoji: '✏️' },
      { label: 'Painting', emoji: '🖌️' },
      { label: 'Sculpting', emoji: '🗿' },
      { label: 'Writing', emoji: '✍️' },
      { label: 'Poetry', emoji: '📝' },
      { label: 'Journaling', emoji: '📓' },
      { label: 'Photography', emoji: '📷' },
      { label: 'Videography', emoji: '🎥' },
      { label: 'Graphic Design', emoji: '🖥️' },
      { label: 'Animation', emoji: '🎞️' },
      { label: '3D Modeling', emoji: '🧊' },
      { label: 'Film Analysis', emoji: '🎬' },
      { label: 'Theater', emoji: '🎭' },
      { label: 'Comedy', emoji: '😂' },
      { label: 'Instruments', emoji: '🎸' },
      { label: 'Singing', emoji: '🎤' },
      { label: 'Dancing', emoji: '💃' },
      { label: 'Fashion', emoji: '👗' },
      { label: 'Makeup', emoji: '💄' },
      { label: 'Hair Styling', emoji: '💇' },
      { label: 'Interior Design', emoji: '🏠' },
      { label: 'DIY Crafts', emoji: '🛠️' },
      { label: 'Woodworking', emoji: '🪵' },
    ],
  },
  {
    name: 'Health & Wellness',
    emoji: '💪',
    items: [
      { label: 'Fitness', emoji: '🏋️' },
      { label: 'Weightlifting', emoji: '💪' },
      { label: 'Yoga', emoji: '🧘' },
      { label: 'Meditation', emoji: '🧘‍♂️' },
      { label: 'Running', emoji: '🏃' },
      { label: 'Cycling', emoji: '🚴' },
      { label: 'Swimming', emoji: '🏊' },
      { label: 'Martial Arts', emoji: '🥋' },
      { label: 'Boxing', emoji: '🥊' },
      { label: 'Wellness', emoji: '🌿' },
      { label: 'Nutrition', emoji: '🥗' },
      { label: 'Mindfulness', emoji: '🧠' },
    ],
  },
  {
    name: 'Nature & Adventure',
    emoji: '🏔️',
    items: [
      { label: 'Hiking', emoji: '🥾' },
      { label: 'Camping', emoji: '⛺' },
      { label: 'Traveling', emoji: '✈️' },
      { label: 'Surfing', emoji: '🏄' },
      { label: 'Climbing', emoji: '🧗' },
      { label: 'Fishing', emoji: '🎣' },
      { label: 'Boating', emoji: '⛵' },
      { label: 'Paddleboard', emoji: '🏄‍♀️' },
      { label: 'Scuba Diving', emoji: '🤿' },
      { label: 'Snowboarding', emoji: '🏂' },
      { label: 'Skiing', emoji: '⛷️' },
      { label: 'Gardening', emoji: '🌱' },
      { label: 'Birdwatching', emoji: '🐦' },
    ],
  },
  {
    name: 'Food & Drink',
    emoji: '🍳',
    items: [
      { label: 'Cooking', emoji: '👨‍🍳' },
      { label: 'Baking', emoji: '🧁' },
      { label: 'Food Tasting', emoji: '🍽️' },
      { label: 'Wine', emoji: '🍷' },
      { label: 'Coffee', emoji: '☕' },
      { label: 'Tea', emoji: '🍵' },
      { label: 'Mixology', emoji: '🍸' },
    ],
  },
  {
    name: 'STEM & Learning',
    emoji: '💻',
    items: [
      { label: 'Technology', emoji: '💻' },
      { label: 'Gadgets', emoji: '📱' },
      { label: 'Coding', emoji: '👨‍💻' },
      { label: 'VR', emoji: '🥽' },
      { label: 'Science', emoji: '🔬' },
      { label: 'Astronomy', emoji: '🔭' },
      { label: 'History', emoji: '📜' },
      { label: 'Philosophy', emoji: '🤔' },
      { label: 'Psychology', emoji: '🧠' },
      { label: 'Astrology', emoji: '♈' },
      { label: 'Languages', emoji: '🌍' },
      { label: 'Culture', emoji: '🏛️' },
    ],
  },
  {
    name: 'Sports & Games',
    emoji: '⚽',
    items: [
      { label: 'Gaming', emoji: '🎮' },
      { label: 'Esports', emoji: '🕹️' },
      { label: 'Soccer', emoji: '⚽' },
      { label: 'Basketball', emoji: '🏀' },
      { label: 'Football', emoji: '🏈' },
      { label: 'Baseball', emoji: '⚾' },
      { label: 'Tennis', emoji: '🎾' },
      { label: 'Pickleball', emoji: '🏓' },
      { label: 'Golf', emoji: '⛳' },
    ],
  },
  {
    name: 'Lifestyle',
    emoji: '🏠',
    items: [
      { label: 'Thrifting', emoji: '🛍️' },
      { label: 'Minimalism', emoji: '✨' },
      { label: 'Organizing', emoji: '🗂️' },
      { label: 'Home Improvement', emoji: '🔨' },
      { label: 'Collecting', emoji: '🎴' },
      { label: 'Blogging', emoji: '📸' },
      { label: 'Cars', emoji: '🚗' },
      { label: 'Motorcycling', emoji: '🏍️' },
      { label: 'DIY Projects', emoji: '🏡' },
      { label: 'Parenting', emoji: '👶' },
    ],
  },
  {
    name: 'Community',
    emoji: '🤝',
    items: [
      { label: 'Volunteering', emoji: '🤲' },
      { label: 'Community', emoji: '🏘️' },
      { label: 'Animal Care', emoji: '🐾' },
      { label: 'Sustainability', emoji: '♻️' },
    ],
  },
  {
    name: 'Business',
    emoji: '💼',
    items: [
      { label: 'Entrepreneurship', emoji: '🚀' },
      { label: 'Investing', emoji: '📈' },
      { label: 'Real Estate', emoji: '🏢' },
      { label: 'Finance', emoji: '💰' },
      { label: 'Public Speaking', emoji: '🎙️' },
    ],
  },
];

interface BubbleItem { label: string; emoji: string; category: string; }

const ALL_INTERESTS: BubbleItem[] = INTEREST_DATA.flatMap(cat =>
  cat.items.map(item => ({ ...item, category: cat.name }))
);

const TRAIT_ITEMS: { label: string; emoji: string }[] = [
  { label: 'Ambitious', emoji: '🎯' },
  { label: 'Adventurous', emoji: '🏔️' },
  { label: 'Analytical', emoji: '🧩' },
  { label: 'Assertive', emoji: '💪' },
  { label: 'Authentic', emoji: '💎' },
  { label: 'Calm', emoji: '🌊' },
  { label: 'Caring', emoji: '💝' },
  { label: 'Charismatic', emoji: '✨' },
  { label: 'Cheerful', emoji: '😊' },
  { label: 'Compassionate', emoji: '🤗' },
  { label: 'Confident', emoji: '🦁' },
  { label: 'Considerate', emoji: '🌸' },
  { label: 'Creative', emoji: '🎨' },
  { label: 'Curious', emoji: '🔍' },
  { label: 'Dependable', emoji: '🏗️' },
  { label: 'Determined', emoji: '⛰️' },
  { label: 'Disciplined', emoji: '🎖️' },
  { label: 'Easygoing', emoji: '😎' },
  { label: 'Empathetic', emoji: '💛' },
  { label: 'Energetic', emoji: '⚡' },
  { label: 'Enthusiastic', emoji: '🔥' },
  { label: 'Extroverted', emoji: '🎉' },
  { label: 'Flexible', emoji: '🌿' },
  { label: 'Focused', emoji: '🎯' },
  { label: 'Friendly', emoji: '😄' },
  { label: 'Generous', emoji: '🎁' },
  { label: 'Genuine', emoji: '💫' },
  { label: 'Hardworking', emoji: '💼' },
  { label: 'Honest', emoji: '🤝' },
  { label: 'Humble', emoji: '🙏' },
  { label: 'Imaginative', emoji: '🌈' },
  { label: 'Independent', emoji: '🦅' },
  { label: 'Innovative', emoji: '💡' },
  { label: 'Insightful', emoji: '👁️' },
  { label: 'Intelligent', emoji: '🧠' },
  { label: 'Intuitive', emoji: '🔮' },
  { label: 'Introverted', emoji: '📖' },
  { label: 'Kind', emoji: '🕊️' },
  { label: 'Logical', emoji: '🧮' },
  { label: 'Loyal', emoji: '🛡️' },
  { label: 'Motivated', emoji: '🚀' },
  { label: 'Observant', emoji: '👀' },
  { label: 'Open-minded', emoji: '🌍' },
  { label: 'Optimistic', emoji: '☀️' },
  { label: 'Organized', emoji: '📋' },
  { label: 'Outgoing', emoji: '🎈' },
  { label: 'Patient', emoji: '⏳' },
  { label: 'Perceptive', emoji: '🔎' },
  { label: 'Persistent', emoji: '🏋️' },
  { label: 'Practical', emoji: '🔧' },
  { label: 'Proactive', emoji: '⏩' },
  { label: 'Rational', emoji: '📐' },
  { label: 'Reflective', emoji: '💭' },
  { label: 'Reliable', emoji: '⚓' },
  { label: 'Reserved', emoji: '🤫' },
  { label: 'Resourceful', emoji: '🧰' },
  { label: 'Responsible', emoji: '✅' },
  { label: 'Self-aware', emoji: '🪞' },
  { label: 'Disciplined', emoji: '🏅' },
  { label: 'Self-reliant', emoji: '🗻' },
  { label: 'Sincere', emoji: '❤️' },
  { label: 'Social', emoji: '👥' },
  { label: 'Spontaneous', emoji: '🎲' },
  { label: 'Strategic', emoji: '♟️' },
  { label: 'Supportive', emoji: '🤲' },
  { label: 'Thoughtful', emoji: '🌙' },
  { label: 'Trustworthy', emoji: '🔐' },
  { label: 'Understanding', emoji: '🤝' },
  { label: 'Upbeat', emoji: '🎵' },
  { label: 'Warm', emoji: '🌻' },
  { label: 'Wise', emoji: '🦉' },
  { label: 'Witty', emoji: '😏' },
  { label: 'Methodical', emoji: '📊' },
  { label: 'Adaptable', emoji: '🦎' },
  { label: 'Balanced', emoji: '⚖️' },
  { label: 'Bold', emoji: '🔥' },
  { label: 'Detail-oriented', emoji: '🔬' },
  { label: 'Deep Thinker', emoji: '🤔' },
  { label: 'Good Listener', emoji: '👂' },
  { label: 'Fast-paced', emoji: '💨' },
  { label: 'Future-focused', emoji: '🔭' },
  { label: 'Gentle', emoji: '🌷' },
  { label: 'High-energy', emoji: '⚡' },
  { label: 'Idealistic', emoji: '🌟' },
  { label: 'Introspective', emoji: '🧘' },
  { label: 'People-person', emoji: '🫂' },
  { label: 'Purpose-driven', emoji: '🧭' },
  { label: 'Realistic', emoji: '🏔️' },
  { label: 'Risk-taker', emoji: '🎪' },
  { label: 'Soft-spoken', emoji: '🌾' },
  { label: 'Direct', emoji: '➡️' },
  { label: 'Structured', emoji: '🏛️' },
  { label: 'Team Player', emoji: '🏉' },
  { label: 'Visionary', emoji: '🔮' },
  { label: 'Cool-headed', emoji: '🧊' },
  { label: 'EQ', emoji: '💜' },
  { label: 'Values-driven', emoji: '⭐' },
];

// ============================================
// BUBBLE CLUSTER COMPONENT
// ============================================

const SELECTED_COLOR = '#406A56';
const SELECTED_COLOR_TRAIT = '#4A3552';

function ClusteredBubbles({
  items,
  selected,
  onToggle,
  accentColor,
}: {
  items: { label: string; emoji: string }[];
  selected: Set<string>;
  onToggle: (label: string) => void;
  accentColor: string;
}) {
  // Assign sizes - create a repeating pattern of S/M/L
  // that fills the space nicely
  const getSizeForIndex = (i: number): number => {
    // Pattern: L M S M L S M L M S ...
    const sizes = [88, 76, 64, 78, 70, 90, 66, 82, 72, 62, 86, 68, 74, 92, 60, 80, 70, 84, 66, 76];
    return sizes[i % sizes.length];
  };

  const UNSELECTED_BG = [
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.04)',
    'rgba(255,255,255,0.08)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.07)',
    'rgba(255,255,255,0.03)',
    'rgba(255,255,255,0.06)',
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'flex-start',
      gap: 6,
      padding: '0 4px',
    }}>
      {items.map((item, i) => {
        const size = getSizeForIndex(i);
        const isSelected = selected.has(item.label);
        const emojiSize = size >= 84 ? 28 : size >= 72 ? 24 : 20;
        const labelSize = size >= 84 ? 10 : size >= 72 ? 9 : 7.5;

        return (
          <motion.button
            key={item.label}
            onClick={() => onToggle(item.label)}
            whileTap={{ scale: 0.88 }}
            initial={false}
            animate={{
              scale: isSelected ? 1.05 : 1,
              backgroundColor: isSelected ? accentColor : (UNSELECTED_BG[i % UNSELECTED_BG.length]),
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              border: isSelected
                ? '2.5px solid rgba(255,255,255,0.85)'
                : '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              padding: 0,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: isSelected
                ? `0 0 24px ${accentColor}50, inset 0 0 20px ${accentColor}30`
                : 'none',
            }}
          >
            <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{item.emoji}</span>
            <span style={{
              fontSize: labelSize,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'white' : 'rgba(255,255,255,0.55)',
              lineHeight: 1.15,
              textAlign: 'center',
              maxWidth: size - 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}>
              {item.label}
            </span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={11} strokeWidth={3} color={accentColor} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================
// INTERESTS PICKER
// ============================================

interface BubblePickerProps {
  mode: 'interests' | 'traits';
  selected: Set<string>;
  onToggle: (label: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
  totalSelected: number;
}

export function BubblePickerInterests({
  selected,
  onToggle,
  onContinue,
  onBack,
  onSkip,
  totalSelected,
}: BubblePickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const currentCat = INTEREST_DATA[activeCategory];

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(145deg, #1a2a22 0%, #0d1a14 50%, #162219 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '5%', left: '-15%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(64,106,86,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(141,172,171,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ padding: '48px 24px 8px', textAlign: 'center', position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
          Pick your interests
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Select everything that speaks to you
        </p>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        padding: '10px 20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }} className="no-scrollbar">
        {INTEREST_DATA.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            style={{
              padding: '7px 14px',
              borderRadius: 100,
              border: activeCategory === i ? '1.5px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.1)',
              background: activeCategory === i ? 'rgba(64,106,86,0.45)' : 'rgba(255,255,255,0.05)',
              color: activeCategory === i ? 'white' : 'rgba(255,255,255,0.45)',
              fontSize: 12,
              fontWeight: activeCategory === i ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Bubble area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 8px 8px',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'flex-start',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCat.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%' }}
          >
            <ClusteredBubbles
              items={currentCat.items}
              selected={selected}
              onToggle={onToggle}
              accentColor={SELECTED_COLOR}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav totalSelected={totalSelected} onBack={onBack} onContinue={onContinue} onSkip={onSkip} accentColor={SELECTED_COLOR} gradientFrom="rgba(13,26,20,0.98)" />
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}

// ============================================
// TRAITS PICKER
// ============================================

export function BubblePickerTraits({
  selected,
  onToggle,
  onContinue,
  onBack,
  onSkip,
  totalSelected,
}: BubblePickerProps) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(145deg, #2a1a2e 0%, #1a0d1e 50%, #221628 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '10%', right: '-10%', width: '45%', height: '45%', background: 'radial-gradient(circle, rgba(74,53,82,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ padding: '48px 24px 12px', textAlign: 'center', position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>
          Who are you?
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Pick the traits that describe you
        </p>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 8px 8px',
        position: 'relative',
        zIndex: 10,
      }}>
        <ClusteredBubbles
          items={TRAIT_ITEMS}
          selected={selected}
          onToggle={onToggle}
          accentColor={SELECTED_COLOR_TRAIT}
        />
      </div>

      <BottomNav totalSelected={totalSelected} onBack={onBack} onContinue={onContinue} onSkip={onSkip} accentColor={SELECTED_COLOR_TRAIT} gradientFrom="rgba(26,13,30,0.98)" />
    </div>
  );
}

// ============================================
// BOTTOM NAV
// ============================================

function BottomNav({
  totalSelected, onBack, onContinue, onSkip, accentColor, gradientFrom,
}: {
  totalSelected: number; onBack: () => void; onContinue: () => void; onSkip: () => void;
  accentColor: string; gradientFrom: string;
}) {
  return (
    <div style={{
      padding: '20px 24px calc(env(safe-area-inset-bottom, 16px) + 16px)',
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', zIndex: 10,
      background: `linear-gradient(to top, ${gradientFrom} 70%, transparent 100%)`,
      flexShrink: 0,
    }}>
      {totalSelected > 0 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
          {totalSelected} selected
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onBack} style={{
          width: 52, height: 52, borderRadius: 16,
          border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <ChevronLeft size={20} />
        </button>
        <button onClick={onContinue} style={{
          flex: 1, height: 52, borderRadius: 16, border: 'none', background: accentColor,
          color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 4px 24px ${accentColor}55`,
        }}>
          Continue <ChevronRight size={18} />
        </button>
      </div>
      <button onClick={onSkip} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
        fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: 4,
      }}>
        Skip for now
      </button>
    </div>
  );
}

export { ALL_INTERESTS, TRAIT_ITEMS, INTEREST_DATA };
