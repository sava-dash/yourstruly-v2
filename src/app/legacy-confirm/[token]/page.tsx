'use client'

import { use, useEffect, useState } from 'react'
import { Heart, Check, Loader2 } from 'lucide-react'

interface Status {
  loading: boolean
  confirmed: boolean
  error: string | null
  alreadyConfirmed: boolean
  senderName?: string
}

export default function LegacyConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [status, setStatus] = useState<Status>({
    loading: true, confirmed: false, error: null, alreadyConfirmed: false,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/legacy-confirm/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setStatus({ loading: false, confirmed: false, error: d.error, alreadyConfirmed: false })
        } else {
          setStatus({
            loading: false,
            confirmed: !!d.confirmed_at,
            alreadyConfirmed: !!d.confirmed_at,
            error: null,
            senderName: d.sender_name,
          })
        }
      })
      .catch(() => setStatus({ loading: false, confirmed: false, error: 'Could not load this page', alreadyConfirmed: false }))
  }, [token])

  const handleConfirm = async () => {
    setSubmitting(true)
    const res = await fetch(`/api/legacy-confirm/${token}`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) {
      setStatus(s => ({ ...s, confirmed: true }))
    } else {
      setStatus(s => ({ ...s, error: d.error || 'Could not confirm' }))
    }
    setSubmitting(false)
  }

  if (status.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F1E5]">
        <Loader2 className="w-8 h-8 animate-spin text-[#406A56]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F1E5] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-sm border border-[#D3E1DF] p-8 sm:p-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#D3E1DF] flex items-center justify-center mb-4">
            <Heart size={28} className="text-[#406A56]" />
          </div>
          <h1
            className="text-2xl text-[#2d2d2d]"
            style={{ fontFamily: 'var(--font-playfair, "Playfair Display", serif)' }}
          >
            A quiet moment of confirmation
          </h1>
          <p
            className="text-[#666] mt-3 text-lg"
            style={{ fontFamily: 'var(--font-caveat, Caveat, cursive)' }}
          >
            {status.senderName
              ? `${status.senderName} trusted you with this — thank you.`
              : 'Thank you for being someone they trusted.'}
          </p>
        </div>

        {status.error && (
          <div className="bg-[#C35F33]/10 border border-[#C35F33]/30 text-[#C35F33] rounded-xl p-4 text-sm mb-4">
            {status.error}
          </div>
        )}

        {status.confirmed ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#406A56]/10 flex items-center justify-center">
              <Check size={28} className="text-[#406A56]" />
            </div>
            <p className="text-[#2d2d2d] text-base leading-relaxed">
              {status.alreadyConfirmed ? 'This was already confirmed — thank you.' : 'Confirmed. We will deliver the message they prepared.'}
            </p>
            <p className="text-[#666] text-sm">You can close this page now.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 text-[#2d2d2d] text-base leading-relaxed">
              <p>
                Some time ago{status.senderName ? `, ${status.senderName}` : ''} wrote a message meant for someone they love. They asked us to wait — and to deliver it only when the time was right.
              </p>
              <p>
                If you can gently confirm that the time has come, click below. We will then send the message they prepared. There is no urgency, and you can come back later if today isn't the day.
              </p>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="mt-8 w-full min-h-[56px] py-4 px-6 rounded-2xl bg-[#406A56] text-white text-base font-semibold hover:bg-[#345a48] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Yes, please deliver the message
            </button>

            <p className="text-xs text-[#666] mt-4 text-center">
              If you got this email by mistake, simply close this page. Nothing will happen.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
