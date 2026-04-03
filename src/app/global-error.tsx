'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#FAFAF7', color: '#1A1F1C', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, padding: '2rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something unexpected happened</h1>
          <p style={{ color: '#5A6660', marginBottom: '1.5rem', maxWidth: '400px' }}>
            We&apos;re sorry about that. Please try again or head back home.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '0.6rem 1.5rem', backgroundColor: '#2D5A3D', color: '#FFFFFF', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{ padding: '0.6rem 1.5rem', backgroundColor: 'transparent', color: '#2D5A3D', border: '1px solid #DDE3DF', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
