'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className = '',
  variant = 'default',
  size = 'default',
  disabled,
  children,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D]/50 disabled:pointer-events-none disabled:opacity-50'
  
  const variantClasses = {
    default: 'bg-[#2D5A3D] text-white hover:bg-[#234A31]',
    outline: 'border border-[#2D5A3D]/20 bg-transparent text-[#2D5A3D] hover:bg-[#2D5A3D]/10',
    ghost: 'bg-transparent text-[#2D5A3D] hover:bg-[#2D5A3D]/10',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
    secondary: 'bg-[#F5F3EE] text-[#2D5A3D] hover:bg-[#E8E4D6]',
    link: 'text-[#2D5A3D] underline-offset-4 hover:underline bg-transparent',
  }
  
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-6 text-lg',
    icon: 'h-10 w-10',
  }

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
