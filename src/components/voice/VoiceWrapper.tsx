'use client'

import { VoiceProvider } from '@/components/voice/VoiceContext'

/**
 * Client-side wrapper for the voice system.
 * VoiceOverlay removed — replaced by AI Concierge in BottomNav.
 */
export default function VoiceWrapper({ children }: { children: React.ReactNode }) {
  return (
    <VoiceProvider>
      {children}
    </VoiceProvider>
  )
}
