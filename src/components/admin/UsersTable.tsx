'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  MoreHorizontal, 
  Edit, 
  Ban, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Crown,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email?: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  subscriptions?: Array<{
    tier: string;
    status: string;
  }>;
}

interface UsersTableProps {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function UsersTable({ 
  users, 
  currentPage, 
  totalPages,
  totalCount 
}: UsersTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const getSubscriptionBadge = (subscriptions?: User['subscriptions']) => {
    if (!subscriptions || subscriptions.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <User className="w-3 h-3" />
          Free
        </span>
      );
    }

    const sub = subscriptions[0];
    const isActive = sub.status === 'active';

    if (sub.tier === 'premium' || sub.tier === 'pro') {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isActive 
            ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          <Crown className="w-3 h-3" />
          {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-[#C4A235]/10 text-[#8B7C00]' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1)}
      </span>
    );
  };

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#B8562E]/10">
              <th className="px-4 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
                />
              </th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">User</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Subscription</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Joined</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Status</th>
              <th className="px-4 py-4 text-right text-sm font-medium text-[#2a1f1a]/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#B8562E]/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/50 transition-colors">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleSelectUser(user.id)}
                    className="rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-[#2D5A3D]">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-[#2a1f1a]">
                        {user.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-[#2a1f1a]/50">{user.email || 'No email'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {getSubscriptionBadge(user.subscriptions)}
                </td>
                <td className="px-4 py-4 text-sm text-[#2a1f1a]/70">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#2D5A3D]/10 text-[#2D5A3D]">
                    Active
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === user.id ? null : user.id)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-[#2a1f1a]/50" />
                    </button>
                    
                    {dropdownOpen === user.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setDropdownOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-[#B8562E]/10 z-20 py-1">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a1f1a] hover:bg-[#2D5A3D]/5"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Link>
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a1f1a] hover:bg-[#2D5A3D]/5"
                          >
                            <Edit className="w-4 h-4" />
                            Edit User
                          </Link>
                          <hr className="my-1 border-[#B8562E]/10" />
                          <button className="flex items-center gap-2 px-4 py-2 text-sm text-[#B8562E] hover:bg-[#B8562E]/5 w-full text-left">
                            <Ban className="w-4 h-4" />
                            Suspend
                          </button>
                          <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-[#B8562E]/10">
        <p className="text-sm text-[#2a1f1a]/60">
          Showing {users.length} of {totalCount} users
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users?page=${Math.max(1, currentPage - 1)}`}
            className={`p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors ${
              currentPage === 1 ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm text-[#2a1f1a]/60">
            Page {currentPage} of {totalPages || 1}
          </span>
          <Link
            href={`/admin/users?page=${Math.min(totalPages, currentPage + 1)}`}
            className={`p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors ${
              currentPage === totalPages || totalPages === 0 ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
