'use client';

import { useState } from 'react';
import { 
  CheckCircle, XCircle, Minus, Star, TrendingUp, Target, Zap, 
  ChevronDown, ChevronUp, Shield, DollarSign, HelpCircle, 
  Layout, Eye, Camera, Video, User, Book, Users, Clock,
  Mic, Phone, Globe, Download, Lock
} from 'lucide-react';

// Types for competitor pricing - flexible to handle all variations
interface PricingTier {
  name: string;
  price: string;
  upfront?: string;
  features: string[];
}

interface CompetitorPricing {
  main: string;
  includes?: string[];
  extras?: string[];
  freeTrial?: string;
  renewal?: string;
  tiers?: PricingTier[];
}

// Detailed competitor data with research from Feb 2026
const competitorDetails: Record<string, { pricing: CompetitorPricing; [key: string]: any }> = {
  storyworth: {
    name: 'StoryWorth',
    tagline: 'Everyone has a story worth sharing',
    website: 'storyworth.com',
    founded: '2013',
    logoColor: '#4A90A4',
    pricing: {
      main: '$99/year',
      includes: [
        'One storyteller account',
        'Unlimited readers',
        'One year of weekly email prompts',
        'One full color hardcover book (up to 300 pages)',
        'Free shipping in US',
        'Voice recording over phone',
        'Unlimited photos and stories',
        'Downloadable PDF e-books'
      ],
      extras: [
        'Extra color books up to 300 pages: $79',
        'Extra color books 300-480 pages: $99',
        'Black & white interior books: $39',
      ],
      freeTrial: '30-day money back guarantee'
    },
    features: {
      voice: true,
      video: false,
      futureMsg: false,
      aiAvatar: false,
      book: true,
      familyShare: true,
      phoneRecord: true,
      aiOrganization: false,
      unlimitedStorage: true,
    },
    faqs: [
      {
        q: 'Who is Storyworth for?',
        a: 'Perfect gift for friends and family - birthdays, Mother\'s Day, Father\'s Day, or milestone occasions like retirement. You can also get it for yourself.'
      },
      {
        q: 'Can I voice record my stories?',
        a: 'Yes! You can record stories over the phone and we\'ll transcribe them to your book automatically.'
      },
      {
        q: 'What happens when my subscription ends?',
        a: 'You\'ll receive an email with the option to renew or print your book. We usually offer a few months to edit your stories.'
      },
      {
        q: 'Can I choose the questions?',
        a: 'You have full flexibility - choose from our library, edit our questions, or write your own.'
      },
    ],
    security: {
      quote: '"Your stories belong to you. Your stories are private and available to download for free at anytime."',
      highlights: [
        'All stories encrypted in database',
        'Private by default - you control who sees',
        'Download PDF backup anytime',
        'No automatic social media sharing',
        'HTTPS secure protocol',
        'Stripe for PCI-compliant payments'
      ]
    },
    easeOfUse: {
      quote: '"No tech savvy needed. Tell your stories on any device, even a landline, no passwords necessary."',
      highlights: [
        'Reply to prompts via email',
        'Record by phone (no app needed)',
        'Built-in proofreader for spelling/grammar',
        'Weekly email prompts keep you motivated'
      ]
    },
    visuals: {
      screenshots: true,
      animations: true,
      videoDemo: true,
      realPhotos: true,
      stockPhotos: false,
      founderPhoto: true,
      founderNote: 'Nick Baum pictured with his dad - personal story about wanting kids to know grandfather better'
    }
  },
  remento: {
    name: 'Remento',
    tagline: 'As Seen On Shark Tank',
    website: 'remento.co',
    founded: '2021',
    logoColor: '#6B4E71',
    pricing: {
      main: '$99/year (first year with book)',
      includes: [
        'One storyteller account',
        'Unlimited collaborators',
        'One year of story prompts',
        'One hardcover full-color book (up to 200 pages)',
        'Free shipping in US',
        'Speech-To-Story™ AI transcription',
        'QR codes in book linking to recordings',
        'Unlimited projects per storyteller'
      ],
      extras: [
        'Books 201-380 pages: +$30 surcharge',
        'Additional copies up to 200pg: $69',
        'Additional copies 201-380pg: $99',
        'E-book version: $49.99',
      ],
      renewal: '$99/year or $12/month',
      freeTrial: '30-day money back guarantee'
    },
    features: {
      voice: true,
      video: true,
      futureMsg: false,
      aiAvatar: false,
      book: true,
      familyShare: true,
      phoneRecord: false,
      aiOrganization: true,
      unlimitedStorage: true,
    },
    faqs: [
      {
        q: 'What if Remento goes out of business?',
        a: 'Your precious memories are too precious to risk. We make it easy to download any recordings, photos, or written stories at any time.'
      },
      {
        q: 'How does Speech-To-Story™ work?',
        a: 'Choose cleaned-up transcripts (ums removed) or let AI turn reflections into beautifully written stories.'
      },
      {
        q: 'What if I don\'t renew my subscription?',
        a: 'You never lose access to existing recorded content. You can view, listen, and download anytime.'
      },
      {
        q: 'Is it easy for older family members?',
        a: 'No apps to download, no login to remember. Many customers 85+ years young recommend us to friends.'
      },
    ],
    security: {
      quote: '"Your stories belong to you, so we\'ve built Remento with your privacy at its heart."',
      highlights: [
        'Private by default',
        'You own 100% of your content',
        'Download anything at any time',
        'All stories encrypted in database',
        'Google Cloud Platform storage',
        'SSL encryption for all communication',
        'Stripe for payment security'
      ]
    },
    easeOfUse: {
      quote: '"Recording doesn\'t require any downloads, logins, or passwords. That\'s why so many of our customers 85 years (young) and older recommend Remento."',
      highlights: [
        'Click link from email/SMS to record',
        'No app download required',
        'No passwords to remember',
        'Works on any device with internet'
      ]
    },
    visuals: {
      screenshots: true,
      animations: true,
      videoDemo: true,
      realPhotos: true,
      stockPhotos: false,
      founderPhoto: false,
      founderNote: 'Featured Shark Tank appearance for credibility'
    }
  },
  heritagewhisper: {
    name: 'HeritageWhisper',
    tagline: 'Their Voice. Their Grit. Your Compass.',
    website: 'heritagewhisper.com',
    founded: '2024',
    logoColor: '#2D5A4A',
    pricing: {
      main: '$79/year',
      includes: [
        'Voice-first recording (just talk)',
        'Pearl AI assistant with personalized follow-ups',
        'Instant family sharing worldwide',
        'Living book format',
        'Print-ready export anytime',
        'Multiple family contributors'
      ],
      extras: [
        'Gift subscription available',
      ],
      freeTrial: 'First 5 stories free, no card required'
    },
    features: {
      voice: true,
      video: false,
      futureMsg: false,
      aiAvatar: false,
      book: true,
      familyShare: true,
      phoneRecord: false,
      aiOrganization: true,
      unlimitedStorage: true,
    },
    faqs: [
      {
        q: 'What makes HeritageWhisper different?',
        a: 'Voice-first: just talk, no writing. Pearl asks personalized follow-ups based on YOUR stories, not generic questions.'
      },
      {
        q: 'How does the "Living Book" work?',
        a: 'Unlike printed books with deadlines, your book grows as you add stories. Family sees updates instantly worldwide.'
      },
      {
        q: 'Can my whole family participate?',
        a: 'Yes! Aunts, uncles, grandchildren - everyone can take turns asking questions and recording stories.'
      },
      {
        q: 'What is "Digital Sovereignty"?',
        a: 'Download your entire archive to keep offline, forever. Your stories aren\'t held hostage by a subscription.'
      },
    ],
    security: {
      quote: '"256-bit encryption • No data selling, ever • Export anytime"',
      highlights: [
        '256-bit encryption',
        'No data selling ever',
        'Digital Sovereignty - export anytime',
        'Fully self-contained offline backup',
        'Your history belongs to you'
      ]
    },
    easeOfUse: {
      quote: '"Recording a legacy has never felt this natural. No writing. No deadlines. No lost stories. No solo homework."',
      highlights: [
        'Voice-first - just tap and talk',
        'No writing required',
        'No deadlines - record when moment is right',
        'Pearl AI guides you naturally',
        'Family collaboration built-in'
      ]
    },
    visuals: {
      screenshots: true,
      animations: false,
      videoDemo: false,
      realPhotos: true,
      stockPhotos: false,
      founderPhoto: true,
      founderNote: 'Paul pictured with his dad - former Verizon AVP, built it with retired father'
    }
  },
  eternos: {
    name: 'Eternos',
    tagline: 'Extend Your Impact, Preserve Your Legacy',
    website: 'eternos.life',
    founded: '2020',
    logoColor: '#1E3A5F',
    pricing: {
      main: '$25-49/month',
      tiers: [
        {
          name: 'Consumer',
          price: '$25/month',
          upfront: '$0',
          features: [
            'High-quality voice replica',
            'Unlimited voice/text chat with AI',
            'Unlimited family sharing',
            'Self-serve onboarding',
            '5 MB bandwidth/mo (~10 hours)',
          ]
        },
        {
          name: 'Prosumer',
          price: '$49/month',
          upfront: '$995 one-time',
          features: [
            'Everything in Consumer',
            'Up to 10 hours concierge onboarding',
            '10 MB bandwidth/mo',
            'Professional/business use',
          ]
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          upfront: 'Custom',
          features: [
            'Premium neural voice (most lifelike)',
            'Unlimited concierge support',
            'Custom bandwidth',
            'Institutional knowledge capture',
          ]
        }
      ],
      freeTrial: 'None listed'
    },
    features: {
      voice: true,
      video: true,
      futureMsg: false,
      aiAvatar: true,
      book: false,
      familyShare: true,
      phoneRecord: false,
      aiOrganization: true,
      unlimitedStorage: false,
    },
    faqs: [
      {
        q: 'What is an Eternos AI?',
        a: 'A digital twin that lets loved ones stay connected to you, your voice, life story, thoughts, and values through interactive conversations.'
      },
      {
        q: 'Can my AI keep learning after I\'m gone?',
        a: 'Yes - it can continue learning from chats with family members, helping your story live on meaningfully.'
      },
      {
        q: 'What is bandwidth?',
        a: '5 MBs represents about 10 hours of AI interaction per month. You can purchase more as needed.'
      },
      {
        q: 'What happens if I stop paying?',
        a: 'Your data remains in the Eternos MemoryVault and can be accessed when you resume membership.'
      },
    ],
    security: {
      quote: '"Your data remains in the Eternos MemoryVault able to be accessed when you choose to resume membership in the future."',
      highlights: [
        'Data preserved in MemoryVault',
        'Enterprise-grade infrastructure',
        'Professional onboarding support',
        'Cloudflare protection'
      ]
    },
    easeOfUse: {
      quote: '"Create an interactive legacy... up and running in minutes!"',
      highlights: [
        'Consumer tier: self-serve setup',
        'Prosumer: 10 hours personal guidance',
        'Enterprise: full concierge service',
        'Chat or speak with your AI anytime'
      ]
    },
    visuals: {
      screenshots: false,
      animations: false,
      videoDemo: true,
      realPhotos: false,
      stockPhotos: true,
      founderPhoto: false,
      founderNote: 'Featured in major press (shown logos)'
    }
  },
  klokbox: {
    name: 'Klokbox',
    tagline: 'Turn Your Personal Moments Into Timeless Stories',
    website: 'klokbox.com',
    founded: '2022',
    logoColor: '#FF6B35',
    pricing: {
      main: 'Free / $4.99/month Premium',
      tiers: [
        {
          name: 'Free',
          price: '$0',
          features: [
            'Ad-supported experience',
            '1-Click Gallery Import',
            'Record Audio Messages',
            'Unlimited Albums',
            'Generate Unlimited Storybooks',
          ]
        },
        {
          name: 'Premium',
          price: '$4.99/month',
          features: [
            'No ads',
            '1-Click Gallery Import',
            'Record Audio Messages',
            'Unlimited Albums',
            'Share Unlimited Storybooks',
            'Cloud Backup',
          ]
        }
      ],
      freeTrial: 'Free tier available forever'
    },
    features: {
      voice: true,
      video: true,
      futureMsg: 'limited',
      aiAvatar: false,
      book: false,
      familyShare: true,
      phoneRecord: false,
      aiOrganization: false,
      unlimitedStorage: false,
    },
    faqs: [
      {
        q: 'What is Klokbox?',
        a: 'A life story app that turns your gallery photos into narrated storybooks you can relive and share privately.'
      },
      {
        q: 'How does gallery import work?',
        a: 'Duplicate your gallery with one touch, then delete the noise and record voice stories about the highs.'
      },
      {
        q: 'Can I create time capsules?',
        a: 'Yes - store things securely and have them shared only if you\'re no longer around (limited feature).'
      },
      {
        q: 'Is my data safe?',
        a: 'Premium includes cloud backup. Keep memories safe and accessible in one secure place.'
      },
    ],
    security: {
      quote: '"Keep your memories safe and accessible, all in one secure place."',
      highlights: [
        'Cloud backup (Premium)',
        'Private story sharing',
        'Data stored securely',
        'iOS/Android app stores'
      ]
    },
    easeOfUse: {
      quote: '"Chronicle Your Life Story Today, So You Can Replay & Share Forever"',
      highlights: [
        '1-Click Gallery Import',
        'Mobile-first app experience',
        'Delete noise, keep highlights',
        'Simple album organization'
      ]
    },
    visuals: {
      screenshots: true,
      animations: true,
      videoDemo: false,
      realPhotos: true,
      stockPhotos: false,
      founderPhoto: false,
      founderNote: 'User testimonials with real photos and names'
    }
  }
};

const features = [
  { key: 'futureMsg', name: 'Future Message Delivery', description: 'Schedule messages to arrive on specific dates or after passing', ytAdvantage: true },
  { key: 'aiAvatar', name: 'AI Avatar / Digital Twin', description: 'Chat with a digital version of your loved one', ytAdvantage: true },
  { key: 'voice', name: 'Voice Recording', description: 'Record stories with your voice' },
  { key: 'video', name: 'Video Recording', description: 'Capture video memories' },
  { key: 'book', name: 'Physical Book', description: 'Print memories as a keepsake book' },
  { key: 'familyShare', name: 'Family Sharing', description: 'Share with family members' },
];

const competitors = [
  { name: 'YoursTruly', price: 'From $79/yr', voice: true, video: true, futureMsg: true, aiAvatar: true, book: 'soon', familyShare: 'soon', highlight: true },
  { name: 'StoryWorth', price: '$99/yr', voice: true, video: false, futureMsg: false, aiAvatar: false, book: true, familyShare: true },
  { name: 'Remento', price: '$99/yr', voice: true, video: true, futureMsg: false, aiAvatar: false, book: true, familyShare: true },
  { name: 'HeritageWhisper', price: '$79/yr', voice: true, video: false, futureMsg: false, aiAvatar: false, book: true, familyShare: true },
  { name: 'Klokbox', price: 'Free/$5/mo', voice: true, video: true, futureMsg: 'limited', aiAvatar: false, book: false, familyShare: true },
  { name: 'Eternos', price: '$25-49/mo', voice: true, video: true, futureMsg: false, aiAvatar: true, book: false, familyShare: true },
];

const uniqueAdvantages = [
  {
    icon: Zap,
    title: 'PostScripts™',
    description: 'Schedule messages to arrive on birthdays, anniversaries, or "after I\'m gone" — no other platform offers this.',
    competitors: 'None (Klokbox has limited time capsules)',
  },
  {
    icon: Star,
    title: 'Gift Marketplace',
    description: 'Attach physical gifts (flowers, keepsakes) to your messages. They arrive together at the perfect moment.',
    competitors: 'None',
  },
  {
    icon: Target,
    title: 'Affordable AI Avatar',
    description: 'Create a digital version of yourself or loved ones at a fraction of competitor pricing.',
    competitors: 'Only Eternos ($300-600+/yr)',
  },
  {
    icon: TrendingUp,
    title: '3D Memory Globe',
    description: 'View your memories on an interactive 3D globe with face detection and smart organization.',
    competitors: 'None',
  },
];

const positioning = {
  tagline: "Don't just preserve the past. Deliver it to the future.",
  description: "While other platforms focus on capturing memories for viewing now, YoursTruly is the only platform that delivers your memories, messages, and gifts exactly when they matter most — even years from now.",
  pricing: [
    { tier: 'Free', price: '$0', features: ['5 memories', '1 PostScript', 'Basic features'] },
    { tier: 'Personal', price: '$79/yr', features: ['Unlimited memories', '12 PostScripts/year', 'Voice & video', 'AI organization'] },
    { tier: 'Family', price: '$149/yr', features: ['Everything in Personal', 'Family sharing', '24 PostScripts/year', 'AI Avatar lite'] },
    { tier: 'Legacy', price: '$249/yr', features: ['Everything in Family', 'Unlimited PostScripts', 'Full AI Avatar', 'Priority support'] },
  ],
};

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="w-5 h-5 text-[#2D5A3D] mx-auto" />;
  if (value === false) return <XCircle className="w-5 h-5 text-[#B8562E]/40 mx-auto" />;
  if (value === 'soon') return <span className="text-xs text-[#C4A235] font-medium">Soon</span>;
  if (value === 'limited') return <span className="text-xs text-[#8DACAB]">Limited</span>;
  return <Minus className="w-5 h-5 text-gray-300 mx-auto" />;
}

function CompetitorCard({ id, data }: { id: string; data: typeof competitorDetails.storyworth }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'pricing' | 'features' | 'faqs' | 'security' | 'ease' | 'visuals'>('pricing');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#B8562E]/10 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: data.logoColor }}
            >
              {data.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#2a1f1a]">{data.name}</h3>
              <p className="text-sm text-[#2a1f1a]/60">{data.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-[#2D5A3D]">{data.pricing.main}</p>
              <p className="text-xs text-[#2a1f1a]/50">{data.website}</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-6 h-6 text-[#2a1f1a]/40" />
            ) : (
              <ChevronDown className="w-6 h-6 text-[#2a1f1a]/40" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[#B8562E]/10">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-[#B8562E]/10 bg-[#F5F3EE]/50">
            {[
              { id: 'pricing', label: 'Pricing', icon: DollarSign },
              { id: 'features', label: 'Features', icon: Layout },
              { id: 'faqs', label: 'FAQs', icon: HelpCircle },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'ease', label: 'Ease of Use', icon: User },
              { id: 'visuals', label: 'Visuals', icon: Eye },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#2D5A3D] border-b-2 border-[#2D5A3D] bg-white'
                    : 'text-[#2a1f1a]/60 hover:text-[#2a1f1a]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {data.pricing.tiers && data.pricing.tiers.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    {data.pricing.tiers.map((tier: PricingTier, idx: number) => (
                      <div key={tier.name} className={`rounded-xl p-4 ${idx === 1 ? 'bg-[#2D5A3D]/10 border-2 border-[#2D5A3D]' : 'bg-[#F5F3EE]'}`}>
                        <h4 className="font-bold text-[#2a1f1a]">{tier.name}</h4>
                        <p className="text-2xl font-bold text-[#2D5A3D] mt-1">{tier.price}</p>
                        {tier.upfront && tier.upfront !== '$0' && (
                          <p className="text-xs text-[#B8562E]">+ {tier.upfront} upfront</p>
                        )}
                        <ul className="mt-3 space-y-1">
                          {tier.features.map((f: string, i: number) => (
                            <li key={i} className="text-sm text-[#2a1f1a]/70 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-[#2D5A3D] mt-0.5 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-semibold text-[#2a1f1a] mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />
                        What's Included
                      </h4>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {(data.pricing.includes || []).map((item: string, i: number) => (
                          <li key={i} className="text-sm text-[#2a1f1a]/70 flex items-start gap-2">
                            <span className="text-[#2D5A3D]">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {data.pricing.extras && data.pricing.extras.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-[#2a1f1a] mb-3 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-[#B8562E]" />
                          Additional Costs
                        </h4>
                        <ul className="space-y-1">
                          {data.pricing.extras.map((item, i) => (
                            <li key={i} className="text-sm text-[#2a1f1a]/70">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {data.pricing.freeTrial && (
                  <div className="bg-[#C4A235]/10 rounded-lg p-3">
                    <p className="text-sm font-medium text-[#2a1f1a]">
                      🎁 {data.pricing.freeTrial}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(data.features).map(([key, value]) => {
                  const labels: Record<string, { label: string; icon: typeof Mic }> = {
                    voice: { label: 'Voice Recording', icon: Mic },
                    video: { label: 'Video Recording', icon: Video },
                    futureMsg: { label: 'Future Messages', icon: Clock },
                    aiAvatar: { label: 'AI Avatar', icon: User },
                    book: { label: 'Physical Book', icon: Book },
                    familyShare: { label: 'Family Sharing', icon: Users },
                    phoneRecord: { label: 'Phone Recording', icon: Phone },
                    aiOrganization: { label: 'AI Organization', icon: Zap },
                    unlimitedStorage: { label: 'Unlimited Storage', icon: Globe },
                  };
                  const info = labels[key];
                  if (!info) return null;
                  return (
                    <div 
                      key={key} 
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        value === true ? 'bg-[#2D5A3D]/10' : value === false ? 'bg-[#B8562E]/5' : 'bg-[#C4A235]/10'
                      }`}
                    >
                      <info.icon className={`w-5 h-5 ${value === true ? 'text-[#2D5A3D]' : value === false ? 'text-[#B8562E]/50' : 'text-[#C4A235]'}`} />
                      <span className="text-sm text-[#2a1f1a]">{info.label}</span>
                      <span className="ml-auto">
                        {value === true && <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />}
                        {value === false && <XCircle className="w-5 h-5 text-[#B8562E]/50" />}
                        {typeof value === 'string' && <span className="text-xs text-[#C4A235] font-medium">{value}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FAQs Tab */}
            {activeTab === 'faqs' && (
              <div className="space-y-4">
                {data.faqs.map((faq: { q: string; a: string }, i: number) => (
                  <div key={i} className="bg-[#F5F3EE] rounded-lg p-4">
                    <h4 className="font-semibold text-[#2a1f1a] mb-2">{faq.q}</h4>
                    <p className="text-sm text-[#2a1f1a]/70">{faq.a}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <blockquote className="border-l-4 border-[#2D5A3D] pl-4 py-2 bg-[#2D5A3D]/5 rounded-r-lg">
                  <p className="text-sm italic text-[#2a1f1a]/80">{data.security.quote}</p>
                </blockquote>
                <div>
                  <h4 className="font-semibold text-[#2a1f1a] mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#2D5A3D]" />
                    Security Highlights
                  </h4>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {data.security.highlights.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-[#2a1f1a]/70 flex items-start gap-2">
                        <Shield className="w-4 h-4 text-[#2D5A3D] mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Ease of Use Tab */}
            {activeTab === 'ease' && (
              <div className="space-y-4">
                <blockquote className="border-l-4 border-[#4A3552] pl-4 py-2 bg-[#4A3552]/5 rounded-r-lg">
                  <p className="text-sm italic text-[#2a1f1a]/80">{data.easeOfUse.quote}</p>
                </blockquote>
                <div>
                  <h4 className="font-semibold text-[#2a1f1a] mb-3">Key Ease-of-Use Points</h4>
                  <ul className="space-y-2">
                    {data.easeOfUse.highlights.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-[#2a1f1a]/70 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#4A3552] mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Visuals Tab */}
            {activeTab === 'visuals' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'screenshots', label: 'Screenshots', icon: Camera },
                    { key: 'animations', label: 'Animations/Videos', icon: Video },
                    { key: 'videoDemo', label: 'Demo Video', icon: Eye },
                    { key: 'realPhotos', label: 'Real Photos', icon: User },
                    { key: 'stockPhotos', label: 'Stock Photos', icon: Layout },
                    { key: 'founderPhoto', label: 'Founder Photo', icon: User },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      className={`p-3 rounded-lg text-center ${
                        data.visuals[item.key as keyof typeof data.visuals] 
                          ? 'bg-[#2D5A3D]/10' 
                          : 'bg-gray-100'
                      }`}
                    >
                      <item.icon className={`w-6 h-6 mx-auto mb-2 ${
                        data.visuals[item.key as keyof typeof data.visuals]
                          ? 'text-[#2D5A3D]'
                          : 'text-gray-400'
                      }`} />
                      <p className="text-xs text-[#2a1f1a]/70">{item.label}</p>
                      {data.visuals[item.key as keyof typeof data.visuals] ? (
                        <CheckCircle className="w-4 h-4 text-[#2D5A3D] mx-auto mt-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mx-auto mt-1" />
                      )}
                    </div>
                  ))}
                </div>
                {data.visuals.founderNote && (
                  <div className="bg-[#F5F3EE] rounded-lg p-3">
                    <p className="text-sm text-[#2a1f1a]/70">
                      <strong>Note:</strong> {data.visuals.founderNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompetitorAnalysisPage() {
  const [showAllCards, setShowAllCards] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2D5A3D] via-[#4A3552] to-[#2a1f1a] text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How We Compare
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {positioning.tagline}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Unique Advantages */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#2a1f1a] text-center mb-4">
            What Makes Us Different
          </h2>
          <p className="text-center text-[#2a1f1a]/60 mb-12 max-w-2xl mx-auto">
            {positioning.description}
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {uniqueAdvantages.map((advantage) => (
              <div 
                key={advantage.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#B8562E]/10 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#2D5A3D] to-[#4A3552]">
                    <advantage.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#2a1f1a] mb-2">
                      {advantage.title}
                    </h3>
                    <p className="text-[#2a1f1a]/70 text-sm mb-3">
                      {advantage.description}
                    </p>
                    <p className="text-xs text-[#2D5A3D] font-medium">
                      Competitors with this: {advantage.competitors}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Matrix */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#2a1f1a] text-center mb-12">
            Feature Comparison
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm border border-[#B8562E]/10 overflow-hidden">
              <thead>
                <tr className="bg-[#2a1f1a] text-white">
                  <th className="text-left px-6 py-4 font-semibold">Platform</th>
                  <th className="text-center px-4 py-4 font-semibold">Price</th>
                  {features.map((f) => (
                    <th key={f.key} className="text-center px-4 py-4 font-semibold text-sm">
                      {f.name}
                      {f.ytAdvantage && <Star className="w-3 h-3 inline ml-1 text-[#C4A235]" />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, idx) => (
                  <tr 
                    key={comp.name}
                    className={`border-t border-[#B8562E]/10 ${
                      comp.highlight 
                        ? 'bg-gradient-to-r from-[#2D5A3D]/10 to-[#4A3552]/10 font-medium' 
                        : idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F3EE]/50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className={comp.highlight ? 'text-[#2D5A3D] font-bold' : 'text-[#2a1f1a]'}>
                        {comp.name}
                        {comp.highlight && <span className="ml-2 text-xs bg-[#2D5A3D] text-white px-2 py-0.5 rounded-full">Us</span>}
                      </span>
                    </td>
                    <td className="text-center px-4 py-4 text-sm text-[#2a1f1a]/70">
                      {comp.price}
                    </td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.futureMsg} /></td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.aiAvatar} /></td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.voice} /></td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.video} /></td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.book} /></td>
                    <td className="text-center px-4 py-4"><FeatureCell value={comp.familyShare} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-center text-sm text-[#2a1f1a]/50 mt-4">
            <Star className="w-3 h-3 inline text-[#C4A235] mr-1" />
            = YoursTruly unique advantage
          </p>
        </section>

        {/* Detailed Competitor Cards */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#2a1f1a] text-center mb-4">
            Deep Dive: Competitor Analysis
          </h2>
          <p className="text-center text-[#2a1f1a]/60 mb-8">
            Click any card to explore pricing, features, FAQs, security messaging, and more
          </p>
          
          <div className="space-y-4">
            {Object.entries(competitorDetails)
              .slice(0, showAllCards ? undefined : 3)
              .map(([id, data]) => (
                <CompetitorCard key={id} id={id} data={data} />
              ))}
          </div>
          
          {!showAllCards && Object.keys(competitorDetails).length > 3 && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAllCards(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a1f1a] text-white rounded-xl hover:bg-[#2a1f1a]/80 transition-colors"
              >
                Show All {Object.keys(competitorDetails).length} Competitors
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* Pricing Preview */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#2a1f1a] text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-[#2a1f1a]/60 mb-12">
            More features, better price than competitors charging $300+/year
          </p>
          
          <div className="grid md:grid-cols-4 gap-4">
            {positioning.pricing.map((tier, idx) => (
              <div 
                key={tier.tier}
                className={`rounded-2xl p-6 ${
                  idx === 2 
                    ? 'bg-gradient-to-br from-[#2D5A3D] to-[#4A3552] text-white ring-4 ring-[#C4A235]' 
                    : 'bg-white border border-[#B8562E]/10'
                }`}
              >
                {idx === 2 && (
                  <span className="text-xs bg-[#C4A235] text-[#2a1f1a] px-2 py-1 rounded-full font-medium mb-3 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className={`text-lg font-bold mb-1 ${idx === 2 ? 'text-white' : 'text-[#2a1f1a]'}`}>
                  {tier.tier}
                </h3>
                <p className={`text-3xl font-bold mb-4 ${idx === 2 ? 'text-white' : 'text-[#2D5A3D]'}`}>
                  {tier.price}
                </p>
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className={`text-sm flex items-start gap-2 ${idx === 2 ? 'text-white/90' : 'text-[#2a1f1a]/70'}`}>
                      <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${idx === 2 ? 'text-[#C4A235]' : 'text-[#2D5A3D]'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Key Takeaways */}
        <section className="mb-20 bg-white rounded-3xl p-8 shadow-sm border border-[#B8562E]/10">
          <h2 className="text-2xl font-bold text-[#2a1f1a] mb-6 text-center">
            Key Competitive Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-[#2D5A3D] flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Market Trends
              </h3>
              <ul className="space-y-2 text-sm text-[#2a1f1a]/70">
                <li>• <strong>Voice-first</strong> is becoming standard (HeritageWhisper, Remento)</li>
                <li>• <strong>No login/password</strong> is a key differentiator for seniors</li>
                <li>• <strong>AI transcription</strong> (Speech-to-Story) adds perceived value</li>
                <li>• <strong>Instant family sharing</strong> beats annual book printing</li>
                <li>• <strong>Data portability</strong> is a growing concern customers mention</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-[#B8562E] flex items-center gap-2">
                <Target className="w-5 h-5" />
                Opportunity Gaps
              </h3>
              <ul className="space-y-2 text-sm text-[#2a1f1a]/70">
                <li>• <strong>No one offers future delivery</strong> (PostScripts™ is unique)</li>
                <li>• <strong>AI Avatars are expensive</strong> (Eternos $300-600+/yr)</li>
                <li>• <strong>Gift integration</strong> doesn't exist in market</li>
                <li>• <strong>3D visualization</strong> is untapped (Memory Globe)</li>
                <li>• <strong>Free tiers are rare</strong> (only Klokbox, but ad-supported)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-br from-[#2D5A3D] to-[#4A3552] rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Preserve Your Legacy?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of families who trust YoursTruly to capture, preserve, and deliver their most precious memories.
          </p>
          <a 
            href="/signup"
            className="inline-block bg-white text-[#2D5A3D] font-semibold px-8 py-4 rounded-xl hover:shadow-lg transition-shadow"
          >
            Start Free Today
          </a>
        </section>
      </div>

      {/* Footer note */}
      <div className="text-center py-8 text-sm text-[#2a1f1a]/40">
        Comparison data updated February 2026. Competitor features may change.
      </div>
    </div>
  );
}
