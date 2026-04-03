import { requireAdmin } from '@/lib/admin/auth';
import { getAuditStats } from '@/lib/admin/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  Users, 
  UserPlus, 
  Activity, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  CheckCircle,
  MessageSquare,
  Image,
  Heart
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = createAdminClient(); // Use admin client to bypass RLS
  
  // Fetch stats - wrap in try/catch for missing tables
  let totalUsers = 0, newUsersToday = 0, activeSubscriptions = 0;
  let totalMemories = 0, totalContacts = 0, totalInterviews = 0;
  let auditStats: { totalActions: number; actionsByType: Record<string, number>; topAdmins: Array<{ admin_email: string; count: number }> } = { totalActions: 0, actionsByType: {}, topAdmins: [] };

  try {
    const [
      usersResult,
      newUsersResult,
      subscriptionsResult,
      memoriesResult,
      contactsResult,
      interviewsResult,
      auditResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase.from('memories').select('*', { count: 'exact', head: true }),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('*', { count: 'exact', head: true }),
      getAuditStats(7),
    ]);
    
    totalUsers = usersResult.count || 0;
    newUsersToday = newUsersResult.count || 0;
    activeSubscriptions = subscriptionsResult.count || 0;
    totalMemories = memoriesResult.count || 0;
    totalContacts = contactsResult.count || 0;
    totalInterviews = interviewsResult.count || 0;
    auditStats = auditResult;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
  }

  const statsCards = [
    {
      title: 'Total Users',
      value: totalUsers.toLocaleString(),
      change: newUsersToday > 0 ? `+${newUsersToday} today` : 'No new today',
      changeType: newUsersToday > 0 ? 'positive' : 'neutral' as const,
      icon: Users,
      color: 'from-[#2D5A3D] to-[#4A7A66]',
    },
    {
      title: 'Total Memories',
      value: totalMemories.toLocaleString(),
      change: 'All time',
      changeType: 'neutral' as const,
      icon: Image,
      color: 'from-[#B8562E] to-[#D37F53]',
    },
    {
      title: 'Contacts',
      value: totalContacts.toLocaleString(),
      change: 'Loved ones added',
      changeType: 'neutral' as const,
      icon: Heart,
      color: 'from-[#4A3552] to-[#5A4562]',
    },
    {
      title: 'Interviews',
      value: totalInterviews.toLocaleString(),
      change: 'Conversations',
      changeType: 'neutral' as const,
      icon: MessageSquare,
      color: 'from-[#8DACAB] to-[#9DBCBD]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-[#2a1f1a]">
          Welcome back, {admin.email?.split('@')[0]}
        </h1>
        <p className="text-[#2a1f1a]/60 mt-1">
          Here&apos;s what&apos;s happening with your platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="glass p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#2a1f1a]/60">{stat.title}</p>
                  <p className="text-3xl font-bold text-[#2a1f1a] mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4">
                {stat.changeType === 'positive' && (
                  <ArrowUpRight className="w-4 h-4 text-[#2D5A3D]" />
                )}
                {stat.changeType === 'negative' && (
                  <ArrowDownRight className="w-4 h-4 text-[#B8562E]" />
                )}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-[#2D5A3D]' : 
                  stat.changeType === 'negative' ? 'text-[#B8562E]' : 
                  'text-[#2a1f1a]/60'
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#2a1f1a]">Recent Admin Activity</h2>
            <a href="/admin/settings?tab=audit" className="text-sm text-[#2D5A3D] hover:underline">
              View all
            </a>
          </div>
          
          <div className="space-y-4">
            {auditStats.topAdmins.slice(0, 5).map((adminActivity, index) => (
              <div
                key={adminActivity.admin_email}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#2D5A3D]">
                    {adminActivity.admin_email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2a1f1a]">
                    {adminActivity.admin_email}
                  </p>
                  <p className="text-xs text-[#2a1f1a]/50">
                    {adminActivity.count} actions this week
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#2a1f1a]/40">
                  <Clock className="w-3 h-3" />
                  <span>Active</span>
                </div>
              </div>
            ))}
            
            {auditStats.topAdmins.length === 0 && (
              <div className="text-center py-8 text-[#2a1f1a]/40">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No admin activity recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-[#2a1f1a] mb-6">Quick Actions</h2>
          
          <div className="space-y-3">
            <QuickAction
              href="/admin/users"
              icon={Users}
              label="Manage Users"
              description="View and edit user accounts"
            />
            <QuickAction
              href="/admin/settings"
              icon={ShieldAlert}
              label="Feature Flags"
              description="Toggle platform features"
            />
            <QuickAction
              href="/admin/analytics"
              icon={TrendingUp}
              label="View Analytics"
              description="Check platform metrics"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-[#B8562E]/10">
            <h3 className="text-sm font-medium text-[#2a1f1a]/60 mb-3">Actions by Type</h3>
            <div className="space-y-2">
              {Object.entries(auditStats.actionsByType)
                .slice(0, 4)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between text-sm">
                    <span className="text-[#2a1f1a]/70 capitalize">
                      {action.replace(/:/g, ' ')}
                    </span>
                    <span className="font-medium text-[#2a1f1a]">{count}</span>
                  </div>
                ))}
              {Object.keys(auditStats.actionsByType).length === 0 && (
                <p className="text-sm text-[#2a1f1a]/40 italic">No actions recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-[#2D5A3D]/10 group-hover:bg-[#2D5A3D]/20 transition-colors">
        <Icon className="w-4 h-4 text-[#2D5A3D]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#2a1f1a]">{label}</p>
        <p className="text-xs text-[#2a1f1a]/50">{description}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-[#2a1f1a]/30 group-hover:text-[#2D5A3D] transition-colors" />
    </a>
  );
}
