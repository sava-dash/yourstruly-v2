import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Verify Telnyx webhook signature (Ed25519)
function verifyTelnyxSignature(
  signature: string | null,
  timestamp: string | null,
  payload: string,
  publicKey: string | undefined
): boolean {
  if (!signature || !timestamp || !publicKey) {
    return false;
  }

  try {
    // Telnyx signs: timestamp + '|' + payload
    const signedPayload = `${timestamp}|${payload}`;
    
    // Convert hex signature to buffer
    const signatureBuffer = Buffer.from(signature, 'hex');
    const publicKeyBuffer = Buffer.from(publicKey, 'base64');
    
    // Verify using Ed25519
    return crypto.verify(
      null, // Ed25519 doesn't use a digest algorithm
      Buffer.from(signedPayload),
      {
        key: publicKeyBuffer,
        format: 'der',
        type: 'spki',
      },
      signatureBuffer
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Telnyx webhook for delivery status updates
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
    // Verify webhook signature
    const signature = request.headers.get('telnyx-signature-ed25519');
    const timestamp = request.headers.get('telnyx-timestamp');
    const publicKey = process.env.TELNYX_PUBLIC_KEY;
    
    // In production, reject unsigned webhooks
    if (process.env.NODE_ENV === 'production' && publicKey) {
      if (!verifyTelnyxSignature(signature, timestamp, rawBody, publicKey)) {
        console.error('Invalid Telnyx webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      
      // Check timestamp to prevent replay attacks (5 minute tolerance)
      const webhookTime = parseInt(timestamp || '0', 10) * 1000;
      const now = Date.now();
      if (Math.abs(now - webhookTime) > 5 * 60 * 1000) {
        console.error('Telnyx webhook timestamp too old');
        return NextResponse.json({ error: 'Timestamp expired' }, { status: 401 });
      }
    }
    
    // Telnyx sends events in this format
    const { data } = body;
    
    if (!data) {
      return NextResponse.json({ received: true });
    }

    const eventType = data.event_type;
    const payload = data.payload;

    // Handle different event types
    switch (eventType) {
      case 'message.sent':
      case 'message.delivered':
      case 'message.failed': {
        const messageId = payload?.id;
        const status = eventType.replace('message.', '');
        
        if (messageId) {
          const supabase = await createClient();
          
          // Update SMS log with delivery status
          await supabase
            .from('sms_logs')
            .update({ 
              status,
              updated_at: new Date().toISOString(),
              delivery_details: payload,
            })
            .eq('telnyx_message_id', messageId);
        }
        break;
      }
      
      case 'message.received': {
        // Handle inbound SMS (future: could enable reply functionality)
        console.log('Inbound SMS received:', payload);
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Telnyx webhook error:', error);
    // Return 200 to prevent Telnyx from retrying
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// Telnyx may send GET requests for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
