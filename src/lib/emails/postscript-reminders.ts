/**
 * PostScript reminder email templates.
 *
 * Five calm, plain-language reminders sent to the *sender* before their
 * scheduled postscript delivers. Brand palette: YT green headline, Inter
 * Tight body, Terra Cotta primary CTA. 560px max-width. Short sentences
 * for 50+ readers.
 *
 * Tone rule: gentle. Never "URGENT" or all-caps.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

const YT_GREEN = '#406A56';
const TERRA = '#C35F33';
const CREAM = '#F2F1E5';
const GREEN_LIGHT = '#D3E1DF';
const INK = '#2A2A26';
const MUTED = '#6B6E68';

export interface ReminderBaseData {
  senderFirstName: string;
  recipientName: string;
  postscriptId: string;
  deliveryDate?: string; // ISO YYYY-MM-DD (paid variants)
  amountDue?: number;    // dollars (unpaid variants)
  payUrl?: string;       // resume-checkout link (unpaid variants)
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

// -------------- Shared chrome --------------

function shell(innerHtml: string, subject: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        ${innerHtml}
        <tr><td style="padding:24px 8px 8px;text-align:center;font-size:12px;color:${MUTED};">
          Sent with care from <a href="${APP_URL}" style="color:${YT_GREEN};text-decoration:none;">YoursTruly</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function headline(text: string): string {
  return `<tr><td style="padding:8px 8px 20px;text-align:center;">
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:600;color:${YT_GREEN};letter-spacing:-0.5px;line-height:1.2;">
      ${escapeHtml(text)}
    </div>
  </td></tr>`;
}

function card(bodyHtml: string, ctaLabel: string, ctaUrl: string): string {
  return `<tr><td style="background:#FFFFFF;border:1px solid ${GREEN_LIGHT};border-radius:18px;padding:28px 26px;">
    ${bodyHtml}
    <div style="text-align:center;margin-top:22px;">
      <a href="${ctaUrl}" style="display:inline-block;background:${TERRA};color:#FFFFFF;padding:13px 28px;text-decoration:none;border-radius:999px;font-weight:600;font-size:16px;">
        ${escapeHtml(ctaLabel)}
      </a>
    </div>
  </td></tr>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${INK};">${text}</p>`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

function formatMoney(dollars?: number): string {
  if (dollars == null || !isFinite(dollars)) return '';
  return `$${dollars.toFixed(2)}`;
}

// -------------- Unpaid gift: 14 days --------------

export function unpaidGift14Days(data: ReminderBaseData): BuiltEmail {
  const subject = `A gentle reminder about your gift for ${data.recipientName}`;
  const url = data.payUrl || `${APP_URL}/dashboard/postscripts/${data.postscriptId}`;
  const amount = formatMoney(data.amountDue);
  const body =
    para(`Hi ${escapeHtml(data.senderFirstName || 'there')},`) +
    para(`Just a gentle reminder. Your postscript to <strong>${escapeHtml(data.recipientName)}</strong> is set to deliver in about two weeks, and the gift you attached hasn't been paid for yet${amount ? ` (${amount} due)` : ''}.`) +
    para(`If you'd still like the gift to go out with your message, you can finish checkout any time in the next two weeks.`);
  const html = shell(
    headline(`Your gift for ${data.recipientName}`) + card(body, 'Finish checkout', url),
    subject
  );
  const text = [
    `Hi ${data.senderFirstName || 'there'},`,
    ``,
    `Your postscript to ${data.recipientName} is set to deliver in about two weeks, and the gift you attached hasn't been paid for yet${amount ? ` (${amount} due)` : ''}.`,
    ``,
    `If you'd still like the gift to go out with your message, you can finish checkout any time in the next two weeks:`,
    url,
    ``,
    `— YoursTruly`,
  ].join('\n');
  return { subject, html, text };
}

// -------------- Unpaid gift: 7 days --------------

export function unpaidGift7Days(data: ReminderBaseData): BuiltEmail {
  const subject = `Last reminder — your gift for ${data.recipientName} is unpaid`;
  const url = data.payUrl || `${APP_URL}/dashboard/postscripts/${data.postscriptId}`;
  const amount = formatMoney(data.amountDue);
  const body =
    para(`Hi ${escapeHtml(data.senderFirstName || 'there')},`) +
    para(`Your postscript to <strong>${escapeHtml(data.recipientName)}</strong> delivers in seven days. The gift you attached still hasn't been paid for${amount ? ` (${amount} due)` : ''}.`) +
    para(`If the gift isn't paid by the delivery date, your message will still send, but the gift won't. You can finish checkout here:`);
  const html = shell(
    headline(`One week to go`) + card(body, 'Pay for the gift', url),
    subject
  );
  const text = [
    `Hi ${data.senderFirstName || 'there'},`,
    ``,
    `Your postscript to ${data.recipientName} delivers in seven days. The gift you attached still hasn't been paid for${amount ? ` (${amount} due)` : ''}.`,
    ``,
    `If the gift isn't paid by the delivery date, your message will still send, but the gift won't. Finish checkout:`,
    url,
    ``,
    `— YoursTruly`,
  ].join('\n');
  return { subject, html, text };
}

// -------------- Unpaid gift: day of (delivery skipped) --------------

export function unpaidGiftDayOf(data: ReminderBaseData): BuiltEmail {
  const subject = `Delivery skipped — gift for ${data.recipientName} is unpaid`;
  const url = data.payUrl || `${APP_URL}/dashboard/postscripts/${data.postscriptId}`;
  const body =
    para(`Hi ${escapeHtml(data.senderFirstName || 'there')},`) +
    para(`Today was the delivery date for your postscript to <strong>${escapeHtml(data.recipientName)}</strong>, but the gift you attached is still unpaid, so delivery is on hold.`) +
    para(`You can finish checkout and reschedule delivery, or remove the gift to send the message on its own:`);
  const html = shell(
    headline(`Delivery on hold`) + card(body, 'Fix and reschedule', url),
    subject
  );
  const text = [
    `Hi ${data.senderFirstName || 'there'},`,
    ``,
    `Today was the delivery date for your postscript to ${data.recipientName}, but the gift you attached is still unpaid, so delivery is on hold.`,
    ``,
    `Finish checkout and reschedule, or remove the gift:`,
    url,
    ``,
    `— YoursTruly`,
  ].join('\n');
  return { subject, html, text };
}

// -------------- Paid: 7 days --------------

export function paidPostscript7Days(data: ReminderBaseData): BuiltEmail {
  const subject = `Your postscript to ${data.recipientName} delivers in 7 days`;
  const url = `${APP_URL}/dashboard/postscripts/${data.postscriptId}`;
  const when = formatDate(data.deliveryDate);
  const body =
    para(`Hi ${escapeHtml(data.senderFirstName || 'there')},`) +
    para(`A quick heads-up. Your postscript to <strong>${escapeHtml(data.recipientName)}</strong> is set to deliver ${when ? `on <strong>${escapeHtml(when)}</strong>` : 'in seven days'}.`) +
    para(`Everything is in order — nothing you need to do. If you want to make a last-minute edit or preview the message, you can do that here:`);
  const html = shell(
    headline(`One week to go`) + card(body, 'View postscript', url),
    subject
  );
  const text = [
    `Hi ${data.senderFirstName || 'there'},`,
    ``,
    `Your postscript to ${data.recipientName} is set to deliver ${when ? `on ${when}` : 'in seven days'}. Everything is in order.`,
    ``,
    `Preview or edit: ${url}`,
    ``,
    `— YoursTruly`,
  ].join('\n');
  return { subject, html, text };
}

// -------------- Paid: day of --------------

export function paidPostscriptDayOf(data: ReminderBaseData): BuiltEmail {
  const subject = `Your postscript to ${data.recipientName} delivers today`;
  const url = `${APP_URL}/dashboard/postscripts/${data.postscriptId}`;
  const body =
    para(`Hi ${escapeHtml(data.senderFirstName || 'there')},`) +
    para(`Today's the day. Your postscript to <strong>${escapeHtml(data.recipientName)}</strong> will be sent shortly.`) +
    para(`You'll get a confirmation once it's been delivered. In the meantime, you can view it here:`);
  const html = shell(
    headline(`Delivering today`) + card(body, 'View postscript', url),
    subject
  );
  const text = [
    `Hi ${data.senderFirstName || 'there'},`,
    ``,
    `Today's the day. Your postscript to ${data.recipientName} will be sent shortly.`,
    ``,
    `View: ${url}`,
    ``,
    `— YoursTruly`,
  ].join('\n');
  return { subject, html, text };
}

// -------------- helpers --------------

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
