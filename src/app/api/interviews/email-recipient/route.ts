import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend } from '@/lib/email'

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourstruly.love'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Pull a short, sentence-aware preview from the recipient's longest answer.
// Caps at maxChars while preserving sentence boundaries when possible.
function pullPreviewQuote(answers: string[], maxChars = 200): string | null {
  const cleaned = answers
    .map((a) => (a || '').replace(/\s+/g, ' ').trim())
    .filter((a) => a.length > 30)
  if (cleaned.length === 0) return null
  const longest = cleaned.reduce((a, b) => (b.length > a.length ? b : a))
  if (longest.length <= maxChars) return longest
  const slice = longest.slice(0, maxChars)
  // Prefer ending at a sentence boundary if one exists in the slice.
  const lastStop = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?')
  )
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim()
  // Fall back to the last whole word.
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + '…'
}

// POST /api/interviews/email-recipient
// Body: { token: string, email: string }
// Sends the recipient a clean transcript of their answers.
export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: session, error } = await supabase
      .from('interview_sessions')
      .select(`
        id, title, status, user_id,
        contact:contacts(id, full_name),
        owner:profiles!interview_sessions_user_id_fkey(full_name, display_name),
        session_questions(id, question_text, sort_order),
        video_responses(id, session_question_id, transcript, text_response)
      `)
      .eq('access_token', token)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    if (session.status !== 'completed') {
      return NextResponse.json(
        { error: 'Interview not yet completed' },
        { status: 400 }
      )
    }

    const contact: any = Array.isArray(session.contact) ? session.contact[0] : session.contact
    const owner: any = Array.isArray(session.owner) ? session.owner[0] : session.owner

    const recipientName = (contact?.full_name || 'Friend').split(' ')[0]
    const senderName =
      (owner?.display_name || owner?.full_name || 'your loved one').split(' ')[0]

    // Build Q+A pairs
    const questions = (session.session_questions || []).slice().sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    )
    const responsesByQ = new Map<string, string>()
    for (const r of (session.video_responses || []) as any[]) {
      const txt = r.transcript || r.text_response || ''
      if (r.session_question_id) responsesByQ.set(r.session_question_id, txt)
    }

    const qaPairs = questions.map((q: any) => ({
      question: q.question_text || '',
      answer: responsesByQ.get(q.id) || '(no transcript)',
    }))

    const resend = getResend()
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    const signupUrl = `${APP_URL}/signup?ref=interview`
    const subject = `Your answers for ${senderName} — kept safe on YoursTruly`

    const previewQuote = pullPreviewQuote(qaPairs.map((p) => p.answer))
    const previewHtml = previewQuote
      ? `
      <div style="margin:0 0 24px 0; padding:18px 20px; border-left:3px solid #C35F33; background:#F2F1E5; border-radius:6px;">
        <div style="font-family: Georgia, 'Playfair Display', serif; font-style:italic; color:#2d4d3e; font-size:17px; line-height:1.55;">
          &ldquo;${escapeHtml(previewQuote)}&rdquo;
        </div>
        <div style="margin-top:8px; font-size:12px; color:#666; letter-spacing:0.04em; text-transform:uppercase;">
          From your story
        </div>
      </div>`
      : ''

    const qaHtml = qaPairs
      .map(
        (p) => `
          <div style="margin: 0 0 24px 0; padding: 16px 18px; background:#F2F1E5; border-radius:10px;">
            <div style="font-family: Georgia, 'Playfair Display', serif; color:#406A56; font-size:15px; font-weight:600; margin-bottom:8px;">
              ${escapeHtml(p.question)}
            </div>
            <div style="color:#2d2d2d; font-size:15px; line-height:1.55; white-space:pre-wrap;">
              ${escapeHtml(p.answer)}
            </div>
          </div>`
      )
      .join('')

    const heroCtaHtml = `
      <div style="margin:32px 0 24px 0; padding:28px 24px; background:#F2F1E5; border-radius:14px; text-align:center;">
        <div style="font-family: Georgia, 'Playfair Display', serif; color:#2d4d3e; font-size:22px; line-height:1.25; font-weight:600; margin-bottom:12px;">
          Want to capture your own family stories?
        </div>
        <div style="color:#2d2d2d; font-size:15px; line-height:1.55; margin-bottom:20px;">
          30 days free. Voice-first.<br>
          We turn answers into beautifully bound books.
        </div>
        <a href="${signupUrl}" style="display:inline-block; background:#C35F33; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:600; font-size:16px;">
          Begin yours
        </a>
      </div>`

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#2d2d2d; max-width:560px; margin:0 auto; padding:24px; background:#ffffff;">
  <div style="text-align:center; margin-bottom:24px;">
    <h1 style="color:#406A56; font-family: Georgia, 'Playfair Display', serif; margin:0; font-size:26px;">YoursTruly</h1>
  </div>

  <p style="font-size:17px; line-height:1.5;">Hi ${escapeHtml(recipientName)},</p>
  <p style="font-size:15px; line-height:1.6; color:#2d2d2d;">
    Here's a copy of the answers you shared for <strong>${escapeHtml(senderName)}</strong>.
    Your story is safely kept by ${escapeHtml(senderName)} on YoursTruly.
  </p>

  ${previewHtml}

  <div style="margin: 28px 0;">
    ${qaHtml}
  </div>

  ${heroCtaHtml}

  <p style="font-size:12px; color:#94a3b8; text-align:center; margin-top:24px;">
    Sent with care from YoursTruly · <a href="${APP_URL}" style="color:#406A56;">yourstruly.love</a>
  </p>

  <p style="font-size:13px; color:#666; line-height:1.6; margin-top:16px;">
    PS &mdash; ${escapeHtml(senderName)} treasures these answers. You can ask them to print a keepsake book for you too.
  </p>
</body></html>`

    const textBody = [
      `Hi ${recipientName},`,
      ``,
      `Here's a copy of the answers you shared for ${senderName}.`,
      `Your story is safely kept by ${senderName} on YoursTruly.`,
      ``,
      previewQuote ? `From your story: "${previewQuote}"` : '',
      previewQuote ? `` : '',
      ...qaPairs.flatMap((p) => [`Q: ${p.question}`, `A: ${p.answer}`, ``]),
      `---`,
      `Want to capture your own family stories?`,
      `30 days free. Voice-first. We turn answers into beautifully bound books.`,
      `Begin yours: ${signupUrl}`,
      ``,
      `PS — ${senderName} treasures these answers. You can ask them to print a keepsake book for you too.`,
    ]
      .filter((line) => line !== '')
      .join('\n')

    const { data: result, error: sendErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text: textBody,
    })

    if (sendErr) {
      console.error('email-recipient send failed:', sendErr)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, messageId: result?.id })
  } catch (err: any) {
    console.error('email-recipient exception:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
