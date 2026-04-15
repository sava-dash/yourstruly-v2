/**
 * /gift — public Gift-a-Year landing. Three tiers, Stripe Checkout flow.
 */
import GiftCheckoutForm from './GiftCheckoutForm';
import { GIFT_TIERS } from '@/lib/gifts';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export const metadata = {
  title: 'Give a year of YoursTruly',
  description: 'Gift a year of capturing memories, stories, and wisdom.',
};

export default function GiftPage() {
  const tiers = Object.values(GIFT_TIERS);
  return (
    <main style={{ background: CREAM, minHeight: '100vh', padding: '48px 16px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'Caveat, cursive', color: TERRA, fontSize: 30 }}>For someone you love</div>
          <h1
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              color: YT_GREEN, fontSize: 48, lineHeight: 1.1, margin: '6px 0 12px',
            }}
          >
            Give a year of YoursTruly.
          </h1>
          <p style={{ color: MUTED, fontSize: 18, maxWidth: 540, margin: '0 auto', lineHeight: 1.5 }}>
            A quiet, beautiful place to capture memories, stories, and wisdom.
            One thoughtful gift they&rsquo;ll come back to all year.
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            marginBottom: 32,
          }}
        >
          {tiers.map((t) => (
            <article
              key={t.id}
              style={{
                background: '#fff', border: `1px solid ${GREEN_LIGHT}`, borderRadius: 18,
                padding: 24, display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ fontFamily: 'Playfair Display, Georgia, serif', color: YT_GREEN, fontSize: 22 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 14, color: MUTED }}>{t.tagline}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: INK, margin: '8px 0' }}>
                ${(t.amountCents / 100).toFixed(0)}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: INK, fontSize: 14, lineHeight: 1.6 }}>
                {t.features.map((f) => (
                  <li key={f} style={{ paddingLeft: 18, position: 'relative' }}>
                    <span aria-hidden style={{ position: 'absolute', left: 0, color: TERRA }}>•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section
          style={{
            background: '#fff', border: `1px solid ${GREEN_LIGHT}`, borderRadius: 18,
            padding: 28,
          }}
        >
          <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: YT_GREEN, marginTop: 0 }}>
            Send the gift
          </h2>
          <GiftCheckoutForm />
        </section>
      </div>
    </main>
  );
}
