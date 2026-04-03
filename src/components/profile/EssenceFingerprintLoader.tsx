'use client'

import dynamic from 'next/dynamic'
import { EssenceVector } from '@/lib/essence'

// Dynamic import for code splitting (smaller initial bundle)
const EssenceFingerprint = dynamic(
  () => import('./EssenceFingerprint'),
  { 
    ssr: true, // SVG-based, safe for SSR
    loading: () => (
      <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
        <div className="w-16 h-16 rounded-full border-2 border-[#2D5A3D]/20 border-t-[#2D5A3D] animate-spin" />
      </div>
    )
  }
)

interface Props {
  essenceVector: EssenceVector
  size?: number
  className?: string
}

export default function EssenceFingerprintLoader({ essenceVector, size = 200, className = '' }: Props) {
  return <EssenceFingerprint essenceVector={essenceVector} size={size} className={className} />
}
