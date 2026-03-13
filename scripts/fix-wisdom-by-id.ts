import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixWisdomById(userId: string) {
  console.log(`🔍 Finding wisdom for user ${userId}...\n`);

  // Find memories that look like wisdom (have "Wisdom:" in title or ai_category suggests wisdom)
  const { data: memories, error: memoriesError } = await supabase
    .from('memories')
    .select('id, title, description, ai_summary, audio_url, created_at, ai_category, memory_type')
    .eq('user_id', userId)
    .or('title.ilike.%Wisdom:%,ai_category.in.(life_lessons,relationships,career,parenting,health,spirituality,creativity,family,values,recipes,advice),memory_type.eq.wisdom')
    .order('created_at', { ascending: false });

  if (memoriesError) {
    console.error('Error fetching memories:', memoriesError);
    return;
  }

  console.log(`📊 Found ${memories?.length || 0} wisdom-related memories\n`);

  if (!memories || memories.length === 0) {
    console.log('❌ No wisdom memories found.');
    return;
  }

  // Check which ones already have knowledge_entries
  const { data: existingEntries } = await supabase
    .from('knowledge_entries')
    .select('id, prompt_text, related_memories')
    .eq('user_id', userId);

  // Build a set of memory IDs that already have entries
  const existingMemoryIds = new Set<string>();
  existingEntries?.forEach(entry => {
    if (entry.related_memories && Array.isArray(entry.related_memories)) {
      entry.related_memories.forEach((id: string) => existingMemoryIds.add(id));
    }
  });
  
  console.log(`✅ ${existingMemoryIds.size} already have knowledge_entries`);
  console.log(`📝 ${memories.length - existingMemoryIds.size} need to be created\n`);

  // Create knowledge_entries for missing wisdom
  let created = 0;
  for (const memory of memories) {
    if (existingMemoryIds.has(memory.id)) {
      console.log(`⏭️  Skipping "${memory.title?.slice(0, 50)}..." (already has entry)`);
      continue;
    }

    // Extract question and answer from title/description
    let promptText = memory.title || 'Wisdom';
    let responseText = memory.ai_summary || memory.description || '';

    // If title starts with "Wisdom:", extract the actual wisdom
    if (promptText.startsWith('Wisdom:')) {
      promptText = promptText.replace(/^Wisdom:\s*/, '').trim();
    }

    // Parse Q&A format if present
    const qaMatch = memory.description?.match(/\*\*Q1:\*\*\s*(.+?)\n\n\*\*A1:\*\*\s*(.+?)(\n|$)/s);
    if (qaMatch) {
      promptText = qaMatch[1].trim();
      responseText = qaMatch[2].trim();
    }

    // Determine category
    let category = 'life_lessons';
    if (memory.ai_category) {
      const validCategories = [
        'life_lessons', 'relationships', 'career', 'parenting', 'health',
        'spirituality', 'creativity', 'family', 'values', 'recipes', 'advice', 'other'
      ];
      if (validCategories.includes(memory.ai_category.toLowerCase())) {
        category = memory.ai_category.toLowerCase();
      }
    }

    const { data, error} = await supabase
      .from('knowledge_entries')
      .insert({
        user_id: userId,
        related_memories: [memory.id], // Store as array
        category,
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
      console.error(`❌ Failed for "${promptText.slice(0, 50)}...":`, error.message);
    } else {
      created++;
      console.log(`✅ Created: "${promptText.slice(0, 50)}..." (${category})`);
    }
  }

  console.log(`\n✨ Done! Created ${created} knowledge entries.`);
  console.log('🎉 Refresh your feed page and check the Wisdom tab!');
}

const userId = process.argv[2] || '9009192d-2840-4ab5-adc7-c42cc9a60655';
fixWisdomById(userId).catch(console.error);
