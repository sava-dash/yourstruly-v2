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
      <body style={{ backgroundColor: '#111', color: '#f5f0e8', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, padding: '2rem', textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something unexpected happened</h1>
          <p style={{ color: '#a8a29e', marginBottom: '1.5rem', maxWidth: '400px' }}>
            We&apos;re sorry about that. Please try again or head back home.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '0.6rem 1.5rem', backgroundColor: '#d4a574', color: '#111', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{ padding: '0.6rem 1.5rem', backgroundColor: 'transparent', color: '#d4a574', border: '1px solid #d4a574', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
