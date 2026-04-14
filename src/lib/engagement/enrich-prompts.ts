import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Raw prompt row returned by the `shuffle_engagement_prompts` RPC.
 * Only the fields used for enrichment are typed here; callers keep
 * the rest of the row via spread/passthrough.
 */
export interface RawPromptRow {
  photo_id?: string | null;
  contact_id?: string | null;
  [key: string]: unknown;
}

export interface PhotoMetadata {
  taken_at?: string | null;
  exif_lat?: number | null;
  exif_lng?: number | null;
  location_name?: string;
}

export interface ContactInfo {
  name: string;
  photo?: string | null;
}

export interface PromptEnrichmentMaps {
  /** photo_id -> file_url */
  photosMap: Record<string, string>;
  /** photo_id -> EXIF metadata */
  photoMetaMap: Record<string, PhotoMetadata>;
  /** contact_id -> { name, photo } */
  contactsMap: Record<string, ContactInfo>;
}

/**
 * Fetches photo + contact lookup maps for a batch of raw prompt rows.
 *
 * Centralizes the enrichment pattern previously duplicated between
 * `useEngagementPrompts` (client) and `/api/engagement/prompts` (server).
 * Accepts any Supabase client (browser or server) since both share the
 * same query interface.
 *
 * Uses batched `.in()` queries (2 round-trips regardless of prompt count)
 * rather than per-row `.single()` calls.
 */
export async function fetchPromptEnrichmentMaps(
  supabase: SupabaseClient,
  prompts: RawPromptRow[],
): Promise<PromptEnrichmentMaps> {
  const photoIds = prompts
    .filter((p) => !!p.photo_id)
    .map((p) => p.photo_id as string);

  const contactIds = prompts
    .filter((p) => !!p.contact_id)
    .map((p) => p.contact_id as string);

  let photosMap: Record<string, string> = {};
  let photoMetaMap: Record<string, PhotoMetadata> = {};
  if (photoIds.length > 0) {
    const { data: photos } = await supabase
      .from('memory_media')
      .select('id, file_url, taken_at, exif_lat, exif_lng')
      .in('id', photoIds);

    if (photos) {
      photosMap = Object.fromEntries(
        photos.map((p: { id: string; file_url: string }) => [p.id, p.file_url]),
      );
      photoMetaMap = Object.fromEntries(
        photos.map(
          (p: {
            id: string;
            taken_at: string | null;
            exif_lat: number | null;
            exif_lng: number | null;
          }) => [
            p.id,
            {
              taken_at: p.taken_at,
              exif_lat: p.exif_lat,
              exif_lng: p.exif_lng,
            },
          ],
        ),
      );
    }
  }

  let contactsMap: Record<string, ContactInfo> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, avatar_url')
      .in('id', contactIds);

    if (contacts && contacts.length > 0) {
      contactsMap = Object.fromEntries(
        contacts.map(
          (c: { id: string; full_name: string; avatar_url: string | null }) => [
            c.id,
            { name: c.full_name, photo: c.avatar_url },
          ],
        ),
      );
    }
  }

  return { photosMap, photoMetaMap, contactsMap };
}
