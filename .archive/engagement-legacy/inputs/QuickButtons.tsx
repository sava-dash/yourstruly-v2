'use client';

import { motion } from 'framer-motion';

interface QuickButtonsProps {
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const OPTION_EMOJIS: Record<string, string> = {
  'Yes': '✅',
  'No': '❌',
  'Not Sure': '🤔',
  'Skip': '⏭️',
  'Happy': '😊',
  'Sad': '😢',
  'Bittersweet': '🥹',
  'Both': '😊😢',
  'Spring': '🌸',
  'Summer': '☀️',
  'Fall': '🍂',
  'Autumn': '🍂',
  'Winter': '❄️',
};

export function QuickButtons({
  options,
  onSelect,
  disabled = false,
}: QuickButtonsProps) {
  return (
    <div className="quick-buttons">
      {options.map((option, index) => (
        <motion.button
          key={option}
          className="option-btn"
          onClick={() => onSelect(option)}
          disabled={disabled}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {OPTION_EMOJIS[option] && (
            <span className="emoji">{OPTION_EMOJIS[option]}</span>
          )}
          <span className="label">{option}</span>
        </motion.button>
      ))}

      <style jsx>{`
        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .option-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .option-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .option-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .emoji {
          font-size: 18px;
        }

        /* Special styling for Yes/No */
        .option-btn:has(.label:contains("Yes")) {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .option-btn:has(.label:contains("No")) {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
        }
      `}</style>
    </div>
  );
}
