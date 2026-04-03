import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PromptForm from '@/components/admin/PromptForm';

export const metadata = {
  title: 'Edit Prompt | YoursTruly Admin',
};

interface EditPromptPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPromptPage({ params }: EditPromptPageProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  const { data: template } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (!template) {
    notFound();
  }

  const formData = {
    id: template.id,
    type: template.type,
    category: template.category || '',
    subcategory: template.subcategory || '',
    prompt_text: template.prompt_text,
    prompt_variations: template.prompt_variations || [],
    target_interest: template.target_interest || '',
    target_skill: template.target_skill || '',
    target_hobby: template.target_hobby || '',
    target_religion: template.target_religion || '',
    target_field: template.target_field || '',
    is_active: template.is_active,
    priority_boost: template.priority_boost,
    cooldown_days: template.cooldown_days,
    seasonal_months: template.seasonal_months || [],
    anniversary_based: template.anniversary_based,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#2a1f1a]">Edit Engagement Prompt</h1>
        <p className="text-[#2a1f1a]/60 mt-1">
          Update prompt template: <code className="text-[#2D5A3D]">{id}</code>
        </p>
      </div>

      <PromptForm initialData={formData} mode="edit" />
    </div>
  );
}
