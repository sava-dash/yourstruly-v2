'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Crown, Check, X, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Subscriber {
  id: string;
  user_id: string;
  user_email: string;
  tier: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  cancel_at_period_end: boolean;
  current_period_end: string;
  created_at: string;
}

export default function SubscribersTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchSubscribers();
  }, [currentPage, statusFilter, search]);

  const fetchSubscribers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/billing/subscriptions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch subscribers');
      const data = await response.json();
      setSubscribers(data.subscribers);
      setTotalCount(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertCircle className="w-3 h-3" />
          Cancels Soon
        </span>
      );
    }

    const styles: Record<string, string> = {
      active: 'bg-[#2D5A3D]/10 text-[#2D5A3D]',
      trialing: 'bg-blue-100 text-blue-700',
      past_due: 'bg-amber-100 text-amber-700',
      unpaid: 'bg-red-100 text-red-700',
      canceled: 'bg-gray-100 text-gray-500',
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.canceled}`}>
        {status === 'active' && <Check className="w-3 h-3" />}
        {status === 'canceled' && <X className="w-3 h-3" />}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'premium' || tier === 'pro') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#C4A235]/20 text-[#8B7C00]">
          <Crown className="w-3 h-3" />
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {tier}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search" placeholder="Search by email..."
                className="w-full pl-10 pr-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all placeholder:text-[#2a1f1a]/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2a1f1a]/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#B8562E]/10">
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">User</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Plan</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Status</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Period Ends</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8562E]/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-[#2D5A3D] border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#2a1f1a]/50">
                    No subscribers found.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-[#2D5A3D]">
                            {(sub.user_email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-[#2a1f1a]">{sub.user_email}</p>
                          <p className="text-xs text-[#2a1f1a]/50">{sub.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getTierBadge(sub.tier)}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(sub.status, sub.cancel_at_period_end)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#2a1f1a]/70">
                      {sub.current_period_end
                        ? formatDistanceToNow(new Date(sub.current_period_end), { addSuffix: true })
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#2a1f1a]/70">
                      {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && !error && subscribers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-[#B8562E]/10">
            <p className="text-sm text-[#2a1f1a]/60">
              Showing {subscribers.length} of {totalCount} subscribers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[#2a1f1a]/60">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
