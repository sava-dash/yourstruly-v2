import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AnswerPromptRequest, AnswerPromptResponse } from '@/types/engagement';
import { transcribeAudio } from '@/lib/ai/transcription';
import { checkAndAdvanceTier } from '@/lib/engagement/tier-advancement';
// Using shared transcription lib for consistency

// XP rewards configuration (matching TYPE_CONFIG in Bubble.tsx)
const XP_REWARDS: Record<string, number> = {
  photo_backstory: 15,
  tag_person: 5,
  missing_info: 5,
  memory_prompt: 20,
  knowledge: 15,
  connect_dots: 10,
  highlight: 5,
  quick_question: 5,
  postscript: 20,
  favorites_firsts: 10,
  recipes_wisdom: 15,
};

// POST /api/engagement/prompts/[id]/respond
// Answer a specific prompt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: promptId } = await params;
    const body: AnswerPromptRequest = await request.json();

    // Verify prompt belongs to user
    const { data: prompt, error: fetchError } = await supabase
      .from('engagement_prompts')
      .select('*')
      .eq('id', promptId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !prompt) {
      console.error('Prompt not found:', promptId, fetchError);
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    // Call answer_prompt function
    const { data: answeredPrompt, error: answerError } = await supabase
      .rpc('answer_prompt', {
        p_prompt_id: promptId,
        p_response_type: body.responseType,
        p_response_text: body.responseText || null,
        p_response_audio_url: body.responseAudioUrl || null,
        p_response_data: body.responseData || null,
      });

    if (answerError) {
      console.error('Failed to answer prompt:', answerError);
      console.error('Prompt ID:', promptId);
      console.error('Request body:', body);
      
      // Fallback: If RPC fails, try direct update
      const { error: directError } = await supabase
        .from('engagement_prompts')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString(),
          response_type: body.responseType,
          response_text: body.responseText || null,
          response_audio_url: body.responseAudioUrl || null,
          response_data: body.responseData || null,
        })
        .eq('id', promptId);
      
      if (directError) {
        console.error('Direct update also failed:', directError);
        return NextResponse.json({ 
          error: 'Failed to answer prompt', 
          details: answerError.message,
          code: answerError.code
        }, { status: 500 });
      }
    }

    // Handle different prompt types
    let knowledgeEntry = null;
    let knowledgeEntryId: string | null = null;
    let memoryCreated = false;
    let memoryId: string | null = null;
    let contactUpdated = false;
    let xpAwarded = 0;
    let mediaAttached = 0;

    // Uploaded media URLs collected from cardchain media-item cards
    const incomingMediaUrls: { url: string; name?: string; type?: string; mediaId?: string }[] = Array.isArray(
      (body.responseData as any)?.mediaUrls
    )
      ? ((body.responseData as any).mediaUrls as any[]).filter(
          (m) => m && typeof m.url === 'string' && m.url.trim().length > 0
        )
      : [];
    const responseLocationName = (body.responseData as any)?.locationName as string | undefined;
    const responseLocationLat = (body.responseData as any)?.locationLat as number | undefined;
    const responseLocationLng = (body.responseData as any)?.locationLng as number | undefined;
    // Normalize partial dates like "2016" or "March 2020" into valid ISO dates
    const rawMemoryDate = (body.responseData as any)?.memoryDate as string | undefined;
    let responseMemoryDate: string | undefined;
    if (rawMemoryDate) {
      const trimmed = rawMemoryDate.trim();
      if (/^\d{4}$/.test(trimmed)) {
        responseMemoryDate = `${trimmed}-01-01`;
      } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
        responseMemoryDate = `${trimmed}-01`;
      } else {
        const d = new Date(trimmed);
        responseMemoryDate = isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
      }
    }

    // === UNIFIED MEMORY CREATION FOR ALL CONTENT-GENERATING PROMPTS ===
    // These prompt types create MEMORY records (not wisdom)
    const MEMORY_CREATING_TYPES = [
      'memory_prompt',     // general memories
      'photo_backstory',   // photo stories
      'favorites_firsts',  // favorites and firsts
      'postscript',        // future messages
      'connect_dots',      // "then & now" comparison memories
      'highlight',         // short spotlights
      'daily_checkin',     // quick daily thoughts
    ];
    
    // These prompt types create KNOWLEDGE/WISDOM entries (separate from memories)
    const KNOWLEDGE_CREATING_TYPES = [
      'knowledge',       // wisdom/life lessons
      'recipes_wisdom',  // recipes/traditions
    ];
    
    const shouldCreateMemory = MEMORY_CREATING_TYPES.includes(prompt.type);
    const shouldCreateKnowledge = KNOWLEDGE_CREATING_TYPES.includes(prompt.type);
    const hasContent = !!(body.responseText || body.responseAudioUrl);

    // Insert rows into memory_media for cardchain-uploaded files.
    // Uses the ADMIN client (service role) because memory_media has RLS
    // enabled and the anon-key client's INSERT is denied. This mirrors
    // what save-conversation does.
    // - If `memoryIdArg` is given, link them to that memory so they appear inside it.
    // - Otherwise insert with memory_id=null so they still show in the Media tab.
    // Deduplicates against existing rows by file_url so re-saves are idempotent.
    const attachChainMedia = async (memoryIdArg: string | null): Promise<number> => {
      if (incomingMediaUrls.length === 0) return 0;
      try {
        const adminClient = createAdminClient();
        // Skip any file URLs already recorded for this user to avoid duplicates
        // on re-finish or multi-call flows.
        const { data: existing } = await adminClient
          .from('memory_media')
          .select('file_url')
          .eq('user_id', user.id)
          .in('file_url', incomingMediaUrls.map((m) => m.url));
        // STEP 1: Check for orphan rows — the upload endpoint creates
        // memory_media rows with memory_id=NULL. If we have a memory to
        // link them to, UPDATE rather than re-insert.
        // Prefer direct mediaId linking (reliable) over URL matching (fragile).
        const allUrls = incomingMediaUrls.map((m) => m.url);
        const knownMediaIds = incomingMediaUrls
          .map((m) => m.mediaId)
          .filter((id): id is string => !!id);
        if (memoryIdArg) {
          let orphanRows: any[] = [];
          // Try ID-based lookup first
          if (knownMediaIds.length > 0) {
            const { data: idRows } = await adminClient
              .from('memory_media')
              .select('id, file_url')
              .eq('user_id', user.id)
              .is('memory_id', null)
              .in('id', knownMediaIds);
            orphanRows = idRows || [];
          }
          // Fall back to URL-based lookup for any without mediaId
          if (orphanRows.length < incomingMediaUrls.length) {
            const foundIds = new Set(orphanRows.map((r: any) => r.id));
            const remainingUrls = allUrls.filter((url) => {
              return !orphanRows.some((r: any) => r.file_url === url);
            });
            if (remainingUrls.length > 0) {
              const { data: urlRows } = await adminClient
                .from('memory_media')
                .select('id, file_url')
                .eq('user_id', user.id)
                .is('memory_id', null)
                .in('file_url', remainingUrls);
              for (const r of urlRows || []) {
                if (!foundIds.has(r.id)) {
                  orphanRows.push(r);
                  foundIds.add(r.id);
                }
              }
            }
          }
          const orphanIds = orphanRows.map((r: any) => r.id);
          const orphanUrlSet = new Set(orphanRows.map((r: any) => r.file_url));

          if (orphanIds.length > 0) {
            // First orphan becomes cover
            await adminClient
              .from('memory_media')
              .update({ memory_id: memoryIdArg, is_cover: true })
              .in('id', orphanIds.slice(0, 1));
            if (orphanIds.length > 1) {
              await adminClient
                .from('memory_media')
                .update({ memory_id: memoryIdArg })
                .in('id', orphanIds.slice(1));
            }

            // Insert anything NOT in orphans AND NOT in existing table
            const allExisting = new Set([
              ...orphanUrlSet,
              ...((existing || []).map((e: any) => e.file_url)),
            ]);
            const brandNew = incomingMediaUrls
              .filter((m) => !allExisting.has(m.url))
              .map((m, i) => {
                const hint = (m.type || m.url || '').toLowerCase();
                const fileType = hint.startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/.test(hint)
                  ? 'video'
                  : hint.startsWith('audio') || /\.(mp3|wav|m4a|ogg)(\?|$)/.test(hint)
                    ? 'audio'
                    : 'image';
                // Derive file_key from URL path
                let fileKey = m.url;
                try { fileKey = new URL(m.url).pathname.split('/').slice(-2).join('/'); } catch {}
                return {
                  memory_id: memoryIdArg,
                  user_id: user.id,
                  file_url: m.url,
                  file_key: fileKey,
                  file_type: fileType,
                  is_cover: false,
                  sort_order: orphanIds.length + i,
                };
              });
            if (brandNew.length > 0) {
              await adminClient.from('memory_media').insert(brandNew);
            }
            return orphanIds.length + brandNew.length;
          }
        }

        // STEP 2: No orphans — fresh insert for URLs not already in DB
        const existingSet = new Set((existing || []).map((e: any) => e.file_url));
        const toInsert = incomingMediaUrls
          .filter((m) => !existingSet.has(m.url))
          .map((m, i) => {
            const hint = (m.type || m.url || '').toLowerCase();
            const fileType = hint.startsWith('video') || /\.(mp4|mov|webm|m4v)(\?|$)/.test(hint)
              ? 'video'
              : hint.startsWith('audio') || /\.(mp3|wav|m4a|ogg)(\?|$)/.test(hint)
                ? 'audio'
                : 'image';
            let fileKey = m.url;
            try { fileKey = new URL(m.url).pathname.split('/').slice(-2).join('/'); } catch {}
            return {
              memory_id: memoryIdArg,
              user_id: user.id,
              file_url: m.url,
              file_key: fileKey,
              file_type: fileType,
              is_cover: memoryIdArg ? i === 0 : false,
              sort_order: i,
            };
          });
        if (toInsert.length === 0) return 0;
        const { error: insErr } = await adminClient.from('memory_media').insert(toInsert);
        if (insErr) {
          console.error('[attachChainMedia] INSERT FAILED:', insErr);
          return 0;
        }
        return toInsert.length;
      } catch (e) {
        console.error('attachChainMedia crashed:', e);
        return 0;
      }
    };

    // Fetch photo metadata for photo_backstory prompts (to inherit date/location)
    let photoMeta: any = null;
    if (prompt.type === 'photo_backstory' && prompt.photo_id) {
      const { data: mediaData } = await supabase
        .from('memory_media')
        .select('taken_at, location_name, location_lat, location_lng')
        .eq('id', prompt.photo_id)
        .single();
      photoMeta = mediaData;
    }

    // For non-backstory prompts, check if any of the uploaded photos
    // have EXIF GPS data (reverse-geocoded during upload). Use the
    // first photo's location as a fallback for the memory's location
    // when the user didn't fill in the when-where card.
    let uploadedPhotoMeta: { location_name?: string; lat?: number; lng?: number; taken_at?: string } | null = null;
    if (!photoMeta && incomingMediaUrls.length > 0) {
      try {
        const adminClient = createAdminClient();
        const { data: mediaRows } = await adminClient
          .from('memory_media')
          .select('exif_lat, exif_lng, taken_at')
          .eq('user_id', user.id)
          .in('file_url', incomingMediaUrls.map((m) => m.url))
          .not('exif_lat', 'is', null)
          .limit(1);
        const row = (mediaRows || [])[0] as any;
        if (row?.exif_lat && row?.exif_lng) {
          // Reverse-geocode was already done during upload and stored in
          // the response, but the memory_media table doesn't have
          // location_name. Re-geocode from the EXIF coords.
          let locName: string | null = null;
          try {
            const { reverseGeocode } = await import('@/lib/geo/reverseGeocode');
            locName = await reverseGeocode(row.exif_lat, row.exif_lng);
          } catch {}
          uploadedPhotoMeta = {
            location_name: locName || undefined,
            lat: row.exif_lat,
            lng: row.exif_lng,
            taken_at: row.taken_at || undefined,
          };
        }
      } catch (e) {
        console.warn('Failed to fetch uploaded photo EXIF:', e);
      }
    }
    
    // === KNOWLEDGE ENTRY CREATION (wisdom prompts - separate from memories) ===
    if (shouldCreateKnowledge && hasContent) {
      // Transcribe audio if we have audio but no text
      let responseText = body.responseText;
      if (!responseText && body.responseAudioUrl) {
        try {
          responseText = await transcribeAudio(body.responseAudioUrl);
        } catch (transcribeError) {
          console.error('Transcription failed:', transcribeError);
          // Continue without transcription - audio will still be saved
        }
      }

      const tags: string[] = ['wisdom'];
      if (prompt.personalization_context?.interest) tags.push(prompt.personalization_context.interest);
      if (prompt.personalization_context?.skill) tags.push(prompt.personalization_context.skill);
      if (prompt.category) tags.push(prompt.category);

      const category = prompt.category || 'life_lessons';

      // Dedup guard: the cardchain may call answerPrompt more than once per
      // prompt (per-card auto-save + final Save & Continue). Reuse the
      // existing knowledge entry if one already exists for this source
      // prompt instead of creating duplicates.
      let newKnowledge: any = null;
      let knowledgeError: any = null;
      const { data: existingKnowledge } = await supabase
        .from('knowledge_entries')
        .select('id')
        .eq('source_prompt_id', promptId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingKnowledge?.id) {
        const { data: updated, error: updErr } = await supabase
          .from('knowledge_entries')
          .update({
            response_text: responseText || null,
            audio_url: body.responseAudioUrl || null,
            tags,
          })
          .eq('id', existingKnowledge.id)
          .select()
          .single();
        newKnowledge = updated;
        knowledgeError = updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('knowledge_entries')
          .insert({
            user_id: user.id,
            category: category,
            subcategory: prompt.personalization_context?.skill || prompt.personalization_context?.interest,
            prompt_text: prompt.prompt_text,
            response_text: responseText || null,
            audio_url: body.responseAudioUrl || null,
            related_interest: prompt.personalization_context?.interest || null,
            related_skill: prompt.personalization_context?.skill || null,
            related_hobby: prompt.personalization_context?.hobby || null,
            source_prompt_id: promptId,
            tags: tags,
          })
          .select()
          .single();
        newKnowledge = inserted;
        knowledgeError = insErr;
      }

      if (knowledgeError) {
        console.error('=== KNOWLEDGE ENTRY INSERT FAILED ===');
        console.error('Error:', knowledgeError);
      } else if (newKnowledge) {
        knowledgeEntry = newKnowledge;
        knowledgeEntryId = newKnowledge.id;

        // Update prompt with result knowledge ID
        await supabase
          .from('engagement_prompts')
          .update({ result_knowledge_id: newKnowledge.id })
          .eq('id', promptId);

        // Attach any cardchain-uploaded media so it shows up in the Media tab.
        // Knowledge entries don't own media directly, so memory_id is null.
        mediaAttached += await attachChainMedia(null);
      }
    }
    
    // === MEMORY CREATION (non-wisdom prompts) ===
    // Guard against double-save: if this prompt has already produced a memory
    // (e.g. from a per-card auto-save earlier in the chain), reuse it instead
    // of creating a second one. The cardchain UI can trigger answerPrompt more
    // than once per prompt (per-card save + final Save & Finish), so this is
    // the authoritative dedup point.
    if (shouldCreateMemory && hasContent && prompt.result_memory_id) {
      memoryCreated = true;
      memoryId = prompt.result_memory_id;

      // Still update the memory with fresh content if this call has new text
      // (the second call usually has the fuller response aggregated from all cards).
      // Also patch in location + date which may not have been available during
      // the initial auto-save (when-where card saves after the text card).
      let updatedDescription = body.responseText;
      if (!updatedDescription && body.responseAudioUrl) {
        try { updatedDescription = await transcribeAudio(body.responseAudioUrl); } catch {}
      }
      const updatePayload: Record<string, any> = {};
      if (updatedDescription) {
        updatePayload.description = updatedDescription;
        updatePayload.audio_url = body.responseAudioUrl || null;
        updatePayload.video_url = body.responseVideoUrl || null;
      }
      if (responseLocationName) updatePayload.location_name = responseLocationName;
      if (responseLocationLat != null) updatePayload.location_lat = responseLocationLat;
      if (responseLocationLng != null) updatePayload.location_lng = responseLocationLng;
      if (responseMemoryDate) updatePayload.memory_date = responseMemoryDate;
      if (Object.keys(updatePayload).length > 0) {
        const adminClient = createAdminClient();
        const { error: updateErr } = await adminClient
          .from('memories')
          .update(updatePayload)
          .eq('id', prompt.result_memory_id);
        if (updateErr) {
          console.error('[DEBUG] Memory update FAILED:', updateErr);
        }
      }

      // Attach any newly uploaded cardchain media to the existing memory
      mediaAttached += await attachChainMedia(prompt.result_memory_id);

      // Link tagged people to the existing memory
      const taggedPeopleExisting = (body.responseData as any)?.taggedPeople as { id: string; name: string }[] | undefined;
      if (taggedPeopleExisting && taggedPeopleExisting.length > 0) {
        const { data: memMedia } = await supabase
          .from('memory_media')
          .select('id')
          .eq('memory_id', prompt.result_memory_id)
          .limit(1);
        const mediaId = memMedia?.[0]?.id;
        if (mediaId) {
          const faceTagRows = taggedPeopleExisting.map((p) => ({
            media_id: mediaId,
            contact_id: p.id,
            user_id: user.id,
            is_confirmed: true,
            source: 'cardchain_tag',
          }));
          await supabase.from('memory_face_tags').upsert(faceTagRows, { onConflict: 'media_id,contact_id', ignoreDuplicates: true });
        }
      }
    } else if (shouldCreateMemory && hasContent) {
      // Build tags based on prompt type and context
      const tags: string[] = [];
      
      if (prompt.type === 'photo_backstory') {
        tags.push('photo story');
      } else {
        tags.push(prompt.type.replace(/_/g, ' '));
      }
      if (prompt.category) tags.push(prompt.category);
      
      // Transcribe audio if we have audio but no text
      let memoryDescription = body.responseText;
      if (!memoryDescription && body.responseAudioUrl) {
        try {
          memoryDescription = await transcribeAudio(body.responseAudioUrl);
        } catch (transcribeError) {
          console.error('Memory transcription failed:', transcribeError);
          memoryDescription = '🎤 Voice memory recorded';
        }
      }

      const { data: newMemory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: prompt.prompt_text?.substring(0, 100) || 'Memory',
          description: memoryDescription || '🎤 Voice memory recorded',
          // `memory_type` must be set explicitly — the My Story query uses
          // NOT IN (...) which excludes NULL rows in Postgres, so cardchain
          // memories with null memory_type would silently disappear.
          memory_type: prompt.type === 'photo_backstory' ? 'photo_story' : 'memory',
          audio_url: body.responseAudioUrl || null,
          video_url: body.responseVideoUrl || null,
          // Location priority: 1) photo_backstory's linked photo EXIF
          // 2) uploaded photo EXIF 3) when-where card input 4) null
          memory_date: photoMeta?.taken_at || uploadedPhotoMeta?.taken_at || responseMemoryDate || new Date().toISOString(),
          location_name: photoMeta?.location_name || uploadedPhotoMeta?.location_name || responseLocationName || null,
          location_lat: photoMeta?.location_lat ?? uploadedPhotoMeta?.lat ?? responseLocationLat ?? null,
          location_lng: photoMeta?.location_lng ?? uploadedPhotoMeta?.lng ?? responseLocationLng ?? null,
          tags,
        })
        .select()
        .single();

      if (memoryError) {
        console.error('=== MEMORY INSERT FAILED ===');
        console.error('Error:', memoryError);
        console.error('Error code:', memoryError.code);
        console.error('Error details:', memoryError.details);
      } else if (newMemory) {
        memoryCreated = true;
        memoryId = newMemory.id;

        // Update prompt with result memory ID
        await supabase
          .from('engagement_prompts')
          .update({ result_memory_id: newMemory.id })
          .eq('id', promptId);

        // If photo_backstory, also link the photo to this memory
        if (prompt.type === 'photo_backstory' && prompt.photo_id) {
          await supabase
            .from('memory_media')
            .update({
              memory_id: newMemory.id,
              description: body.responseText
            })
            .eq('id', prompt.photo_id);
        }

        // Attach any cardchain-uploaded media to the new memory.
        // First row becomes the cover so the memory has a thumbnail.
        mediaAttached += await attachChainMedia(newMemory.id);

        // Link tagged people (from PeoplePresentCard) to the memory
        // so the slideshow "People" section can display them.
        const taggedPeople = (body.responseData as any)?.taggedPeople as { id: string; name: string }[] | undefined;
        if (taggedPeople && taggedPeople.length > 0) {
          // Get any media IDs for this memory to attach face tags to
          const { data: memMedia } = await supabase
            .from('memory_media')
            .select('id')
            .eq('memory_id', newMemory.id)
            .limit(1);
          const mediaId = memMedia?.[0]?.id;
          if (mediaId) {
            const faceTagRows = taggedPeople.map((p) => ({
              media_id: mediaId,
              contact_id: p.id,
              user_id: user.id,
              is_confirmed: true,
              source: 'cardchain_tag',
            }));
            await supabase.from('memory_face_tags').insert(faceTagRows);
          }
        }
      }
    } else if (!shouldCreateKnowledge) {
      // Even if we didn't create a memory or knowledge entry (e.g. missing_info,
      // tag_person, profile updates), uploaded media should still appear in the
      // user's Media tab. Attach with memory_id=null.
      mediaAttached += await attachChainMedia(null);
    }

    // === XP AWARDING ===
    // Only award XP once per prompt — skip if prompt was already answered previously
    // (happens when cardchain triggers answerPrompt more than once per prompt).
    // Also skip if the caller passes skipXp=true — the card-chain dashboard awards
    // XP per-card on the client via /api/xp, so the server must not double-count.
    const alreadyAnswered = !!(prompt.result_memory_id || prompt.result_knowledge_id || prompt.status === 'answered');
    const skipXp = (body as any).skipXp === true;
    try {
      if (!skipXp && !alreadyAnswered) {
        const xpAmount = XP_REWARDS[prompt.type] || 10;

        const { error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: xpAmount,
          p_action: 'answer_prompt',
          p_description: `Answered ${prompt.type} prompt`,
          p_reference_type: 'prompt',
          p_reference_id: promptId,
        });

        if (xpError) {
          console.error('Failed to award XP:', xpError);
        } else {
          xpAwarded = xpAmount;
        }
      }

      // Record daily activity for streak tracking
      const { error: streakError } = await supabase.rpc('record_daily_activity', {
        p_user_id: user.id,
        p_activity_type: 'engagement_prompt',
      });

      if (streakError) {
        console.error('Failed to record daily activity:', streakError);
      }
    } catch (xpCatchError) {
      console.error('Error in XP awarding:', xpCatchError);
    }

    // NOTE: photo_backstory is now handled by the unified memory creation block above

    // If it's missing info, update the contact
    if ((prompt.type === 'missing_info' || prompt.type === 'quick_question') && prompt.contact_id) {
      const updateData: Record<string, any> = {};
      const field = prompt.missing_field;
      
      // Map field types to columns
      if (field === 'birth_date' || field === 'date_of_birth') {
        // Accept text input as date
        updateData.birth_date = body.responseText || body.responseData?.date || null;
      } else if (field === 'phone') {
        updateData.phone = body.responseText || body.responseData?.value || null;
      } else if (field === 'email') {
        updateData.email = body.responseText || body.responseData?.value || null;
      } else if (field === 'relationship_type' || field === 'relationship') {
        updateData.relationship_type = body.responseText || body.responseData?.value || null;
      } else if (field === 'how_met') {
        updateData.how_met = body.responseText || null;
      } else if (field === 'address') {
        updateData.address = body.responseText || null;
      } else if (field === 'contact_info') {
        // Combined phone/email input (pipe-separated)
        const parts = (body.responseText || '').split('|');
        if (parts[0]?.trim()) updateData.phone = parts[0].trim();
        if (parts[1]?.trim()) updateData.email = parts[1].trim();
      } else if (body.responseText) {
        // Generic text response - store in notes
        updateData.notes = body.responseText;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: contactError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', prompt.contact_id);

        if (contactError) {
          console.error('Failed to update contact:', contactError);
        }
        contactUpdated = !contactError;
      }
    }

    // If it's tag person, link face to contact
    if (prompt.type === 'tag_person' && body.responseData?.contactId) {
      const faceId = prompt.metadata?.face_id;
      if (faceId) {
        await supabase
          .from('detected_faces')
          .update({
            matched_contact_id: body.responseData.contactId,
            manually_verified: true,
          })
          .eq('id', faceId);
      }
    }

    // Increment prompts_answered_count + check tier advancement
    let tierAdvanced = false;
    let newTier: number | undefined;
    if (!alreadyAnswered) {
      try {
        const adminClient = createAdminClient();
        const { error: rpcErr } = await adminClient.rpc('increment_prompts_answered', { p_user_id: user.id });
        if (rpcErr) {
          // Fallback if RPC doesn't exist yet: read-then-write
          const { data: prof } = await adminClient
            .from('profiles')
            .select('prompts_answered_count')
            .eq('id', user.id)
            .single();
          await adminClient
            .from('profiles')
            .update({ prompts_answered_count: ((prof as any)?.prompts_answered_count ?? 0) + 1 })
            .eq('id', user.id);
        }
      } catch (e) {
        console.error('[answer] increment prompts_answered_count failed:', e);
      }

      const advancement = await checkAndAdvanceTier(supabase, user.id);
      tierAdvanced = advancement.advanced;
      newTier = advancement.newTier;
    }

    const response: AnswerPromptResponse = {
      success: true,
      prompt: answeredPrompt,
      knowledgeEntry,
      knowledgeEntryId: knowledgeEntryId || undefined,
      memoryCreated,
      memoryId: memoryId || undefined,
      contactId: prompt.contact_id || undefined,
      contactUpdated,
      xpAwarded,
      mediaAttached,
      tierAdvanced,
      newTier,
    } as AnswerPromptResponse & { mediaAttached: number; tierAdvanced: boolean; newTier?: number };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Answer prompt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/engagement/prompts/[id]/skip
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: promptId } = await params;
    const body = await request.json();
    const action = body.action; // 'skip' or 'dismiss'

    if (action === 'skip') {
      const cooldownDays = body.cooldownDays || 7;
      
      const { error } = await supabase
        .rpc('skip_prompt', {
          p_prompt_id: promptId,
          p_cooldown_days: cooldownDays,
        });

      if (error) {
        return NextResponse.json({ error: 'Failed to skip prompt' }, { status: 500 });
      }
    } else if (action === 'dismiss') {
      const { error } = await supabase
        .rpc('dismiss_prompt', {
          p_prompt_id: promptId,
        });

      if (error) {
        return NextResponse.json({ error: 'Failed to dismiss prompt' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Skip/dismiss prompt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
