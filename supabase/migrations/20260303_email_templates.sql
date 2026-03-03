-- Email Templates Table
-- Allows admin to customize email templates

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]', -- Available template variables like {{recipientName}}, {{inviterName}}
  category TEXT DEFAULT 'transactional' CHECK (category IN ('transactional', 'marketing', 'notification', 'system')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read templates (for email service)
CREATE POLICY "Service can read templates" ON email_templates
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage templates" ON email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Seed default templates
INSERT INTO email_templates (id, name, description, subject, html_content, text_content, variables, category) VALUES
(
  'circle_invite',
  'Circle Invitation',
  'Sent when a user invites someone to join their circle',
  '{{inviterName}} invited you to "{{circleName}}" on YoursTruly',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Circle Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #406A56; margin: 0;">YoursTruly</h1>
    <p style="color: #666; margin: 5px 0 0 0;">Preserve Your Legacy</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #406A56 0%, #5a8a6a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px 0;">You''re Invited! 🎉</h2>
    <p style="margin: 0; font-size: 18px;">
      <strong>{{inviterName}}</strong> wants you to join their circle
    </p>
  </div>
  
  <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-bottom: 30px;">
    <h3 style="margin: 0 0 12px 0; color: #1e293b;">Circle: "{{circleName}}"</h3>
    <p style="margin: 0; color: #64748b;">
      Circles are private groups where families and friends share memories, stories, and preserve their legacy together.
    </p>
  </div>
  
  <div style="text-align: center; margin-bottom: 30px;">
    <a href="{{inviteUrl}}" style="display: inline-block; background: #406A56; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Accept Invitation
    </a>
  </div>
  
  <p style="color: #64748b; font-size: 14px; text-align: center;">
    This invitation will expire in 7 days.<br>
    If you don''t have a YoursTruly account, you''ll be able to create one when you accept.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  
  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    If you didn''t expect this invitation, you can safely ignore this email.<br>
    <a href="{{appUrl}}" style="color: #406A56;">YoursTruly</a> - Preserve your legacy for generations to come.
  </p>
</body>
</html>',
  '{{inviterName}} invited you to "{{circleName}}" on YoursTruly

Circles are private groups where families and friends share memories, stories, and preserve their legacy together.

Accept the invitation: {{inviteUrl}}

This invitation will expire in 7 days.

If you don''t have a YoursTruly account, you''ll be able to create one when you accept.

---
If you didn''t expect this invitation, you can safely ignore this email.
YoursTruly - Preserve your legacy for generations to come.',
  '["inviterName", "circleName", "inviteUrl", "appUrl", "recipientName", "recipientEmail"]',
  'transactional'
),
(
  'death_claim_received',
  'Death Claim Received',
  'Confirmation sent when someone submits a death verification claim',
  'Death Claim Received - {{deceasedName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #406A56; margin: 0;">YoursTruly</h1>
  </div>
  
  <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px 0; color: #92400e;">Claim Received</h2>
    <p style="margin: 0; color: #78350f;">
      We''ve received your death verification claim for <strong>{{deceasedName}}</strong>.
    </p>
  </div>
  
  <p>Dear {{claimantName}},</p>
  
  <p>
    Thank you for submitting your verification claim. We understand this is a difficult time, 
    and we''re here to help preserve {{deceasedName}}''s digital legacy.
  </p>
  
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <h3 style="margin: 0 0 12px 0;">What happens next?</h3>
    <ol style="margin: 0; padding-left: 20px; color: #475569;">
      <li style="margin-bottom: 8px;">Our team will review the documentation you provided</li>
      <li style="margin-bottom: 8px;">This process typically takes 2-5 business days</li>
      <li style="margin-bottom: 8px;">We''ll email you once a decision has been made</li>
      <li>If approved, you''ll receive access to manage the memorial account</li>
    </ol>
  </div>
  
  <p style="color: #64748b; font-size: 14px;">
    Claim Reference: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{{claimId}}</code>
  </p>
  
  <p>
    If you have any questions, please reply to this email or contact our support team.
  </p>
  
  <p style="margin-top: 24px;">
    With sympathy,<br>
    <strong>The YoursTruly Team</strong>
  </p>
</body>
</html>',
  'Death Claim Received - {{deceasedName}}

Dear {{claimantName}},

Thank you for submitting your verification claim. We understand this is a difficult time, and we''re here to help preserve {{deceasedName}}''s digital legacy.

What happens next?
1. Our team will review the documentation you provided
2. This process typically takes 2-5 business days
3. We''ll email you once a decision has been made
4. If approved, you''ll receive access to manage the memorial account

Claim Reference: {{claimId}}

If you have any questions, please reply to this email or contact our support team.

With sympathy,
The YoursTruly Team',
  '["claimantName", "deceasedName", "claimId", "appUrl"]',
  'transactional'
),
(
  'welcome',
  'Welcome Email',
  'Sent to new users after sign up',
  'Welcome to YoursTruly, {{userName}}! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #406A56; margin: 0;">YoursTruly</h1>
    <p style="color: #666; margin: 5px 0 0 0;">Preserve Your Legacy</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #406A56 0%, #5a8a6a 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px 0;">Welcome, {{userName}}! 🎉</h2>
    <p style="margin: 0; font-size: 16px;">
      Your journey to preserve your legacy begins today.
    </p>
  </div>
  
  <p>We''re thrilled to have you join YoursTruly, where your stories, memories, and wisdom will live on for generations.</p>
  
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
    <a href="{{dashboardUrl}}" style="display: inline-block; background: #406A56; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Go to Dashboard
    </a>
  </div>
  
  <p style="color: #64748b; font-size: 14px; text-align: center;">
    Questions? Just reply to this email - we''re here to help.
  </p>
</body>
</html>',
  'Welcome to YoursTruly, {{userName}}!

We''re thrilled to have you join us, where your stories, memories, and wisdom will live on for generations.

Get Started:
- Upload your first memory
- Share a piece of wisdom
- Invite family to your circle
- Set up a PostScript for loved ones

Go to your dashboard: {{dashboardUrl}}

Questions? Just reply to this email - we''re here to help.

The YoursTruly Team',
  '["userName", "userEmail", "dashboardUrl", "appUrl"]',
  'transactional'
),
(
  'postscript_delivered',
  'PostScript Delivered',
  'Notification when a scheduled PostScript is delivered',
  'A message from {{senderName}} has arrived 💌',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #406A56; margin: 0;">YoursTruly</h1>
  </div>
  
  <div style="background: linear-gradient(135deg, #C35F33 0%, #e07a4d 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h2 style="margin: 0 0 10px 0;">A Message For You 💌</h2>
    <p style="margin: 0; font-size: 16px;">
      <strong>{{senderName}}</strong> left you something special
    </p>
  </div>
  
  <p>Dear {{recipientName}},</p>
  
  <p>
    {{senderName}} scheduled this message to arrive today. It may contain words of wisdom, 
    cherished memories, or heartfelt wishes just for you.
  </p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{postscriptUrl}}" style="display: inline-block; background: #C35F33; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Open Your Message
    </a>
  </div>
  
  <p style="color: #64748b; font-size: 14px; text-align: center;">
    This message was scheduled with love through YoursTruly.
  </p>
</body>
</html>',
  'A Message from {{senderName}} Has Arrived

Dear {{recipientName}},

{{senderName}} scheduled this message to arrive today. It may contain words of wisdom, cherished memories, or heartfelt wishes just for you.

Open your message: {{postscriptUrl}}

This message was scheduled with love through YoursTruly.',
  '["senderName", "recipientName", "postscriptUrl", "deliveryReason", "appUrl"]',
  'transactional'
);
