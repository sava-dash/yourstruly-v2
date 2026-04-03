'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CouponFormProps {
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    max_redemptions: number | null;
    min_purchase_cents: number | null;
    starts_at: string;
    expires_at: string | null;
    is_active: boolean;
  } | null;
  onClose: () => void;
}

export default function CouponForm({ coupon, onClose }: CouponFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon ? 
      (coupon.discount_type === 'percentage' ? coupon.discount_value : coupon.discount_value / 100) 
      : 20,
    max_redemptions: coupon?.max_redemptions || '',
    min_purchase_cents: coupon?.min_purchase_cents ? coupon.min_purchase_cents / 100 : '',
    starts_at: coupon?.starts_at ? new Date(coupon.starts_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expires_at: coupon?.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : '',
    is_active: coupon?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        discount_value: formData.discount_type === 'percentage' 
          ? formData.discount_value 
          : Math.round((formData.discount_value as number) * 100),
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions as string) : null,
        min_purchase_cents: formData.min_purchase_cents ? Math.round((formData.min_purchase_cents as number) * 100) : null,
        expires_at: formData.expires_at || null,
      };

      const url = coupon 
        ? `/api/admin/billing/coupons/${coupon.id}` 
        : '/api/admin/billing/coupons';
      
      const response = await fetch(url, {
        method: coupon ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save coupon');
      }

      onClose();
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coupon');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-lg glass bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#B8562E]/10">
          <h2 className="text-xl font-semibold text-[#2a1f1a]">
            {coupon ? 'Edit Coupon' : 'Create Coupon'}
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2a1f1a]">Coupon Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              disabled={!!coupon}
              className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 disabled:bg-gray-100"
              placeholder="e.g., SUMMER20"
            />
            <p className="text-xs text-[#2a1f1a]/50">Code will be converted to uppercase</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#2a1f1a]">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              placeholder="e.g., Summer sale - 20% off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed_amount' })}
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">
                Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.discount_type === 'percentage' ? '100' : undefined}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                required
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Max Redemptions (optional)</label>
              <input
                type="number"
                min="1"
                value={formData.max_redemptions}
                onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                placeholder="Unlimited"
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Min Purchase ($, optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_purchase_cents}
                onChange={(e) => setFormData({ ...formData, min_purchase_cents: e.target.value })}
                placeholder="No minimum"
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Start Date</label>
              <input
                type="date"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                required
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#2a1f1a]">Expiry Date (optional)</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-4 py-2 bg-white/80 border border-[#B8562E]/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#B8562E]/10">
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
              {coupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
