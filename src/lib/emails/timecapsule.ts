/**
 * Quarterly Time Capsule email template (F3). Pairs with
 * src/lib/digest/quarterly.ts which produces the SummaryData payload.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export interface TimeCapsuleEmailItem {
  title: string;
  excerpt?: string;
  thumbnailUrl?: string | null;
}

export interface TimeCapsuleEmailData {
  firstName: string;
  period: string; // e.g. "Q1 2026"
  capsuleId: string;
  memoriesCount: number;
  photosCount: number;
  wisdomCount: number;
  postscriptsCount: number;
  topMemories: TimeCapsuleEmailItem[];
  topPhotos: TimeCapsuleEmailItem[];
  topWisdom: TimeCapsuleEmailItem[];
}

export function buildTimeCapsuleEmail(data: TimeCapsuleEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your ${data.period} — captured on YoursTruly`;
  const viewUrl = `${APP_URL}/dashboard/timecapsule?id=${encodeURIComponent(data.capsuleId)}`;
  const greeting = data.firstName?.trim() || 'friend';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:8px 8px 28px;text-align:center;">
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:600;color:${YT_GREEN};letter-spacing:-0.5px;line-height:1.1;">
            Your ${escapeHtml(data.period)} time capsule
          </div>
          <div style="margin-top:10px;font-size:16px;color:${MUTED};">A quiet look back, ${escapeHtml(greeting)}.</div>
        </td></tr>

        <tr><td style="background:#FFFFFF;border:1px solid ${GREEN_LIGHT};border-radius:18px;padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${stat('Memories', data.memoriesCount)}
              ${stat('Photos', data.photosCount)}
              ${stat('Wisdom', data.wisdomCount)}
              ${stat('Postscripts', data.postscriptsCount)}
            </tr>
          </table>

          ${section('Memories worth remembering', data.topMemories)}
          ${section('Photos that stayed with you', data.topPhotos)}
          ${section('Wisdom you shared', data.topWisdom)}

          <div style="text-align:center;margin:24px 0 4px;">
            <a href="${viewUrl}" style="display:inline-block;background:${TERRA};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:14px;min-width:220px;">
              Open your time capsule
            </a>
          </div>
        </td></tr>

        <tr><td style="padding:24px 8px 0;text-align:center;font-size:12px;color:${MUTED};line-height:1.6;">
          Time capsules arrive each quarter. Future you will thank present you.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text =
    `Your ${data.period} time capsule\n\n` +
    `Memories: ${data.memoriesCount}\nPhotos: ${data.photosCount}\nWisdom: ${data.wisdomCount}\nPostscripts: ${data.postscriptsCount}\n\n` +
    `Open: ${viewUrl}\n`;

  return { subject, html, text };
}

function stat(label: string, value: number): string {
  return `<td style="width:25%;text-align:center;padding:12px 6px;">
    <div style="background:${CREAM};border-radius:12px;padding:14px 6px;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:${YT_GREEN};">${value}</div>
      <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${label}</div>
    </div>
  </td>`;
}

function section(title: string, items: TimeCapsuleEmailItem[]): string {
  if (!items || items.length === 0) return '';
  const rows = items
    .map(
      (it) => `<tr><td style="padding:10px 0;border-top:1px solid ${GREEN_LIGHT};">
      <div style="font-weight:600;font-size:15px;color:${INK};">${escapeHtml(it.title)}</div>
      ${it.excerpt ? `<div style="font-size:13px;color:${MUTED};margin-top:4px;line-height:1.5;">${escapeHtml(it.excerpt)}</div>` : ''}
    </td></tr>`,
    )
    .join('');
  return `<div style="margin:24px 0 8px;">
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:600;color:${YT_GREEN};margin-bottom:4px;">${escapeHtml(title)}</div>
    <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </div>`;
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
