'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminUser, AdminRole, hasPermission } from '@/types/admin';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CreditCard,
  ShoppingBag,
  Brain,
  Puzzle,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  BookOpen,
  HeartHandshake,
  Mail,
} from 'lucide-react';

interface AdminSidebarProps {
  admin: AdminUser;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users, permission: 'users:read' },
  { label: 'Verifications', href: '/admin/verifications', icon: HeartHandshake, permission: 'moderation:read' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, permission: 'analytics:read' },
  { label: 'Billing', href: '/admin/billing', icon: CreditCard, permission: 'billing:read' },
  { label: 'Marketplace', href: '/admin/marketplace', icon: ShoppingBag, permission: 'marketplace:read' },
  { label: 'Photobooks', href: '/admin/photobook', icon: BookOpen, permission: 'marketplace:read' },
  { label: 'AI Config', href: '/admin/ai', icon: Brain, permission: 'ai:read' },
  { label: 'Engagement', href: '/admin/engagement', icon: Puzzle, permission: 'engagement:read' },
  { label: 'Email Templates', href: '/admin/email-templates', icon: Mail, permission: 'settings:read' },
  { label: 'Moderation', href: '/admin/moderation', icon: ShieldAlert, permission: 'moderation:read' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings:read' },
];

export default function AdminSidebar({ admin }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(admin.role, item.permission);
  });

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`relative flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Glass background */}
      <div className="absolute inset-0 glass border-r border-white/50" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[#B8562E]/10">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D5A3D] to-[#4A3552] flex items-center justify-center shadow-lg flex-shrink-0">
              <Crown className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-[#2a1f1a] leading-tight">YoursTruly</span>
                <span className="text-xs text-[#B8562E] font-medium">Admin Portal</span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                    : 'text-[#2a1f1a]/70 hover:bg-white/50 hover:text-[#2a1f1a]'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  active ? 'bg-[#2D5A3D]/20' : 'bg-transparent group-hover:bg-white/50'
                }`}>
                  <Icon className={`w-5 h-5 ${active ? 'text-[#2D5A3D]' : 'text-[#2a1f1a]/60'}`} />
                </div>
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto bg-[#B8562E] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[#B8562E]/10">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B8562E] to-[#2D5A3D] flex items-center justify-center text-white font-medium flex-shrink-0">
              {admin.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2a1f1a] truncate">
                  {admin.email}
                </p>
                <p className="text-xs text-[#B8562E] capitalize">
                  {admin.role.replace('_', ' ')}
                </p>
              </div>
            )}
            {!collapsed && (
              <form action="/admin/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#B8562E] transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-white border border-[#B8562E]/20 shadow-md flex items-center justify-center text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors z-20"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}
