'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Check, X, Tag, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_redemptions: number | null;
  redemptions_count: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface CouponsTableProps {
  onEdit: (coupon: Coupon) => void;
}

export default function CouponsTable({ onEdit }: CouponsTableProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/admin/billing/coupons');
      if (!response.ok) throw new Error('Failed to fetch coupons');
      const data = await response.json();
      setCoupons(data.coupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/billing/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update coupon');
      fetchCoupons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await fetch(`/api/admin/billing/coupons/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete coupon');
      fetchCoupons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete coupon');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return formatCurrency(coupon.discount_value / 100);
  };

  const getUsageDisplay = (coupon: Coupon) => {
    if (coupon.max_redemptions) {
      return `${coupon.redemptions_count} / ${coupon.max_redemptions}`;
    }
    return `${coupon.redemptions_count} (unlimited)`;
  };

  if (isLoading) {
    return (
      <div className="glass p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-[#2D5A3D] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#B8562E]/10">
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Code</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Discount</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Usage</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Valid Period</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Status</th>
              <th className="px-4 py-4 text-right text-sm font-medium text-[#2a1f1a]/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#B8562E]/5">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-white/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C4A235]/10 flex items-center justify-center">
                      <Tag className="w-5 h-5 text-[#8B7C00]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#2a1f1a] font-mono">{coupon.code}</p>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1 rounded hover:bg-white/50 text-[#2a1f1a]/30 hover:text-[#2D5A3D] transition-colors"
                          title="Copy code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-[#2a1f1a]/50">{coupon.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-medium text-[#2a1f1a]">{getDiscountDisplay(coupon)}</span>
                  <span className="text-xs text-[#2a1f1a]/50 ml-1">
                    {coupon.discount_type === 'percentage' ? 'off' : ''}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#2D5A3D] rounded-full"
                        style={{ 
                          width: coupon.max_redemptions 
                            ? `${Math.min(100, (coupon.redemptions_count / coupon.max_redemptions) * 100)}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                    <span className="text-xs text-[#2a1f1a]/60">{getUsageDisplay(coupon)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-[#2a1f1a]/70">
                  <div className="flex flex-col">
                    <span>From: {format(new Date(coupon.starts_at), 'MMM d, yyyy')}</span>
                    {coupon.expires_at ? (
                      <span>To: {format(new Date(coupon.expires_at), 'MMM d, yyyy')}</span>
                    ) : (
                      <span className="text-[#2D5A3D]">No expiry</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      coupon.is_active
                        ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {coupon.is_active ? (
                      <>
                        <Check className="w-3 h-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Inactive
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(coupon)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors text-[#2a1f1a]/50 hover:text-[#2D5A3D]"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors text-[#2a1f1a]/50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {coupons.length === 0 && (
        <div className="p-8 text-center text-[#2a1f1a]/50">
          No coupons found. Create your first promo code to get started.
        </div>
      )}
    </div>
  );
}
