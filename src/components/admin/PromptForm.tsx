'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  X,
  MessageSquare,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  PromptTemplateFormData,
  PROMPT_TYPES,
  KNOWLEDGE_CATEGORIES,
  INTERESTS,
  SKILLS,
  RELIGIONS,
  MISSING_INFO_FIELDS,
} from '@/types/engagement';

interface PromptFormProps {
  initialData?: PromptTemplateFormData;
  mode: 'create' | 'edit';
}

const emptyFormData: PromptTemplateFormData = {
  id: '',
  type: 'memory_prompt',
  category: '',
  subcategory: '',
  prompt_text: '',
  prompt_variations: [],
  target_interest: '',
  target_skill: '',
  target_hobby: '',
  target_religion: '',
  target_field: '',
  is_active: true,
  priority_boost: 0,
  cooldown_days: 30,
  seasonal_months: [],
  anniversary_based: false,
};

export default function PromptForm({ initialData, mode }: PromptFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PromptTemplateFormData>(
    initialData || emptyFormData
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newVariation, setNewVariation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = mode === 'create' 
        ? '/api/admin/engagement/prompts' 
        : `/api/admin/engagement/prompts/${formData.id}`;
      
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/engagement');
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save prompt');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const addVariation = () => {
    if (newVariation.trim()) {
      setFormData({
        ...formData,
        prompt_variations: [...formData.prompt_variations, newVariation.trim()],
      });
      setNewVariation('');
    }
  };

  const removeVariation = (index: number) => {
    setFormData({
      ...formData,
      prompt_variations: formData.prompt_variations.filter((_, i) => i !== index),
    });
  };

  const toggleSeasonalMonth = (month: number) => {
    const months = formData.seasonal_months.includes(month)
      ? formData.seasonal_months.filter((m) => m !== month)
      : [...formData.seasonal_months, month].sort();
    setFormData({ ...formData, seasonal_months: months });
  };

  const isMissingInfoType = formData.type === 'missing_info';
  const isKnowledgeType = formData.type === 'knowledge';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="glass p-4 bg-red-50/50 border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              {/* ID */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Template ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={mode === 'edit'}
                  placeholder="e.g., memory_cooking_001"
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm disabled:bg-gray-100"
                  required
                />
                <p className="text-xs text-[#2a1f1a]/40 mt-1">
                  Unique identifier for this prompt template
                </p>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Prompt Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                  required
                >
                  {PROMPT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Category
                </label>
                {isKnowledgeType ? (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                  >
                    <option value="">Select a category...</option>
                    {KNOWLEDGE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., cooking, travel"
                    className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                  />
                )}
              </div>

              {/* Prompt Text */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Prompt Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                  placeholder="What would you like to ask the user?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm resize-none"
                  required
                />
              </div>

              {/* Variations */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Alternative Phrasings
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newVariation}
                    onChange={(e) => setNewVariation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariation())}
                    placeholder="Add an alternative way to ask this..."
                    className="flex-1 px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addVariation}
                    className="px-4 py-2 rounded-xl bg-[#2D5A3D]/10 text-[#2D5A3D] hover:bg-[#2D5A3D]/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {formData.prompt_variations.length > 0 && (
                  <div className="space-y-2">
                    {formData.prompt_variations.map((variation, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/50 text-sm"
                      >
                        <span className="text-[#2a1f1a]/70">{variation}</span>
                        <button
                          type="button"
                          onClick={() => removeVariation(index)}
                          className="p-1 rounded hover:bg-red-50 text-[#2a1f1a]/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Targeting</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Interest */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Target Interest
                </label>
                <select
                  value={formData.target_interest}
                  onChange={(e) => setFormData({ ...formData, target_interest: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                >
                  <option value="">Any interest</option>
                  {INTERESTS.map((interest) => (
                    <option key={interest} value={interest}>
                      {interest.charAt(0).toUpperCase() + interest.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Target Skill
                </label>
                <select
                  value={formData.target_skill}
                  onChange={(e) => setFormData({ ...formData, target_skill: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                >
                  <option value="">Any skill</option>
                  {SKILLS.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Religion */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Target Religion
                </label>
                <select
                  value={formData.target_religion}
                  onChange={(e) => setFormData({ ...formData, target_religion: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                >
                  <option value="">Any religion</option>
                  {RELIGIONS.map((religion) => (
                    <option key={religion} value={religion}>
                      {religion.charAt(0).toUpperCase() + religion.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Missing Info Field */}
              {isMissingInfoType && (
                <div>
                  <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                    Missing Field
                  </label>
                  <select
                    value={formData.target_field}
                    onChange={(e) => setFormData({ ...formData, target_field: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                  >
                    <option value="">Select a field...</option>
                    {MISSING_INFO_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Behavior */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Behavior</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Priority Boost */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Priority Boost ({formData.priority_boost})
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={formData.priority_boost}
                  onChange={(e) => setFormData({ ...formData, priority_boost: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
                />
                <div className="flex justify-between text-xs text-[#2a1f1a]/40 mt-1">
                  <span>Normal</span>
                  <span>High Priority</span>
                </div>
              </div>

              {/* Cooldown Days */}
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                  Cooldown (days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={formData.cooldown_days}
                  onChange={(e) => setFormData({ ...formData, cooldown_days: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
                />
                <p className="text-xs text-[#2a1f1a]/40 mt-1">
                  Days before showing again after skip
                </p>
              </div>
            </div>

            {/* Seasonal Months */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-2">
                Seasonal Months (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                  (month, index) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleSeasonalMonth(index + 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formData.seasonal_months.includes(index + 1)
                          ? 'bg-[#2D5A3D] text-white'
                          : 'bg-white/50 text-[#2a1f1a]/60 hover:bg-white/80'
                      }`}
                    >
                      {month}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Anniversary Based */}
            <div className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="anniversary_based"
                checked={formData.anniversary_based}
                onChange={(e) => setFormData({ ...formData, anniversary_based: e.target.checked })}
                className="w-4 h-4 rounded border-[#B8562E]/20 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
              />
              <label htmlFor="anniversary_based" className="text-sm text-[#2a1f1a]/70">
                Show on memory anniversaries
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Status</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-[#B8562E]/20 cursor-pointer hover:bg-white/30 transition-colors">
                <input
                  type="radio"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={() => setFormData({ ...formData, is_active: true })}
                  className="w-4 h-4 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2a1f1a]">Active</p>
                  <p className="text-xs text-[#2a1f1a]/50">Prompt will be shown to users</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-xl border border-[#B8562E]/20 cursor-pointer hover:bg-white/30 transition-colors">
                <input
                  type="radio"
                  name="is_active"
                  checked={!formData.is_active}
                  onChange={() => setFormData({ ...formData, is_active: false })}
                  className="w-4 h-4 text-[#2D5A3D] focus:ring-[#2D5A3D]/20"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2a1f1a]">Inactive</p>
                  <p className="text-xs text-[#2a1f1a]/50">Prompt will be hidden from users</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="glass p-6">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-4">Preview</h3>
            
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm text-[#2D5A3D] hover:underline"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>

            {showPreview && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#2D5A3D]/5 to-[#B8562E]/5 border border-[#2D5A3D]/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2D5A3D]/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-[#2D5A3D]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#2a1f1a]">
                      {formData.prompt_text || 'Your prompt text will appear here...'}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] text-white text-xs font-medium"
                      >
                        Answer
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-white/50 text-[#2a1f1a]/60 text-xs font-medium"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="glass p-6">
            <div className="space-y-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : mode === 'create' ? 'Create Prompt' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/admin/engagement')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#B8562E]/20 text-[#2a1f1a]/70 rounded-xl text-sm font-medium hover:bg-white/50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
