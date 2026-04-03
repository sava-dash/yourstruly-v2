import { requirePermission } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import UsersTable from '@/components/admin/UsersTable';
import { Search, Filter, Download, UserPlus } from 'lucide-react';

interface UsersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    subscription?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requirePermission('users:read');
  const params = await searchParams;
  
  const supabase = createAdminClient();
  
  const page = parseInt(params.page || '1', 10);
  const pageSize = 20;
  const search = params.search || '';
  const status = params.status || 'all';
  const subscription = params.subscription || 'all';

  // Build query
  let query = supabase
    .from('profiles')
    .select('*, subscriptions(tier, status)', { count: 'exact' });

  // Apply search filter
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Apply status filter
  if (status !== 'all') {
    // You would typically have an is_active field on profiles
    // For now, we'll skip this filter
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: users, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to fetch users:', error);
  }

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2a1f1a]">User Management</h1>
          <p className="text-[#2a1f1a]/60 mt-1">
            Manage user accounts, subscriptions, and permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm font-medium text-[#2a1f1a] hover:bg-white transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4">
        <form className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[280px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                aria-label="Search" placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all placeholder:text-[#2a1f1a]/40"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2a1f1a]/40" />
            <select
              name="status"
              defaultValue={status}
              className="px-3 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Subscription Filter */}
          <select
            name="subscription"
            defaultValue={subscription}
            className="px-3 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 transition-all"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="pro">Pro</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-[#2D5A3D]/10 text-[#2D5A3D] rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/20 transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Users Table */}
      <UsersTable 
        users={users || []} 
        currentPage={page}
        totalPages={totalPages}
        totalCount={count || 0}
      />
    </div>
  );
}
