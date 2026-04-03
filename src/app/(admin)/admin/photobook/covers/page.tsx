'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Palette,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
  BookOpen,
  Image,
  Type,
  QrCode
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CoverElement {
  type: 'photo' | 'text' | 'qr';
  id: string;
  position: { x: number; y: number; width: number; height: number };
  style?: Record<string, unknown>;
}

interface CoverDesign {
  id: string;
  name: string;
  description: string | null;
  cover_type: 'front' | 'back' | 'spine';
  thumbnail_url: string | null;
  background: string;
  elements: CoverElement[];
  text_placeholders: Record<string, string>;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
}

const COVER_TYPES = [
  { value: 'front', label: 'Front Cover', icon: '📖' },
  { value: 'back', label: 'Back Cover', icon: '📕' },
  { value: 'spine', label: 'Spine', icon: '📗' },
];

const emptyCover: Omit<CoverDesign, 'id' | 'created_at'> = {
  name: '',
  description: '',
  cover_type: 'front',
  thumbnail_url: null,
  background: '#ffffff',
  elements: [],
  text_placeholders: {},
  sort_order: 0,
  is_enabled: true,
};

export default function CoversPage() {
  const [covers, setCovers] = useState<CoverDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<CoverDesign, 'id' | 'created_at'>>(emptyCover);
  const [showForm, setShowForm] = useState(false);
  const [elementsJson, setElementsJson] = useState('[]');
  const [placeholdersJson, setPlaceholdersJson] = useState('{}');
  const [activeType, setActiveType] = useState<string | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    fetchCovers();
  }, []);

  async function fetchCovers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('photobook_cover_designs')
      .select('*')
      .order('cover_type', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching covers:', error);
    } else {
      setCovers(data || []);
    }
    setLoading(false);
  }

  function startEdit(cover: CoverDesign) {
    setEditingId(cover.id);
    setFormData({
      name: cover.name,
      description: cover.description || '',
      cover_type: cover.cover_type,
      thumbnail_url: cover.thumbnail_url,
      background: cover.background,
      elements: cover.elements,
      text_placeholders: cover.text_placeholders,
      sort_order: cover.sort_order,
      is_enabled: cover.is_enabled,
    });
    setElementsJson(JSON.stringify(cover.elements, null, 2));
    setPlaceholdersJson(JSON.stringify(cover.text_placeholders, null, 2));
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setFormData({ ...emptyCover, sort_order: covers.length });
    setElementsJson('[]');
    setPlaceholdersJson('{}');
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData(emptyCover);
    setElementsJson('[]');
    setPlaceholdersJson('{}');
    setShowForm(false);
  }

  async function handleSave() {
    setSaving(true);
    
    let parsedElements: CoverElement[];
    let parsedPlaceholders: Record<string, string>;
    
    try {
      parsedElements = JSON.parse(elementsJson);
      parsedPlaceholders = JSON.parse(placeholdersJson);
    } catch {
      alert('Invalid JSON in elements or placeholders');
      setSaving(false);
      return;
    }
    
    const dataToSave = {
      ...formData,
      elements: parsedElements,
      text_placeholders: parsedPlaceholders,
      description: formData.description || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('photobook_cover_designs')
        .update(dataToSave)
        .eq('id', editingId);
      
      if (error) {
        console.error('Error updating cover:', error);
        alert('Failed to update cover design');
      }
    } else {
      const { error } = await supabase
        .from('photobook_cover_designs')
        .insert([dataToSave]);
      
      if (error) {
        console.error('Error creating cover:', error);
        alert('Failed to create cover design');
      }
    }
    
    setSaving(false);
    cancelEdit();
    fetchCovers();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this cover design?')) return;
    
    const { error } = await supabase
      .from('photobook_cover_designs')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting cover:', error);
      alert('Failed to delete cover design');
    } else {
      fetchCovers();
    }
  }

  async function toggleEnabled(cover: CoverDesign) {
    const { error } = await supabase
      .from('photobook_cover_designs')
      .update({ is_enabled: !cover.is_enabled })
      .eq('id', cover.id);
    
    if (error) {
      console.error('Error toggling cover:', error);
    } else {
      fetchCovers();
    }
  }

  const filteredCovers = activeType
    ? covers.filter(c => c.cover_type === activeType)
    : covers;

  function getElementIcon(type: string) {
    switch (type) {
      case 'photo': return <Image className="w-3 h-3" />;
      case 'text': return <Type className="w-3 h-3" />;
      case 'qr': return <QrCode className="w-3 h-3" />;
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
            <h1 className="text-2xl font-bold text-[#2a1f1a]">Cover Designs</h1>
            <p className="text-[#2a1f1a]/60 mt-1">Front and back cover templates</p>
          </div>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl hover:bg-[#4A7A66] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Cover
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveType(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeType === null
              ? 'bg-[#2D5A3D] text-white'
              : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
          }`}
        >
          All ({covers.length})
        </button>
        {COVER_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setActiveType(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeType === type.value
                ? 'bg-[#2D5A3D] text-white'
                : 'bg-white/50 text-[#2a1f1a]/70 hover:bg-white/80'
            }`}
          >
            <span>{type.icon}</span>
            {type.label} ({covers.filter(c => c.cover_type === type.value).length})
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">
            {editingId ? 'Edit Cover Design' : 'New Cover Design'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="e.g., Classic Title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Cover Type</label>
              <select
                value={formData.cover_type}
                onChange={(e) => setFormData({ ...formData, cover_type: e.target.value as 'front' | 'back' | 'spine' })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
              >
                {COVER_TYPES.map((t) => (
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
            
            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">Background</label>
              <input
                type="text"
                value={formData.background}
                onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50"
                placeholder="#ffffff"
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
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                Elements (JSON)
                <span className="text-[#2a1f1a]/40 ml-2">Photo, text, QR positions</span>
              </label>
              <textarea
                value={elementsJson}
                onChange={(e) => setElementsJson(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50 font-mono text-sm"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#2a1f1a]/70 mb-1">
                Text Placeholders (JSON)
                <span className="text-[#2a1f1a]/40 ml-2">Default text values</span>
              </label>
              <textarea
                value={placeholdersJson}
                onChange={(e) => setPlaceholdersJson(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/50 font-mono text-sm"
                placeholder='{"title": "Our Memories"}'
              />
            </div>
            
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

      {/* Covers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D5A3D]" />
            <p className="text-[#2a1f1a]/60 mt-2">Loading covers...</p>
          </div>
        ) : filteredCovers.length === 0 ? (
          <div className="col-span-full p-12 text-center glass">
            <Palette className="w-12 h-12 mx-auto text-[#B8562E]/30" />
            <p className="text-[#2a1f1a]/60 mt-4">No cover designs yet</p>
            <button
              onClick={startNew}
              className="mt-4 text-[#2D5A3D] hover:underline"
            >
              Add your first cover design
            </button>
          </div>
        ) : (
          filteredCovers.map((cover) => (
            <div
              key={cover.id}
              className={`glass p-4 ${!cover.is_enabled ? 'opacity-50' : ''}`}
            >
              {/* Preview */}
              <div 
                className="aspect-[3/4] rounded-lg mb-4 relative overflow-hidden border border-[#B8562E]/10"
                style={{ background: cover.background }}
              >
                {/* Render element preview boxes */}
                {cover.elements.map((el) => (
                  <div
                    key={el.id}
                    className="absolute border-2 border-dashed flex items-center justify-center"
                    style={{
                      left: `${el.position.x}%`,
                      top: `${el.position.y}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      borderColor: el.type === 'photo' ? '#2D5A3D' : el.type === 'text' ? '#B8562E' : '#4A3552',
                      backgroundColor: el.type === 'photo' ? 'rgba(64, 106, 86, 0.15)' : el.type === 'text' ? 'rgba(195, 95, 51, 0.15)' : 'rgba(74, 53, 82, 0.15)',
                    }}
                  >
                    {getElementIcon(el.type)}
                  </div>
                ))}
                
                {/* Cover type badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-white/80 text-xs font-medium">
                  {COVER_TYPES.find(t => t.value === cover.cover_type)?.icon}
                </div>
              </div>
              
              {/* Info */}
              <div className="mb-2">
                <h3 className="font-medium text-[#2a1f1a]">{cover.name}</h3>
                <p className="text-xs text-[#2a1f1a]/50 capitalize">
                  {cover.cover_type} cover
                </p>
              </div>
              
              <p className="text-sm text-[#2a1f1a]/60 mb-3 line-clamp-2">
                {cover.description || 'No description'}
              </p>
              
              {/* Element summary */}
              <div className="flex gap-2 mb-3">
                {['photo', 'text', 'qr'].map((type) => {
                  const count = cover.elements.filter(e => e.type === type).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex items-center gap-1 text-xs text-[#2a1f1a]/50">
                      {getElementIcon(type)}
                      <span>×{count}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#B8562E]/10">
                <button
                  onClick={() => toggleEnabled(cover)}
                  className="flex items-center gap-1 text-sm"
                >
                  {cover.is_enabled ? (
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
                    onClick={() => startEdit(cover)}
                    className="p-2 rounded-lg hover:bg-white/50 text-[#2a1f1a]/50 hover:text-[#2D5A3D] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(cover.id)}
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
