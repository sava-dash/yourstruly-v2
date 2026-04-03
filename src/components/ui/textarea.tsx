'use client'

import { forwardRef, TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className = '',
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D] ${className}`}
      {...props}
    />
  )
})

Textarea.displayName = 'Textarea'

export { Textarea }
