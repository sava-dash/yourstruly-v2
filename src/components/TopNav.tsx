'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SlideUpLink, { SlideUpButton } from '@/components/SlideUpLink'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import { DashboardTourTrigger } from '@/components/dashboard/DashboardTour'
import { 
  User as UserIcon, 
  Users, 
  Home,
  Settings,
  LogOut,
  Camera,
  MessageSquare,
  Gift,
  FolderOpen,
  ChevronDown,
  Menu,
  X,
  Lightbulb,
  Mail,
  BookOpen,
  UsersRound,
  ShoppingBag,
  Bell,
} from 'lucide-react'

interface Profile {
  full_name?: string
  avatar_url?: string
}

interface TopNavProps {
  user: User
  profile: Profile | null
}

// Top-level nav items (just Home now - others are dropdowns)
const primaryNav = [
  { href: '/dashboard', label: 'Home', icon: Home },
]

// My Story dropdown - content about you
const myStoryItems = [
  { href: '/dashboard/life', label: 'Your Life', icon: UsersRound },
  { href: '/dashboard/feed', label: 'Timeline', icon: BookOpen },
  { href: '/dashboard/memories', label: 'Memories', icon: Camera },
  { href: '/dashboard/wisdom', label: 'Wisdom', icon: Lightbulb },
  { href: '/dashboard/gallery', label: 'Gallery', icon: FolderOpen },
]

// Tools dropdown - utilities + postscripts + books
const toolsItems = [
  { href: '/dashboard/journalist', label: 'Interviews', icon: MessageSquare },
  { href: '/dashboard/postscripts', label: 'PostScripts', icon: Gift },
  { href: '/dashboard/photobook/create', label: 'Create Book', icon: BookOpen },
]

// People dropdown - who you share with
const peopleItems = [
  { href: '/dashboard/contacts', label: 'Contacts', icon: Users },
  { href: '/dashboard/circles', label: 'Circles', icon: UsersRound },
]

// Right-side icon buttons
const rightIcons = [
  { href: '/dashboard/messages', icon: Mail, label: 'Messages' },
  { href: '/marketplace', icon: ShoppingBag, label: 'Shop' },
]

export default function TopNav({ user, profile }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [myStoryOpen, setMyStoryOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const myStoryRef = useRef<HTMLDivElement>(null)
  const peopleRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Fetch unread activity count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/activity?limit=10')
        if (res.ok) {
          const data = await res.json()
          const sharedTypes = ['memory_shared', 'wisdom_shared', 'circle_message', 'circle_invite', 'circle_content']
          const count = (data.activities || []).filter((a: any) => sharedTypes.includes(a.type)).length
          setUnreadCount(count)
        }
      } catch {}
    }
    fetchUnread()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (myStoryRef.current && !myStoryRef.current.contains(e.target as Node)) setMyStoryOpen(false)
      if (peopleRef.current && !peopleRef.current.contains(e.target as Node)) setPeopleOpen(false)
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (activityRef.current && !activityRef.current.contains(e.target as Node)) setActivityOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 glass-nav z-50 px-4 font-inter-tight">
        <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between">
          
          {/* Left: Logo + Primary Nav */}
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="mr-4 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/images/logo-yours.png" 
                alt="YoursTruly" 
                className="h-7 w-auto"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Primary items - slide-up text + underline animation like Webflow */}
              {primaryNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <div key={item.href} className="mx-3">
                    <SlideUpLink
                      href={item.href}
                      isActive={isActive}
                      className="text-sm"
                    >
                      {item.label}
                    </SlideUpLink>
                  </div>
                )
              })}

              {/* My Story Dropdown */}
              <div ref={myStoryRef} className="relative mx-3">
                <SlideUpButton
                  onClick={() => { setMyStoryOpen(!myStoryOpen); setPeopleOpen(false); setToolsOpen(false) }}
                  isActive={myStoryItems.some(i => pathname === i.href)}
                  className="text-sm"
                  suffix={<ChevronDown size={14} className={`transition-transform ${myStoryOpen ? 'rotate-180' : ''}`} />}
                >
                  My Story
                </SlideUpButton>
                
                {myStoryOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 glass-modal rounded-refined p-1.5 dropdown-menu" role="menu">
                    {myStoryItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMyStoryOpen(false)}
                          role="menuitem"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-[#C35F33]/15 text-[#C35F33]'
                              : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Tools Dropdown */}
              <div ref={toolsRef} className="relative mx-3">
                <SlideUpButton
                  onClick={() => { setToolsOpen(!toolsOpen); setMyStoryOpen(false); setPeopleOpen(false) }}
                  isActive={toolsItems.some(i => pathname === i.href)}
                  className="text-sm"
                  suffix={<ChevronDown size={14} className={`transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />}
                >
                  Tools
                </SlideUpButton>
                
                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 glass-modal rounded-refined p-1.5 dropdown-menu" role="menu">
                    {toolsItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      const isDisabled = 'disabled' in item && Boolean(item.disabled)
                      return (
                        <Link
                          key={item.href}
                          href={isDisabled ? '#' : item.href}
                          onClick={(e) => {
                            if (isDisabled) e.preventDefault()
                            else setToolsOpen(false)
                          }}
                          role="menuitem"
                          aria-disabled={isDisabled || undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-[#C35F33]/15 text-[#C35F33]'
                              : isDisabled
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                          {isDisabled && (
                            <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* People Dropdown */}
              <div ref={peopleRef} className="relative mx-3">
                <SlideUpButton
                  onClick={() => { setPeopleOpen(!peopleOpen); setMyStoryOpen(false); setToolsOpen(false) }}
                  isActive={peopleItems.some(i => pathname === i.href)}
                  className="text-sm"
                  suffix={<ChevronDown size={14} className={`transition-transform ${peopleOpen ? 'rotate-180' : ''}`} />}
                >
                  People
                </SlideUpButton>
                
                {peopleOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 glass-modal rounded-refined p-1.5 dropdown-menu" role="menu">
                    {peopleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setPeopleOpen(false)}
                          role="menuitem"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-[#C35F33]/15 text-[#C35F33]'
                              : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Icon Buttons + User Menu */}
          <div className="flex items-center gap-1">
            {/* Activity Bell - Desktop */}
            <div ref={activityRef} className="relative hidden lg:block">
              <button
                onClick={() => setActivityOpen(!activityOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                  activityOpen ? 'bg-[#C35F33]/15 text-[#C35F33]' : 'text-gray-500 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                }`}
                title="Activity"
                aria-label="Notifications"
                aria-expanded={activityOpen}
                aria-haspopup="true"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#F31260] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {activityOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-full right-0 mt-2 w-[360px] z-50"
                  >
                    <ActivityFeed />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages & Shop Icons - Desktop */}
            {rightIcons.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hidden lg:flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : 'text-gray-500 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                  title={item.label}
                  aria-label={item.label === 'Shop' ? 'Marketplace' : item.label}
                >
                  <Icon size={18} />
                </Link>
              )
            })}

            {/* Divider */}
            <div className="hidden lg:block w-px h-6 bg-black/10 mx-2" />

            {/* User Dropdown */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg text-gray-600 hover:bg-[#C35F33]/5 transition-all"
                aria-label="User menu"
                aria-expanded={userOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C35F33] to-[#D9C61A] flex items-center justify-center text-white font-semibold text-sm">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden xl:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {profile?.full_name || 'Welcome'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${userOpen ? 'rotate-180' : ''}`} />
              </button>

              {userOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 glass-modal rounded-refined p-1.5 dropdown-menu" role="menu">
                  <div className="px-3 py-2 border-b border-[#C35F33]/10 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'Welcome!'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33] transition-all"
                    role="menuitem"
                  >
                    <UserIcon size={16} />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33] transition-all"
                    role="menuitem"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <div onClick={() => setUserOpen(false)}>
                    <DashboardTourTrigger />
                  </div>
                  <div className="border-t border-[#C35F33]/10 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-[#C35F33]/5 transition-all"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 glass-modal z-40 overflow-y-auto">
          <div className="p-4 space-y-1">
            {/* Primary items (Home) */}
            {primaryNav.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* My Story Section */}
            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-[#C35F33]/60 uppercase tracking-wider">My Story</p>
            </div>
            {myStoryItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Tools Section */}
            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-[#C35F33]/60 uppercase tracking-wider">Tools</p>
            </div>
            {toolsItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isDisabled = 'disabled' in item && Boolean(item.disabled)
              return (
                <Link
                  key={item.href}
                  href={isDisabled ? '#' : item.href}
                  onClick={(e) => {
                    if (isDisabled) e.preventDefault()
                    else setMobileOpen(false)
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : isDisabled
                      ? 'text-gray-400'
                      : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {isDisabled && (
                    <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded">Soon</span>
                  )}
                </Link>
              )
            })}

            {/* People Section */}
            <div className="pt-3 pb-1">
              <p className="px-4 text-xs font-semibold text-[#C35F33]/60 uppercase tracking-wider">People</p>
            </div>
            {peopleItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="border-t border-[#C35F33]/10 my-3" />

            {/* Activity in mobile */}
            <Link
              href="/dashboard/activity"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]`}
            >
              <Bell size={20} />
              <span>Activity</span>
              {unreadCount > 0 && (
                <span className="ml-auto w-5 h-5 bg-[#F31260] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Messages & Shop in mobile */}
            {rightIcons.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all ${
                    isActive
                      ? 'bg-[#C35F33]/15 text-[#C35F33]'
                      : 'text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33]'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="border-t border-[#C35F33]/10 my-3" />
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base text-gray-600 hover:bg-[#C35F33]/5 hover:text-[#C35F33] transition-all"
            >
              <Settings size={20} />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
