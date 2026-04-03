import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Shield,
  Brain,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getConfidenceLevel } from '@/lib/verification/confidence';
import { ReviewForm } from '@/components/admin/verifications/ReviewForm';
import { DocumentViewer } from '@/components/admin/verifications/DocumentViewer';

interface VerificationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VerificationDetailPage({ params }: VerificationDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = createAdminClient();

  // Fetch verification with profile data
  const { data: verification, error } = await supabase
    .from('death_verifications')
    .select(`
      *,
      profiles:claimed_user_id (
        id,
        full_name,
        date_of_birth,
        avatar_url,
        account_status,
        city,
        state,
        country,
        biography,
        created_at
      ),
      reviewer:reviewer_id (
        id,
        email
      )
    `)
    .eq('id', id)
    .single();

  if (error || !verification) {
    notFound();
  }

  // Generate signed URL for document if exists
  let documentSignedUrl: string | null = null;
  if (verification.document_url) {
    const { data: signedUrlData } = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(verification.document_url, 3600);
    documentSignedUrl = signedUrlData?.signedUrl || null;
  }

  // Get profile email
  let profileEmail: string | null = null;
  if (verification.claimed_user_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(verification.claimed_user_id);
    profileEmail = authData?.user?.email || null;
  }

  const confidenceInfo = verification.ai_confidence_score 
    ? getConfidenceLevel(verification.ai_confidence_score)
    : null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending Review' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Rejected' };
      case 'needs_more_info':
        return { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Needs More Info' };
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', label: status };
    }
  };

  const statusConfig = getStatusConfig(verification.status);
  const StatusIcon = statusConfig.icon;
  const aiData = verification.ai_extraction_data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/verifications"
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#2a1f1a]/60" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#2a1f1a]">
              Verification Request
            </h1>
            <p className="text-[#2a1f1a]/60 mt-1">
              Submitted {formatDistanceToNow(new Date(verification.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl ${statusConfig.bg} ${statusConfig.color} flex items-center gap-2`}>
          <StatusIcon className="w-5 h-5" />
          <span className="font-medium">{statusConfig.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deceased Information Card */}
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#2D5A3D]" />
              Deceased Information
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Name (Claimed)</p>
                <p className="font-medium text-[#2a1f1a]">{verification.deceased_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Date of Death</p>
                <p className="font-medium text-[#2a1f1a]">
                  {format(new Date(verification.deceased_date_of_death), 'MMMM d, yyyy')}
                </p>
              </div>
              {verification.deceased_dob && (
                <div>
                  <p className="text-xs text-[#2a1f1a]/40 uppercase tracking-wide">Date of Birth</p>
                  <p className="font-medium text-[#2a1f1a]">
                    {format(new Date(verification.deceased_dob), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          {verification.profiles && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#2D5A3D]" />
                Profile Comparison
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Claimed Data */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <h3 className="text-sm font-medium text-amber-800 mb-3">Claimant Says</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-[#2a1f1a]/50">Name:</span> {verification.deceased_name}</p>
                    {verification.deceased_dob && (
                      <p><span className="text-[#2a1f1a]/50">DOB:</span> {format(new Date(verification.deceased_dob), 'MMM d, yyyy')}</p>
                    )}
                    <p><span className="text-[#2a1f1a]/50">DOD:</span> {format(new Date(verification.deceased_date_of_death), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Profile Data */}
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <h3 className="text-sm font-medium text-green-800 mb-3">Profile Data</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-[#2a1f1a]/50">Name:</span> {verification.profiles.full_name || 'Not set'}</p>
                    <p><span className="text-[#2a1f1a]/50">DOB:</span> {verification.profiles.date_of_birth ? format(new Date(verification.profiles.date_of_birth), 'MMM d, yyyy') : 'Not set'}</p>
                    <p><span className="text-[#2a1f1a]/50">Email:</span> {profileEmail || 'N/A'}</p>
                    <p><span className="text-[#2a1f1a]/50">Status:</span> {verification.profiles.account_status || 'active'}</p>
                  </div>
                </div>
              </div>

              {/* Match indicators */}
              <div className="mt-4 pt-4 border-t border-[#2a1f1a]/10">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[#2a1f1a]/50">Name Match:</span>
                  {verification.deceased_name.toLowerCase() === verification.profiles.full_name?.toLowerCase() ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Exact match
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Partial/No match
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Extraction Results */}
          {aiData && Object.keys(aiData).length > 0 && !aiData.error && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#2D5A3D]" />
                AI Extraction Results
                {confidenceInfo && (
                  <span className={`ml-auto px-2 py-1 rounded-lg text-xs font-medium ${
                    confidenceInfo.level === 'high' ? 'bg-green-100 text-green-700' :
                    confidenceInfo.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {verification.ai_confidence_score}% Confidence
                  </span>
                )}
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {aiData.deceased_full_name && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Extracted Name</p>
                    <p className="font-medium">{aiData.deceased_full_name}</p>
                  </div>
                )}
                {aiData.date_of_birth && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Extracted DOB</p>
                    <p className="font-medium">{aiData.date_of_birth}</p>
                  </div>
                )}
                {aiData.date_of_death && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Extracted DOD</p>
                    <p className="font-medium">{aiData.date_of_death}</p>
                  </div>
                )}
                {aiData.place_of_death && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Place of Death</p>
                    <p className="font-medium">{aiData.place_of_death}</p>
                  </div>
                )}
                {aiData.certificate_number && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Certificate #</p>
                    <p className="font-medium">{aiData.certificate_number}</p>
                  </div>
                )}
                {aiData.issuing_authority && (
                  <div>
                    <p className="text-[#2a1f1a]/40">Issuing Authority</p>
                    <p className="font-medium">{aiData.issuing_authority}</p>
                  </div>
                )}
              </div>

              {aiData.extraction_confidence && (
                <p className="text-xs text-[#2a1f1a]/40 mt-4">
                  AI reported {aiData.extraction_confidence}% extraction confidence
                </p>
              )}
            </div>
          )}

          {/* Document Viewer */}
          {documentSignedUrl && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2D5A3D]" />
                Uploaded Document
              </h2>
              <DocumentViewer 
                url={documentSignedUrl} 
                type={verification.document_url?.endsWith('.pdf') ? 'pdf' : 'image'} 
              />
            </div>
          )}

          {/* Obituary Link */}
          {verification.obituary_url && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">Obituary Link</h2>
              <a
                href={verification.obituary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#2D5A3D] hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                {verification.obituary_url}
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Claimant Info */}
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">Claimant</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B8562E] to-[#2D5A3D] flex items-center justify-center text-white font-medium">
                  {verification.claimant_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[#2a1f1a]">{verification.claimant_name}</p>
                  <p className="text-sm text-[#2a1f1a]/50 capitalize">
                    {verification.claimant_relationship === 'other' 
                      ? verification.claimant_relationship_other || 'Other'
                      : verification.claimant_relationship}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[#2a1f1a]/70">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${verification.claimant_email}`} className="hover:text-[#2D5A3D]">
                    {verification.claimant_email}
                  </a>
                </div>
                {verification.claimant_phone && (
                  <div className="flex items-center gap-2 text-[#2a1f1a]/70">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${verification.claimant_phone}`} className="hover:text-[#2D5A3D]">
                      {verification.claimant_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review History */}
          {verification.reviewed_at && (
            <div className="glass p-6">
              <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4">Review History</h2>
              
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-[#2a1f1a]/50">Reviewed by:</span>{' '}
                  {verification.reviewer?.email || 'Unknown'}
                </p>
                <p>
                  <span className="text-[#2a1f1a]/50">Reviewed at:</span>{' '}
                  {format(new Date(verification.reviewed_at), 'MMM d, yyyy HH:mm')}
                </p>
                {verification.reviewer_notes && (
                  <div className="mt-3 p-3 rounded-lg bg-white/50">
                    <p className="text-xs text-[#2a1f1a]/40 mb-1">Notes</p>
                    <p className="text-[#2a1f1a]">{verification.reviewer_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-[#2a1f1a] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#2D5A3D]" />
              Metadata
            </h2>
            
            <div className="space-y-2 text-sm text-[#2a1f1a]/60">
              <p>
                <span className="text-[#2a1f1a]/40">ID:</span>{' '}
                <code className="text-xs bg-white/50 px-1 rounded">{verification.id}</code>
              </p>
              <p>
                <span className="text-[#2a1f1a]/40">Submitted:</span>{' '}
                {format(new Date(verification.created_at), 'MMM d, yyyy HH:mm')}
              </p>
              <p>
                <span className="text-[#2a1f1a]/40">Document Type:</span>{' '}
                {verification.document_type.replace('_', ' ')}
              </p>
              {verification.submission_ip && (
                <p>
                  <span className="text-[#2a1f1a]/40">IP:</span> {verification.submission_ip}
                </p>
              )}
            </div>
          </div>

          {/* Review Form (only if pending or needs_more_info) */}
          {(verification.status === 'pending' || verification.status === 'needs_more_info') && (
            <ReviewForm 
              verificationId={verification.id} 
              hasLinkedProfile={!!verification.claimed_user_id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
