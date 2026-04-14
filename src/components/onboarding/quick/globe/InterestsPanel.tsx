import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { CURATED_INTERESTS } from '../../curated-options';

export interface InterestsPanelProps {
  selectedPills: Set<string>;
  onTogglePill: (label: string) => void;
  customInterests: { label: string; emoji: string }[];
  setCustomInterests: React.Dispatch<React.SetStateAction<{ label: string; emoji: string }[]>>;
  customInterestInput: string;
  setCustomInterestInput: React.Dispatch<React.SetStateAction<string>>;
  onContinue: () => void;
}

export function InterestsPanel({
  selectedPills,
  onTogglePill,
  customInterests,
  setCustomInterests,
  customInterestInput,
  setCustomInterestInput,
  onContinue,
}: InterestsPanelProps) {
  return (
    <motion.div
      key="interests-panel"
      className="globe-floating-panel globe-floating-right globe-panel-wide"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="globe-side-panel-header">
        <h3>Your Interests</h3>
        <p>What you care about shapes the moments ahead. Pick what you love so we can ask better questions and make your story feel true to you.</p>
      </div>
      <div className="globe-side-panel-items">
        {[...CURATED_INTERESTS, ...customInterests].map(interest => {
          const isSelected = selectedPills.has(interest.label);
          return (
            <button
              key={interest.label}
              className={`globe-pill ${isSelected ? 'selected' : ''}`}
              onClick={() => onTogglePill(interest.label)}
            >
              <span>{interest.emoji}</span>
              <span>{interest.label}</span>
              {isSelected && <Check size={14} />}
            </button>
          );
        })}
      </div>
      <div className="globe-custom-input-row">
        <input
          type="text"
          value={customInterestInput}
          onChange={(e) => setCustomInterestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customInterestInput.trim()) {
              const label = customInterestInput.trim();
              setCustomInterests(prev => [...prev, { label, emoji: '💡' }]);
              onTogglePill(label);
              setCustomInterestInput('');
            }
          }}
          placeholder="Add your own..."
          className="globe-custom-input"
        />
        <button
          className="globe-custom-add-btn"
          disabled={!customInterestInput.trim()}
          onClick={() => {
            if (customInterestInput.trim()) {
              const label = customInterestInput.trim();
              setCustomInterests(prev => [...prev, { label, emoji: '💡' }]);
              onTogglePill(label);
              setCustomInterestInput('');
            }
          }}
        >
          +
        </button>
      </div>
      <div className="globe-side-panel-footer">
        <button
          className="globe-continue-btn"
          onClick={onContinue}
        >
          {selectedPills.size > 0 ? 'Continue' : 'Skip'} <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}
