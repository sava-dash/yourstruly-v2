import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  User,
  Calendar,
  ArrowRight,
  Search,
  Filter
} from 'lucide-react';
import { VerificationFilters } from '@/components/admin/verifications/VerificationFilters';
import { formatDistanceToNow } from 'date-fns';

interface SearchParams {
  status?: string;
  page?: string;
  search?: string;
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = createAdminClient();

  const status = params.status || null;
  const page = parseInt(params.page || '1');
  const search = params.search || null;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('death_verifications')
    .select(`
      *,
      profiles:claimed_user_id (
        id,
        full_name,
        avatar_url,
        account_status
      )
    `, { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`claimant_name.ilike.%${search}%,claimant_email.ilike.%${search}%,deceased_name.ilike.%${search}%`);
  }

  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data: verifications, count } = await query;

  // Get status counts
  const { data: allVerifications } = await supabase
    .from('death_verifications')
    .select('status');

  const counts = {
    all: allVerifications?.length || 0,
    pending: allVerifications?.filter(v => v.status === 'pending').length || 0,
    approved: allVerifications?.filter(v => v.status === 'approved').length || 0,
    rejected: allVerifications?.filter(v => v.status === 'rejected').length || 0,
    needs_more_info: allVerifications?.filter(v => v.status === 'needs_more_info').length || 0,
  };

  const totalPages = Math.ceil((count || 0) / limit);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending Review' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Rejected' };
      case 'needs_more_info':
        return { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Needs Info' };
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">Death Verifications</h1>
          <p className="text-[#2a1f1a]/60 mt-1">
            Review and process death verification claims
          </p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-xl">
            <Clock className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">{counts.pending} pending</span>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="glass p-1 inline-flex rounded-xl">
        {[
          { key: null, label: 'All', count: counts.all },
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'needs_more_info', label: 'Needs Info', count: counts.needs_more_info },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'rejected', label: 'Rejected', count: counts.rejected },
        ].map((tab) => (
          <Link
            key={tab.key || 'all'}
            href={tab.key ? `/admin/verifications?status=${tab.key}` : '/admin/verifications'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab.key || (!status && !tab.key)
                ? 'bg-[#2D5A3D] text-white'
                : 'text-[#2a1f1a]/60 hover:text-[#2a1f1a] hover:bg-white/50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                status === tab.key || (!status && !tab.key)
                  ? 'bg-white/20'
                  : 'bg-[#2a1f1a]/10'
              }`}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Search */}
      <VerificationFilters currentSearch={search} currentStatus={status} />

      {/* Verifications List */}
      <div className="space-y-4">
        {verifications && verifications.length > 0 ? (
          verifications.map((verification: any) => {
            const statusConfig = getStatusConfig(verification.status);
            const StatusIcon = statusConfig.icon;

            return (
              <Link
                key={verification.id}
                href={`/admin/verifications/${verification.id}`}
                className="glass p-4 block hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar/Icon */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D]/20 to-[#B8562E]/20 flex items-center justify-center flex-shrink-0">
                    {verification.profiles?.avatar_url ? (
                      <img 
                        src={verification.profiles.avatar_url} 
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-[#2D5A3D]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#2a1f1a] group-hover:text-[#2D5A3D] transition-colors">
                          {verification.deceased_name}
                        </h3>
                        <p className="text-sm text-[#2a1f1a]/60">
                          Claimed by: {verification.claimant_name} ({verification.claimant_relationship})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {statusConfig.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#2a1f1a]/30 group-hover:text-[#2D5A3D] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-[#2a1f1a]/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        DOD: {new Date(verification.deceased_date_of_death).toLocaleDateString()}
                      </span>
                      <span>
                        Submitted {formatDistanceToNow(new Date(verification.created_at), { addSuffix: true })}
                      </span>
                      {verification.ai_confidence_score && (
                        <span className={`font-medium ${
                          verification.ai_confidence_score >= 80 ? 'text-green-600' :
                          verification.ai_confidence_score >= 60 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          AI: {verification.ai_confidence_score}%
                        </span>
                      )}
                      {verification.profiles && (
                        <span className="text-[#2D5A3D]">
                          ✓ Linked to profile
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="glass p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-[#2a1f1a]/20 mb-4" />
            <h3 className="font-medium text-[#2a1f1a]">No verifications found</h3>
            <p className="text-sm text-[#2a1f1a]/50 mt-1">
              {status ? `No ${status.replace('_', ' ')} verifications` : 'No verification requests yet'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/verifications?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
              className="px-4 py-2 rounded-lg bg-white/50 text-[#2a1f1a]/60 hover:bg-white hover:text-[#2a1f1a] transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-[#2a1f1a]/60">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/verifications?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
              className="px-4 py-2 rounded-lg bg-white/50 text-[#2a1f1a]/60 hover:bg-white hover:text-[#2a1f1a] transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
