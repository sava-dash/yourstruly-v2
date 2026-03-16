'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.offsetHeight);
    }
    const onResize = () => {
      if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Greedy circle packing: place circles left-to-right, filling height first
  const packed = useMemo(() => {
    let seed = 7919;
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // Generate radii with variation
    const radii = items.map((_, i) => {
      const baseSizes = [52, 46, 50, 56, 44, 54, 48, 42, 58, 46, 52, 40, 56, 44, 50, 54, 42, 48, 58, 46];
      return baseSizes[i % baseSizes.length];
    });

    const padding = 5;
    const placed: { x: number; y: number; r: number }[] = [];

    for (let i = 0; i < items.length; i++) {
      const r = radii[i];
      let bestX = r + padding;
      let bestY = r + padding;
      let minX = Infinity;

      // Try many candidate positions, pick the leftmost one that fits
      // Scan columns from left to right
      for (let tryX = r + padding; tryX < 8000; tryX += 12) {
        let foundY = false;
        // Try positions top to bottom within container height
        for (let tryY = r + padding; tryY <= containerHeight - r - padding; tryY += 10) {
          // Check collision with all placed circles
          let collides = false;
          for (const p of placed) {
            const dx = tryX - p.x;
            const dy = tryY - p.y;
            const minDist = r + p.r + padding;
            if (dx * dx + dy * dy < minDist * minDist) {
              collides = true;
              break;
            }
          }
          if (!collides) {
            if (tryX < minX) {
              minX = tryX;
              bestX = tryX + (rng() - 0.5) * 4;
              bestY = tryY + (rng() - 0.5) * 4;
            }
            foundY = true;
            break;
          }
        }
        if (foundY && tryX <= minX) break;
      }

      placed.push({ x: bestX, y: bestY, r });
    }

    return placed;
  }, [items.length, containerHeight]);

  const totalWidth = packed.reduce((max, c) => Math.max(max, c.x + c.r + 10), 0);

  const UNSELECTED_BG = [
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.08)',
    'rgba(255,255,255,0.05)',
    'rgba(255,255,255,0.07)',
  ];

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
      className="no-scrollbar"
    >
      <div style={{ position: 'relative', width: totalWidth, height: '100%' }}>
        {packed.map((circle, i) => {
          if (i >= items.length) return null;
          const item = items[i];
          const size = circle.r * 2;
          const isSelected = selected.has(item.label);

          return (
            <motion.button
              key={item.label}
              onClick={() => onToggle(item.label)}
              whileTap={{ scale: 0.9 }}
              whileHover={{
                scale: 1.08,
                boxShadow: `0 0 20px ${accentColor}40`,
              }}
              initial={false}
              animate={{
                scale: isSelected ? 1.06 : 1,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              style={{
                position: 'absolute',
                left: circle.x - circle.r,
                top: circle.y - circle.r,
                width: size,
                height: size,
                borderRadius: '50%',
                border: isSelected
                  ? '3px solid rgba(255,255,255,0.9)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isSelected ? accentColor : UNSELECTED_BG[i % UNSELECTED_BG.length],
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                overflow: 'hidden',
                boxShadow: isSelected
                  ? `0 0 28px ${accentColor}55, inset 0 0 16px ${accentColor}25`
                  : '0 0 0 transparent',
                transition: 'box-shadow 0.2s, border 0.2s',
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{item.emoji}</span>
              <span style={{
                fontSize: size >= 100 ? 12 : 11,
                fontWeight: isSelected ? 700 : 600,
                color: isSelected ? 'white' : 'rgba(255,255,255,0.65)',
                lineHeight: 1.15,
                textAlign: 'center',
                maxWidth: size - 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 3,
              }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
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

// Flat list of all interest items for the single-screen view
const ALL_INTEREST_ITEMS = INTEREST_DATA.flatMap(cat => cat.items);

export function BubblePickerInterests({
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

      {/* All bubbles — horizontal scroll */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        padding: '8px 0',
        position: 'relative',
        zIndex: 10,
      }}>
        <ClusteredBubbles
          items={ALL_INTEREST_ITEMS}
          selected={selected}
          onToggle={onToggle}
          accentColor={SELECTED_COLOR}
        />
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
        overflow: 'hidden',
        padding: '8px 0',
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
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
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
