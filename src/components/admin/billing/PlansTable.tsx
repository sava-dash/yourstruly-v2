'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Check, X, Crown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Plan {
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
  display_order: number;
}

interface PlansTableProps {
  onEdit: (plan: Plan) => void;
}

export default function PlansTable({ onEdit }: PlansTableProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/billing/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      const data = await response.json();
      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/billing/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update plan');
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`/api/admin/billing/plans/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete plan');
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plan');
    }
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
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Plan</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Price</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Interval</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Features</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Status</th>
              <th className="px-4 py-4 text-right text-sm font-medium text-[#2a1f1a]/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#B8562E]/5">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-white/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.is_default 
                        ? 'bg-gradient-to-br from-[#B8562E] to-[#C4A235]' 
                        : 'bg-[#2D5A3D]/10'
                    }`}>
                      {plan.is_default ? (
                        <Crown className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-medium text-[#2D5A3D]">
                          {plan.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#2a1f1a]">{plan.name}</p>
                      <p className="text-xs text-[#2a1f1a]/50">{plan.slug}</p>
                      {plan.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#B8562E] font-medium">
                          Default Plan
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-medium text-[#2a1f1a]">
                    {formatCurrency(plan.price_cents / 100, plan.currency)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#2D5A3D]/10 text-[#2D5A3D] capitalize">
                    {plan.interval}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {plan.features.slice(0, 2).map((feature, i) => (
                      <span 
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/50 text-[#2a1f1a]/70"
                      >
                        {feature}
                      </span>
                    ))}
                    {plan.features.length > 2 && (
                      <span className="text-xs text-[#2a1f1a]/50">
                        +{plan.features.length - 2} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleToggleActive(plan.id, plan.is_active)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      plan.is_active
                        ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {plan.is_active ? (
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
                      onClick={() => onEdit(plan)}
                      className="p-2 rounded-lg hover:bg-white/80 transition-colors text-[#2a1f1a]/50 hover:text-[#2D5A3D]"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
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

      {plans.length === 0 && (
        <div className="p-8 text-center text-[#2a1f1a]/50">
          No plans found. Create your first plan to get started.
        </div>
      )}
    </div>
  );
}
