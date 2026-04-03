'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  MessageSquare,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PromptTemplate, PROMPT_TYPES } from '@/types/engagement';
import { formatDistanceToNow } from 'date-fns';

interface PromptTemplatesTableProps {
  templates: PromptTemplate[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

export default function PromptTemplatesTable({
  templates,
  currentPage,
  totalPages,
  totalCount,
}: PromptTemplatesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getPromptTypeLabel = (type: string) => {
    const pt = PROMPT_TYPES.find((p) => p.value === type);
    return pt?.label || type;
  };

  const getPromptTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      photo_backstory: 'bg-blue-100 text-blue-700',
      tag_person: 'bg-green-100 text-green-700',
      missing_info: 'bg-yellow-100 text-yellow-700',
      memory_prompt: 'bg-purple-100 text-purple-700',
      knowledge: 'bg-orange-100 text-orange-700',
      connect_dots: 'bg-pink-100 text-pink-700',
      highlight: 'bg-red-100 text-red-700',
      quick_question: 'bg-teal-100 text-teal-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.prompt_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && template.is_active) ||
      (statusFilter === 'inactive' && !template.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/engagement/prompts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete prompt');
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      alert('Failed to delete prompt');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
            <input
              type="text"
              aria-label="Search" placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a1f1a]/40" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-10 pr-8 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {PROMPT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-[#B8562E]/20 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 text-sm cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <Link
              href="/admin/engagement/new"
              className="flex items-center gap-2 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm font-medium hover:bg-[#2D5A3D]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Prompt
            </Link>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#B8562E]/10">
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Prompt</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Type</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Category</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Priority</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Status</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-[#2a1f1a]/60">Updated</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-[#2a1f1a]/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8562E]/5">
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-white/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[#2D5A3D]/10">
                        <MessageSquare className="w-4 h-4 text-[#2D5A3D]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2a1f1a] line-clamp-1">
                          {template.prompt_text}
                        </p>
                        <code className="text-xs text-[#2D5A3D]/70">{template.id}</code>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPromptTypeColor(
                        template.type
                      )}`}
                    >
                      {getPromptTypeLabel(template.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-[#2a1f1a]/70 capitalize">
                      {template.category || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            template.priority_boost >= 10
                              ? '#B8562E'
                              : template.priority_boost >= 5
                              ? '#C4A235'
                              : '#2D5A3D',
                        }}
                      />
                      <span className="text-sm text-[#2a1f1a]/70">
                        {template.priority_boost > 0 ? `+${template.priority_boost}` : '0'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {template.is_active ? (
                      <span className="inline-flex items-center gap-1 text-sm text-[#2D5A3D]">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-[#2a1f1a]/40">
                        <XCircle className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-[#2a1f1a]/60">
                    {formatDistanceToNow(new Date(template.updated_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() =>
                          setDropdownOpen(dropdownOpen === template.id ? null : template.id)
                        }
                        className="p-2 rounded-lg hover:bg-white/80 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#2a1f1a]/50" />
                      </button>

                      {dropdownOpen === template.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setDropdownOpen(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-[#B8562E]/10 z-20 py-1">
                            <Link
                              href={`/admin/engagement/${template.id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a1f1a] hover:bg-[#2D5A3D]/5"
                            >
                              <Eye className="w-4 h-4" />
                              Preview
                            </Link>
                            <Link
                              href={`/admin/engagement/${template.id}/edit`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a1f1a] hover:bg-[#2D5A3D]/5"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Link>
                            <hr className="my-1 border-[#B8562E]/10" />
                            <button
                              onClick={() => {
                                setDeleteConfirm(template.id);
                                setDropdownOpen(null);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-[#2a1f1a]/20 mb-4" />
            <p className="text-[#2a1f1a]/60">No prompts found</p>
            <p className="text-sm text-[#2a1f1a]/40 mt-1">
              Try adjusting your filters or create a new prompt
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredTemplates.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-[#B8562E]/10">
            <p className="text-sm text-[#2a1f1a]/60">
              Showing {filteredTemplates.length} of {totalCount} prompts
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/engagement?page=${Math.max(1, currentPage - 1)}`}
                className={`p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors ${
                  currentPage === 1 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <span className="text-sm text-[#2a1f1a]/60">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Link
                href={`/admin/engagement?page=${Math.min(totalPages, currentPage + 1)}`}
                className={`p-2 rounded-lg border border-[#B8562E]/10 hover:bg-white/80 transition-colors ${
                  currentPage === totalPages || totalPages === 0 ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 glass-modal p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#2a1f1a] mb-2">Delete Prompt?</h3>
            <p className="text-sm text-[#2a1f1a]/60 mb-6">
              Are you sure you want to delete this prompt template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#2a1f1a]/70 hover:bg-white/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
