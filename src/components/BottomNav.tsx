'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, Users, User, Sparkles } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/my-story', icon: BookOpen, label: 'My Story' },
  { href: '/dashboard/about-me', icon: Sparkles, label: 'My Faves' },
  { href: '/dashboard/contacts', icon: Users, label: 'People' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-[#1A2B20]/95 backdrop-blur-lg border-t border-[#2D5A3D]/20 lg:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 ${
                active ? 'text-[#2D5A3D]' : 'text-[#8DACAB]'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
