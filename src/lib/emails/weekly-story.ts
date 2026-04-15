/**
 * Weekly Story Sunday email template (F1). 560px wide, brand palette,
 * single hero card with a Terra Cotta CTA + quiet running totals beneath.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export interface WeeklyStoryEmailData {
  firstName: string;
  promptId: string;
  promptTitle: string;
  promptHint?: string;
  contactName?: string | null;
  contactPhotoUrl?: string | null;
  memoriesCount: number;
  lovedOnesCount: number;
  unsubscribeUrl: string;
}

export function buildWeeklyStoryEmail(data: WeeklyStoryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const cta = `${APP_URL}/dashboard?prompt=${encodeURIComponent(data.promptId)}`;
  const greetingName = data.firstName?.trim() || 'friend';
  const subject = `A 2-minute story for you, ${greetingName}`;

  const photoBlock = data.contactPhotoUrl
    ? `<img src="${data.contactPhotoUrl}" width="72" height="72" alt="" style="border-radius:50%;display:block;margin:0 auto 12px;object-fit:cover;border:2px solid ${GREEN_LIGHT};" />`
    : '';

  const aboutLine = data.contactName
    ? `<p style="margin:0 0 18px;font-size:14px;color:${MUTED};font-style:italic;">A memory about ${escapeHtml(data.contactName)}</p>`
    : '';

  const totalLine = `${data.memoriesCount} ${plural(data.memoriesCount, 'memory', 'memories')} captured · ${data.lovedOnesCount} loved ${plural(data.lovedOnesCount, 'one', 'ones')} included.`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:8px 8px 24px;text-align:center;">
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:600;color:${YT_GREEN};letter-spacing:-0.5px;line-height:1.1;">
            Good Sunday, ${escapeHtml(greetingName)}.
          </div>
          <div style="margin-top:8px;font-size:15px;color:${MUTED};">One quiet story to capture this week.</div>
        </td></tr>

        <tr><td style="background:#FFFFFF;border:1px solid ${GREEN_LIGHT};border-radius:18px;padding:32px 28px;">
          ${photoBlock}
          ${aboutLine}
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:600;color:${INK};line-height:1.35;margin:0 0 14px;">
            ${escapeHtml(data.promptTitle)}
          </div>
          ${data.promptHint ? `<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:${MUTED};">${escapeHtml(data.promptHint)}</p>` : ''}
          <div style="text-align:center;margin:8px 0 4px;">
            <a href="${cta}" style="display:inline-block;background:${TERRA};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:17px;padding:16px 30px;border-radius:14px;min-width:220px;">
              Capture this in 2 minutes
            </a>
          </div>
          <p style="text-align:center;margin:14px 0 0;font-size:13px;color:${MUTED};">
            Talk it, type it, or record a short voice note.
          </p>
        </td></tr>

        <tr><td style="padding:24px 8px 8px;text-align:center;">
          <div style="font-size:13px;color:${MUTED};">
            <strong style="color:${YT_GREEN};">Your story so far</strong> · ${totalLine}
          </div>
        </td></tr>

        <tr><td style="padding:24px 8px 0;text-align:center;font-size:12px;color:${MUTED};line-height:1.6;">
          You're getting this because Weekly Story is on for your account.<br/>
          <a href="${data.unsubscribeUrl}" style="color:${YT_GREEN};">Turn off Weekly Story emails</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Good Sunday, ${greetingName}.\n\n${data.promptTitle}\n${data.promptHint ?? ''}\n\nCapture this in 2 minutes: ${cta}\n\nYour story so far — ${totalLine}\n\nTurn off these emails: ${data.unsubscribeUrl}\n`;

  return { subject, html, text };
}

function plural(n: number, s: string, p: string): string {
  return n === 1 ? s : p;
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
