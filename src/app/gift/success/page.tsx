/**
 * /gift/success — friendly confirmation after Stripe checkout completes.
 * The webhook does the actual gift creation; this page just reassures.
 */
import Link from 'next/link';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const MUTED = '#6B6E68';

export const metadata = { title: 'Thank you — YoursTruly' };

export default function GiftSuccessPage() {
  return (
    <main style={{ background: CREAM, minHeight: '100vh', padding: '64px 16px' }}>
      <div
        style={{
          maxWidth: 560, margin: '0 auto', background: '#fff',
          border: `1px solid ${GREEN_LIGHT}`, borderRadius: 20, padding: 36, textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'Caveat, cursive', color: TERRA, fontSize: 34 }}>thank you</div>
        <h1
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            color: YT_GREEN, fontSize: 32, margin: '8px 0 16px',
          }}
        >
          Your gift is on its way.
        </h1>
        <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6 }}>
          We&rsquo;ll email the recipient shortly with a personal note from you and a link to claim their account.
        </p>
        <Link
          href="/gift"
          style={{
            display: 'inline-block', marginTop: 24, background: TERRA, color: '#fff',
            padding: '14px 22px', borderRadius: 12, textDecoration: 'none', fontWeight: 600,
            minHeight: 44,
          }}
        >
          Send another gift
        </Link>
      </div>
    </main>
  );
}
