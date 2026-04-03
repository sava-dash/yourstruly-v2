'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Mic, ImagePlus, BookOpen, PenLine } from 'lucide-react'

const ACTIONS = [
  { icon: Mic, label: 'Voice Memory', href: '/dashboard/memories/voice', color: 'bg-amber-600' },
  { icon: ImagePlus, label: 'Upload Photos', href: '/dashboard/gallery?upload=true', color: 'bg-blue-600' },
  { icon: BookOpen, label: 'Add Wisdom', href: '/dashboard/wisdom?new=true', color: 'bg-purple-600' },
  { icon: PenLine, label: 'Write Memory', href: '/dashboard/memories?new=true', color: 'bg-emerald-600' },
]

export default function QuickActionsFAB() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleAction = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex flex-col items-end gap-2">
      {/* Expanded actions */}
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.href)}
              className="flex items-center gap-2 group"
              aria-label={action.label}
            >
              <span className="text-sm text-neutral-300 bg-neutral-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                {action.label}
              </span>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${action.color} text-white shadow-lg transition-transform hover:scale-110`}>
                <action.icon className="h-5 w-5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main FAB toggle */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        aria-expanded={open}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${
          open
            ? 'bg-neutral-700 rotate-45 hover:bg-neutral-600'
            : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'
        }`}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
      </button>
    </div>
  )
}
