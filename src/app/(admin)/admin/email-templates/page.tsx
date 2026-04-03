'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Search, Edit2, Trash2, Eye, EyeOff, Loader2, Send, Code, FileText, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface EmailTemplate {
  id: string
  name: string
  description: string | null
  subject: string
  html_content: string
  text_content: string | null
  variables: string[]
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name')

    if (!error && data) {
      setTemplates(data)
    }
    setLoading(false)
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleActive = async (template: EmailTemplate) => {
    const { error } = await supabase
      .from('email_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id)

    if (!error) {
      setTemplates(templates.map(t =>
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ))
    }
  }

  const categoryColors: Record<string, string> = {
    transactional: 'bg-blue-100 text-blue-700',
    marketing: 'bg-purple-100 text-purple-700',
    notification: 'bg-green-100 text-green-700',
    system: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2a1f1a]">Email Templates</h1>
          <p className="text-[#2a1f1a]/60 mt-1">Customize transactional email content</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2a1f1a]/40" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white/60 border border-[#B8562E]/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
        />
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#2D5A3D]" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 bg-white/40 backdrop-blur-sm rounded-xl border border-[#B8562E]/10 text-center">
          <Mail className="w-16 h-16 mx-auto text-[#B8562E]/30" />
          <h3 className="text-lg font-medium text-[#2a1f1a] mt-4">No Templates Found</h3>
          <p className="text-[#2a1f1a]/60 mt-2">
            {searchQuery ? 'Try a different search term' : 'Run the migration to seed default templates'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-[#B8562E]/10 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#2a1f1a]">{template.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${categoryColors[template.category] || categoryColors.system}`}>
                      {template.category}
                    </span>
                    {!template.is_active && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#2a1f1a]/60 mb-3">{template.description}</p>
                  <div className="flex items-center gap-4 text-sm text-[#2a1f1a]/50">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{template.id}</span>
                    <span>Subject: <em>{template.subject}</em></span>
                  </div>
                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.variables.map((v) => (
                        <code key={v} className="text-xs bg-[#2D5A3D]/10 text-[#2D5A3D] px-2 py-0.5 rounded">
                          {`{{${v}}}`}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye size={18} className="text-[#2D5A3D]" />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} className="text-[#2a1f1a]/60" />
                  </button>
                  <button
                    onClick={() => toggleActive(template)}
                    className="p-2 hover:bg-[#2D5A3D]/10 rounded-lg transition-colors"
                    title={template.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {template.is_active ? (
                      <EyeOff size={18} className="text-[#2a1f1a]/60" />
                    ) : (
                      <Eye size={18} className="text-green-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={() => {
            fetchTemplates()
            setEditingTemplate(null)
          }}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  )
}

// Template Editor Modal
function TemplateEditorModal({
  template,
  onClose,
  onSave,
}: {
  template: EmailTemplate
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: template.name,
    description: template.description || '',
    subject: template.subject,
    html_content: template.html_content,
    text_content: template.text_content || '',
    variables: template.variables.join(', '),
    category: template.category,
  })
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase
      .from('email_templates')
      .update({
        name: form.name,
        description: form.description || null,
        subject: form.subject,
        html_content: form.html_content,
        text_content: form.text_content || null,
        variables: form.variables.split(',').map(s => s.trim()).filter(Boolean),
        category: form.category,
      })
      .eq('id', template.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#2a1f1a]">Edit: {template.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
                >
                  <option value="transactional">Transactional</option>
                  <option value="notification">Notification</option>
                  <option value="marketing">Marketing</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2a1f1a]/80 mb-1">
                Variables (comma-separated)
              </label>
              <input
                type="text"
                value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                placeholder="recipientName, senderName, url"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 font-mono text-sm"
              />
            </div>

            {/* Content Tabs */}
            <div>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('html')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'html'
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-gray-100 text-[#2a1f1a]/60 hover:bg-gray-200'
                  }`}
                >
                  <Code size={16} />
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'text'
                      ? 'bg-[#2D5A3D] text-white'
                      : 'bg-gray-100 text-[#2a1f1a]/60 hover:bg-gray-200'
                  }`}
                >
                  <FileText size={16} />
                  Plain Text
                </button>
              </div>

              {activeTab === 'html' ? (
                <textarea
                  value={form.html_content}
                  onChange={(e) => setForm({ ...form, html_content: e.target.value })}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 font-mono text-xs"
                />
              ) : (
                <textarea
                  value={form.text_content}
                  onChange={(e) => setForm({ ...form, text_content: e.target.value })}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 font-mono text-sm"
                />
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#2a1f1a]/60 hover:text-[#2a1f1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#2D5A3D] text-white rounded-lg hover:bg-[#355847] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Template Preview Modal
function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: EmailTemplate
  onClose: () => void
}) {
  // Replace variables with sample values for preview
  const sampleValues: Record<string, string> = {
    recipientName: 'John Doe',
    recipientEmail: 'john@example.com',
    inviterName: 'Jane Smith',
    senderName: 'Jane Smith',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    circleName: 'Smith Family',
    inviteUrl: '#',
    dashboardUrl: '#',
    postscriptUrl: '#',
    appUrl: 'https://yourstruly.love',
    claimantName: 'John Doe',
    deceasedName: 'Robert Smith',
    claimId: 'CLM-2024-001',
  }

  let previewHtml = template.html_content
  let previewSubject = template.subject
  
  for (const [key, value] of Object.entries(sampleValues)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    previewHtml = previewHtml.replace(regex, value)
    previewSubject = previewSubject.replace(regex, value)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#2a1f1a]">Preview: {template.name}</h2>
            <p className="text-sm text-[#2a1f1a]/60">Subject: {previewSubject}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[600px] border-0"
              title="Email Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
