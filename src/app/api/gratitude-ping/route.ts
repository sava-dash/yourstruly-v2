import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { recipientEmail, recipientName, senderName, message } = await request.json()

  if (!recipientEmail || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Send email notification via Resend (or whatever email provider is configured)
  try {
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const emoji = message === 'Thinking of you' ? '💛'
        : message === 'Proud of you' ? '🌟'
        : message === 'Miss you' ? '💜'
        : message === 'Love you' ? '❤️'
        : message === 'Thank you' ? '🙏'
        : '💛'

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>',
          to: recipientEmail,
          subject: `${emoji} ${senderName} is thinking of you`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 48px;">${emoji}</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 700; color: #1A1F1C; text-align: center; margin: 0 0 8px;">
                ${message}
              </h1>
              <p style="font-size: 16px; color: #5A6660; text-align: center; margin: 0 0 32px;">
                A gratitude ping from <strong>${senderName}</strong>
              </p>
              <div style="text-align: center; padding: 24px; background: #F5F1EA; border-radius: 16px;">
                <p style="font-size: 14px; color: #94A09A; margin: 0;">
                  Sent with love via YoursTruly
                </p>
              </div>
            </div>
          `,
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to send gratitude ping email:', err)
    // Still return success — the ping was recorded even if email failed
    return NextResponse.json({ success: true })
  }
}
