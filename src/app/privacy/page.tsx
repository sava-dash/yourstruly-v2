import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | YoursTruly',
  description: 'Privacy Policy for YoursTruly',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-stone max-w-none">
          <p className="text-stone-600 mb-6">
            <em>Last updated: March 2026</em>
          </p>

          <h2>Our Commitment to Privacy</h2>
          <p>
            At YoursTruly, your privacy is fundamental to everything we do. We understand that you're 
            trusting us with your most personal stories and memories. We take that responsibility seriously.
          </p>

          <h2>Information We Collect</h2>
          <h3>Account Information</h3>
          <p>
            When you create an account, we collect your email address, name, and password. If you choose 
            to add a phone number for notifications, we store that as well.
          </p>

          <h3>Content You Create</h3>
          <p>
            This includes stories, memories, voice recordings, photos, and any other content you choose 
            to add to your digital legacy. This content is encrypted and stored securely.
          </p>

          <h3>Usage Data</h3>
          <p>
            We collect basic analytics about how you use the Service to improve functionality. This includes 
            pages visited and features used, but never the content of your stories.
          </p>

          <h2>How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the Service</li>
            <li>To send scheduled messages and gifts to your designated recipients</li>
            <li>To communicate with you about your account and updates</li>
            <li>To improve and develop new features</li>
          </ul>

          <h2>What We Never Do</h2>
          <ul>
            <li><strong>We never sell your personal data</strong></li>
            <li>We never share your content with third parties for advertising</li>
            <li>We never use your personal stories to train AI models without explicit consent</li>
            <li>We never access your content without your permission, except as required by law</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            Your content is encrypted at rest and in transit. We use industry-standard security measures 
            to protect your information. Access to user data is strictly limited and logged.
          </p>

          <h2>Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to fulfill your legacy 
            plans. After account deletion, data is permanently removed within 30 days.
          </p>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and all associated data</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            We use essential cookies for authentication and functionality. We also use analytics cookies 
            with your consent. You can manage cookie preferences through our cookie banner.
          </p>

          <h2>Third-Party Services</h2>
          <p>
            We use trusted third-party services for payments (Stripe), email (Resend), and infrastructure (AWS). 
            These providers are bound by strict data processing agreements.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            YoursTruly is not intended for users under 18. We do not knowingly collect information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify you of significant changes via email 
            or through the Service.
          </p>

          <h2>Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact us at{' '}
            <a href="mailto:privacy@yourstruly.love" className="text-amber-600 hover:underline">
              privacy@yourstruly.love
            </a>
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-200">
          <a href="/" className="text-amber-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
