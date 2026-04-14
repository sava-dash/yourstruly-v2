'use client'

/**
 * QRPreview - Renders a QR code using the local `qrcode` library.
 *
 * Replaces the previous dependency on `api.qrserver.com`. Uses Error
 * Correction Level 'H' (~30% redundancy) so printed QR codes remain
 * scannable after wear, folds, or minor damage.
 */

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRPreviewProps {
  /** The string/URL to encode (e.g. a /view/{token} link). */
  value: string
  /** Display size in CSS pixels. Defaults to 64. */
  size?: number
  /** Optional className forwarded to the rendered <img>. */
  className?: string
  /** Optional alt text. Defaults to "QR code". */
  alt?: string
}

/**
 * Small client component that generates a QR data URL in an effect
 * and renders it as a plain <img>. Safe for print — generated at
 * 2x the display size for crisp editor previews.
 */
export default function QRPreview({
  value,
  size = 64,
  className,
  alt = 'QR code',
}: QRPreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!value) {
      setDataUrl(null)
      return
    }
    // Generate at 2x for sharp on-screen preview while keeping memory cheap.
    const renderPx = Math.max(64, Math.round(size * 2))
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: renderPx,
      color: { dark: '#1A1F1C', light: '#FFFFFF' },
    })
      .then(url => {
        if (!cancelled) {
          setDataUrl(url)
          setFailed(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error('QRPreview: failed to generate QR code', err)
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (failed) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#ffebee',
          color: '#c35f33',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontFamily: 'var(--font-inter-tight), Inter, sans-serif',
        }}
      >
        QR error
      </div>
    )
  }

  if (!dataUrl) {
    // Light placeholder while generating
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: '#F2F1E5',
        }}
      />
    )
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
