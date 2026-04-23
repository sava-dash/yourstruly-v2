import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';

const WHY_HERE_OPTIONS = [
  { emoji: '🧠', label: "I want to reflect on my life and how I've changed" },
  { emoji: '💼', label: "I want to think through my career and what I've learned" },
  { emoji: '❤️', label: "I want to save my parents' stories before they're gone" },
  { emoji: '🔄', label: "I'm in the middle of a big change and want to process it" },
  { emoji: '🌱', label: "I want to leave something for my kids" },
  { emoji: '📖', label: "I want to document my life for the people who come after me" },
];

export interface WhyHerePanelProps {
  whyHereText: string;
  setWhyHereText: React.Dispatch<React.SetStateAction<string>>;
  whyHereSelections: Set<string>;
  setWhyHereSelections: React.Dispatch<React.SetStateAction<Set<string>>>;
  onContinue: () => void | Promise<void>;
  onBack?: () => void;
}

export function WhyHerePanel({
  whyHereText,
  setWhyHereText,
  whyHereSelections,
  setWhyHereSelections,
  onContinue,
  onBack,
}: WhyHerePanelProps) {
  return (
    <motion.div
      key="why-here-panel"
      className="globe-floating-panel globe-floating-right globe-panel-wide"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="globe-side-panel-header">
        <h3>Why are you here?</h3>
        <p>Pick whatever fits, or write your own. We&apos;ll shape prompts around it.</p>
      </div>
      <div className="globe-side-panel-items" style={{ gap: '0', padding: '8px 16px' }}>
        {WHY_HERE_OPTIONS.map(opt => {
          const isSelected = whyHereSelections.has(opt.label);
          return (
            <button
              key={opt.label}
              className={`why-here-option ${isSelected ? 'why-here-selected' : ''}`}
              onClick={() => {
                setWhyHereSelections(prev => {
                  const next = new Set(prev);
                  if (next.has(opt.label)) next.delete(opt.label);
                  else next.add(opt.label);
                  return next;
                });
              }}
            >
              <span className="why-here-emoji">{opt.emoji}</span>
              <span className="why-here-text">{opt.label}</span>
              {isSelected && <Check size={14} className="why-here-check" />}
            </button>
          );
        })}

        {/* Divider + freeform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0 8px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
          <span style={{ fontSize: '12px', color: 'rgba(45,45,45,0.4)', whiteSpace: 'nowrap' }}>or in your own words</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.08)' }} />
        </div>
        <textarea
          value={whyHereText}
          onChange={(e) => setWhyHereText(e.target.value)}
          placeholder="Anything else we should know…"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: '1.5px solid rgba(0,0,0,0.1)',
            background: 'rgba(0,0,0,0.02)',
            fontSize: '14px',
            color: '#2d2d2d',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            minHeight: '70px',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#2D5A3D'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
        />
      </div>
      <div className="globe-side-panel-footer">
        {onBack && (
          <button type="button" onClick={onBack} className="globe-back-btn" aria-label="Back">
            ‹ Back
          </button>
        )}
        <button
          className="globe-continue-btn"
          onClick={async () => {
            await onContinue();
          }}
        >
          {(whyHereText.trim() || whyHereSelections.size > 0) ? 'Continue' : 'Skip'} <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
