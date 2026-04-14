import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { WHY_OPTIONS } from '../constants';
import { SHARED } from '../shared-styles';

// ============================================
// STEP: WHY ARE YOU HERE
// ============================================

export function WhyHereStep({
  value,
  onChange,
  onContinue,
  onBack,
  onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [freeText, setFreeText] = useState('');
  const isOptionSelected = WHY_OPTIONS.some((o) => o.text === value);

  const handleFreeText = (text: string) => {
    setFreeText(text);
    if (text.trim()) onChange(text.trim());
  };

  return (
    <div className="why-step">
      <motion.div
        className="why-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
      >
        💭
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>What brings you here?</h2>
        <p className="subtitle">
          This shapes the first question we ask you, so be as honest as you like.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="why-options">
          {WHY_OPTIONS.map((opt) => (
            <button
              key={opt.text}
              className={`why-option ${value === opt.text ? 'why-selected' : ''}`}
              onClick={() => {
                setFreeText('');
                onChange(opt.text);
              }}
            >
              <span className="why-emoji">{opt.emoji}</span>
              <span className="why-text">{opt.text}</span>
              {value === opt.text && <Check size={16} className="why-check" />}
            </button>
          ))}
        </div>

        <div className="why-or">
          <div className="why-or-line" />
          <span>or in your own words</span>
          <div className="why-or-line" />
        </div>

        <textarea
          className="why-textarea"
          value={freeText}
          onChange={(e) => handleFreeText(e.target.value)}
          placeholder="Share what's on your heart…"
          rows={3}
        />
      </motion.div>

      <div className="why-nav">
        <button className="nav-back-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} />
        </button>
        <div className="nav-right">
          <button
            className="nav-continue-btn"
            onClick={value.trim() ? onContinue : onSkip}
          >
            {value.trim() ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        ${SHARED}
        .why-step {}
        .why-icon { font-size: 40px; margin-bottom: 20px; display: block; }
        .why-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .why-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.7);
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 4px rgba(64, 106, 86, 0.05);
          position: relative;
        }
        .why-option:hover {
          border-color: #2D5A3D;
          color: #2D5A3D;
          background: rgba(64, 106, 86, 0.02);
        }
        .why-selected {
          background: rgba(64, 106, 86, 0.07);
          border-color: #2D5A3D;
          color: #2D5A3D;
          font-weight: 500;
        }
        .why-emoji { font-size: 18px; flex-shrink: 0; }
        .why-text { flex: 1; line-height: 1.4; }
        :global(.why-check) {
          color: #2D5A3D;
          flex-shrink: 0;
        }
        .why-or {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          color: rgba(45, 45, 45, 0.35);
          font-size: 12px;
        }
        .why-or-line {
          flex: 1;
          height: 1px;
          background: rgba(64, 106, 86, 0.12);
        }
        .why-textarea {
          width: 100%;
          padding: 14px 16px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.16);
          border-radius: 14px;
          color: #2d2d2d;
          font-size: 14px;
          resize: none;
          margin-bottom: 4px;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .why-textarea::placeholder { color: rgba(45, 45, 45, 0.28); }
        .why-textarea:focus {
          outline: none;
          border-color: #2D5A3D;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.09);
        }
        /* Reuse nav styles */
        .why-nav {
          position: sticky;
          bottom: 0;
          background: linear-gradient(to bottom, transparent, #FAFAF7 30%);
          padding-top: 16px;
          padding-bottom: 4px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 12px;
        }
        .nav-back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 14px;
          color: rgba(45, 45, 45, 0.55);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s, color 0.2s;
        }
        .nav-back-btn:hover { border-color: #2D5A3D; color: #2D5A3D; }
        .nav-right { flex: 1; }
        .nav-continue-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 15px 20px;
          background: #2D5A3D;
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(64, 106, 86, 0.28);
          transition: background 0.2s, transform 0.15s;
        }
        .nav-continue-btn:hover { background: #355948; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
