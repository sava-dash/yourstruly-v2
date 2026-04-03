import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  CheckCircle,
  XCircle,
  Target,
  Clock,
  Calendar,
} from 'lucide-react';
import { PROMPT_TYPES } from '@/types/engagement';

interface PreviewPromptPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PreviewPromptPage({ params }: PreviewPromptPageProps) {
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

  const promptType = PROMPT_TYPES.find((pt) => pt.value === template.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/engagement"
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#2a1f1a]/60" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#2a1f1a]">Prompt Preview</h1>
            <p className="text-[#2a1f1a]/60 mt-1">
              <code className="text-[#2D5A3D]">{template.id}</code>
            </p>
          </div>
        </div>
        <Link
          href={`/admin/engagement/${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Prompt
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* How It Looks */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">How It Looks</h3>
            
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#2D5A3D]/5 to-[#B8562E]/5 border border-[#2D5A3D]/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D5A3D] to-[#B8562E] flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg text-[#2a1f1a] leading-relaxed">
                    {template.prompt_text}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <button className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-sm font-medium">
                      Answer
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-white/50 text-[#2a1f1a]/60 text-sm font-medium">
                      Skip for now
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-white/50 text-[#2a1f1a]/60 text-sm font-medium">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {template.prompt_variations && template.prompt_variations.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-[#2a1f1a]/60 mb-3">Alternative Phrasings</h4>
                <div className="space-y-2">
                  {template.prompt_variations.map((variation: string, index: number) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-white/50 text-sm text-[#2a1f1a]/80"
                    >
                      {variation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Type</p>
                <p className="text-sm font-medium text-[#2a1f1a] mt-1">
                  {promptType?.label || template.type}
                </p>
                {promptType?.description && (
                  <p className="text-xs text-[#2a1f1a]/50 mt-0.5">{promptType.description}</p>
                )}
              </div>
              
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-[#2a1f1a] mt-1 capitalize">
                  {template.category || 'None'}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Priority Boost</p>
                <p className="text-sm font-medium text-[#2a1f1a] mt-1">
                  {template.priority_boost > 0 ? `+${template.priority_boost}` : 'Normal'}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Cooldown</p>
                <p className="text-sm font-medium text-[#2a1f1a] mt-1">
                  {template.cooldown_days} days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Status</h3>
            
            <div className="flex items-center gap-3">
              {template.is_active ? (
                <>
                  <div className="p-2 rounded-full bg-[#2D5A3D]/10">
                    <CheckCircle className="w-5 h-5 text-[#2D5A3D]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#2D5A3D]">Active</p>
                    <p className="text-xs text-[#2a1f1a]/50">Shown to users</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-gray-100">
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-[#2a1f1a]/60">Inactive</p>
                    <p className="text-xs text-[#2a1f1a]/50">Hidden from users</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Targeting */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Targeting</h3>
            
            <div className="space-y-4">
              {template.target_interest && (
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-[#2D5A3D]" />
                  <div>
                    <p className="text-xs text-[#2a1f1a]/40">Interest</p>
                    <p className="text-sm text-[#2a1f1a] capitalize">{template.target_interest}</p>
                  </div>
                </div>
              )}
              
              {template.target_skill && (
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-[#2D5A3D]" />
                  <div>
                    <p className="text-xs text-[#2a1f1a]/40">Skill</p>
                    <p className="text-sm text-[#2a1f1a] capitalize">{template.target_skill.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}
              
              {template.target_religion && (
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-[#2D5A3D]" />
                  <div>
                    <p className="text-xs text-[#2a1f1a]/40">Religion</p>
                    <p className="text-sm text-[#2a1f1a] capitalize">{template.target_religion}</p>
                  </div>
                </div>
              )}
              
              {!template.target_interest && !template.target_skill && !template.target_religion && (
                <p className="text-sm text-[#2a1f1a]/50 italic">No targeting criteria set</p>
              )}
            </div>
          </div>

          {/* Scheduling */}
          {(template.seasonal_months?.length || template.anniversary_based) && (
            <div className="glass p-6">
              <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Scheduling</h3>
              
              <div className="space-y-4">
                {template.seasonal_months && template.seasonal_months.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#2D5A3D] mt-0.5" />
                    <div>
                      <p className="text-xs text-[#2a1f1a]/40">Seasonal Months</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.seasonal_months.map((month: number) => (
                          <span
                            key={month}
                            className="px-2 py-0.5 rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] text-xs"
                          >
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {template.anniversary_based && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#2D5A3D]" />
                    <div>
                      <p className="text-xs text-[#2a1f1a]/40">Anniversary Based</p>
                      <p className="text-sm text-[#2a1f1a]">Shown on memory anniversaries</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
