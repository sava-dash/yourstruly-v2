import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Initialize Resend for email
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Twilio configuration for SMS
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

interface NotificationRequest {
  sessionId: string
  type: 'invite' | 'followup' | 'reminder'
  contactEmail?: string
  contactPhone?: string
  contactName: string
  customMessage?: string
}

/**
 * Send interview notification via email and/or SMS
 * POST /api/interviews/notify
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: NotificationRequest = await request.json()
    const { sessionId, type, contactEmail, contactPhone, contactName, customMessage } = body

    // Verify session ownership
    const { data: session } = await supabase
      .from('interview_sessions')
      .select('id, title, access_token, user_id, notification_preferences')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Build interview link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://yourstruly.love'
    const interviewLink = `${baseUrl}/interview/${session.access_token}`

    // Prepare notification content
    const subject = type === 'followup' 
      ? `New questions from ${user.email}`
      : type === 'reminder'
      ? `Reminder: Please complete your interview`
      : `You've been invited to share your story`

    const messageBody = customMessage || getDefaultMessage(type, contactName, interviewLink)

    const results: { email?: any; sms?: any } = {}

    // Send email notification
    if (contactEmail && resend && session.notification_preferences?.email !== false) {
      try {
        const emailResult = await resend.emails.send({
          from: 'YoursTruly <interviews@yourstruly.love>',
          to: contactEmail,
          subject: subject,
          html: generateEmailTemplate(subject, messageBody, interviewLink, type),
          text: `${messageBody}\n\nClick here to respond: ${interviewLink}`
        })

        results.email = { success: true, id: emailResult.data?.id }

        // Log notification
        await logNotification(supabase, {
          session_id: sessionId,
          notification_type: 'email',
          recipient_type: 'interviewee',
          recipient_contact: contactEmail,
          subject,
          message_body: messageBody,
          action_url: interviewLink,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      } catch (error) {
        console.error('Email send error:', error)
        results.email = { success: false, error: 'Failed to send email' }
        
        await logNotification(supabase, {
          session_id: sessionId,
          notification_type: 'email',
          recipient_type: 'interviewee',
          recipient_contact: contactEmail,
          subject,
          message_body: messageBody,
          action_url: interviewLink,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Send SMS notification
    if (contactPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && session.notification_preferences?.sms !== false) {
      try {
        const smsMessage = truncateMessage(`${messageBody} Click here: ${interviewLink}`, 320)
        
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
            },
            body: new URLSearchParams({
              To: contactPhone,
              From: TWILIO_PHONE_NUMBER || '',
              Body: smsMessage
            })
          }
        )

        const twilioData = await twilioResponse.json()

        if (twilioResponse.ok) {
          results.sms = { success: true, sid: twilioData.sid }
          
          await logNotification(supabase, {
            session_id: sessionId,
            notification_type: 'sms',
            recipient_type: 'interviewee',
            recipient_contact: contactPhone,
            subject: null,
            message_body: smsMessage,
            action_url: interviewLink,
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: twilioData.sid,
            provider_response: twilioData
          })
        } else {
          throw new Error(twilioData.message || 'Twilio error')
        }
      } catch (error) {
        console.error('SMS send error:', error)
        results.sms = { success: false, error: 'Failed to send SMS' }
        
        await logNotification(supabase, {
          session_id: sessionId,
          notification_type: 'sms',
          recipient_type: 'interviewee',
          recipient_contact: contactPhone,
          subject: null,
          message_body: messageBody,
          action_url: interviewLink,
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update session last notification time
    await supabase
      .from('interview_sessions')
      .update({ last_notification_sent: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}

/**
 * Log notification to database
 */
async function logNotification(
  supabase: any,
  notification: {
    session_id: string
    notification_type: string
    recipient_type: string
    recipient_contact: string
    subject: string | null
    message_body: string
    action_url: string
    status: string
    sent_at?: string
    error_message?: string
    provider_message_id?: string
    provider_response?: any
  }
) {
  await supabase.from('interview_notifications').insert(notification)
}

/**
 * Get default message based on notification type
 */
function getDefaultMessage(type: string, contactName: string, link: string): string {
  switch (type) {
    case 'followup':
      return `Hi ${contactName}! You have new questions waiting for you. We'd love to hear more of your stories.`
    case 'reminder':
      return `Hi ${contactName}! Just a friendly reminder that you have some questions waiting for your response. Take your time!`
    case 'invite':
    default:
      return `Hi ${contactName}! Someone special wants to capture your life stories and wisdom. Your memories are a gift that will be treasured for generations.`
  }
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(subject: string, message: string, link: string, type: string): string {
  const buttonText = type === 'followup' ? 'Answer New Questions' : type === 'reminder' ? 'Complete Interview' : 'Start Interview'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #F5F3EE;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #2D5A3D, #4A3552);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      font-size: 16px;
      line-height: 1.7;
      color: #444;
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2D5A3D, #2d4f3e);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .button:hover {
      background: linear-gradient(135deg, #234A31, #365949);
    }
    .footer {
      background: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #888;
    }
    .footer a {
      color: #2D5A3D;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td style="padding: 20px;">
        <div class="container">
          <div class="header">
            <h1>🎙️ YoursTruly Interview</h1>
          </div>
          <div class="content">
            <p class="message">${message}</p>
            <center>
              <a href="${link}" class="button">${buttonText}</a>
            </center>
            <p style="text-align: center; font-size: 14px; color: #888; margin-top: 30px;">
              Or copy and paste this link:<br>
              <a href="${link}" style="color: #2D5A3D; word-break: break-all;">${link}</a>
            </p>
          </div>
          <div class="footer">
            <p>Powered by <a href="https://yourstruly.love">YoursTruly</a> - Preserving family stories for generations</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * Truncate message to fit SMS limit
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength - 3) + '...'
}
