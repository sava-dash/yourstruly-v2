'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: React.ReactNode
}

/**
 * Accessible icon button wrapper
 * Ensures all icon-only buttons have proper aria-label
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D] focus-visible:ring-offset-2 ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

/**
 * Visually hidden text for screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: 'rect(0, 0, 0, 0)' }}
    >
      {children}
    </span>
  )
}

/**
 * Skip to main content link for keyboard users
 */
export function SkipToMain({ mainId = 'main-content' }: { mainId?: string }) {
  return (
    <a
      href={`#${mainId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#2D5A3D] focus:text-white focus:rounded-lg focus:outline-none"
    >
      Skip to main content
    </a>
  )
}
