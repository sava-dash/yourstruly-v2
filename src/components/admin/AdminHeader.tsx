'use client';

import { AdminUser } from '@/types/admin';
import { Bell, Search, Command } from 'lucide-react';

interface AdminHeaderProps {
  admin: AdminUser;
}

export default function AdminHeader({ admin }: AdminHeaderProps) {
  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-[#B8562E]/10 bg-white/50 backdrop-blur-sm">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
          <input
            type="text"
            aria-label="Search" placeholder="Search users, orders, settings..."
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all placeholder:text-[#2a1f1a]/40"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#2a1f1a]/30">
            <Command className="w-3 h-3" />
            <span className="text-xs">K</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-white/80 transition-colors">
          <Bell className="w-5 h-5 text-[#2a1f1a]/60" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B8562E] rounded-full" />
        </button>

        {/* Quick actions */}
        <div className="h-6 w-px bg-[#B8562E]/10" />
        
        <span className="text-sm text-[#2a1f1a]/60">
          Welcome back, <span className="font-medium text-[#2a1f1a]">{admin.email?.split('@')[0]}</span>
        </span>
      </div>
    </header>
  );
}
