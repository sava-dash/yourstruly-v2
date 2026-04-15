/**
 * Gift redemption email — sent to the recipient after Stripe payment
 * confirms the gift purchase (F4).
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export interface GiftRedemptionEmailData {
  recipientName: string;
  purchaserName: string;
  message?: string | null;
  tierName: string;
  redemptionToken: string;
}

export function buildGiftRedemptionEmail(data: GiftRedemptionEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const url = `${APP_URL}/gift/redeem/${encodeURIComponent(data.redemptionToken)}`;
  const greetingName = data.recipientName?.trim() || 'friend';
  const subject = `${data.purchaserName} gifted you a year of YoursTruly`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:40px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="text-align:center;padding-bottom:18px;">
          <div style="font-family:'Caveat',cursive;font-size:34px;color:${TERRA};line-height:1;">A gift, just for you</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border:1px solid ${GREEN_LIGHT};border-radius:20px;padding:36px 30px;text-align:center;">
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:30px;color:${YT_GREEN};font-weight:600;line-height:1.2;">
            ${escapeHtml(data.purchaserName)} gifted you<br/>a year of YoursTruly.
          </div>
          <div style="font-size:14px;color:${MUTED};margin-top:8px;">${escapeHtml(data.tierName)}</div>

          ${
            data.message
              ? `<div style="margin:24px 0 8px;padding:18px 20px;background:${CREAM};border-radius:14px;font-family:'Caveat',cursive;font-size:22px;line-height:1.4;color:${INK};">
                  &ldquo;${escapeHtml(data.message)}&rdquo;
                </div>`
              : ''
          }

          <p style="font-size:16px;color:${INK};line-height:1.6;margin:24px 0 24px;">
            Hi ${escapeHtml(greetingName)} — YoursTruly is a quiet place to capture the memories,
            stories, and wisdom that matter. Click below to claim your account.
          </p>

          <a href="${url}" style="display:inline-block;background:${TERRA};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:17px;padding:16px 32px;border-radius:14px;min-width:240px;">
            Claim your gift
          </a>

          <p style="font-size:12px;color:${MUTED};margin-top:20px;line-height:1.6;">
            This link is unique to you — please don't share it.
          </p>
        </td></tr>
        <tr><td style="padding:24px 8px 0;text-align:center;font-size:12px;color:${MUTED};">
          With love from <a href="${APP_URL}" style="color:${YT_GREEN};text-decoration:none;">YoursTruly</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${data.purchaserName} gifted you a year of YoursTruly (${data.tierName}).\n\n${data.message ? `"${data.message}"\n\n` : ''}Hi ${greetingName} — claim your gift here:\n${url}\n`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}
