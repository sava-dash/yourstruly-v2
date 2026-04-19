import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractAndPersistWithMetrics } from '@/lib/interviews/extract-entities';

// Use service role for database operations (interviewees may not be authenticated)

// POST /api/interviews/save-response
// Save interview response and create memories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      questionId,
      accessToken,
      videoUrl,
      videoKey,
      audioUrl,
      audioKey,
      textResponse,
      transcript,
      duration,
      answerType,
    } = body;

    if (!sessionId || !questionId || !accessToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate session token and get session data
    // First check if session exists at all
    const { data: sessionCheck, error: checkError } = await createAdminClient()
      .from('interview_sessions')
      .select('id, access_token')
      .eq('id', sessionId)
      .single();

    if (checkError || !sessionCheck) {
      console.error('Session not found:', sessionId, checkError);
      return NextResponse.json({
        error: 'Session not found'
      }, { status: 404 });
    }

    // Check if token matches
    if (sessionCheck.access_token !== accessToken) {
      console.error('Token mismatch:', { 
        expected: sessionCheck.access_token?.substring(0, 10) + '...', 
        received: accessToken?.substring(0, 10) + '...' 
      });
      return NextResponse.json({
        error: 'Invalid access token'
      }, { status: 403 });
    }

    const { data: session, error: sessionError } = await createAdminClient()
      .from('interview_sessions')
      .select('id, user_id, title, contact_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session load error:', sessionError);
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
    }

    // Get contact info separately
    let contact: { id: string; full_name: string } | null = null;
    if (session.contact_id) {
      const { data: contactData, error: contactError } = await createAdminClient()
        .from('contacts')
        .select('id, full_name')
        .eq('id', session.contact_id)
        .single();
      
      if (contactError) {
        console.error('Contact lookup error:', contactError);
      }
      contact = contactData;
      console.log('Contact lookup result:', { contact_id: session.contact_id, contact });
    } else {
      console.error('Session has no contact_id:', session);
    }

    // Get question text
    const { data: questionData } = await createAdminClient()
      .from('session_questions')
      .select('question_text')
      .eq('id', questionId)
      .single();

    const questionText = questionData?.question_text || '';

    if (!contact?.id) {
      console.error('Contact not found for session:', { sessionId, contact_id: session.contact_id, contact });
      return NextResponse.json({
        error: 'Session has no linked contact'
      }, { status: 400 });
    }

    // Create video response record
    // For text/voice answers, use placeholder values for required video fields
    const { data: responseRecord, error: responseError } = await createAdminClient()
      .from('video_responses')
      .insert({
        session_id: sessionId,
        session_question_id: questionId,
        user_id: session.user_id,
        contact_id: contact.id,
        video_url: videoUrl || null,  // Nullable - null for text answers
        video_key: videoKey || null,  // Nullable - null for text answers
        audio_url: audioUrl,
        audio_key: audioKey,
        text_response: textResponse,
        transcript: transcript,
        duration: duration || 0,
        answer_type: answerType || 'text',
      })
      .select()
      .single();

    if (responseError) {
      console.error('Failed to save response:', JSON.stringify(responseError, null, 2));
      return NextResponse.json({
        error: 'Failed to save response'
      }, { status: 500 });
    }

    // Mark question as answered
    await createAdminClient()
      .from('session_questions')
      .update({ status: 'answered' })
      .eq('id', questionId);

    // Create memory for the interviewer (session owner). Uses the
    // canonical memories columns: `description` (the body), `ai_labels`
    // (the JSONB metadata bucket — we store the interview-specific
    // pointers here so they're queryable later). The previous version
    // wrote `content` and `metadata`, neither of which exists on the
    // memories table, so the insert was silently failing.
    //
    // memory_type='interview' is already excluded from the RAG search
    // RPC so this row won't pollute the owner's self-avatar voice.
    const interviewBody = transcript || textResponse || '';
    const interviewerMemory = {
      user_id: session.user_id,
      title: `Interview: ${questionText.slice(0, 50)}${questionText.length > 50 ? '...' : ''}`,
      description: interviewBody,
      memory_type: 'interview',
      ai_labels: {
        source: 'video_journalist',
        interview_session: sessionId,
        question: questionText,
        answered_by: contact?.full_name,
        session_title: session.title,
        video_url: videoUrl,
        audio_url: audioUrl,
        response_id: responseRecord.id,
      },
    };

    const { data: interviewerMemoryRecord, error: memoryError } = await createAdminClient()
      .from('memories')
      .insert(interviewerMemory)
      .select()
      .single();

    if (memoryError) {
      // Surface in logs — pre-this-fix the error was silently swallowed
      // and interview memories never landed.
      console.error('[save-response] memory insert failed:', memoryError);
    }

    // Fire-and-forget entity extraction. Pulls topics / people / times /
    // locations / one-line summary out of the transcript and writes them
    // to BOTH video_responses.extracted_entities AND memories.metadata so
    // the memory row alone is the comprehensive searchable record.
    // Never throws — see extract-entities.ts for the metric/log shape.
    extractAndPersistWithMetrics(createAdminClient(), {
      videoResponseId: responseRecord.id,
      memoryId: interviewerMemoryRecord?.id ?? null,
      transcript: transcript || textResponse || '',
      sessionId,
      userId: session.user_id,
    });

    // Note: In the future, if contacts are linked to YT accounts,
    // we could create memories for them too. For now, all interview
    // content is owned by the interviewer (user who set up the session).

    return NextResponse.json({
      success: true,
      responseId: responseRecord.id,
      memoryId: interviewerMemoryRecord?.id,
    });
  } catch (error: any) {
    console.error('Save response error:', error);
    return NextResponse.json({
      error: 'Failed to save response'
    }, { status: 500 });
  }
}
