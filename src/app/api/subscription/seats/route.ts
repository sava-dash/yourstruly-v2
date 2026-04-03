import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * GET /api/subscription/seats
 * List all seats for the user's subscription
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's subscription
    const { data: subscription } = await adminClient
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ 
        seats: [], 
        subscription: null,
        pricing: []
      })
    }

    // Get all seats (including removed for history)
    const { data: seats } = await adminClient
      .from('subscription_seats')
      .select('*')
      .eq('subscription_id', subscription.id)
      .in('status', ['active', 'pending'])
      .order('seat_number')

    // Get seat pricing tiers
    const { data: pricing } = await adminClient
      .from('seat_pricing')
      .select('*')
      .order('min_seat')

    // Fetch user details for active seats
    const seatsWithUsers = await Promise.all(
      (seats || []).map(async (seat) => {
        if (seat.user_id) {
          const { data: profile } = await adminClient
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', seat.user_id)
            .single()
          
          return { ...seat, user: profile }
        }
        return seat
      })
    )

    // Get owner info (seat 1 is always the owner)
    const { data: ownerProfile } = await adminClient
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', user.id)
      .single()

    // Build complete seat list
    // Seat 1 is always the owner (implicit, not stored in seats table)
    const ownerSeat = {
      id: 'owner',
      subscription_id: subscription.id,
      seat_number: 1,
      user_id: user.id,
      email: user.email,
      status: 'active',
      accepted_at: subscription.created_at,
      user: ownerProfile
    }

    return NextResponse.json({
      seats: [ownerSeat, ...seatsWithUsers],
      subscription,
      pricing: pricing || [],
      maxSeats: 10
    })
  } catch (err) {
    console.error('Get seats error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/subscription/seats
 * Invite a new member to a seat
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get user's subscription
    const { data: subscription } = await adminClient
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(name)')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    if (subscription.plan?.name !== 'premium') {
      return NextResponse.json({ error: 'Seats require Premium plan' }, { status: 403 })
    }

    // Check current seat count
    const { data: currentSeats } = await adminClient
      .from('subscription_seats')
      .select('*')
      .eq('subscription_id', subscription.id)
      .in('status', ['active', 'pending'])

    const seatCount = (currentSeats?.length || 0) + 1 // +1 for owner
    if (seatCount >= 10) {
      return NextResponse.json({ error: 'Maximum 10 seats allowed' }, { status: 400 })
    }

    // Check if email already invited or is owner
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
    }

    const existingInvite = currentSeats?.find(s => s.email?.toLowerCase() === email.toLowerCase())
    if (existingInvite) {
      return NextResponse.json({ error: 'Email already invited' }, { status: 400 })
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const nextSeatNumber = seatCount + 1

    // Create seat
    const { data: seat, error } = await adminClient
      .from('subscription_seats')
      .insert({
        subscription_id: subscription.id,
        seat_number: nextSeatNumber,
        email: email.toLowerCase(),
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Seat insert error:', error)
      return NextResponse.json({ error: 'Failed to create seat' }, { status: 500 })
    }

    // Get inviter's profile for email
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || user.email?.split('@')[0] || 'Someone'

    // Send invite email
    if (resend) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourstruly.love'
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`

      try {
        await resend.emails.send({
          from: 'YoursTruly <invites@yourstruly.love>',
          to: email,
          subject: `${inviterName} invited you to YoursTruly`,
          html: generateInviteEmailTemplate(inviterName, inviteUrl),
          text: `${inviterName} has invited you to join their YoursTruly family subscription!\n\nAccept your invitation here: ${inviteUrl}`
        })
      } catch (emailErr) {
        console.error('Failed to send invite email:', emailErr)
        // Don't fail the request if email fails - seat is still created
      }
    }

    return NextResponse.json({ 
      success: true, 
      seat,
      message: 'Invite sent successfully'
    })
  } catch (err) {
    console.error('Invite seat error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/subscription/seats
 * Remove a member from a seat
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seatId = searchParams.get('seatId')

    if (!seatId) {
      return NextResponse.json({ error: 'Seat ID is required' }, { status: 400 })
    }

    // Get the seat and verify ownership
    const { data: seat } = await adminClient
      .from('subscription_seats')
      .select(`
        *,
        subscription:user_subscriptions(user_id)
      `)
      .eq('id', seatId)
      .single()

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 })
    }

    // Verify user owns the subscription
    if (seat.subscription?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Can't remove seat 1 (owner)
    if (seat.seat_number === 1) {
      return NextResponse.json({ error: 'Cannot remove owner seat' }, { status: 400 })
    }

    // Mark seat as removed
    const { error } = await adminClient
      .from('subscription_seats')
      .update({ 
        status: 'removed',
        user_id: null 
      })
      .eq('id', seatId)

    if (error) {
      console.error('Remove seat error:', error)
      return NextResponse.json({ error: 'Failed to remove seat' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove seat error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * PUT /api/subscription/seats
 * Resend invite email
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seatId } = await request.json()

    if (!seatId) {
      return NextResponse.json({ error: 'Seat ID is required' }, { status: 400 })
    }

    // Get the seat and verify ownership
    const { data: seat } = await adminClient
      .from('subscription_seats')
      .select(`
        *,
        subscription:user_subscriptions(user_id)
      `)
      .eq('id', seatId)
      .single()

    if (!seat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 })
    }

    if (seat.subscription?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (seat.status !== 'pending') {
      return NextResponse.json({ error: 'Can only resend pending invites' }, { status: 400 })
    }

    // Generate new token and update
    const newToken = crypto.randomBytes(32).toString('hex')
    
    await adminClient
      .from('subscription_seats')
      .update({ 
        invite_token: newToken,
        invite_sent_at: new Date().toISOString()
      })
      .eq('id', seatId)

    // Get inviter's profile
    const { data: inviterProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || user.email?.split('@')[0] || 'Someone'

    // Resend email
    if (resend && seat.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yourstruly.love'
      const inviteUrl = `${baseUrl}/invite/${newToken}`

      try {
        await resend.emails.send({
          from: 'YoursTruly <invites@yourstruly.love>',
          to: seat.email,
          subject: `Reminder: ${inviterName} invited you to YoursTruly`,
          html: generateInviteEmailTemplate(inviterName, inviteUrl),
          text: `${inviterName} has invited you to join their YoursTruly family subscription!\n\nAccept your invitation here: ${inviteUrl}`
        })
      } catch (emailErr) {
        console.error('Failed to resend invite email:', emailErr)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invite resent successfully'
    })
  } catch (err) {
    console.error('Resend invite error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * Generate HTML email template for invites
 */
function generateInviteEmailTemplate(inviterName: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to YoursTruly</title>
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
    .benefits {
      background: #F5F3EE;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .benefits h3 {
      margin: 0 0 12px 0;
      color: #2d2d2d;
      font-size: 16px;
    }
    .benefits ul {
      margin: 0;
      padding-left: 20px;
      color: #555;
    }
    .benefits li {
      margin: 8px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #2D5A3D, #2d4f3e);
      color: white !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
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
            <h1>💚 You're Invited!</h1>
          </div>
          <div class="content">
            <p class="message">
              <strong>${inviterName}</strong> has invited you to join their YoursTruly family subscription!
            </p>
            
            <div class="benefits">
              <h3>As a member, you'll get access to:</h3>
              <ul>
                <li>🤖 AI Chat with family digital essences</li>
                <li>🎙️ Create and share video memories</li>
                <li>💬 Send interview questions to loved ones</li>
                <li>📦 20% off all marketplace items</li>
                <li>💾 100GB cloud storage</li>
              </ul>
            </div>

            <center>
              <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </center>
            
            <p style="text-align: center; font-size: 14px; color: #888; margin-top: 30px;">
              Or copy and paste this link:<br>
              <a href="${inviteUrl}" style="color: #2D5A3D; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
          <div class="footer">
            <p>Powered by <a href="https://yourstruly.love">YoursTruly</a> - Preserving family stories for generations</p>
            <p style="margin-top: 10px; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}
