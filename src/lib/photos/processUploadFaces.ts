/**
 * Shared post-upload face-processing pipeline.
 *
 * Called by every upload endpoint after the memory_media row has been
 * inserted. Runs Rekognition, computes a focal point, persists everything,
 * and creates memory_face_tags (with optional auto-tag from the user's
 * Rekognition collection). Never throws — failures are logged and the
 * caller's upload response is unaffected.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { detectFaces, searchFaces, type DetectedFace, type FaceMatch } from '@/lib/aws/rekognition'
import { computeDisplayPosition, type DisplayPosition } from './displayPosition'

const FACE_CONFIDENCE_THRESHOLD = 80
const AUTO_TAG_SIMILARITY = 80

export interface ProcessUploadFacesResult {
  facesDetected: number
  displayPosition: DisplayPosition | null
  autoTagged: number
}

export async function processUploadFaces(opts: {
  admin: SupabaseClient
  userId: string
  mediaId: string
  imageBuffer: Buffer
}): Promise<ProcessUploadFacesResult> {
  const { admin, userId, mediaId, imageBuffer } = opts
  const empty: ProcessUploadFacesResult = { facesDetected: 0, displayPosition: null, autoTagged: 0 }

  let detected: DetectedFace[] = []
  try {
    detected = await detectFaces(imageBuffer)
  } catch (err) {
    console.error('[processUploadFaces] detectFaces failed:', err)
    // Still mark the media as processed so we don't retry forever.
    await admin
      .from('memory_media')
      .update({ ai_processed: true })
      .eq('id', mediaId)
      .then(
        () => null,
        (e) => console.error('[processUploadFaces] update after detect fail:', e),
      )
    return empty
  }

  const validFaces = detected.filter((f) => f.confidence >= FACE_CONFIDENCE_THRESHOLD)

  const aiFaces = validFaces.map((f) => ({
    left: f.boundingBox.x,
    top: f.boundingBox.y,
    width: f.boundingBox.width,
    height: f.boundingBox.height,
    confidence: f.confidence,
    age: f.age,
    gender: f.gender,
  }))

  const displayPosition = computeDisplayPosition(aiFaces)

  const { error: updateErr } = await admin
    .from('memory_media')
    .update({
      ai_faces: aiFaces,
      ai_processed: true,
      display_position_x: displayPosition?.x ?? null,
      display_position_y: displayPosition?.y ?? null,
    })
    .eq('id', mediaId)
  if (updateErr) {
    console.error('[processUploadFaces] memory_media update failed:', updateErr)
  }

  if (validFaces.length === 0) {
    return { facesDetected: 0, displayPosition, autoTagged: 0 }
  }

  // Best-effort collection match — the user may have no indexed faces yet,
  // or the Rekognition collection may not exist. Non-blocking.
  let matches: FaceMatch[] = []
  try {
    matches = await searchFaces(imageBuffer, userId, AUTO_TAG_SIMILARITY)
  } catch (err) {
    console.log('[processUploadFaces] searchFaces skipped:', err)
  }

  // Match the single-face convention used elsewhere in the codebase:
  // if there's a confident match, auto-tag the primary (largest) face.
  // Other faces get created untagged so FaceTagger can surface them.
  let primaryIdx = 0
  let primaryArea = -1
  for (let i = 0; i < validFaces.length; i++) {
    const b = validFaces[i].boundingBox
    const area = (b.width ?? 0) * (b.height ?? 0)
    if (area > primaryArea) {
      primaryArea = area
      primaryIdx = i
    }
  }
  const best = matches.find((m) => m.similarity >= AUTO_TAG_SIMILARITY)

  const tagRows = validFaces.map((face, i) => {
    const isPrimary = i === primaryIdx
    const contactId = isPrimary && best ? best.contactId : null
    return {
      media_id: mediaId,
      user_id: userId,
      contact_id: contactId,
      box_left: face.boundingBox.x,
      box_top: face.boundingBox.y,
      box_width: face.boundingBox.width,
      box_height: face.boundingBox.height,
      confidence: face.confidence,
      is_auto_detected: true,
      is_confirmed: !!contactId && (best?.similarity ?? 0) >= 90,
      confirmed_at: contactId && (best?.similarity ?? 0) >= 90 ? new Date().toISOString() : null,
      rekognition_face_id: isPrimary && best ? best.faceId : null,
    }
  })

  const { error: tagErr } = await admin.from('memory_face_tags').insert(tagRows)
  if (tagErr) {
    console.error('[processUploadFaces] face tag insert failed:', tagErr)
    return { facesDetected: validFaces.length, displayPosition, autoTagged: 0 }
  }

  return {
    facesDetected: validFaces.length,
    displayPosition,
    autoTagged: best ? 1 : 0,
  }
}
