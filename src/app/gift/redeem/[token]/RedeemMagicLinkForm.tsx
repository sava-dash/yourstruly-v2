'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TERRA = '#C35F33';
const YT_GREEN = '#406A56';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

interface Props {
  token: string;
  defaultEmail: string;
  defaultName: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: 12,
  border: `1px solid ${GREEN_LIGHT}`, fontSize: 16, color: INK, background: '#fff',
  minHeight: 48,
};

export default function RedeemMagicLinkForm({ token, defaultEmail, defaultName }: Props) {
  const supabase = createClient();
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const redirectTo =
        `${window.location.origin}/auth/callback?next=` +
        encodeURIComponent(`/dashboard?gift=${token}`);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: name, gift_token: token },
        },
      });
      if (error) {
        setErr(error.message);
      } else {
        setSent(true);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: 12 }}>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', color: YT_GREEN, fontSize: 22, margin: '0 0 8px' }}>
          Check your inbox.
        </p>
        <p style={{ color: MUTED, fontSize: 15, margin: 0 }}>
          We sent a sign-in link to <strong>{email}</strong>. Click it to claim your gift.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 14, color: YT_GREEN, fontWeight: 600 }}>Your email</span>
        <input
          required type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} style={inputStyle}
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
        {busy ? 'Sending…' : 'Claim my gift'}
      </button>
    </form>
  );
}
