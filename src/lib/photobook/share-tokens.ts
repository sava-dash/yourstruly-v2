/**
 * Photobook share-token helpers.
 *
 * Schema assumptions (verified against archive/migrations-pre-cleanup/048_qr_photobooks.sql):
 * - Table `qr_access_tokens` has columns: id, token (uuid unique), memory_id, wisdom_id,
 *   photobook_page_id, created_by_user_id, allowed_contact_ids, allowed_user_ids,
 *   is_public, view_count, max_views, expires_at, is_active, revoked_at, revoked_reason.
 * - There is no `source` / `source_project_id` column. We link a token to a photobook
 *   project indirectly via `photobook_page_id -> photobook_pages.project_id`.
 *   For idempotency we scope the uniqueness lookup by project by joining pages.
 *
 * This module is a thin helper only; API ownership checks live in the route handler.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type ShareTarget =
  | { type: 'memory'; id: string }
  | { type: 'wisdom'; id: string }

export interface ShareTokenRow {
  id: string
  token: string
  memory_id: string | null
  wisdom_id: string | null
  photobook_page_id: string | null
  is_active: boolean
  revoked_at: string | null
  created_at: string
}

export interface MintParams {
  userId: string
  projectId: string
  target: ShareTarget
}

/**
 * Mint (or return the existing) share token for a memory/wisdom in a given photobook project.
 * Idempotent: re-calling with the same (projectId, target) returns the previously minted
 * non-revoked token rather than inserting a duplicate.
 */
export async function mintBookShareToken(
  supabase: SupabaseClient,
  { userId, projectId, target }: MintParams
): Promise<{ token: string; tokenId: string; reused: boolean }> {
  const targetColumn = target.type === 'memory' ? 'memory_id' : 'wisdom_id'

  // Look for an existing active token for this (project, target).
  const existing = await findActiveTokenForTarget(supabase, projectId, target)
  if (existing) {
    return { token: existing.token, tokenId: existing.id, reused: true }
  }

  // Find (or create) a page row in this project to anchor photobook_page_id.
  const pageId = await resolveAnchorPageId(supabase, projectId)

  const insertPayload: Record<string, unknown> = {
    created_by_user_id: userId,
    is_public: true, // Printed photobook — anyone scanning must be able to view.
    is_active: true,
    [targetColumn]: target.id,
  }
  if (pageId) insertPayload.photobook_page_id = pageId

  const { data, error } = await supabase
    .from('qr_access_tokens')
    .insert(insertPayload)
    .select('id, token')
    .single()

  if (error || !data) {
    throw new Error(`Failed to mint share token: ${error?.message || 'unknown error'}`)
  }
  return { token: data.token as string, tokenId: data.id as string, reused: false }
}

/**
 * List every non-deleted share token minted for this project's memories/wisdom.
 * Includes revoked ones so the UI can render status.
 */
export async function listProjectShareTokens(
  supabase: SupabaseClient,
  projectId: string
): Promise<ShareTokenRow[]> {
  // Select tokens whose anchor page belongs to the project.
  const { data: pageRows } = await supabase
    .from('photobook_pages')
    .select('id')
    .eq('project_id', projectId)

  const pageIds = (pageRows || []).map((r: { id: string }) => r.id)
  if (pageIds.length === 0) return []

  const { data, error } = await supabase
    .from('qr_access_tokens')
    .select(
      'id, token, memory_id, wisdom_id, photobook_page_id, is_active, revoked_at, created_at'
    )
    .in('photobook_page_id', pageIds)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ShareTokenRow[]
}

/**
 * Revoke a single token (soft revoke: sets is_active=false, revoked_at=now()).
 * Caller is expected to have verified ownership already.
 */
export async function revokeShareToken(
  supabase: SupabaseClient,
  tokenValue: string
): Promise<void> {
  const { error } = await supabase
    .from('qr_access_tokens')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_reason: 'user_revoked_from_orders_ui',
    })
    .eq('token', tokenValue)
  if (error) throw new Error(error.message)
}

async function findActiveTokenForTarget(
  supabase: SupabaseClient,
  projectId: string,
  target: ShareTarget
): Promise<ShareTokenRow | null> {
  const { data: pageRows } = await supabase
    .from('photobook_pages')
    .select('id')
    .eq('project_id', projectId)

  const pageIds = (pageRows || []).map((r: { id: string }) => r.id)
  if (pageIds.length === 0) return null

  const col = target.type === 'memory' ? 'memory_id' : 'wisdom_id'
  const { data } = await supabase
    .from('qr_access_tokens')
    .select(
      'id, token, memory_id, wisdom_id, photobook_page_id, is_active, revoked_at, created_at'
    )
    .eq(col, target.id)
    .eq('is_active', true)
    .in('photobook_page_id', pageIds)
    .limit(1)

  return ((data || [])[0] as ShareTokenRow | undefined) || null
}

async function resolveAnchorPageId(
  supabase: SupabaseClient,
  projectId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('photobook_pages')
    .select('id')
    .eq('project_id', projectId)
    .order('page_number', { ascending: true })
    .limit(1)
  return (data && data[0]?.id) || null
}

/**
 * Build the printed-QR URL that encodes a share token.
 */
export function buildShareTokenUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://app.yourstruly.love')
  return `${base}/view/${token}`
}
