/**
 * Monthly Recap Email Template
 * 
 * Generates a personalized HTML email showing user activity
 * for the previous month (memories, photos, voices, wisdom, tags).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

export interface MonthlyRecapData {
  userName: string;
  monthName: string;
  memoriesCount: number;
  photosCount: number;
  voicesCount: number;
  wisdomCount: number;
  tagsCount: number;
  totalItems: number;
  highlights: string[];
}

function statBox(label: string, value: number, emoji: string): string {
  return `
    <td style="width: 33%; text-align: center; padding: 12px 8px;">
      <div style="background: #f0faf4; border-radius: 10px; padding: 16px 8px;">
        <div style="font-size: 28px; margin-bottom: 4px;">${emoji}</div>
        <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${value}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${label}</div>
      </div>
    </td>
  `;
}

export function buildMonthlyRecapEmail(data: MonthlyRecapData): {
  subject: string;
  html: string;
  text: string;
} {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const highlightItems = data.highlights
    .map(h => `<li style="margin-bottom: 8px; color: #334155;">${h}</li>`)
    .join('');

  const highlightItemsText = data.highlights
    .map(h => `  • ${h}`)
    .join('\n');

  const subject = `Your ${data.monthName} Recap 📊`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
    <div style="background-color: #ffffff; margin: 0 auto; max-width: 600px;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #406A56 0%, #5a8a6a 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 0 0 0 0;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 300;">
          Your ${data.monthName} Recap 📊
        </h1>
        <p style="margin: 0; font-size: 15px; opacity: 0.9;">
          Here's what you preserved this month, ${data.userName}
        </p>
      </div>

      <div style="padding: 30px;">
        <!-- Stats Grid -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            ${statBox('Memories', data.memoriesCount, '📝')}
            ${statBox('Photos', data.photosCount, '📸')}
            ${statBox('Voices', data.voicesCount, '🎙️')}
          </tr>
          <tr>
            ${statBox('Wisdom', data.wisdomCount, '💡')}
            ${statBox('People Tagged', data.tagsCount, '👤')}
            <td style="width: 33%;"></td>
          </tr>
        </table>

        <!-- Highlights -->
        ${data.highlights.length > 0 ? `
        <div style="background: #fefce8; border: 1px solid #fde68a; padding: 20px 24px; border-radius: 10px; margin-bottom: 28px;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">✨ Highlights</h3>
          <ul style="margin: 0; padding-left: 18px; list-style: disc;">
            ${highlightItems}
          </ul>
        </div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #406A56; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Your Dashboard
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 0;">
          Keep preserving your legacy — every memory matters. 💚
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          You're receiving this because you have an active account on
          <a href="${APP_URL}" style="color: #406A56; text-decoration: none;">YoursTruly</a>.<br>
          Preserve your legacy for generations to come.
        </p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const text = `
Your ${data.monthName} Recap 📊

Hi ${data.userName}, here's what you preserved this month:

  📝 Memories: ${data.memoriesCount}
  📸 Photos: ${data.photosCount}
  🎙️ Voices: ${data.voicesCount}
  💡 Wisdom: ${data.wisdomCount}
  👤 People Tagged: ${data.tagsCount}

Highlights:
${highlightItemsText}

View your dashboard: ${dashboardUrl}

Keep preserving your legacy — every memory matters. 💚

---
YoursTruly - Preserve your legacy for generations to come.
${APP_URL}
  `.trim();

  return { subject, html, text };
}
