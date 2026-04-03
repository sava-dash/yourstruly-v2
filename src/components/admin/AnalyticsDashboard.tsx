'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Activity,
  Target,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  MousePointerClick,
} from 'lucide-react';

interface AnalyticsData {
  dau: number;
  mau: number;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
  totalMemories: number;
  totalTilesCompleted: number;
  totalXpEarned: number;
  engagementRate: number;
  dailyStats: Array<{
    date: string;
    active_users: number;
    new_users: number;
    memories_created: number;
    engagement_responses: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    xp: number;
  }>;
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  dateRange: { from: string; to: string };
}

const COLORS = ['#2D5A3D', '#B8562E', '#C4A235', '#8DACAB', '#4A3552'];

export default function AnalyticsDashboard({ data, dateRange }: AnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'engagement' | 'content'>('users');

  // Calculate engagement rate as a meaningful "change" metric
  const engagementPct = data.engagementRate > 0 ? `${data.engagementRate}% rate` : null;
  const userRatio = data.totalUsers > 0 ? `${data.totalUsers} total` : null;

  const statCards = [
    {
      title: 'Daily Active Users',
      value: data.dau.toLocaleString(),
      change: userRatio,
      changeType: 'neutral' as const,
      icon: Activity,
      color: '#2D5A3D',
    },
    {
      title: 'Monthly Active Users',
      value: data.mau.toLocaleString(),
      change: data.newUsers > 0 ? `+${data.newUsers} new` : null,
      changeType: data.newUsers > 0 ? 'positive' as const : 'neutral' as const,
      icon: Users,
      color: '#B8562E',
    },
    {
      title: 'Tiles Completed',
      value: data.totalTilesCompleted.toLocaleString(),
      change: engagementPct,
      changeType: 'neutral' as const,
      icon: MousePointerClick,
      color: '#C4A235',
    },
    {
      title: 'Total XP Earned',
      value: data.totalXpEarned.toLocaleString(),
      change: data.totalMemories > 0 ? `${data.totalMemories} memories` : null,
      changeType: 'neutral' as const,
      icon: Award,
      color: '#8DACAB',
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="glass p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#2a1f1a]/60">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#2a1f1a] mt-1">{stat.value}</p>
                </div>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
              {stat.change && (
                <div className="flex items-center gap-1 mt-3">
                  {stat.changeType === 'positive' && <TrendingUp className="w-3 h-3 text-[#2D5A3D]" />}
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-[#2D5A3D]' : 'text-[#2a1f1a]/50'
                  }`}>{stat.change}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Over Time */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#2a1f1a]">Activity Over Time</h3>
              <p className="text-sm text-[#2a1f1a]/60">Daily active users and new signups</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('users')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedMetric === 'users'
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-white/50 text-[#2a1f1a]/60 hover:bg-white/80'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setSelectedMetric('engagement')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedMetric === 'engagement'
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-white/50 text-[#2a1f1a]/60 hover:bg-white/80'
                }`}
              >
                Engagement
              </button>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyStats}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D5A3D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2D5A3D" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B8562E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B8562E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#2a1f1a"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#2a1f1a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(195,95,51,0.2)',
                    borderRadius: '12px',
                  }}
                  labelFormatter={(value) => formatDate(value as string)}
                />
                {selectedMetric === 'users' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="active_users"
                      stroke="#2D5A3D"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorActive)"
                      name="Active Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="new_users"
                      stroke="#B8562E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNew)"
                      name="New Users"
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="engagement_responses"
                      stroke="#C4A235"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNew)"
                      name="Responses"
                    />
                    <Area
                      type="monotone"
                      dataKey="memories_created"
                      stroke="#8DACAB"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorActive)"
                      name="Memories"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass p-6">
          <h3 className="text-lg font-semibold text-[#2a1f1a] mb-2">Category Breakdown</h3>
          <p className="text-sm text-[#2a1f1a]/60 mb-6">Engagement by prompt category</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {data.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(195,95,51,0.2)',
                    borderRadius: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4">
            {data.categoryBreakdown.slice(0, 5).map((cat, index) => (
              <div key={cat.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[#2a1f1a]/70 capitalize">{cat.category}</span>
                </div>
                <span className="font-medium text-[#2a1f1a]">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#2D5A3D]/10">
              <Target className="w-5 h-5 text-[#2D5A3D]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#2a1f1a]/60">Engagement Rate</p>
              <p className="text-xl font-bold text-[#2a1f1a]">{data.engagementRate}%</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2D5A3D] rounded-full transition-all"
              style={{ width: `${data.engagementRate}%` }}
            />
          </div>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#B8562E]/10">
              <Calendar className="w-5 h-5 text-[#B8562E]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#2a1f1a]/60">Total Memories</p>
              <p className="text-xl font-bold text-[#2a1f1a]">{data.totalMemories.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-[#2a1f1a]/50">Across all users</p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#C4A235]/10">
              <Clock className="w-5 h-5 text-[#8B7C00]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#2a1f1a]/60">Avg. Session</p>
              <p className="text-xl font-bold text-[#2a1f1a]">8m 42s</p>
            </div>
          </div>
          <p className="text-xs text-[#2a1f1a]/50">+1m 15s vs last week</p>
        </div>
      </div>
    </div>
  );
}
