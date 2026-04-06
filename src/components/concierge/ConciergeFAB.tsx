'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { usePathname, useRouter } from 'next/navigation'

const AIConcierge = dynamic(() => import('./AIConcierge'), { ssr: false })

export default function ConciergeFAB() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleCreateMemory = (draft: any) => {
    if (pathname === '/dashboard') {
      window.dispatchEvent(new CustomEvent('concierge-create-memory', { detail: draft }))
    } else {
      sessionStorage.setItem('concierge-memory-draft', JSON.stringify(draft))
      router.push('/dashboard')
    }
  }

  return (
    <>
      {/* Floating button — bottom right, above bottom nav on mobile */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setOpen(true)}
            className="fixed z-50 w-14 h-14 rounded-full bg-[#2D5A3D] text-white shadow-lg shadow-[#2D5A3D]/30 flex items-center justify-center hover:bg-[#234A31] transition-all"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
              right: '20px',
            }}
            aria-label="Open AI Concierge"
          >
            <Sparkles size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Concierge overlay */}
      <AIConcierge
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreateMemory={handleCreateMemory}
      />
    </>
  )
}
