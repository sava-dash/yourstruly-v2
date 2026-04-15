'use client'

/**
 * F4: Claim-your-account flow for gifted interviews.
 *
 * Renders a CTA alongside the existing completion-flow signup. Takes the
 * recipient through 3 steps:
 *   1) email + full name
 *   2) server creates auth user and magic link; we show "check your email"
 *   3) on verify, the server copies interview responses into the new user's
 *      memories, then their first sign-in lands on /dashboard?welcome=from-interview
 */
import { useState } from 'react'
import { Gift, Mail, Check, AlertCircle } from 'lucide-react'

interface Props {
  token: string
  defaultName?: string | null
  defaultEmail?: string | null
}

type Step = 'cta' | 'form' | 'sent'

export default function ClaimAccountFlow({ token, defaultName, defaultEmail }: Props) {
  const [step, setStep] = useState<Step>('cta')
  const [fullName, setFullName] = useState(defaultName || '')
  const [email, setEmail] = useState(defaultEmail || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!fullName.trim()) {
      setError('Enter your name.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/interviews/claim-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim(), fullName: fullName.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not claim account')
      setStep('sent')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not claim account')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'cta') {
    return (
      <div className="bg-[#D3E1DF] rounded-lg p-5 border border-[#406A56]/20">
        <div className="flex items-start gap-3">
          <div className="bg-[#406A56] text-[#F2F1E5] rounded-full p-2 shrink-0" aria-hidden>
            <Gift size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#406A56]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Keep your answers forever
            </h3>
            <p className="text-sm text-[#406A56]/80 mt-1">
              Claim a free YoursTruly account and we'll save every answer you just gave — your own private archive, just for you.
            </p>
            <button
              onClick={() => setStep('form')}
              aria-label="Claim my account and keep my answers"
              className="mt-3 min-h-[44px] px-5 py-2.5 rounded-md bg-[#406A56] text-[#F2F1E5] font-medium hover:opacity-90"
            >
              Claim my account
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'sent') {
    return (
      <div className="bg-[#D3E1DF] rounded-lg p-5 border border-[#406A56]/20" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="bg-[#406A56] text-[#F2F1E5] rounded-full p-2 shrink-0" aria-hidden>
            <Check size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#406A56]">Check your email</h3>
            <p className="text-sm text-[#406A56]/80 mt-1">
              We sent a one-tap sign-in link to <strong>{email}</strong>. Open it to finish claiming your account — your interview answers will be waiting.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-[#D3E1DF] rounded-lg p-5 border border-[#406A56]/20">
      <h3 className="text-lg font-semibold text-[#406A56]" style={{ fontFamily: 'Playfair Display, serif' }}>
        Save your answers
      </h3>
      <p className="text-sm text-[#406A56]/80 mt-1">
        Free, 10-second signup. We'll email you a sign-in link — no password needed.
      </p>

      <label htmlFor="claim-name" className="block text-sm font-medium text-[#406A56] mt-4">Your name</label>
      <input
        id="claim-name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full mt-1 min-h-[44px] px-3 py-2 rounded-md border border-[#406A56]/30 bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#406A56]"
        autoComplete="name"
        required
      />

      <label htmlFor="claim-email" className="block text-sm font-medium text-[#406A56] mt-3">Email</label>
      <input
        id="claim-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full mt-1 min-h-[44px] px-3 py-2 rounded-md border border-[#406A56]/30 bg-white text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#406A56]"
        autoComplete="email"
        required
      />

      {error && (
        <div className="mt-3 flex items-center gap-2 text-[#C35F33] text-sm" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => setStep('cta')}
          className="min-h-[44px] px-4 py-2 rounded-md border border-[#406A56]/30 text-[#406A56] hover:bg-white"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={submitting}
          aria-label="Send my sign-in link"
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-md bg-[#406A56] text-[#F2F1E5] font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Mail size={16} /> {submitting ? 'Sending…' : 'Send my link'}
        </button>
      </div>
    </form>
  )
}
