'use client';

import { useState } from 'react';
import { FeatureFlag } from '@/types/admin';
import { 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Edit2,
  Globe,
  Users,
  Percent,
  MoreHorizontal
} from 'lucide-react';

interface FeatureFlagsListProps {
  flags: FeatureFlag[];
}

export default function FeatureFlagsList({ flags }: FeatureFlagsListProps) {
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const getTargetingIcon = (type: string) => {
    switch (type) {
      case 'global':
        return <Globe className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      case 'rollout':
        return <Percent className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const response = await fetch(`/api/admin/settings/feature-flags/${flag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to toggle flag:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#2a1f1a]">Feature Flags</h2>
          <p className="text-sm text-[#2a1f1a]/60">
            Enable or disable features and control rollouts
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Flag
        </button>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="glass p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#2a1f1a]">{flag.name}</h3>
                  {flag.enabled ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#2D5A3D]/10 text-[#2D5A3D]">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#2a1f1a]/60 mt-1">{flag.description}</p>
                <code className="text-xs text-[#2D5A3D] bg-[#2D5A3D]/5 px-2 py-1 rounded mt-2 inline-block">
                  {flag.key}
                </code>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(flag)}
                  className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                >
                  {flag.enabled ? (
                    <ToggleRight className="w-6 h-6 text-[#2D5A3D]" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-[#2a1f1a]/30" />
                  )}
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === flag.id ? null : flag.id)}
                    className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-[#2a1f1a]/50" />
                  </button>
                  
                  {dropdownOpen === flag.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setDropdownOpen(null)}
                      />
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-[#B8562E]/10 z-20 py-1">
                        <button
                          onClick={() => {
                            setEditingFlag(flag);
                            setDropdownOpen(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a1f1a] hover:bg-[#2D5A3D]/5 w-full text-left"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#B8562E]/10">
              <div className="flex items-center gap-1.5 text-sm text-[#2a1f1a]/60">
                {getTargetingIcon(flag.targeting_type)}
                <span className="capitalize">{flag.targeting_type}</span>
              </div>
              
              {flag.targeting_type === 'rollout' && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2D5A3D] rounded-full"
                      style={{ width: `${flag.rollout_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#2a1f1a]/60">
                    {flag.rollout_percentage}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {flags.length === 0 && (
        <div className="text-center py-12 glass">
          <p className="text-[#2a1f1a]/40">No feature flags configured yet</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 text-[#2D5A3D] hover:underline text-sm"
          >
            Create your first feature flag
          </button>
        </div>
      )}
    </div>
  );
}
