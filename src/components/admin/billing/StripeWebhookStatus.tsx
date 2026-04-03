'use client';

import { useState, useEffect } from 'react';
import { Webhook, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebhookEvent {
  id: string;
  event_type: string;
  processing_status: 'pending' | 'processed' | 'failed' | 'ignored';
  error_message: string | null;
  created_at: string;
}

interface WebhookStats {
  total24h: number;
  successful: number;
  failed: number;
  pending: number;
  lastReceived: string | null;
}

export default function StripeWebhookStatus() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWebhookData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/admin/billing/webhooks');
      if (!response.ok) throw new Error('Failed to fetch webhook data');
      const data = await response.json();
      setEvents(data.events);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load webhook data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWebhookData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWebhookData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'ignored':
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ignored':
        return 'bg-gray-50 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="glass p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#2D5A3D] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Webhook className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#2a1f1a]">{stats?.total24h || 0}</p>
              <p className="text-xs text-[#2a1f1a]/50">Total Events (24h)</p>
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#2a1f1a]">{stats?.successful || 0}</p>
              <p className="text-xs text-[#2a1f1a]/50">Successful</p>
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#2a1f1a]">{stats?.failed || 0}</p>
              <p className="text-xs text-[#2a1f1a]/50">Failed</p>
            </div>
          </div>
        </div>

        <div className="glass p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#2D5A3D]/10">
              <Clock className="w-5 h-5 text-[#2D5A3D]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#2a1f1a]">
                {stats?.lastReceived 
                  ? formatDistanceToNow(new Date(stats.lastReceived), { addSuffix: true })
                  : 'Never'}
              </p>
              <p className="text-xs text-[#2a1f1a]/50">Last Event</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="glass p-4">
        <h3 className="text-sm font-medium text-[#2a1f1a] mb-3">Webhook Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#B8562E]/5">
            <span className="text-[#2a1f1a]/60">Endpoint URL</span>
            <code className="px-2 py-1 bg-white/50 rounded text-xs">
              /api/webhooks/stripe
            </code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#B8562E]/5">
            <span className="text-[#2a1f1a]/60">Events Subscribed</span>
            <span className="text-[#2a1f1a]">customer.subscription.*, invoice.*, checkout.session.*</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#2a1f1a]/60">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle className="w-3 h-3" />
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="glass overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#B8562E]/10">
          <h3 className="text-sm font-medium text-[#2a1f1a]">Recent Events</h3>
          <button
            onClick={fetchWebhookData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#2D5A3D] hover:bg-[#2D5A3D]/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#B8562E]/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#2a1f1a]/60">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#2a1f1a]/60">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#2a1f1a]/60">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8562E]/5">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-white/50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono bg-white/50 px-2 py-1 rounded">
                      {event.event_type}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.processing_status)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusClass(event.processing_status)}`}>
                        {event.processing_status}
                      </span>
                    </div>
                    {event.error_message && (
                      <p className="text-xs text-red-600 mt-1">{event.error_message}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#2a1f1a]/70">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {events.length === 0 && (
          <div className="p-8 text-center text-[#2a1f1a]/50">
            No webhook events in the last 24 hours.
          </div>
        )}
      </div>
    </div>
  );
}
