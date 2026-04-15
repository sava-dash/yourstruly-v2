'use client';

/**
 * MemoryOfTheDayBanner — soft Cream banner that appears at the top of the
 * dashboard when the user has an unread `memory-of-the-day` notification.
 * Reads from /api/notifications/today and dismisses by POSTing back.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

interface NotificationRow {
  id: string;
  type: string;
  payload: {
    memoryId?: string;
    yearsAgo?: number;
    title?: string;
    excerpt?: string;
    thumbnailUrl?: string | null;
  };
  read_at: string | null;
  created_at: string;
}

export default function MemoryOfTheDayBanner() {
  const [notification, setNotification] = useState<NotificationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications/today', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        // Defensive: only render when the server's priority hint matches us.
        // Prevents this banner from flashing in when the latest unread is a
        // different notification type.
        if (data.priority && data.priority !== 'memory-of-the-day') {
          if (!cancelled) setNotification(null);
          return;
        }
        const list: NotificationRow[] = data.today ?? [];
        const motd = list.find((n) => n.type === 'memory-of-the-day' && !n.read_at);
        if (!cancelled) setNotification(motd ?? null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || dismissed || !notification) return null;

  const p = notification.payload || {};
  const yearsAgo = p.yearsAgo ?? 1;
  const yearLabel = yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;

  const dismiss = async () => {
    setDismissed(true);
    try {
      await fetch('/api/notifications/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: notification.id, action: 'read' }),
      });
    } catch {
      // best effort
    }
  };

  return (
    <div
      role="region"
      aria-label="Memory of the day"
      style={{
        background: CREAM,
        border: `1px solid ${GREEN_LIGHT}`,
        borderRadius: 16,
        padding: '14px 16px',
        margin: '12px 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minHeight: 88,
      }}
    >
      {p.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.thumbnailUrl}
          alt=""
          width={64}
          height={64}
          style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flex: '0 0 auto' }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            width: 64, height: 64, borderRadius: 12, flex: '0 0 auto',
            background: GREEN_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: YT_GREEN, fontSize: 28,
          }}
        >📷</div>
      )}

      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div style={{ fontSize: 13, color: YT_GREEN, fontWeight: 600, letterSpacing: 0.3 }}>
          On this day {yearLabel}…
        </div>
        <div style={{ fontSize: 16, color: INK, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.title || 'A memory worth revisiting'}
        </div>
        {p.excerpt ? (
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.excerpt}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        {p.memoryId ? (
          <Link
            href={`/dashboard/memories/${p.memoryId}`}
            onClick={dismiss}
            style={{
              background: TERRA, color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '12px 18px', borderRadius: 12, textDecoration: 'none',
              minHeight: 44, display: 'inline-flex', alignItems: 'center',
            }}
          >
            Open this memory
          </Link>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent', border: 'none', color: MUTED, cursor: 'pointer',
            fontSize: 22, lineHeight: 1, padding: 8, minWidth: 44, minHeight: 44,
          }}
        >×</button>
      </div>
    </div>
  );
}
