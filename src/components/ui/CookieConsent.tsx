'use client'

import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'yt-cookie-consent'

interface CookieConsentProps {
  privacyUrl?: string
}

export default function CookieConsent({ 
  privacyUrl = '/privacy' 
}: CookieConsentProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }))
    setVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-[#2D5A3D]/10 rounded-xl flex items-center justify-center">
            <Cookie className="w-6 h-6 text-[#2D5A3D]" />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="font-semibold text-[#2d2d2d] mb-1">We use cookies</h3>
            <p className="text-sm text-[#666] leading-relaxed">
              We use cookies to improve your experience, analyze site traffic, and personalize content. 
              By clicking "Accept", you consent to our use of cookies. 
              <Link href={privacyUrl} className="text-[#2D5A3D] hover:underline ml-1">
                Learn more
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-[#666] hover:text-[#2d2d2d] hover:bg-gray-100 rounded-xl transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-[#2D5A3D] hover:bg-[#355847] rounded-xl transition-colors shadow-sm"
            >
              Accept
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={handleDecline}
            className="absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors hidden sm:block"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Minimal version - just a small banner
 */
export function CookieConsentMinimal({ privacyUrl = '/privacy' }: CookieConsentProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString()
    }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-slide-up">
      <div className="bg-[#2d2d2d] text-white rounded-xl p-4 shadow-xl">
        <p className="text-sm mb-3">
          We use cookies to enhance your experience.{' '}
          <Link href={privacyUrl} className="underline hover:text-[#B8562E]">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setVisible(false)}
            className="flex-1 px-3 py-2 text-sm text-white/70 hover:text-white rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-3 py-2 text-sm bg-[#2D5A3D] hover:bg-[#234A31] rounded-lg transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
