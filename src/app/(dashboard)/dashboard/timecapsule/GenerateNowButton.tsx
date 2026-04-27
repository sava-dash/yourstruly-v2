'use client';

import { useState } from 'react';

const TERRA = '#C35F33';

export default function GenerateNowButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function trigger() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/timecapsule/generate', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.skipped) {
          setMsg(data.reason || 'No content yet for the previous quarter.');
        } else if (data.emailSent) {
          setMsg('Your time capsule is on its way. Check your email shortly.');
        } else {
          setMsg('Time capsule generated. ' + (data.reason || ''));
        }
      } else {
        setMsg(data.error || 'Could not generate right now. Please try again later.');
      }
    } catch {
      setMsg('Could not generate right now. Please try again later.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={trigger}
        disabled={busy}
        style={{
          background: TERRA, color: '#fff', border: 'none', padding: '14px 22px',
          borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
          minHeight: 44, opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Working…' : 'Send me one now'}
      </button>
      {msg ? <div style={{ marginTop: 10, color: '#406A56', fontSize: 14 }}>{msg}</div> : null}
    </div>
  );
}
