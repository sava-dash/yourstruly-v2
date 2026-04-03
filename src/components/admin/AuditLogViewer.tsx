'use client';

import { useState, useEffect } from 'react';
import { AuditLog } from '@/types/admin';
import { getAuditLogs } from '@/lib/admin/audit';
import { formatDistanceToNow } from 'date-fns';
import { 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  User,
  Settings,
  Flag,
  Shield,
  CreditCard,
  Brain,
  Puzzle
} from 'lucide-react';

const ENTITY_ICONS: Record<string, React.ElementType> = {
  user: User,
  system_setting: Settings,
  feature_flag: Flag,
  admin_user: Shield,
  subscription: CreditCard,
  ai_model: Brain,
  engagement: Puzzle,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-[#2D5A3D]/10 text-[#2D5A3D]',
  update: 'bg-[#C4A235]/10 text-[#8B7C00]',
  delete: 'bg-[#B8562E]/10 text-[#B8562E]',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-600',
  suspend: 'bg-red-100 text-red-700',
  toggle: 'bg-purple-100 text-purple-700',
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({
    action: '',
    entityType: '',
    search: '',
  });

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs(
        {
          action: filter.action || undefined,
          entityType: filter.entityType || undefined,
          search: filter.search || undefined,
        },
        page,
        pageSize
      );
      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const actionType = action.split(':')[1] || action;
    return ACTION_COLORS[actionType] || 'bg-gray-100 text-gray-600';
  };

  const getEntityIcon = (entityType: string) => {
    const Icon = ENTITY_ICONS[entityType] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2a1f1a]">Audit Logs</h2>
          <p className="text-sm text-[#2a1f1a]/60">
            Track all administrative actions and changes
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm font-medium text-[#2a1f1a] hover:bg-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2a1f1a]/40" />
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="px-3 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="toggle">Toggle</option>
            </select>
          </div>

          <select
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
            className="px-3 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
          >
            <option value="">All Entities</option>
            <option value="user">User</option>
            <option value="admin_user">Admin</option>
            <option value="feature_flag">Feature Flag</option>
            <option value="system_setting">System Setting</option>
            <option value="subscription">Subscription</option>
          </select>

          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            aria-label="Search" placeholder="Search..."
            className="px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#B8562E]/10">
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Action</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Entity</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Admin</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8562E]/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/50 transition-colors">
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[#2a1f1a]/50">
                        {getEntityIcon(log.entity_type)}
                      </span>
                      <span className="text-sm text-[#2a1f1a]">
                        {log.entity_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center">
                        <span className="text-xs font-medium text-[#2D5A3D]">
                          {(log.admin_email || 'S').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-[#2a1f1a]">
                        {log.admin_email || 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#2a1f1a]/60">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-[#B8562E]/10">
          <p className="text-sm text-[#2a1f1a]/60">
            Showing {logs.length} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[#2a1f1a]/60">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
