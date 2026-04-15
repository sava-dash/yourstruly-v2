import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendInvitation } from '@/lib/interviews/notify';
import { nanoid } from 'nanoid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love';

// POST /api/interviews/invite — F3: routes through the resilient notify
// helper (SMS retry x2 with 1s backoff, email fallback). All attempts are
// recorded in notification_log.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      message,
      sessionId,
      createNewSession,
      questions,
      cadence, // F5: optional 'once' | 'monthly' | 'quarterly' | 'annual'
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });
    }

    let accessToken: string;
    let interviewSessionId: string;

    if (sessionId) {
      const { data: session, error } = await supabase
        .from('interview_sessions')
        .select('id, access_token')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();
      if (error || !session) {
        return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
      }
      accessToken = session.access_token;
      interviewSessionId = session.id;
    } else if (createNewSession !== false) {
      accessToken = nanoid(32);

      let contactId: string | null = null;
      if (phone || email) {
        let query = supabase.from('contacts').select('id').eq('user_id', user.id);
        if (phone) query = query.eq('phone', phone);
        else if (email) query = query.eq('email', email);
        const { data: existingContact } = await query.single();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              user_id: user.id,
              name,
              phone: phone || null,
              email: email || null,
              relationship: 'interview_subject',
            })
            .select('id')
            .single();
          if (!contactError && newContact) contactId = newContact.id;
        }
      }

      const allowedCadence = ['once', 'monthly', 'quarterly', 'annual'];
      const safeCadence = allowedCadence.includes(cadence) ? cadence : 'once';

      const { data: newSession, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          access_token: accessToken,
          status: 'pending',
          invitee_name: name,
          phone_number: phone || null,
          email_address: email || null,
          custom_questions: questions || null,
          cadence: safeCadence,
        })
        .select('id')
        .single();
      if (sessionError || !newSession) {
        console.error('Failed to create interview session:', sessionError);
        return NextResponse.json({ error: 'Failed to create interview session' }, { status: 500 });
      }
      interviewSessionId = newSession.id;
    } else {
      return NextResponse.json({ error: 'Must provide sessionId or allow creating new session' }, { status: 400 });
    }

    const interviewLink = `${APP_URL}/interview/${accessToken}`;

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name, display_name')
      .eq('id', user.id)
      .single();
    const senderName = senderProfile?.display_name || senderProfile?.full_name || 'Someone';

    const method: 'sms' | 'email' | 'auto' =
      phone && email ? 'auto' : phone ? 'sms' : 'email';

    const result = await sendInvitation({
      method,
      recipient: { name, phone: phone || null, email: email || null },
      link: interviewLink,
      sender: { name: senderName, userId: user.id },
      customMessage: message || null,
      type: 'interview_invite',
      targetId: interviewSessionId,
    });

    await supabase
      .from('interview_sessions')
      .update({
        invite_sent_at: new Date().toISOString(),
        invite_method: result.channel || 'failed',
      })
      .eq('id', interviewSessionId);

    return NextResponse.json({
      success: result.delivered,
      sessionId: interviewSessionId,
      interviewLink,
      channel: result.channel,
      attempts: result.attempts,
    });
  } catch (error) {
    console.error('Interview invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
