'use client'

/**
 * Photobook checkout overlay.
 *
 * Drives the full end-to-end order flow so users don't get stranded mid-way:
 *   1. Save project
 *   2. Render + upload every page (renderAndUploadAll)
 *   3. POST /api/photobook/order -> client_secret
 *   4. Collect payment in-page via <PaymentElement />
 *   5. After stripe.confirmPayment succeeds, POST /api/photobook/order/{id}
 *      with { action: 'confirm_payment' } to hand off to Prodigi
 *   6. Show friendly confirmation + "View my orders" link
 *
 * All strings use plain English and brand colors from design-system.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Check, Loader2, X, AlertCircle } from 'lucide-react'
import {
  renderAndUploadAll,
  type UploadablePage,
  type RenderProgress,
} from './renderAndUpload'

type Phase =
  | 'idle'
  | 'preparing'    // rendering + uploading pages
  | 'ordering'    // creating PaymentIntent / order
  | 'paying'      // Stripe Elements mounted, awaiting card
  | 'submitting'  // stripe.confirmPayment in flight
  | 'finalizing'  // confirm_payment -> Prodigi
  | 'done'
  | 'error'

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface CheckoutFlowProps {
  open: boolean
  onClose: () => void
  projectId: string
  pages: UploadablePage[]
  shippingAddress: ShippingAddress
  shippingMethod?: 'standard' | 'express' | 'overnight'
  /** Total in dollars, already including shipping + markup — for the header summary only. */
  totalDisplay: number
}

let stripePromise: Promise<Stripe | null> | null = null
function getStripePromise() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

export default function CheckoutFlow(props: CheckoutFlowProps) {
  const { open, onClose, projectId, pages, shippingAddress, shippingMethod = 'standard' } = props

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<RenderProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const startedRef = useRef(false)

  const start = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setError(null)

    // --- Step 1: render + upload pages
    setPhase('preparing')
    try {
      await renderAndUploadAll({
        projectId,
        pages,
        onProgress: p => setProgress(p),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong preparing your book.')
      setPhase('error')
      return
    }

    // --- Step 2: create order + PaymentIntent
    setPhase('ordering')
    try {
      const resp = await fetch('/api/photobook/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          shipping_address: {
            name: shippingAddress.name,
            line1: shippingAddress.line1,
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.postalCode,
            countryCode: shippingAddress.country,
          },
          shipping_method: shippingMethod,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'We couldn\'t start your order. Please try again.')
      }
      setOrderId(data.order.id)
      setClientSecret(data.payment.client_secret)
      setPhase('paying')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn\'t start your order.')
      setPhase('error')
    }
  }, [projectId, pages, shippingAddress, shippingMethod])

  // Kick off the flow when the overlay opens.
  useEffect(() => {
    if (open && !startedRef.current) {
      start()
    }
    if (!open) {
      // Reset for next open
      startedRef.current = false
      setPhase('idle')
      setProgress(null)
      setError(null)
      setClientSecret(null)
      setOrderId(null)
    }
  }, [open, start])

  const retry = () => {
    startedRef.current = false
    setError(null)
    setPhase('idle')
    start()
  }

  const elementsOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: 'stripe' as const,
              variables: {
                colorPrimary: '#406A56',
                colorText: '#2d2d2d',
                fontFamily: 'Inter Tight, system-ui, sans-serif',
                borderRadius: '12px',
              },
            },
          }
        : undefined,
    [clientSecret]
  )

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="bg-[#F2F1E5] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          style={{ fontFamily: 'Inter Tight, system-ui, sans-serif' }}
        >
          <div className="sticky top-0 bg-[#F2F1E5] border-b border-[#D3E1DF] px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2
              className="text-xl text-[#2d2d2d]"
              style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600 }}
            >
              Place your order
            </h2>
            {phase !== 'submitting' && phase !== 'finalizing' && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-11 h-11 rounded-full hover:bg-[#D3E1DF] flex items-center justify-center text-[#666]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6">
            <StepList phase={phase} progress={progress} />

            {phase === 'error' && (
              <div className="mt-6 bg-white border border-[#C35F33]/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#C35F33] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[#2d2d2d] font-medium mb-2">Something went wrong</p>
                    <p className="text-[#666] text-sm mb-4">{error}</p>
                    <button
                      onClick={retry}
                      className="bg-[#406A56] hover:bg-[#355a49] text-white font-medium px-5 py-3 rounded-xl min-h-[44px]"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'paying' && clientSecret && elementsOptions && (
              <div className="mt-6">
                <Elements stripe={getStripePromise()} options={elementsOptions}>
                  <PayForm
                    orderId={orderId!}
                    onSubmitting={() => setPhase('submitting')}
                    onFinalizing={() => setPhase('finalizing')}
                    onDone={() => setPhase('done')}
                    onError={msg => {
                      setError(msg)
                      setPhase('error')
                    }}
                  />
                </Elements>
              </div>
            )}

            {phase === 'done' && (
              <div className="mt-6 bg-white border border-[#406A56]/30 rounded-xl p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#406A56] mx-auto mb-4 flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <h3
                  className="text-xl text-[#2d2d2d] mb-2"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600 }}
                >
                  Your book is on its way to the printer!
                </h3>
                <p className="text-[#666] mb-4">
                  We&rsquo;ll email you a tracking link as soon as it ships.
                </p>
                {orderId && (
                  <p className="text-sm text-[#666] mb-5">
                    Order number: <span className="font-mono text-[#2d2d2d]">{orderId.slice(0, 8)}</span>
                  </p>
                )}
                <Link
                  href="/dashboard/orders"
                  className="inline-block bg-[#406A56] hover:bg-[#355a49] text-white font-medium px-6 py-3 rounded-xl min-h-[52px] leading-[28px]"
                >
                  View my orders
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StepList({ phase, progress }: { phase: Phase; progress: RenderProgress | null }) {
  const steps: Array<{ label: string; active: boolean; done: boolean }> = [
    {
      label:
        phase === 'preparing' && progress
          ? `Preparing page ${progress.current} of ${progress.total}...`
          : 'Preparing your book',
      active: phase === 'preparing',
      done: ['ordering', 'paying', 'submitting', 'finalizing', 'done'].includes(phase),
    },
    {
      label:
        phase === 'paying' || phase === 'submitting'
          ? 'Processing payment...'
          : 'Processing payment',
      active: phase === 'paying' || phase === 'submitting' || phase === 'ordering',
      done: ['finalizing', 'done'].includes(phase),
    },
    {
      label: phase === 'finalizing' ? 'Sending to the printer...' : 'Sending to the printer',
      active: phase === 'finalizing',
      done: phase === 'done',
    },
    {
      label: phase === 'done' ? 'Done — order confirmed!' : 'Done',
      active: phase === 'done',
      done: phase === 'done',
    },
  ]

  return (
    <ul className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              s.done
                ? 'bg-[#406A56] text-white'
                : s.active
                  ? 'bg-[#D3E1DF] text-[#406A56]'
                  : 'bg-white border border-[#D3E1DF] text-[#666]'
            }`}
          >
            {s.done ? (
              <Check className="w-4 h-4" />
            ) : s.active ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm font-medium">{i + 1}</span>
            )}
          </span>
          <span
            className={`text-base ${s.done || s.active ? 'text-[#2d2d2d]' : 'text-[#666]'}`}
          >
            {s.label}
          </span>
        </li>
      ))}
      {phase === 'preparing' && progress && (
        <li>
          <div className="mt-2 w-full h-2 bg-[#D3E1DF] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#406A56]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </li>
      )}
    </ul>
  )
}

function PayForm({
  orderId,
  onSubmitting,
  onFinalizing,
  onDone,
  onError,
}: {
  orderId: string
  onSubmitting: () => void
  onFinalizing: () => void
  onDone: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [ready, setReady] = useState(false)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    onSubmitting()

    const returnUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/orders/${orderId}`
        : ''

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message || 'Your card was not accepted. Please try again or use a different card.')
      return
    }

    if (paymentIntent && paymentIntent.status !== 'succeeded') {
      onError('Payment is still processing. We\'ll email you when it completes.')
      return
    }

    // Hand off to Prodigi
    onFinalizing()
    try {
      const resp = await fetch(`/api/photobook/order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_payment',
          payment_intent_id: paymentIntent?.id,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(
          data?.error ||
            'Your payment went through, but we hit a snag sending your book to the printer. Our team has been notified.'
        )
      }
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'We couldn\'t send your book to the printer. Our team has been notified.')
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="bg-white rounded-xl p-4 border border-[#D3E1DF]">
        <PaymentElement onReady={() => setReady(true)} />
      </div>
      <button
        type="submit"
        disabled={!stripe || !elements || !ready}
        className="w-full bg-[#406A56] hover:bg-[#355a49] disabled:bg-[#D3E1DF] disabled:text-[#666] text-white font-semibold rounded-xl min-h-[52px] text-lg"
      >
        Pay & place order
      </button>
      <p className="text-xs text-[#666] text-center">
        Your card is charged securely through Stripe. We never see your card number.
      </p>
    </form>
  )
}
