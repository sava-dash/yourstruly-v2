import { requireAdmin } from '@/lib/admin/auth';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default async function ModerationPage() {
  await requireAdmin();

  const stats = [
    { label: 'Pending Review', value: '0', icon: Clock, color: 'text-yellow-600' },
    { label: 'Flagged Content', value: '0', icon: AlertTriangle, color: 'text-[#B8562E]' },
    { label: 'Approved Today', value: '0', icon: CheckCircle, color: 'text-[#2D5A3D]' },
    { label: 'Total Reviews', value: '0', icon: Shield, color: 'text-[#4A3552]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2a1f1a]">Content Moderation</h1>
        <p className="text-[#2a1f1a]/60 mt-1">Review and moderate user-generated content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10">
            <div className="flex items-center justify-between">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#2a1f1a] mt-2">{stat.value}</p>
            <p className="text-sm text-[#2a1f1a]/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Queue placeholder */}
      <div className="p-12 bg-white/40 backdrop-blur-sm rounded-xl border border-[#B8562E]/10 text-center">
        <Shield className="w-16 h-16 mx-auto text-[#2D5A3D]/30" />
        <h3 className="text-lg font-medium text-[#2a1f1a] mt-4">Moderation Queue Empty</h3>
        <p className="text-[#2a1f1a]/60 mt-2 max-w-md mx-auto">
          No content pending review. Flagged memories, messages, and uploads will appear here.
        </p>
      </div>
    </div>
  );
}
