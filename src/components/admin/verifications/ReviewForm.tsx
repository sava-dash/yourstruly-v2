'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ReviewFormProps {
  verificationId: string;
  hasLinkedProfile: boolean;
}

export function ReviewForm({ verificationId, hasLinkedProfile }: ReviewFormProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'needs_more_info' | null>(null);
  const [notes, setNotes] = useState('');
  const [transferAccess, setTransferAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/verifications/${verificationId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: notes || undefined,
          transfer_access: transferAccess,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass p-6">
      <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">Review Decision</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Selection */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setAction('approve')}
            className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
              action === 'approve'
                ? 'border-green-500 bg-green-50'
                : 'border-[#2a1f1a]/10 hover:border-green-300 hover:bg-green-50/50'
            }`}
          >
            <CheckCircle className={`w-5 h-5 ${action === 'approve' ? 'text-green-600' : 'text-[#2a1f1a]/40'}`} />
            <div className="text-left">
              <p className={`font-medium ${action === 'approve' ? 'text-green-700' : 'text-[#2a1f1a]'}`}>
                Approve
              </p>
              <p className="text-xs text-[#2a1f1a]/50">
                Convert account to memorial status
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAction('needs_more_info')}
            className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
              action === 'needs_more_info'
                ? 'border-blue-500 bg-blue-50'
                : 'border-[#2a1f1a]/10 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <AlertCircle className={`w-5 h-5 ${action === 'needs_more_info' ? 'text-blue-600' : 'text-[#2a1f1a]/40'}`} />
            <div className="text-left">
              <p className={`font-medium ${action === 'needs_more_info' ? 'text-blue-700' : 'text-[#2a1f1a]'}`}>
                Request More Info
              </p>
              <p className="text-xs text-[#2a1f1a]/50">
                Ask claimant for additional documentation
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAction('reject')}
            className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
              action === 'reject'
                ? 'border-red-500 bg-red-50'
                : 'border-[#2a1f1a]/10 hover:border-red-300 hover:bg-red-50/50'
            }`}
          >
            <XCircle className={`w-5 h-5 ${action === 'reject' ? 'text-red-600' : 'text-[#2a1f1a]/40'}`} />
            <div className="text-left">
              <p className={`font-medium ${action === 'reject' ? 'text-red-700' : 'text-[#2a1f1a]'}`}>
                Reject
              </p>
              <p className="text-xs text-[#2a1f1a]/50">
                Deny the verification request
              </p>
            </div>
          </button>
        </div>

        {/* Transfer Access Option (only for approve with linked profile) */}
        {action === 'approve' && hasLinkedProfile && (
          <label className="flex items-center gap-3 p-3 rounded-xl bg-[#2D5A3D]/5 border border-[#2D5A3D]/20 cursor-pointer">
            <input
              type="checkbox"
              checked={transferAccess}
              onChange={(e) => setTransferAccess(e.target.checked)}
              className="w-4 h-4 rounded border-[#2a1f1a]/30 text-[#2D5A3D] focus:ring-[#2D5A3D]"
            />
            <div>
              <p className="font-medium text-[#2a1f1a] text-sm">Transfer access to claimant</p>
              <p className="text-xs text-[#2a1f1a]/50">
                Allow claimant to manage the memorial account
              </p>
            </div>
          </label>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[#2a1f1a] mb-2">
            Review Notes {action === 'reject' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              action === 'approve' 
                ? 'Optional notes about the approval...'
                : action === 'needs_more_info'
                ? 'What additional information is needed?'
                : 'Reason for rejection...'
            }
            required={action === 'reject'}
            rows={3}
            className="w-full px-4 py-2 rounded-xl border border-[#2a1f1a]/10 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/20 focus:border-[#2D5A3D]/30 resize-none"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!action || isSubmitting}
          className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            !action || isSubmitting
              ? 'bg-[#2a1f1a]/10 text-[#2a1f1a]/40 cursor-not-allowed'
              : action === 'approve'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : action === 'reject'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {action === 'approve' && <CheckCircle className="w-4 h-4" />}
              {action === 'reject' && <XCircle className="w-4 h-4" />}
              {action === 'needs_more_info' && <AlertCircle className="w-4 h-4" />}
              {action === 'approve' ? 'Approve Verification' : 
               action === 'reject' ? 'Reject Verification' : 
               action === 'needs_more_info' ? 'Request More Info' : 
               'Select an action'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
