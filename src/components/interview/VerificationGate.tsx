'use client';

/**
 * VerificationGate — optional email gate for the recipient interview page.
 *
 * Mounts at the top of `interview/[token]/page.tsx` (PR B owns that file).
 * If `verification_required` is false (or already passed), this renders
 * nothing. Otherwise it asks for the recipient's email, sends a 6-digit
 * Resend code, and confirms it.
 *
 * Example mount (for PR B):
 *
 *   const [verified, setVerified] = useState(false);
 *   <VerificationGate token={params.token} onVerified={() => setVerified(true)} />
 *   {verified && <InterviewConversation ... />}
 *
 * The gate queries /api/interviews/verify?token=...&check=1 on mount to
 * discover whether verification is required. PR B should NOT render the
 * conversation until `onVerified()` fires.
 */

import { useEffect, useState } from 'react';

interface VerificationGateProps {
  token: string;
  onVerified: () => void;
}

type Phase = 'loading' | 'email' | 'code' | 'done' | 'not-required';

const wrap: React.CSSProperties = {
  maxWidth: 480, margin: '40px auto', padding: 32,
  background: '#F2F1E5', borderRadius: 16, color: '#2d2d2d',
  fontFamily: 'Inter Tight, system-ui, sans-serif',
};
const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', fontSize: 18,
  border: '1px solid #D3E1DF', borderRadius: 10, marginBottom: 16,
  minHeight: 56, background: '#fff', color: '#2d2d2d',
};
const btn = (bg: string, busy: boolean): React.CSSProperties => ({
  width: '100%', minHeight: 56, padding: 16, background: bg, color: '#fff',
  fontSize: 18, fontWeight: 600, border: 'none', borderRadius: 10,
  cursor: 'pointer', opacity: busy ? 0.6 : 1,
});

export function VerificationGate({ token, onVerified }: VerificationGateProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/interviews/verify?token=${encodeURIComponent(token)}&check=1`);
        const data = await res.json();
        if (cancelled) return;
        if (!data.verification_required || data.verification_passed) {
          setPhase('not-required'); onVerified();
        } else { setPhase('email'); }
      } catch { if (!cancelled) setPhase('email'); }
    })();
    return () => { cancelled = true; };
  }, [token, onVerified]);

  const post = async (payload: object): Promise<any> => {
    const res = await fetch('/api/interviews/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...payload }),
    });
    return { res, data: await res.json() };
  };

  const sendCode = async () => {
    if (!email.trim()) return;
    setBusy(true); setError(null);
    try {
      const { res, data } = await post({ email: email.trim() });
      if (!res.ok || !data.ok) setError(data.error || "We couldn't send the code.");
      else setPhase('code');
    } catch { setError('Network error — please try again.'); }
    finally { setBusy(false); }
  };

  const confirmCode = async () => {
    if (!code.trim()) return;
    setBusy(true); setError(null);
    try {
      const { res, data } = await post({ code: code.trim() });
      if (!res.ok || !data.ok) setError(data.error || 'That code did not match.');
      else { setPhase('done'); onVerified(); }
    } catch { setError('Network error — please try again.'); }
    finally { setBusy(false); }
  };

  if (phase === 'loading' || phase === 'not-required' || phase === 'done') return null;

  return (
    <div style={wrap}>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#406A56', fontSize: 24, margin: '0 0 12px 0' }}>
        Quick check first
      </h2>
      <p style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
        The person who invited you asked us to confirm it's really you before you start.
      </p>

      {phase === 'email' && (
        <>
          <label style={{ display: 'block', fontSize: 15, marginBottom: 8 }}>Your email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" style={input} />
          <button onClick={sendCode} disabled={busy || !email.trim()} style={btn('#406A56', busy)}>
            {busy ? 'Sending…' : 'Send my code'}
          </button>
        </>
      )}

      {phase === 'code' && (
        <>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 12 }}>
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>
          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
            style={{ ...input, fontSize: 28, letterSpacing: 8, textAlign: 'center' }} />
          <button onClick={confirmCode} disabled={busy || code.length !== 6} style={btn('#C35F33', busy)}>
            {busy ? 'Checking…' : 'Confirm'}
          </button>
          <button onClick={() => { setPhase('email'); setCode(''); setError(null); }}
            style={{ width: '100%', marginTop: 10, padding: 12, background: 'transparent',
              color: '#406A56', fontSize: 14, border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Use a different email
          </button>
        </>
      )}

      {error && <p role="alert" style={{ color: '#C35F33', fontSize: 14, marginTop: 12 }}>{error}</p>}
    </div>
  );
}

export default VerificationGate;
