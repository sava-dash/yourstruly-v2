/**
 * Email Service using Resend
 * 
 * Handles transactional emails for YoursTruly:
 * - Circle invitations
 * - Death claim notifications
 * - Welcome emails
 * - PostScript delivery
 * 
 * Templates are loaded from the database (email_templates table)
 * with fallback to hardcoded templates for safety.
 */

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;
export function getResend(): Resend | null {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - email sending disabled');
      return null;
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'YoursTruly <noreply@yourstruly.love>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yourstruly.love';

// =============================================================================
// Types
// =============================================================================

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailTemplate {
  id: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  is_active: boolean;
}

interface CircleInviteEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  circleName: string;
  inviteToken: string;
}

interface DeathClaimReceivedEmailData {
  recipientEmail: string;
  claimantName: string;
  deceasedName: string;
  claimId: string;
}

interface DeathClaimStatusEmailData {
  recipientEmail: string;
  claimantName: string;
  deceasedName: string;
  status: 'approved' | 'rejected' | 'needs_more_info';
  reviewerNotes?: string;
  accessLink?: string;
}

interface AdminNotificationEmailData {
  recipientEmail: string;
  subject: string;
  content: string;
}

interface WelcomeEmailData {
  recipientEmail: string;
  userName: string;
}

interface PostscriptDeliveredEmailData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  postscriptId: string;
  deliveryReason?: string;
}

// =============================================================================
// Template Loading & Processing
// =============================================================================

/**
 * Fetch an email template from the database by slug
 */
async function getTemplateFromDB(slug: string): Promise<EmailTemplate | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, subject, html_content, text_content, is_active')
      .eq('id', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      console.warn(`[Email] Template '${slug}' not found in DB:`, error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`[Email] Error fetching template '${slug}':`, err);
    return null;
  }
}

/**
 * Replace {{variable}} placeholders in a template string
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

/**
 * Process a template - load from DB and replace variables
 * Falls back to hardcoded template if DB lookup fails
 */
async function processTemplate(
  slug: string,
  variables: Record<string, string>,
  fallback: { subject: string; html: string; text: string }
): Promise<{ subject: string; html: string; text: string }> {
  const dbTemplate = await getTemplateFromDB(slug);
  
  if (dbTemplate) {
    console.log(`[Email] Using DB template for '${slug}'`);
    return {
      subject: replaceVariables(dbTemplate.subject, variables),
      html: replaceVariables(dbTemplate.html_content, variables),
      text: dbTemplate.text_content 
        ? replaceVariables(dbTemplate.text_content, variables) 
        : replaceVariables(fallback.text, variables),
    };
  }
  
  console.log(`[Email] Using fallback template for '${slug}'`);
  return {
    subject: replaceVariables(fallback.subject, variables),
    html: replaceVariables(fallback.html, variables),
    text: replaceVariables(fallback.text, variables),
  };
}

// =============================================================================
// Fallback Email Templates (for safety)
// =============================================================================

function circleInviteFallback(data: CircleInviteEmailData): { subject: string; html: string; text: string } {
  const inviteUrl = `${APP_URL}/circles/join?token=${data.inviteToken}`;
  
  return {
    subject: `${data.inviterName} invited you to "${data.circleName}" on YoursTruly`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Circle Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D5A3D; margin: 0;">YoursTruly</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Preserve Your Legacy</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #2D5A3D 0%, #5a8a6a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">You're Invited! 🎉</h2>
            <p style="margin: 0; font-size: 18px;">
              <strong>${data.inviterName}</strong> wants you to join their circle
            </p>
          </div>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 12px 0; color: #1e293b;">Circle: "${data.circleName}"</h3>
            <p style="margin: 0; color: #64748b;">
              Circles are private groups where families and friends share memories, stories, and preserve their legacy together.
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${inviteUrl}" style="display: inline-block; background: #2D5A3D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            This invitation will expire in 7 days.<br>
            If you don't have a YoursTruly account, you'll be able to create one when you accept.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.<br>
            <a href="${APP_URL}" style="color: #2D5A3D;">YoursTruly</a> - Preserve your legacy for generations to come.
          </p>
        </body>
      </html>
    `,
    text: `
${data.inviterName} invited you to "${data.circleName}" on YoursTruly

Circles are private groups where families and friends share memories, stories, and preserve their legacy together.

Accept the invitation: ${inviteUrl}

This invitation will expire in 7 days.

If you don't have a YoursTruly account, you'll be able to create one when you accept.

---
If you didn't expect this invitation, you can safely ignore this email.
YoursTruly - Preserve your legacy for generations to come.
    `.trim()
  };
}

function deathClaimReceivedFallback(data: DeathClaimReceivedEmailData): { subject: string; html: string; text: string } {
  return {
    subject: `Death Claim Received - ${data.deceasedName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D5A3D; margin: 0;">YoursTruly</h1>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px 0; color: #92400e;">Claim Received</h2>
            <p style="margin: 0; color: #78350f;">
              We've received your death verification claim for <strong>${data.deceasedName}</strong>.
            </p>
          </div>
          
          <p>Dear ${data.claimantName},</p>
          
          <p>
            Thank you for submitting your verification claim. We understand this is a difficult time, 
            and we're here to help preserve ${data.deceasedName}'s digital legacy.
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0;">What happens next?</h3>
            <ol style="margin: 0; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 8px;">Our team will review the documentation you provided</li>
              <li style="margin-bottom: 8px;">This process typically takes 2-5 business days</li>
              <li style="margin-bottom: 8px;">We'll email you once a decision has been made</li>
              <li>If approved, you'll receive access to manage the memorial account</li>
            </ol>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Claim Reference: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${data.claimId}</code>
          </p>
          
          <p>
            If you have any questions, please reply to this email or contact our support team.
          </p>
          
          <p style="margin-top: 24px;">
            With sympathy,<br>
            <strong>The YoursTruly Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            <a href="${APP_URL}" style="color: #2D5A3D;">YoursTruly</a> - Preserve your legacy for generations to come.
          </p>
        </body>
      </html>
    `,
    text: `
Death Claim Received - ${data.deceasedName}

Dear ${data.claimantName},

Thank you for submitting your verification claim. We understand this is a difficult time, and we're here to help preserve ${data.deceasedName}'s digital legacy.

What happens next?
1. Our team will review the documentation you provided
2. This process typically takes 2-5 business days
3. We'll email you once a decision has been made
4. If approved, you'll receive access to manage the memorial account

Claim Reference: ${data.claimId}

If you have any questions, please reply to this email or contact our support team.

With sympathy,
The YoursTruly Team
    `.trim()
  };
}

function welcomeFallback(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const dashboardUrl = `${APP_URL}/dashboard`;
  
  return {
    subject: `Welcome to YoursTruly, ${data.userName}! 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D5A3D; margin: 0;">YoursTruly</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Preserve Your Legacy</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #2D5A3D 0%, #5a8a6a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">Welcome, ${data.userName}! 🎉</h2>
            <p style="margin: 0; font-size: 16px;">
              Your journey to preserve your legacy begins today.
            </p>
          </div>
          
          <p>We're thrilled to have you join YoursTruly, where your stories, memories, and wisdom will live on for generations.</p>
          
          <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; color: #1e293b;">Get Started</h3>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 8px;">📸 Upload your first memory</li>
              <li style="margin-bottom: 8px;">💡 Share a piece of wisdom</li>
              <li style="margin-bottom: 8px;">👥 Invite family to your circle</li>
              <li>🎁 Set up a PostScript for loved ones</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #2D5A3D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            Questions? Just reply to this email - we're here to help.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            <a href="${APP_URL}" style="color: #2D5A3D;">YoursTruly</a> - Preserve your legacy for generations to come.
          </p>
        </body>
      </html>
    `,
    text: `
Welcome to YoursTruly, ${data.userName}!

We're thrilled to have you join us, where your stories, memories, and wisdom will live on for generations.

Get Started:
- Upload your first memory
- Share a piece of wisdom
- Invite family to your circle
- Set up a PostScript for loved ones

Go to your dashboard: ${dashboardUrl}

Questions? Just reply to this email - we're here to help.

The YoursTruly Team
    `.trim()
  };
}

function postscriptDeliveredFallback(data: PostscriptDeliveredEmailData): { subject: string; html: string; text: string } {
  const postscriptUrl = `${APP_URL}/postscript/${data.postscriptId}`;
  
  return {
    subject: `A message from ${data.senderName} has arrived 💌`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D5A3D; margin: 0;">YoursTruly</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #B8562E 0%, #e07a4d 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0;">A Message For You 💌</h2>
            <p style="margin: 0; font-size: 16px;">
              <strong>${data.senderName}</strong> left you something special
            </p>
          </div>
          
          <p>Dear ${data.recipientName},</p>
          
          <p>
            ${data.senderName} scheduled this message to arrive today. It may contain words of wisdom, 
            cherished memories, or heartfelt wishes just for you.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${postscriptUrl}" style="display: inline-block; background: #B8562E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Open Your Message
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            This message was scheduled with love through YoursTruly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            <a href="${APP_URL}" style="color: #2D5A3D;">YoursTruly</a> - Preserve your legacy for generations to come.
          </p>
        </body>
      </html>
    `,
    text: `
A Message from ${data.senderName} Has Arrived

Dear ${data.recipientName},

${data.senderName} scheduled this message to arrive today. It may contain words of wisdom, cherished memories, or heartfelt wishes just for you.

Open your message: ${postscriptUrl}

This message was scheduled with love through YoursTruly.
    `.trim()
  };
}

function deathClaimStatusTemplate(data: DeathClaimStatusEmailData): { subject: string; html: string; text: string } {
  const statusConfig = {
    approved: {
      emoji: '✅',
      title: 'Claim Approved',
      color: '#10b981',
      bgColor: '#d1fae5',
      borderColor: '#10b981',
    },
    rejected: {
      emoji: '❌',
      title: 'Claim Not Approved',
      color: '#ef4444',
      bgColor: '#fee2e2',
      borderColor: '#ef4444',
    },
    needs_more_info: {
      emoji: '📋',
      title: 'Additional Information Needed',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      borderColor: '#f59e0b',
    },
  };

  const config = statusConfig[data.status];
  
  let bodyContent = '';
  let textBodyContent = '';
  
  if (data.status === 'approved') {
    bodyContent = `
      <p>
        Your death verification claim for <strong>${data.deceasedName}</strong> has been approved. 
        You now have access to manage their memorial account.
      </p>
      ${data.accessLink ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.accessLink}" style="display: inline-block; background: #2D5A3D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Access Memorial Account
          </a>
        </div>
      ` : ''}
      <p>
        As a memorial manager, you can:
      </p>
      <ul style="color: #475569;">
        <li>View and share ${data.deceasedName}'s memories</li>
        <li>Manage who has access to the memorial</li>
        <li>Ensure their digital legacy is preserved</li>
      </ul>
    `;
    textBodyContent = `Your death verification claim for ${data.deceasedName} has been approved. You now have access to manage their memorial account.${data.accessLink ? `\n\nAccess Memorial Account: ${data.accessLink}` : ''}`;
  } else if (data.status === 'rejected') {
    bodyContent = `
      <p>
        After careful review, we were unable to verify the death claim for <strong>${data.deceasedName}</strong>.
      </p>
      ${data.reviewerNotes ? `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Reason:</strong><br>
          ${data.reviewerNotes}
        </div>
      ` : ''}
      <p>
        If you believe this decision was made in error, please contact our support team with 
        additional documentation.
      </p>
    `;
    textBodyContent = `After careful review, we were unable to verify the death claim for ${data.deceasedName}.${data.reviewerNotes ? `\n\nReason: ${data.reviewerNotes}` : ''}\n\nIf you believe this decision was made in error, please contact our support team.`;
  } else {
    bodyContent = `
      <p>
        We need additional information to process your death verification claim for 
        <strong>${data.deceasedName}</strong>.
      </p>
      ${data.reviewerNotes ? `
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Information needed:</strong><br>
          ${data.reviewerNotes}
        </div>
      ` : ''}
      <p>
        Please reply to this email with the requested information, or log in to your account 
        to update your claim.
      </p>
    `;
    textBodyContent = `We need additional information to process your death verification claim for ${data.deceasedName}.${data.reviewerNotes ? `\n\nInformation needed: ${data.reviewerNotes}` : ''}\n\nPlease reply to this email with the requested information.`;
  }

  return {
    subject: `${config.emoji} Death Claim Update - ${data.deceasedName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2D5A3D; margin: 0;">YoursTruly</h1>
          </div>
          
          <div style="background: ${config.bgColor}; border: 1px solid ${config.borderColor}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px 0; color: ${config.color};">
              ${config.emoji} ${config.title}
            </h2>
          </div>
          
          <p>Dear ${data.claimantName},</p>
          
          ${bodyContent}
          
          <p style="margin-top: 24px;">
            With sympathy,<br>
            <strong>The YoursTruly Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            <a href="${APP_URL}" style="color: #2D5A3D;">YoursTruly</a> - Preserve your legacy for generations to come.
          </p>
        </body>
      </html>
    `,
    text: `
${config.title}

Dear ${data.claimantName},

${textBodyContent}

With sympathy,
The YoursTruly Team
    `.trim()
  };
}

// =============================================================================
// Send Functions
// =============================================================================

export async function sendCircleInviteEmail(data: CircleInviteEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const inviteUrl = `${APP_URL}/circles/join?token=${data.inviteToken}`;
    const fallback = circleInviteFallback(data);
    
    const template = await processTemplate('circle_invite', {
      inviterName: data.inviterName,
      circleName: data.circleName,
      inviteUrl,
      appUrl: APP_URL,
      recipientName: data.recipientName || 'Friend',
      recipientEmail: data.recipientEmail,
    }, fallback);
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] Circle invite failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Circle invite sent:', result?.id);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] Circle invite error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendDeathClaimReceivedEmail(data: DeathClaimReceivedEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const fallback = deathClaimReceivedFallback(data);
    
    const template = await processTemplate('death_claim_received', {
      claimantName: data.claimantName,
      deceasedName: data.deceasedName,
      claimId: data.claimId,
      appUrl: APP_URL,
    }, fallback);
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] Death claim received notification failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Death claim received notification sent:', result?.id);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] Death claim received error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendDeathClaimStatusEmail(data: DeathClaimStatusEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    // Death claim status uses hardcoded template (complex conditional logic)
    const template = deathClaimStatusTemplate(data);
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] Death claim status notification failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Death claim status notification sent:', result?.id);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] Death claim status error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const dashboardUrl = `${APP_URL}/dashboard`;
    const fallback = welcomeFallback(data);
    
    const template = await processTemplate('welcome', {
      userName: data.userName,
      userEmail: data.recipientEmail,
      dashboardUrl,
      appUrl: APP_URL,
    }, fallback);
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] Welcome email failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Welcome email sent:', result?.id);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] Welcome email error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendPostscriptDeliveredEmail(data: PostscriptDeliveredEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const postscriptUrl = `${APP_URL}/postscript/${data.postscriptId}`;
    const fallback = postscriptDeliveredFallback(data);
    
    const template = await processTemplate('postscript_delivered', {
      senderName: data.senderName,
      recipientName: data.recipientName,
      postscriptUrl,
      deliveryReason: data.deliveryReason || 'scheduled delivery',
      appUrl: APP_URL,
    }, fallback);
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (error) {
      console.error('[Email] PostScript delivery notification failed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] PostScript delivery notification sent:', result?.id);
    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] PostScript delivery error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendAdminNotificationEmail(data: AdminNotificationEmailData): Promise<EmailResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: data.subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2D5A3D; margin: 0;">YoursTruly Admin</h1>
            </div>
            <div style="white-space: pre-wrap;">${data.content}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated admin notification from YoursTruly.
            </p>
          </body>
        </html>
      `,
      text: data.content,
    });

    if (error) {
      console.error('[Email] Admin notification failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: result?.id };
  } catch (err) {
    console.error('[Email] Admin notification error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Re-export types for consumers
export type {
  CircleInviteEmailData,
  DeathClaimReceivedEmailData,
  DeathClaimStatusEmailData,
  AdminNotificationEmailData,
  WelcomeEmailData,
  PostscriptDeliveredEmailData,
  EmailResult,
};
