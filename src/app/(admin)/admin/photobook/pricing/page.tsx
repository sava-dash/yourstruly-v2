'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
  Percent,
  Truck,
  Tag,
  Gift
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PricingRule {
  id: string;
  name: string;
  description: string | null;
  pricing_type: 'markup' | 'shipping' | 'discount' | 'addon';
  markup_percentage: number | null;
  region: string | null;
  flat_rate: number | null;
  per_item_rate: number | null;
  free_threshold: number | null;
  discount_code: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  min_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
}

const PRICING_TYPES = [
  { value: 'markup', label: 'Markup', icon: Percent, description: 'Base markup percentage' },
  { value: 'shipping', label: 'Shipping', icon: Truck, description: 'Shipping rates by region' },
  { value: 'discount', label: 'Discount', icon: Tag, description: 'Discount codes' },
  { value: 'addon', label: 'Add-on', icon: Gift, description: 'Additional services' },
];

const emptyPricing: Omit<PricingRule, 'id' | 'created_at' | 'current_uses'> = {
  name: '',
  description: '',
  pricing_type: 'markup',
  markup_percentage: 30,
  region: null,
  flat_rate: null,
  per_item_rate: null,
  free_threshold: null,
  discount_code: null,
  discount_percentage: null,
  discount_amount: null,
  min_order_value: null,
  max_uses: null,
  valid_from: null,
  valid_until: null,
  config: {},
  is_enabled: true,
};

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<PricingRule, 'id' | 'created_at' | 'current_uses'>>(emptyPricing);
  const [showForm, setShowForm] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    const { data, error } = await supabase
      .from('photobook_pricing')
      .select('*')
      .order('pricing_type', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching pricing rules:', error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }

  function startEdit(rule: PricingRule) {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      pricing_type: rule.pricing_type,
      markup_percentage: rule.markup_percentage,
      region: rule.region,
      flat_rate: rule.flat_rate,
      per_item_rate: rule.per_item_rate,
      free_threshold: rule.free_threshold,
      discount_code: rule.discount_code,
      discount_percentage: rule.discount_percentage,
      discount_amount: rule.discount_amount,
      min_order_value: rule.min_order_value,
      max_uses: rule.max_uses,
      valid_from: rule.valid_from,
      valid_until: rule.valid_until,
      config: rule.config,
      is_enabled: rule.is_enabled,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setFormData(emptyPricing);
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(emptyPricing);
    setShowForm(false);
  }

  async function handleSave() {
    setSaving(true);
    
    const dataToSave = {
      ...formData,
      description: formData.description || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('photobook_pricing')
        .update(dataToSave)
        .eq('id', editingId);
      
      if (error) {
        console.error('Error updating pricing rule:', error);
        alert('Failed to update pricing rule');
      }
    } else {
      const { error } = await supabase
        .from('photobook_pricing')
        .insert([dataToSave]);
      
      if (error) {
        console.error('Error creating pricing rule:', error);
        alert('Failed to create pricing rule');
      }
    }
    
    setSaving(false);
    cancelEdit();
    fetchRules();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    
    const { error } = await supabase
      .from('photobook_pricing')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting pricing rule:', error);
      alert('Failed to delete pricing rule');
    } else {
      fetchRules();
    }
  }

  async function toggleEnabled(rule: PricingRule) {
    const { error } = await supabase
      .from('photobook_pricing')
      .update({ is_enabled: !rule.is_enabled })
      .eq('id', rule.id);
    
    if (error) {
      console.error('Error toggling rule:', error);
    } else {
      fetchRules();
    }
  }

  const filteredRules = activeType
    ? rules.filter(r => r.pricing_type === activeType)
    : rules;

  function getTypeIcon(type: string) {
    const typeConfig = PRICING_TYPES.find(t => t.value === type);
    if (!typeConfig) return DollarSign;
    return typeConfig.icon;
  }

  function renderRuleDetails(rule: PricingRule) {
    switch (rule.pricing_type) {
      case 'markup':
        return (
          <span className="text-[#2D5A3D] font-semibold">
            {rule.markup_percentage}% markup
          </span>
        );
      case 'shipping':
        return (
          <span className="text-[#2a1f1a]/70">
            {rule.region}: ${rule.flat_rate} flat
            {rule.free_threshold && ` (free over $${rule.free_threshold})`}
          </span>
        );
      case 'discount':
        return (
          <span className="text-[#B8562E]">
            {rule.discount_code}: {rule.discount_percentage ? `${rule.discount_percentage}%` : `$${rule.discount_amount}`} off
            {rule.max_uses && ` (${rule.current_uses}/${rule.max_uses} uses)`}
          </span>
        );
      case 'addon':
        return (
          <span className="text-[#4A3552]">
            ${rule.flat_rate || 0}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/photobook"
            className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#2a1f1a]">Pricing Configuration</h1>
            <p className="text-[#2a1f1a]/60 mt-1">Markup, shipping, and discount rules</p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveType(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeType === null
              ? 'bg-[#2D5A3D] text-white'
              : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
          }`}
        >
          All ({rules.length})
        </button>
        {PRICING_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setActiveType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeType === type.value
                  ? 'bg-[#2D5A3D] text-white'
                  : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label} ({rules.filter(r => r.pricing_type === type.value).length})
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">
            {editingId ? 'Edit Pricing Rule' : 'New Pricing Rule'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="e.g., Default Markup"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Type</label>
              <select
                value={formData.pricing_type}
                onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value as 'markup' | 'shipping' | 'discount' | 'addon' })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              >
                {PRICING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Description</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="Brief description"
              />
            </div>
            
            {/* Markup fields */}
            {formData.pricing_type === 'markup' && (
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Markup Percentage</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.markup_percentage || 0}
                  onChange={(e) => setFormData({ ...formData, markup_percentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                />
              </div>
            )}
            
            {/* Shipping fields */}
            {formData.pricing_type === 'shipping' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Region</label>
                  <input
                    type="text"
                    value={formData.region || ''}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                    placeholder="e.g., US, EU, INTL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Flat Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.flat_rate || ''}
                    onChange={(e) => setFormData({ ...formData, flat_rate: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Per Item Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.per_item_rate || ''}
                    onChange={(e) => setFormData({ ...formData, per_item_rate: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Free Shipping Threshold ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.free_threshold || ''}
                    onChange={(e) => setFormData({ ...formData, free_threshold: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
              </>
            )}
            
            {/* Discount fields */}
            {formData.pricing_type === 'discount' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Discount Code</label>
                  <input
                    type="text"
                    value={formData.discount_code || ''}
                    onChange={(e) => setFormData({ ...formData, discount_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                    placeholder="e.g., SAVE20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Discount Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discount_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || null, discount_amount: null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">OR Fixed Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_amount || ''}
                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || null, discount_percentage: null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Min Order Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_order_value || ''}
                    onChange={(e) => setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Max Uses</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.max_uses || ''}
                    onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </>
            )}
            
            {/* Addon fields */}
            {formData.pricing_type === 'addon' && (
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.flat_rate || ''}
                  onChange={(e) => setFormData({ ...formData, flat_rate: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                />
              </div>
            )}
            
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/50"
              />
              <label htmlFor="is_enabled" className="text-sm font-medium text-[#2a1f1a]/70">
                Enabled
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#B8562E]/10">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-[#2a1f1a]/70 hover:text-[#2a1f1a] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="glass">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D5A3D]" />
            <p className="text-[#2a1f1a]/60 mt-2">Loading pricing rules...</p>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-[#B8562E]/30" />
            <p className="text-[#2a1f1a]/60 mt-4">No pricing rules yet</p>
            <button
              onClick={startNew}
              className="mt-4 text-[#2D5A3D] hover:underline"
            >
              Add your first pricing rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#B8562E]/10">
            {filteredRules.map((rule) => {
              const Icon = getTypeIcon(rule.pricing_type);
              return (
                <div
                  key={rule.id}
                  className={`flex items-center gap-4 p-4 hover:bg-white/30 transition-colors ${
                    !rule.is_enabled ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    rule.pricing_type === 'markup' ? 'bg-[#2D5A3D]/10' :
                    rule.pricing_type === 'shipping' ? 'bg-[#8DACAB]/20' :
                    rule.pricing_type === 'discount' ? 'bg-[#B8562E]/10' :
                    'bg-[#4A3552]/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      rule.pricing_type === 'markup' ? 'text-[#2D5A3D]' :
                      rule.pricing_type === 'shipping' ? 'text-[#8DACAB]' :
                      rule.pricing_type === 'discount' ? 'text-[#B8562E]' :
                      'text-[#4A3552]'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#2a1f1a]">{rule.name}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-[#2D5A3D]/10 text-[#2D5A3D] capitalize">
                        {rule.pricing_type}
                      </span>
                    </div>
                    <p className="text-sm text-[#2a1f1a]/60 truncate">
                      {rule.description || renderRuleDetails(rule)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {renderRuleDetails(rule)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEnabled(rule)}
                      className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                      title={rule.is_enabled ? 'Disable' : 'Enable'}
                    >
                      {rule.is_enabled ? (
                        <ToggleRight className="w-5 h-5 text-[#2D5A3D]" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-[#2a1f1a]/30" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => startEdit(rule)}
                      className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#B8562E] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
