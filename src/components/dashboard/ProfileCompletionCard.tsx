'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const DISMISS_KEY = 'yt_profile_completion_dismissed';

// Fields the engagement engine reads. Missing ones produce weaker prompts.
const FIELDS = [
  { key: 'birth_date',     label: 'Your birthday',         why: 'lets us reference your age' },
  { key: 'hometown',       label: 'Your hometown',         why: 'lets prompts pull from where you grew up' },
  { key: 'why_here',       label: 'Why you\'re here',      why: 'shapes your reflection prompts' },
  { key: 'favorite_quote', label: 'A quote you love',      why: 'a line you\'d actually say' },
  { key: 'personal_motto', label: 'Your personal motto',   why: 'tone for how your story reads' },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

export function ProfileCompletionCard({ userId }: { userId: string }) {
  const [missing, setMissing] = useState<FieldKey[] | null>(null);
  // Read the dismissed flag synchronously — keeps the effect pure.
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISMISS_KEY + ':' + userId) === '1';
  });

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(FIELDS.map(f => f.key).join(','))
        .eq('id', userId)
        .single();
      if (cancelled) return;
      if (error || !data) { setMissing([]); return; }
      const row = data as unknown as Record<string, unknown>;
      const gaps = FIELDS
        .filter(f => {
          const v = row[f.key];
          if (v == null) return true;
          if (typeof v === 'string' && v.trim() === '') return true;
          return false;
        })
        .map(f => f.key);
      setMissing(gaps);
    })();
    return () => { cancelled = true; };
  }, [userId, dismissed]);

  if (dismissed || !missing || missing.length === 0) return null;

  const top = FIELDS.filter(f => missing.includes(f.key)).slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="profile-completion-card"
      >
        <div className="pcc-head">
          <div className="pcc-title">
            <Sparkles size={16} />
            <span>A few more details</span>
          </div>
          <button
            className="pcc-dismiss"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY + ':' + userId, '1');
              setDismissed(true);
            }}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <p className="pcc-sub">
          A few more details and your prompts will work better.
        </p>
        <ul className="pcc-list">
          {top.map(f => (
            <li key={f.key} className="pcc-item">
              <span className="pcc-label">{f.label}</span>
              <span className="pcc-why">— {f.why}</span>
            </li>
          ))}
        </ul>
        <Link href="/dashboard/profile" className="pcc-cta">
          Add them <ChevronRight size={14} />
        </Link>

        <style jsx>{`
          .profile-completion-card {
            margin: 12px 24px 0;
            padding: 14px 16px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(64,106,86,0.08), rgba(217,198,26,0.08));
            border: 1px solid rgba(64,106,86,0.18);
            position: relative;
          }
          .pcc-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .pcc-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 700;
            color: #2D5A3D;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .pcc-dismiss {
            background: transparent;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: rgba(0,0,0,0.35);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pcc-dismiss:hover { color: rgba(0,0,0,0.7); background: rgba(0,0,0,0.05); }
          .pcc-sub {
            margin: 0 0 8px;
            font-size: 13px;
            color: rgba(26,31,28,0.7);
          }
          .pcc-list {
            list-style: none;
            padding: 0;
            margin: 0 0 10px;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .pcc-item { font-size: 13px; color: rgba(26,31,28,0.85); }
          .pcc-label { font-weight: 600; }
          .pcc-why { color: rgba(26,31,28,0.55); margin-left: 4px; }
          .pcc-cta {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 8px 14px;
            border-radius: 10px;
            background: #2D5A3D;
            color: white;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
          }
          .pcc-cta:hover { background: #355948; }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
