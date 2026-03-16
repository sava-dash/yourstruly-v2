'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

// ============================================
// DATA - All interests, traits, and religions from Chuck's master list
// ============================================

interface BubbleItem {
  label: string;
  emoji: string;
  category: string;
}

// ---- INTERESTS (categorized) ----
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
      { label: 'Playing Instruments', emoji: '🎸' },
      { label: 'Singing', emoji: '🎤' },
      { label: 'Dancing', emoji: '💃' },
      { label: 'Fashion', emoji: '👗' },
      { label: 'Makeup Artistry', emoji: '💄' },
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
      { label: 'Holistic Wellness', emoji: '🌿' },
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
      { label: 'Paddleboarding', emoji: '🏄‍♀️' },
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
      { label: 'Wine Tasting', emoji: '🍷' },
      { label: 'Coffee Culture', emoji: '☕' },
      { label: 'Tea Culture', emoji: '🍵' },
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
      { label: 'Virtual Reality', emoji: '🥽' },
      { label: 'Science', emoji: '🔬' },
      { label: 'Astronomy', emoji: '🔭' },
      { label: 'History', emoji: '📜' },
      { label: 'Philosophy', emoji: '🤔' },
      { label: 'Psychology', emoji: '🧠' },
      { label: 'Astrology', emoji: '♈' },
      { label: 'Foreign Languages', emoji: '🌍' },
      { label: 'Cultural Studies', emoji: '🏛️' },
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
      { label: 'Home Organization', emoji: '🗂️' },
      { label: 'Home Improvement', emoji: '🔨' },
      { label: 'Collecting', emoji: '🎴' },
      { label: 'Travel Blogging', emoji: '📸' },
      { label: 'Car Restoration', emoji: '🚗' },
      { label: 'Motorcycling', emoji: '🏍️' },
      { label: 'DIY Home Projects', emoji: '🏡' },
      { label: 'Parenting', emoji: '👶' },
    ],
  },
  {
    name: 'Community & Service',
    emoji: '🤝',
    items: [
      { label: 'Volunteering', emoji: '🤲' },
      { label: 'Community Service', emoji: '🏘️' },
      { label: 'Animal Care', emoji: '🐾' },
      { label: 'Sustainability', emoji: '♻️' },
    ],
  },
  {
    name: 'Business & Growth',
    emoji: '💼',
    items: [
      { label: 'Entrepreneurship', emoji: '🚀' },
      { label: 'Investing', emoji: '📈' },
      { label: 'Real Estate', emoji: '🏢' },
      { label: 'Personal Finance', emoji: '💰' },
      { label: 'Public Speaking', emoji: '🎙️' },
    ],
  },
];

// Flat list of all interests
const ALL_INTERESTS: BubbleItem[] = INTEREST_DATA.flatMap(cat =>
  cat.items.map(item => ({ ...item, category: cat.name }))
);

// ---- PERSONALITY TRAITS ----
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
  { label: 'Self-disciplined', emoji: '🏅' },
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
  { label: 'Compassion-driven', emoji: '💗' },
  { label: 'Detail-oriented', emoji: '🔬' },
  { label: 'Deep Thinker', emoji: '🤔' },
  { label: 'Empathic Listener', emoji: '👂' },
  { label: 'Fast-paced', emoji: '💨' },
  { label: 'Future-focused', emoji: '🔭' },
  { label: 'Gentle', emoji: '🌷' },
  { label: 'High-energy', emoji: '⚡' },
  { label: 'Idealistic', emoji: '🌟' },
  { label: 'Introspective', emoji: '🧘' },
  { label: 'People-oriented', emoji: '🫂' },
  { label: 'Purpose-driven', emoji: '🧭' },
  { label: 'Realistic', emoji: '🏔️' },
  { label: 'Risk-taking', emoji: '🎪' },
  { label: 'Slow-paced', emoji: '🐢' },
  { label: 'Soft-spoken', emoji: '🌾' },
  { label: 'Straightforward', emoji: '➡️' },
  { label: 'Structured', emoji: '🏛️' },
  { label: 'Team-oriented', emoji: '🏉' },
  { label: 'Visionary', emoji: '🔮' },
  { label: 'Calm under Pressure', emoji: '🧊' },
  { label: 'Emotionally Intelligent', emoji: '💜' },
  { label: 'Values-driven', emoji: '⭐' },
];

// ============================================
// BUBBLE SIZES - create visual variety like the reference
// ============================================

// Assign sizes based on index for visual variety
function getBubbleSize(index: number, total: number): number {
  // Create a pattern of sizes: some big, mostly medium, some small
  const pattern = [72, 64, 56, 68, 52, 76, 60, 54, 70, 58, 66, 50, 74, 62, 56, 68, 52, 60, 72, 54];
  return pattern[index % pattern.length];
}

// Random-ish colors for unselected bubbles (muted)
const BUBBLE_COLORS = [
  'rgba(64, 106, 86, 0.12)',
  'rgba(141, 172, 171, 0.15)',
  'rgba(195, 95, 51, 0.10)',
  'rgba(217, 198, 26, 0.10)',
  'rgba(74, 53, 82, 0.10)',
  'rgba(64, 106, 86, 0.08)',
  'rgba(141, 172, 171, 0.12)',
];

const SELECTED_COLOR = '#406A56';

// ============================================
// COMPONENTS
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

function BubbleGrid({
  items,
  selected,
  onToggle,
  category,
}: {
  items: { label: string; emoji: string }[];
  selected: Set<string>;
  onToggle: (label: string) => void;
  category?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      justifyContent: 'center',
      padding: '8px 0',
    }}>
      {items.map((item, i) => {
        const size = getBubbleSize(i, items.length);
        const isSelected = selected.has(item.label);
        const bgColor = isSelected ? SELECTED_COLOR : BUBBLE_COLORS[i % BUBBLE_COLORS.length];

        return (
          <motion.button
            key={item.label}
            onClick={() => onToggle(item.label)}
            whileTap={{ scale: 0.9 }}
            animate={{
              scale: isSelected ? 1.05 : 1,
              backgroundColor: bgColor,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              border: isSelected ? '2.5px solid white' : '1.5px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: size > 64 ? 22 : 18, lineHeight: 1 }}>{item.emoji}</span>
            <span style={{
              fontSize: size > 64 ? 9 : 8,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'white' : 'rgba(255,255,255,0.75)',
              lineHeight: 1.1,
              textAlign: 'center',
              maxWidth: size - 12,
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
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={10} strokeWidth={3} color={SELECTED_COLOR} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
      {/* Ambient glow effects */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '-20%',
        width: '60%',
        height: '60%',
        background: 'radial-gradient(circle, rgba(64,106,86,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '-20%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, rgba(141,172,171,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '60px 24px 16px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'white',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Pick your interests
        </h2>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}>
          Select everything that speaks to you
        </p>
      </div>

      {/* Category tabs - horizontal scroll */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 24px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {INTEREST_DATA.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            style={{
              padding: '8px 16px',
              borderRadius: 100,
              border: activeCategory === i ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
              background: activeCategory === i ? 'rgba(64,106,86,0.4)' : 'rgba(255,255,255,0.06)',
              color: activeCategory === i ? 'white' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              fontWeight: activeCategory === i ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Bubble grid area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 16px',
        position: 'relative',
        zIndex: 10,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCat.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <BubbleGrid
              items={currentCat.items}
              selected={selected}
              onToggle={onToggle}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Selected count + bottom nav */}
      <div style={{
        padding: '16px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(to top, rgba(13,26,20,0.95) 0%, transparent 100%)',
      }}>
        {totalSelected > 0 && (
          <div style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
          }}>
            {totalSelected} selected
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onContinue}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              border: 'none',
              background: '#406A56',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(64,106,86,0.4)',
            }}
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'center',
            padding: 4,
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

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
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '-15%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, rgba(74,53,82,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '60px 24px 20px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'white',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Who are you?
        </h2>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}>
          Pick the traits that describe you
        </p>
      </div>

      {/* Bubble grid - all traits in one grid, scroll */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 16px',
        position: 'relative',
        zIndex: 10,
      }}>
        <BubbleGrid
          items={TRAIT_ITEMS}
          selected={selected}
          onToggle={onToggle}
        />
      </div>

      {/* Bottom nav */}
      <div style={{
        padding: '16px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        zIndex: 10,
        background: 'linear-gradient(to top, rgba(26,13,30,0.95) 0%, transparent 100%)',
      }}>
        {totalSelected > 0 && (
          <div style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
          }}>
            {totalSelected} selected
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onContinue}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              border: 'none',
              background: '#4A3552',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(74,53,82,0.4)',
            }}
          >
            Continue <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'center',
            padding: 4,
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// Export data for use elsewhere
export { ALL_INTERESTS, TRAIT_ITEMS, INTEREST_DATA };
