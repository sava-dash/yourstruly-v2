import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixRemaining() {
  const userId = '9009192d-2840-4ab5-adc7-c42cc9a60655';

  // Get the two family memories
  const { data: memories } = await supabase
    .from('memories')
    .select('id, title, description, ai_summary, audio_url, created_at')
    .eq('user_id', userId)
    .eq('ai_category', 'family')
    .limit(2);

  if (!memories || memories.length === 0) {
    console.log('No family memories found');
    return;
  }

  for (const memory of memories) {
    const promptText = memory.title || 'Family wisdom';
    const responseText = memory.ai_summary || memory.description || '';

    // Use "life_lessons" instead of "family"
    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert({
        user_id: userId,
        related_memories: [memory.id],
        category: 'life_lessons', // Changed from 'family'
        prompt_text: promptText.slice(0, 500),
        response_text: responseText.slice(0, 2000),
        audio_url: memory.audio_url,
        word_count: responseText.split(/\s+/).length,
        is_featured: false,
        created_at: memory.created_at,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed: ${error.message}`);
    } else {
      console.log(`✅ Created: "${promptText.slice(0, 50)}..."`);
    }
  }
}

fixRemaining().catch(console.error);
