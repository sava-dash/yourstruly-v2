/**
 * Test script for Resend email integration
 * 
 * Usage: node scripts/test-email.js
 */

const { config } = require('dotenv');
const { resolve } = require('path');

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Now require Resend after env is loaded
const { Resend } = require('resend');

async function testEmail() {
  console.log('========================================');
  console.log('YoursTruly Email Test - Resend Integration');
  console.log('========================================\n');

  // Check environment
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';
  
  console.log('Configuration:');
  console.log(`  FROM: ${fromEmail}`);
  console.log(`  API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`  Key valid format: ${apiKey && apiKey.startsWith('re_') && apiKey.length > 10 ? 'YES' : 'NO'}\n`);

  if (!apiKey || apiKey === 're_XXXXX') {
    console.error('❌ FAILED: RESEND_API_KEY is not configured');
    console.error('   Please set a valid Resend API key in .env.local');
    console.error('   Get your API key from: https://resend.com/api-keys\n');
    process.exit(1);
  }

  // Initialize Resend
  const resend = new Resend(apiKey);
  console.log('✓ Resend client initialized\n');

  // Test recipient
  const testRecipient = 'chuckpatel7@gmail.com';
  
  console.log(`Sending test email to: ${testRecipient}\n`);

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testRecipient,
      subject: 'YoursTruly Email Test',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #6366f1; margin: 0;">YoursTruly</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Preserve Your Legacy</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 10px 0;">✅ Email Test Successful!</h2>
              <p style="margin: 0; font-size: 18px;">Your Resend integration is working correctly.</p>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 12px 0; color: #1e293b;">Test Details</h3>
              <ul style="margin: 0; padding-left: 20px; color: #64748b;">
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                <li><strong>From:</strong> ${fromEmail}</li>
                <li><strong>To:</strong> ${testRecipient}</li>
                <li><strong>Integration:</strong> Resend API</li>
              </ul>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              This is an automated test email from the YoursTruly V2 system.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              <a href="https://yourstruly.love" style="color: #6366f1;">YoursTruly</a> - Preserve your legacy for generations to come.
            </p>
          </body>
        </html>
      `,
      text: `YoursTruly Email Test

✅ Email Test Successful!

Your Resend integration is working correctly.

Test Details:
- Timestamp: ${new Date().toISOString()}
- From: ${fromEmail}
- To: ${testRecipient}
- Integration: Resend API

This is an automated test email from the YoursTruly V2 system.

---
YoursTruly - Preserve your legacy for generations to come.
      `.trim()
    });

    if (error) {
      console.log('\n❌ FAILED: Email sending failed');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.name || 'unknown'}`);
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Email sent successfully!');
    console.log(`   Message ID: ${data?.id}`);
    console.log(`   To: ${testRecipient}`);
    console.log(`   From: ${fromEmail}`);
    console.log(`\nThe test email has been sent to ${testRecipient}.`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR: Unexpected error during email send');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

testEmail();
