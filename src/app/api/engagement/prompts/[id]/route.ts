import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnswerPromptRequest, AnswerPromptResponse } from '@/types/engagement';
import { transcribeAudio } from '@/lib/ai/transcription';
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
    
    console.log('=== ANSWER PROMPT API ===');
    console.log('Prompt ID:', promptId);
    console.log('Request body:', JSON.stringify(body, null, 2));

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
    
    console.log('Found prompt:', JSON.stringify(prompt, null, 2));

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

    // === UNIFIED MEMORY CREATION FOR ALL CONTENT-GENERATING PROMPTS ===
    // All user-generated content goes into the Memories table
    console.log('=== MEMORY CREATION CHECK ===');
    console.log('prompt.type:', prompt.type);
    console.log('body.responseText length:', body.responseText?.length || 0);
    console.log('body.responseAudioUrl:', body.responseAudioUrl || 'none');
    console.log('body.responseVideoUrl:', body.responseVideoUrl || 'none');
    
    // These prompt types create MEMORY records (not wisdom)
    const MEMORY_CREATING_TYPES = [
      'memory_prompt',   // general memories
      'photo_backstory', // photo stories  
      'favorites_firsts', // favorites and firsts
      'postscript',      // future messages
    ];
    
    // These prompt types create KNOWLEDGE/WISDOM entries (separate from memories)
    const KNOWLEDGE_CREATING_TYPES = [
      'knowledge',       // wisdom/life lessons
      'recipes_wisdom',  // recipes/traditions
    ];
    
    const shouldCreateMemory = MEMORY_CREATING_TYPES.includes(prompt.type);
    const shouldCreateKnowledge = KNOWLEDGE_CREATING_TYPES.includes(prompt.type);
    const hasContent = !!(body.responseText || body.responseAudioUrl);
    
    console.log('shouldCreateMemory:', shouldCreateMemory, 'shouldCreateKnowledge:', shouldCreateKnowledge, 'hasContent:', hasContent);

    // Fetch photo metadata for photo_backstory prompts (to inherit date/location)
    let photoMeta: any = null;
    if (prompt.type === 'photo_backstory' && prompt.photo_id) {
      const { data: mediaData } = await supabase
        .from('memory_media')
        .select('taken_at, location_name, location_lat, location_lng')
        .eq('id', prompt.photo_id)
        .single();
      photoMeta = mediaData;
      console.log('Photo metadata for backstory:', photoMeta);
    }
    
    // === KNOWLEDGE ENTRY CREATION (wisdom prompts - separate from memories) ===
    if (shouldCreateKnowledge && hasContent) {
      console.log('=== CREATING KNOWLEDGE ENTRY (not memory) ===');
      
      // Transcribe audio if we have audio but no text
      let responseText = body.responseText;
      if (!responseText && body.responseAudioUrl) {
        console.log('Transcribing audio for knowledge entry...');
        try {
          responseText = await transcribeAudio(body.responseAudioUrl);
          console.log('Transcription successful, length:', responseText?.length);
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

      const { data: newKnowledge, error: knowledgeError } = await supabase
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

      if (knowledgeError) {
        console.error('=== KNOWLEDGE ENTRY INSERT FAILED ===');
        console.error('Error:', knowledgeError);
      } else if (newKnowledge) {
        knowledgeEntry = newKnowledge;
        knowledgeEntryId = newKnowledge.id;
        console.log('=== KNOWLEDGE ENTRY CREATED ===');
        console.log('Knowledge Entry ID:', newKnowledge.id);

        // Update prompt with result knowledge ID
        await supabase
          .from('engagement_prompts')
          .update({ result_knowledge_id: newKnowledge.id })
          .eq('id', promptId);
      }
    }
    
    // === MEMORY CREATION (non-wisdom prompts) ===
    if (shouldCreateMemory && hasContent) {
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
        console.log('Transcribing audio for memory...');
        try {
          memoryDescription = await transcribeAudio(body.responseAudioUrl);
          console.log('Memory transcription successful, length:', memoryDescription?.length);
        } catch (transcribeError) {
          console.error('Memory transcription failed:', transcribeError);
          memoryDescription = '🎤 Voice memory recorded';
        }
      }
      
      console.log('Creating memory with tags:', tags);
      
      const { data: newMemory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          title: prompt.prompt_text?.substring(0, 100) || 'Memory',
          description: memoryDescription || '🎤 Voice memory recorded',
          audio_url: body.responseAudioUrl || null,
          video_url: body.responseVideoUrl || null,
          memory_date: photoMeta?.taken_at || new Date().toISOString(),
          location_name: photoMeta?.location_name || null,
          location_lat: photoMeta?.location_lat || null,
          location_lng: photoMeta?.location_lng || null,
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
        console.log('=== MEMORY CREATED ===');
        console.log('Memory ID:', newMemory.id);
        
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
          console.log('Linked photo to memory');
        }
      }
    } else if (!shouldCreateKnowledge) {
      console.log('Skipping memory creation - shouldCreateMemory:', shouldCreateMemory, 'hasContent:', hasContent);
    }

    // === XP AWARDING ===
    // Award XP for answering the prompt
    try {
      const xpAmount = XP_REWARDS[prompt.type] || 10;
      console.log('=== AWARDING XP ===');
      console.log('Amount:', xpAmount, 'Type:', prompt.type);

      const { data: xpResult, error: xpError } = await supabase.rpc('award_xp', {
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
        console.log('XP awarded successfully. New total:', xpResult);
      }

      // Record daily activity for streak tracking
      const { data: streakResult, error: streakError } = await supabase.rpc('record_daily_activity', {
        p_user_id: user.id,
        p_activity_type: 'engagement_prompt',
      });

      if (streakError) {
        console.error('Failed to record daily activity:', streakError);
      } else {
        console.log('Daily activity recorded. Streak:', streakResult);
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
    };

    console.log('=== ANSWER RESPONSE ===');
    console.log('memoryId:', memoryId);
    console.log('contactId:', prompt.contact_id);
    console.log('type:', prompt.type);

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
