'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, Mic, Users, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/dashboard/memories', icon: BookOpen, label: 'Memories' },
  { href: '/dashboard/memories/voice', icon: Mic, label: 'Record', fab: true },
  { href: '/dashboard/contacts', icon: Users, label: 'People' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 lg:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-end justify-around h-16 px-2">
        {tabs.map(({ href, icon: Icon, label, fab }) => {
          const active = isActive(href)

          if (fab) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center -mt-5"
                aria-label={label}
              >
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-[#3D6B52] shadow-lg shadow-[#3D6B52]/40">
                  <Icon size={24} className="text-white" />
                </span>
                <span className="text-[10px] mt-1 text-[#3D6B52]">{label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 ${
                active ? 'text-[#3D6B52]' : 'text-neutral-500'
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
