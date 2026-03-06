import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | YoursTruly',
  description: 'Terms of Service for YoursTruly',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-stone-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-stone max-w-none">
          <p className="text-stone-600 mb-6">
            <em>Last updated: March 2026</em>
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using YoursTruly ("the Service"), you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            YoursTruly is a digital legacy platform that allows users to document their life stories, 
            create AI-powered digital versions of themselves, and schedule future messages and gifts for loved ones.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all 
            activities that occur under your account. You must be at least 18 years old to use this Service.
          </p>

          <h2>4. User Content</h2>
          <p>
            You retain ownership of all content you submit to YoursTruly. By submitting content, you grant us 
            a license to store, process, and deliver your content as part of the Service. We will never sell 
            your personal content to third parties.
          </p>

          <h2>5. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our <a href="/privacy" className="text-amber-600 hover:underline">Privacy Policy</a> to 
            understand how we collect, use, and protect your information.
          </p>

          <h2>6. Subscription and Billing</h2>
          <p>
            Premium features require a paid subscription. Subscriptions automatically renew unless cancelled 
            before the renewal date. Refunds are handled on a case-by-case basis.
          </p>

          <h2>7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. You may delete 
            your account at any time through your account settings.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            YoursTruly is provided "as is" without warranties of any kind. We are not liable for any indirect, 
            incidental, or consequential damages arising from your use of the Service.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes constitutes 
            acceptance of the new terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
            <a href="mailto:support@yourstruly.love" className="text-amber-600 hover:underline">
              support@yourstruly.love
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
