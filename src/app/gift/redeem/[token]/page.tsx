/**
 * /gift/redeem/[token] — recipient lands here from the gift email.
 * Shows the gift details + a Supabase magic-link sign-in form.
 *
 * After the recipient signs in, /api/gifts/redeem (TODO) or a small client
 * effect on the dashboard would call applyGiftEntitlement. For now this page
 * surfaces the gift and walks them through magic-link sign-in via the
 * existing Supabase auth flow.
 */
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGiftTier } from '@/lib/gifts';
import RedeemMagicLinkForm from './RedeemMagicLinkForm';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface GiftRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  purchaser_name: string | null;
  tier: string;
  status: string;
  message: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
}

function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const expiryMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryMs)) return null;
  const diffDays = Math.ceil((expiryMs - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays <= 30) return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  const date = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  return `Expires ${date}`;
}

export default async function RedeemPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('gift_subscriptions')
    .select('id, recipient_email, recipient_name, purchaser_name, tier, status, message, redeemed_at, expires_at')
    .eq('redemption_token', token)
    .maybeSingle();

  const gift = data as GiftRow | null;
  if (!gift) notFound();

  const tier = getGiftTier(gift.tier);
  const alreadyRedeemed = Boolean(gift.redeemed_at);
  const expiryLabel = formatExpiry(gift.expires_at);

  return (
    <main style={{ background: CREAM, minHeight: '100vh', padding: '48px 16px' }}>
      <div
        style={{
          maxWidth: 560, margin: '0 auto', background: '#fff',
          border: `1px solid ${GREEN_LIGHT}`, borderRadius: 20, padding: 36,
        }}
      >
        <div style={{ textAlign: 'center', fontFamily: 'Caveat, cursive', color: TERRA, fontSize: 30 }}>
          A gift, just for you
        </div>
        <h1
          style={{
            fontFamily: 'Playfair Display, Georgia, serif', color: YT_GREEN,
            fontSize: 30, lineHeight: 1.2, textAlign: 'center', margin: '6px 0 6px',
          }}
        >
          {gift.purchaser_name || 'A friend'} gifted you<br />a year of YoursTruly.
        </h1>
        {tier ? <p style={{ textAlign: 'center', color: MUTED, margin: 0 }}>{tier.name}</p> : null}
        {expiryLabel && !alreadyRedeemed ? (
          <p
            style={{
              textAlign: 'center',
              color: '#666',
              fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
              fontSize: 13,
              margin: '4px 0 0',
            }}
          >
            {expiryLabel}
          </p>
        ) : null}

        {gift.message ? (
          <blockquote
            style={{
              margin: '24px 0', padding: '18px 20px', background: CREAM, borderRadius: 14,
              fontFamily: 'Caveat, cursive', fontSize: 22, color: INK, lineHeight: 1.4,
            }}
          >
            &ldquo;{gift.message}&rdquo;
          </blockquote>
        ) : null}

        {alreadyRedeemed ? (
          <p style={{ textAlign: 'center', color: MUTED, fontSize: 15 }}>
            This gift has already been claimed. Welcome back!
          </p>
        ) : (
          <RedeemMagicLinkForm
            token={token}
            defaultEmail={gift.recipient_email}
            defaultName={gift.recipient_name ?? ''}
          />
        )}
      </div>
    </main>
  );
}
