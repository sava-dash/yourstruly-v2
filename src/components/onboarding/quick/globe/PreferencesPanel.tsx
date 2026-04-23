'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Shield, Clock } from 'lucide-react';

const SENSITIVE_TOPICS = [
  { key: 'loss',     label: 'Loss of loved ones' },
  { key: 'divorce',  label: 'Divorce / breakups' },
  { key: 'trauma',   label: 'Traumatic events' },
  { key: 'religion', label: 'Religion / faith' },
  { key: 'politics', label: 'Politics' },
  { key: 'health',   label: 'Serious illness' },
  { key: 'money',    label: 'Financial hardship' },
] as const;

const CADENCES = [
  { key: 'daily',      label: 'Daily',             hint: 'One prompt per day' },
  { key: 'few_weekly', label: 'A few times a week', hint: '3–4 per week' },
  { key: 'weekly',     label: 'Weekly',            hint: 'One every 7 days' },
  { key: 'user_paced', label: 'Let me decide',     hint: 'No scheduled prompts' },
] as const;

interface PreferencesPanelProps {
  sensitiveOptouts: Set<string>;
  setSensitiveOptouts: React.Dispatch<React.SetStateAction<Set<string>>>;
  promptCadence: string | null;
  setPromptCadence: (v: string) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export function PreferencesPanel({
  sensitiveOptouts,
  setSensitiveOptouts,
  promptCadence,
  setPromptCadence,
  onContinue,
  onBack,
}: PreferencesPanelProps) {
  const toggleTopic = (key: string) => {
    setSensitiveOptouts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <motion.div
      key="preferences-panel"
      className="globe-floating-panel globe-floating-right globe-panel-wide"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <div className="globe-side-panel-header">
        <h3>How we reach out</h3>
        <p>Two quick choices. You can change both later.</p>
      </div>

      <div className="globe-side-panel-items" style={{ overflowY: 'auto', padding: '8px 16px' }}>
        <div className="pref-section">
          <div className="pref-section-title"><Clock size={14} /> Prompt cadence</div>
          <div className="pref-cadence-grid">
            {CADENCES.map(c => (
              <button
                key={c.key}
                className={`pref-cadence-btn ${promptCadence === c.key ? 'pref-cadence-active' : ''}`}
                onClick={() => setPromptCadence(c.key)}
                type="button"
              >
                <span className="pref-cadence-label">{c.label}</span>
                <span className="pref-cadence-hint">{c.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pref-section">
          <div className="pref-section-title"><Shield size={14} /> Topics to avoid <span className="pref-optional">(optional)</span></div>
          <p className="pref-help">
            Anything you check here, we won&apos;t bring up.
          </p>
          <div className="pref-topics">
            {SENSITIVE_TOPICS.map(t => (
              <label key={t.key} className={`pref-topic ${sensitiveOptouts.has(t.key) ? 'pref-topic-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={sensitiveOptouts.has(t.key)}
                  onChange={() => toggleTopic(t.key)}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="globe-side-panel-footer">
        {onBack && (
          <button type="button" onClick={onBack} className="globe-back-btn" aria-label="Back">
            ‹ Back
          </button>
        )}
        <button
          className="globe-continue-btn"
          disabled={!promptCadence}
          style={{ opacity: promptCadence ? 1 : 0.5 }}
          onClick={onContinue}
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>

      <style jsx>{`
        .pref-section { padding: 14px 4px 10px; }
        .pref-section + .pref-section { border-top: 1px solid rgba(0,0,0,0.06); margin-top: 4px; }
        .pref-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #2D5A3D;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin-bottom: 8px;
        }
        .pref-optional {
          text-transform: none;
          font-weight: 500;
          color: rgba(0,0,0,0.4);
          letter-spacing: 0;
        }
        .pref-help { margin: 0 0 10px; font-size: 13px; color: rgba(0,0,0,0.55); }
        .pref-cadence-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .pref-cadence-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1.5px solid rgba(0,0,0,0.12);
          background: white;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }
        .pref-cadence-btn:hover { border-color: #2D5A3D; }
        .pref-cadence-active {
          border-color: #2D5A3D;
          background: rgba(64,106,86,0.08);
          box-shadow: 0 0 0 3px rgba(64,106,86,0.1);
        }
        .pref-cadence-label { font-size: 14px; font-weight: 600; color: #2d2d2d; }
        .pref-cadence-hint { font-size: 12px; color: rgba(0,0,0,0.5); margin-top: 2px; }
        .pref-topics {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pref-topic {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: white;
          font-size: 13px;
          color: #2d2d2d;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pref-topic input { cursor: pointer; accent-color: #2D5A3D; }
        .pref-topic-active {
          border-color: #2D5A3D;
          background: rgba(64,106,86,0.08);
          color: #2D5A3D;
        }
      `}</style>
    </motion.div>
  );
}
