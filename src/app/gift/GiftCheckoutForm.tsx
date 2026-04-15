'use client';

import { useState } from 'react';
import { GIFT_TIERS, type GiftTier } from '@/lib/gifts';

const TERRA = '#C35F33';
const YT_GREEN = '#406A56';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 14px', borderRadius: 12,
  border: `1px solid ${GREEN_LIGHT}`, fontSize: 16, fontFamily: 'inherit',
  background: '#fff', color: INK, minHeight: 48,
};

export default function GiftCheckoutForm() {
  const [tier, setTier] = useState<GiftTier>('yt');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/gifts/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier, recipientName, recipientEmail, purchaserName, message }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setErr(data?.error || 'Could not start checkout.');
        setBusy(false);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setErr('Network error. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Gift</span>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as GiftTier)}
          style={inputStyle}
        >
          {Object.values(GIFT_TIERS).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — ${(t.amountCents / 100).toFixed(0)}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Recipient&rsquo;s name</span>
        <input
          required
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          style={inputStyle}
          placeholder="Mom, Grandpa Joe…"
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Recipient&rsquo;s email</span>
        <input
          required
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          style={inputStyle}
          placeholder="them@email.com"
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Your name</span>
        <input
          required
          value={purchaserName}
          onChange={(e) => setPurchaserName(e.target.value)}
          style={inputStyle}
          placeholder="From"
        />
      </label>

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>A short note (optional)</span>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          style={{ ...inputStyle, minHeight: 96, resize: 'vertical', fontFamily: 'Caveat, cursive', fontSize: 22 }}
          placeholder="Write something they'll smile at…"
        />
      </label>

      {err ? <div style={{ color: '#B0331E', fontSize: 14 }}>{err}</div> : null}

      <button
        type="submit"
        disabled={busy}
        style={{
          background: TERRA, color: '#fff', border: 'none', padding: '16px 22px',
          borderRadius: 14, fontSize: 17, fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
          minHeight: 52, opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Redirecting…' : 'Continue to secure checkout'}
      </button>
      <p style={{ fontSize: 12, color: '#6B6E68', textAlign: 'center', margin: 0 }}>
        You&rsquo;ll be sent to Stripe to complete payment.
      </p>
    </form>
  );
}
