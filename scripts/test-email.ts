/**
 * Test script for Resend email integration
 * 
 * Usage: npx ts-node scripts/test-email.ts
 * Or: node --loader ts-node/esm scripts/test-email.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Import the email library
import { sendAdminNotificationEmail, getResend } from '../src/lib/email/index';

async function testEmail() {
  console.log('========================================');
  console.log('YoursTruly Email Test - Resend Integration');
  console.log('========================================\n');

  // Check environment
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@yourstruly.love';
  
  console.log('Configuration:');
  console.log(`  FROM: ${fromEmail}`);
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}\n`);

  // Verify Resend is configured
  const resend = getResend();
  if (!resend) {
    console.error('❌ FAILED: Resend client not initialized');
    console.error('   Check that RESEND_API_KEY is set in .env.local');
    process.exit(1);
  }

  console.log('✓ Resend client initialized\n');

  // Test recipient
  const testRecipient = 'chuckpatel7@gmail.com';
  
  console.log(`Sending test email to: ${testRecipient}\n`);

  try {
    const result = await sendAdminNotificationEmail({
      recipientEmail: testRecipient,
      subject: 'YoursTruly Email Test',
      content: `Hello,

This is a test email from YoursTruly V2 to confirm the Resend email integration is working correctly.

Test Details:
- Timestamp: ${new Date().toISOString()}
- From: ${fromEmail}
- Integration: Resend API

If you're seeing this, the email integration is successfully configured! 🎉

Best regards,
YoursTruly System Test`,
    });

    console.log('Result:', result);

    if (result.success) {
      console.log('\n✅ SUCCESS: Email sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Email sending failed');
      console.log(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR: Unexpected error during email send');
    console.error(error);
    process.exit(1);
  }
}

testEmail();
