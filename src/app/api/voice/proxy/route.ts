import { NextRequest } from 'next/server'

// WebSocket proxy to PersonaPlex server
// This allows browsers to connect via WSS (secure) through the app domain
// while the backend connects to the PersonaPlex server via plain WS on Tailscale

export const runtime = 'nodejs' // Required for WebSocket support

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade')
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 })
  }

  // Note: Next.js Edge Runtime doesn't support WebSocket upgrades yet
  // This will need to be handled by a separate WebSocket server or via a reverse proxy
  // For now, return instructions
  
  return new Response(
    JSON.stringify({
      error: 'WebSocket proxy not yet implemented',
      workaround: 'Use direct connection to PersonaPlex server',
      url: process.env.NEXT_PUBLIC_PERSONAPLEX_URL
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
