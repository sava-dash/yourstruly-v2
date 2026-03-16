'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';

// ============================================
// DATA
// ============================================

interface BubbleItem {
  label: string;
  emoji: string;
  category: string;
}

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
// BUBBLE PACKING - circle packing algorithm
// ============================================

const SELECTED_COLOR = '#406A56';
const SELECTED_COLOR_TRAIT = '#4A3552';

// Deterministic seeded random for consistent layouts
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Size pattern for visual variety
function getBubbleRadius(index: number, total: number): number {
  // Mix of sizes: ~20% large, ~50% medium, ~30% small
  const sizes = [42, 36, 38, 44, 34, 46, 36, 32, 40, 34, 38, 30, 44, 36, 34, 40, 32, 38, 42, 30];
  return sizes[index % sizes.length];
}

interface PackedCircle {
  x: number;
  y: number;
  r: number;
  index: number;
}

// Simple greedy circle packing
function packCircles(count: number, containerWidth: number, seed: number = 42): PackedCircle[] {
  const rng = seededRandom(seed);
  const circles: PackedCircle[] = [];
  const padding = 4;

  for (let i = 0; i < count; i++) {
    const r = getBubbleRadius(i, count);
    let bestX = 0, bestY = 0;
    let placed = false;

    // Try to place in rows, packing tightly
    const cols = Math.floor(containerWidth / ((r + padding) * 2));
    const row = Math.floor(i / Math.max(cols, 1));
    const col = i % Math.max(cols, 1);

    // Offset every other row for hex packing
    const xOffset = row % 2 === 1 ? r + padding : 0;
    bestX = col * (r * 2 + padding) + r + padding + xOffset;
    bestY = row * (r * 1.85 + padding) + r + padding;

    // Add slight randomness for organic feel
    bestX += (rng() - 0.5) * 6;
    bestY += (rng() - 0.5) * 4;

    circles.push({ x: bestX, y: bestY, r, index: i });
  }

  return circles;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const packed = useMemo(() => packCircles(items.length, containerWidth, 42), [items.length, containerWidth]);

  // Calculate total height needed
  const maxY = packed.reduce((max, c) => Math.max(max, c.y + c.r), 0) + 16;

  const UNSELECTED_COLORS = [
    'rgba(255,255,255,0.07)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.09)',
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.08)',
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: maxY, minHeight: 200 }}>
      {packed.map((circle, i) => {
        if (i >= items.length) return null;
        const item = items[i];
        const isSelected = selected.has(item.label);
        const size = circle.r * 2;

        return (
          <motion.button
            key={item.label}
            onClick={() => onToggle(item.label)}
            whileTap={{ scale: 0.88 }}
            animate={{
              scale: isSelected ? 1.08 : 1,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{
              position: 'absolute',
              left: circle.x - circle.r,
              top: circle.y - circle.r,
              width: size,
              height: size,
              borderRadius: '50%',
              border: isSelected ? '2.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(255,255,255,0.08)',
              background: isSelected ? accentColor : UNSELECTED_COLORS[i % UNSELECTED_COLORS.length],
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              overflow: 'hidden',
              boxShadow: isSelected ? `0 0 20px ${accentColor}40` : 'none',
              zIndex: isSelected ? 2 : 1,
            }}
          >
            <span style={{ fontSize: size > 72 ? 24 : size > 60 ? 20 : 16, lineHeight: 1 }}>
              {item.emoji}
            </span>
            <span style={{
              fontSize: size > 72 ? 10 : size > 60 ? 9 : 7.5,
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? 'white' : 'rgba(255,255,255,0.6)',
              lineHeight: 1.1,
              textAlign: 'center',
              maxWidth: size - 10,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 1,
            }}>
              {item.label}
            </span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={10} strokeWidth={3} color={accentColor} />
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
  const tabsRef = useRef<HTMLDivElement>(null);

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
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '-20%', width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(64,106,86,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '-20%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(141,172,171,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '60px 24px 12px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Pick your interests
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Select everything that speaks to you
        </p>
      </div>

      {/* Category tabs - horizontal scroll */}
      <div
        ref={tabsRef}
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 24px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
        }}
        className="hide-scrollbar"
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

      {/* Bubble cluster area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px',
        position: 'relative',
        zIndex: 10,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCat.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
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

      {/* Bottom nav */}
      <BottomNav
        totalSelected={totalSelected}
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        accentColor={SELECTED_COLOR}
        gradientFrom="rgba(13,26,20,0.95)"
      />

      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
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
        position: 'absolute', top: '15%', right: '-15%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(74,53,82,0.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ padding: '60px 24px 16px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'white', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          Who are you?
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Pick the traits that describe you
        </p>
      </div>

      {/* Bubble cluster - all traits */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px',
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

      {/* Bottom nav */}
      <BottomNav
        totalSelected={totalSelected}
        onBack={onBack}
        onContinue={onContinue}
        onSkip={onSkip}
        accentColor={SELECTED_COLOR_TRAIT}
        gradientFrom="rgba(26,13,30,0.95)"
      />
    </div>
  );
}

function BottomNav({
  totalSelected,
  onBack,
  onContinue,
  onSkip,
  accentColor,
  gradientFrom,
}: {
  totalSelected: number;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  accentColor: string;
  gradientFrom: string;
}) {
  return (
    <div style={{
      padding: '16px 24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      position: 'relative',
      zIndex: 10,
      background: `linear-gradient(to top, ${gradientFrom} 60%, transparent 100%)`,
    }}>
      {totalSelected > 0 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          {totalSelected} selected
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            width: 52, height: 52, borderRadius: 16,
            border: '1.5px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onContinue}
          style={{
            flex: 1, height: 52, borderRadius: 16,
            border: 'none', background: accentColor,
            color: 'white', fontSize: 16, fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 20px ${accentColor}66`,
          }}
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
      <button
        onClick={onSkip}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.3)', fontSize: 13,
          cursor: 'pointer', textAlign: 'center', padding: 4,
        }}
      >
        Skip for now
      </button>
    </div>
  );
}

export { ALL_INTERESTS, TRAIT_ITEMS, INTEREST_DATA };
