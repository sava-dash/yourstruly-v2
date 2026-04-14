import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Shield } from 'lucide-react';
import { RELIGION_OPTIONS } from '../constants';
import { SHARED } from '../shared-styles';

// ============================================
// STEP: RELIGION
// ============================================

export function ReligionStep({
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
  const [otherText, setOtherText] = useState('');

  // Parse comma-joined string back to array for multi-select
  const selectedArr = value ? value.split(', ').filter(Boolean) : [];

  const toggleOption = (opt: string) => {
    let next: string[];
    if (opt === 'Other') {
      const hasOther = selectedArr.some(s => s === 'Other' || s.startsWith('Other:'));
      if (hasOther) {
        next = selectedArr.filter(s => s !== 'Other' && !s.startsWith('Other:'));
        setOtherText('');
      } else {
        next = [...selectedArr, 'Other'];
      }
    } else {
      if (selectedArr.includes(opt)) {
        next = selectedArr.filter(s => s !== opt);
      } else {
        next = [...selectedArr, opt];
      }
    }
    onChange(next.join(', '));
  };

  const handleOtherChange = (text: string) => {
    setOtherText(text);
    const withoutOther = selectedArr.filter(s => s !== 'Other' && !s.startsWith('Other:'));
    if (text.trim()) {
      onChange([...withoutOther, `Other: ${text.trim()}`].join(', '));
    } else {
      onChange([...withoutOther, 'Other'].join(', '));
    }
  };

  const isOtherSelected = selectedArr.some(s => s === 'Other' || s.startsWith('Other:'));
  const isOptionSelected = (opt: string) => {
    if (opt === 'Other') return isOtherSelected;
    return selectedArr.includes(opt);
  };

  return (
    <div className="step-card">
      <h2>Faith &amp; belief</h2>
      <p className="subtitle">
        This helps us personalize how we explore life&apos;s deeper moments with you. Select all that apply.
      </p>

      <div className="religion-grid">
        {RELIGION_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`religion-btn ${isOptionSelected(opt) ? 'religion-selected' : ''}`}
            onClick={() => toggleOption(opt)}
          >
            {isOptionSelected(opt) && <Check size={14} />}
            {opt}
          </button>
        ))}
      </div>

      {/* "Other" custom input */}
      {isOtherSelected && (
        <motion.div
          className="other-input-wrap"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <input
            className="other-input"
            type="text"
            value={otherText}
            onChange={(e) => handleOtherChange(e.target.value)}
            placeholder="Please describe your belief or tradition…"
            autoFocus
          />
        </motion.div>
      )}

      {/* Trust badge */}
      <div className="trust-badge">
        <Shield size={14} color="#2D5A3D" />
        <span>Your beliefs are private and never shared.</span>
      </div>

      {/* Sticky nav */}
      <div className="religion-nav">
        <div className="religion-nav-inner">
          <button className="nav-back" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <button className="nav-continue" onClick={value ? onContinue : onSkip}>
            {value ? 'Continue' : 'Skip for now'} <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        ${SHARED}
        .step-card {}
        .religion-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
        .religion-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: white;
          border: 1.5px solid rgba(64, 106, 86, 0.18);
          border-radius: 100px;
          color: rgba(45, 45, 45, 0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 4px rgba(64, 106, 86, 0.06);
        }
        .religion-btn:hover {
          border-color: #2D5A3D;
          color: #2D5A3D;
        }
        .religion-selected {
          background: rgba(64, 106, 86, 0.08);
          border-color: #2D5A3D;
          color: #2D5A3D;
          font-weight: 600;
        }
        .other-input-wrap {
          overflow: hidden;
          margin-bottom: 16px;
        }
        .other-input {
          width: 100%;
          padding: 14px 16px;
          background: white;
          border: 1.5px solid #2D5A3D;
          border-radius: 14px;
          color: #2d2d2d;
          font-size: 15px;
          box-shadow: 0 0 0 3px rgba(64, 106, 86, 0.08);
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .other-input::placeholder { color: rgba(45, 45, 45, 0.35); }
        .other-input:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(64, 106, 86, 0.12);
        }
        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(64, 106, 86, 0.05);
          border: 1px solid rgba(64, 106, 86, 0.1);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .trust-badge span {
          font-size: 12px;
          color: rgba(64, 106, 86, 0.8);
        }
        /* sticky nav */
        .religion-nav {
          position: sticky;
          bottom: 0;
          background: linear-gradient(to bottom, transparent, #FAFAF7 30%);
          padding-top: 16px;
          padding-bottom: 4px;
        }
        .religion-nav-inner {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .nav-back {
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
        .nav-back:hover { border-color: #2D5A3D; color: #2D5A3D; }
        .nav-continue {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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
        .nav-continue:hover { background: #355948; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
