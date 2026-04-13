import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import PromptTemplatesTable from '@/components/admin/PromptTemplatesTable';

export const metadata = {
  title: 'Engagement Prompts | YoursTruly Admin',
};

interface EngagementPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;

export default async function EngagementPage({ searchParams }: EngagementPageProps) {
  await requireAdmin();
  const params = await searchParams;
  
  const currentPage = parseInt(params.page || '1', 10);
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = createAdminClient();

  // Build query
  let query = supabase
    .from('prompt_templates')
    .select('*', { count: 'exact' });

  // Apply filters
  if (params.type && params.type !== 'all') {
    query = query.eq('type', params.type);
  }

  const category = (params as any).category;
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (params.search) {
    query = query.or(`prompt_text.ilike.%${params.search}%,id.ilike.%${params.search}%,category.ilike.%${params.search}%`);
  }

  // Apply pagination
  const { data: templates, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#2a1f1a]">Engagement Prompts</h1>
        <p className="text-[#2a1f1a]/60 mt-1">
          Manage prompt templates for micro-interactions and knowledge capture
        </p>
      </div>

      <PromptTemplatesTable
        templates={templates || []}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={count || 0}
      />
    </div>
  );
}
