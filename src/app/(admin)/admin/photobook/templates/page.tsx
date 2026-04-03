'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Layout,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
  Image,
  Type,
  QrCode,
  Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TemplateSlot {
  id: string;
  type: 'photo' | 'text' | 'qr';
  position: { x: number; y: number; width: number; height: number };
  required: boolean;
  placeholder?: string;
  style?: Record<string, unknown>;
}

interface Template {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  category: 'single' | 'multi' | 'special';
  min_photos: number;
  max_photos: number;
  slots: TemplateSlot[];
  background: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'single', label: 'Single Photo', description: '1 photo layouts' },
  { value: 'multi', label: 'Multi Photo', description: '2+ photo layouts' },
  { value: 'special', label: 'Special', description: 'QR, quotes, titles' },
];

const emptyTemplate: Omit<Template, 'id' | 'created_at'> = {
  template_id: '',
  name: '',
  description: '',
  category: 'single',
  min_photos: 1,
  max_photos: 1,
  slots: [],
  background: '#ffffff',
  thumbnail_url: null,
  sort_order: 0,
  is_enabled: true,
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Template, 'id' | 'created_at'>>(emptyTemplate);
  const [showForm, setShowForm] = useState(false);
  const [slotsJson, setSlotsJson] = useState('[]');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from('photobook_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setFormData({
      template_id: template.template_id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      min_photos: template.min_photos,
      max_photos: template.max_photos,
      slots: template.slots,
      background: template.background || '#ffffff',
      thumbnail_url: template.thumbnail_url,
      sort_order: template.sort_order,
      is_enabled: template.is_enabled,
    });
    setSlotsJson(JSON.stringify(template.slots, null, 2));
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setFormData({ ...emptyTemplate, sort_order: templates.length });
    setSlotsJson('[]');
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(emptyTemplate);
    setSlotsJson('[]');
    setShowForm(false);
  }

  async function handleSave() {
    setSaving(true);
    
    let parsedSlots: TemplateSlot[];
    try {
      parsedSlots = JSON.parse(slotsJson);
    } catch {
      alert('Invalid slots JSON');
      setSaving(false);
      return;
    }
    
    const dataToSave = {
      ...formData,
      slots: parsedSlots,
      description: formData.description || null,
      background: formData.background || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('photobook_templates')
        .update(dataToSave)
        .eq('id', editingId);
      
      if (error) {
        console.error('Error updating template:', error);
        alert('Failed to update template');
      }
    } else {
      const { error } = await supabase
        .from('photobook_templates')
        .insert([dataToSave]);
      
      if (error) {
        console.error('Error creating template:', error);
        alert('Failed to create template');
      }
    }
    
    setSaving(false);
    cancelEdit();
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    const { error } = await supabase
      .from('photobook_templates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    } else {
      fetchTemplates();
    }
  }

  async function toggleEnabled(template: Template) {
    const { error } = await supabase
      .from('photobook_templates')
      .update({ is_enabled: !template.is_enabled })
      .eq('id', template.id);
    
    if (error) {
      console.error('Error toggling template:', error);
    } else {
      fetchTemplates();
    }
  }

  const filteredTemplates = activeCategory
    ? templates.filter(t => t.category === activeCategory)
    : templates;

  const templatesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    templates: templates.filter(t => t.category === cat.value),
  }));

  function getSlotIcon(type: string) {
    switch (type) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'qr': return <QrCode className="w-4 h-4" />;
      default: return null;
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
            <h1 className="text-2xl font-bold text-[#2a1f1a]">Layout Templates</h1>
            <p className="text-[#2a1f1a]/60 mt-1">Page layout templates for the photobook editor</p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === null
              ? 'bg-[#2D5A3D] text-white'
              : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
          }`}
        >
          All ({templates.length})
        </button>
        {templatesByCategory.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-[#2D5A3D] text-white'
                : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
            }`}
          >
            {cat.label} ({cat.templates.length})
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">
            {editingId ? 'Edit Template' : 'New Template'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Template ID</label>
              <input
                type="text"
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="e.g., full-photo"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="e.g., Full Photo"
              />
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
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as 'single' | 'multi' | 'special' })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Background</label>
              <input
                type="text"
                value={formData.background || ''}
                onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="#ffffff or linear-gradient(...)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Min Photos</label>
              <input
                type="number"
                min="0"
                value={formData.min_photos}
                onChange={(e) => setFormData({ ...formData, min_photos: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Max Photos</label>
              <input
                type="number"
                min="0"
                value={formData.max_photos}
                onChange={(e) => setFormData({ ...formData, max_photos: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              />
            </div>
            
            <div className="flex items-center gap-2">
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
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                Slots (JSON)
                <span className="text-[#2a1f1a]/40 ml-2">Define photo, text, and QR slots</span>
              </label>
              <textarea
                value={slotsJson}
                onChange={(e) => setSlotsJson(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50 font-mono text-sm"
                placeholder='[{"id":"photo-1","type":"photo","position":{"x":0,"y":0,"width":100,"height":100},"required":true}]'
              />
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
              disabled={saving || !formData.template_id || !formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D5A3D]" />
            <p className="text-[#2a1f1a]/60 mt-2">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full p-12 text-center glass">
            <Layout className="w-12 h-12 mx-auto text-[#B8562E]/30" />
            <p className="text-[#2a1f1a]/60 mt-4">No templates yet</p>
            <button
              onClick={startNew}
              className="mt-4 text-[#2D5A3D] hover:underline"
            >
              Add your first template
            </button>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`glass p-4 ${!template.is_enabled ? 'opacity-50' : ''}`}
            >
              {/* Preview */}
              <div 
                className="aspect-square rounded-lg mb-4 relative overflow-hidden border border-[#B8562E]/10"
                style={{ background: template.background || '#ffffff' }}
              >
                {/* Render slot preview boxes */}
                {template.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="absolute border-2 border-dashed flex items-center justify-center"
                    style={{
                      left: `${slot.position.x}%`,
                      top: `${slot.position.y}%`,
                      width: `${slot.position.width}%`,
                      height: `${slot.position.height}%`,
                      borderColor: slot.type === 'photo' ? '#2D5A3D' : slot.type === 'text' ? '#B8562E' : '#4A3552',
                      backgroundColor: slot.type === 'photo' ? 'rgba(64, 106, 86, 0.1)' : slot.type === 'text' ? 'rgba(195, 95, 51, 0.1)' : 'rgba(74, 53, 82, 0.1)',
                    }}
                  >
                    <span className="text-[10px] font-mono opacity-50">
                      {slot.type === 'photo' ? '📷' : slot.type === 'text' ? 'Aa' : 'QR'}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Info */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-[#2a1f1a]">{template.name}</h3>
                  <p className="text-xs text-[#2a1f1a]/50">
                    {template.template_id}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  template.category === 'single' ? 'bg-[#2D5A3D]/10 text-[#2D5A3D]' :
                  template.category === 'multi' ? 'bg-[#B8562E]/10 text-[#B8562E]' :
                  'bg-[#4A3552]/10 text-[#4A3552]'
                }`}>
                  {template.category}
                </span>
              </div>
              
              <p className="text-sm text-[#2a1f1a]/60 mb-3 line-clamp-2">
                {template.description || 'No description'}
              </p>
              
              {/* Slot summary */}
              <div className="flex gap-2 mb-3">
                {['photo', 'text', 'qr'].map((type) => {
                  const count = template.slots.filter(s => s.type === type).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex items-center gap-1 text-xs text-[#2a1f1a]/50">
                      {getSlotIcon(type)}
                      <span>×{count}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#B8562E]/10">
                <button
                  onClick={() => toggleEnabled(template)}
                  className="flex items-center gap-1 text-sm"
                >
                  {template.is_enabled ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-[#2D5A3D]" />
                      <span className="text-[#2D5A3D]">Enabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-[#2a1f1a]/30" />
                      <span className="text-[#2a1f1a]/50">Disabled</span>
                    </>
                  )}
                </button>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(template)}
                    className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#B8562E] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
