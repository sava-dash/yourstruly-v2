'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface PlanFormProps {
  plan?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price_cents: number;
    currency: string;
    interval: 'month' | 'year' | 'lifetime';
    features: string[];
    limits: Record<string, number | boolean>;
    is_active: boolean;
    is_default: boolean;
  } | null;
  onClose: () => void;
}

export default function PlanForm({ plan, onClose }: PlanFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price_cents: plan ? plan.price_cents / 100 : 0,
    currency: plan?.currency || 'USD',
    interval: plan?.interval || 'month',
    features: plan?.features?.join('\n') || '',
    is_active: plan?.is_active ?? true,
    is_default: plan?.is_default ?? false,
    max_memories: (plan?.limits?.max_memories as number) || 50,
    max_voice_clones: (plan?.limits?.max_voice_clones as number) || 1,
    max_storage_mb: (plan?.limits?.max_storage_mb as number) || 100,
    family_sharing: (plan?.limits?.family_sharing as boolean) || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        price_cents: Math.round(formData.price_cents * 100),
        features: formData.features.split('\n').filter(f => f.trim()),
        limits: {
          max_memories: formData.max_memories,
          max_voice_clones: formData.max_voice_clones,
          max_storage_mb: formData.max_storage_mb,
          family_sharing: formData.family_sharing,
        },
      };

      const url = plan 
        ? `/api/admin/billing/plans/${plan.id}` 
        : '/api/admin/billing/plans';
      
      const response = await fetch(url, {
        method: plan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save plan');
      }

      onClose();
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#B8562E]/10 bg-white/80 backdrop-blur-sm rounded-t-2xl">
          <h2 className="text-xl font-semibold text-[#2a1f1a]">
            {plan ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5 text-[#2a1f1a]/50" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
                placeholder="e.g., Premium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                disabled={!!plan}
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 disabled:bg-gray-100"
                placeholder="e.g., premium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2a1f1a]">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              placeholder="Brief description of the plan"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price_cents}
                onChange={(e) => setFormData({ ...formData, price_cents: parseFloat(e.target.value) })}
                required
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Interval</label>
              <select
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value as 'month' | 'year' | 'lifetime' })}
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2a1f1a]">Features (one per line)</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 resize-none"
              placeholder="Unlimited memories&#10;Priority support&#10;Family sharing"
            />
          </div>

          <div className="border-t border-[#B8562E]/10 pt-4">
            <h3 className="text-sm font-medium text-[#2a1f1a] mb-4">Plan Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#2a1f1a]/70">Max Memories (-1 for unlimited)</label>
                <input
                  type="number"
                  value={formData.max_memories}
                  onChange={(e) => setFormData({ ...formData, max_memories: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#2a1f1a]/70">Max Voice Clones</label>
                <input
                  type="number"
                  value={formData.max_voice_clones}
                  onChange={(e) => setFormData({ ...formData, max_voice_clones: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#2a1f1a]/70">Storage (MB)</label>
                <input
                  type="number"
                  value={formData.max_storage_mb}
                  onChange={(e) => setFormData({ ...formData, max_storage_mb: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="family_sharing"
                  checked={formData.family_sharing}
                  onChange={(e) => setFormData({ ...formData, family_sharing: e.target.checked })}
                  className="rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
                />
                <label htmlFor="family_sharing" className="text-sm text-[#2a1f1a]/70">
                  Enable Family Sharing
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-[#B8562E]/10">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
              />
              <label htmlFor="is_active" className="text-sm text-[#2a1f1a]">
                Active
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
              />
              <label htmlFor="is_default" className="text-sm text-[#2a1f1a]">
                Default Plan
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm font-medium text-[#2a1f1a] hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
