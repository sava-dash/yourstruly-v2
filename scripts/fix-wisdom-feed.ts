import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixWisdomFeed(userEmail: string) {
  console.log('🔍 Finding user...');
  
  // Get user by email
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  console.log('\n📋 Available users in database:');
  userData.users.forEach(u => {
    console.log(`  - ${u.email} (${u.id})`);
  });

  const user = userData.users.find(u => u.email === userEmail);
  
  if (!user) {
    console.error('\n❌ User not found:', userEmail);
    return;
  }

  console.log('✅ Found user:', user.email, user.id);

  // First, check what memory types this user has
  console.log('\n🔍 Checking all memory types...');
  const { data: allMemories, error: allMemoriesError } = await supabase
    .from('memories')
    .select('id, memory_type, title, ai_category')
    .eq('user_id', user.id);

  if (allMemoriesError) {
    console.error('Error fetching memories:', allMemoriesError);
    return;
  }

  const memoryTypeCounts = new Map<string, number>();
  allMemories?.forEach(m => {
    const type = m.memory_type || 'null';
    memoryTypeCounts.set(type, (memoryTypeCounts.get(type) || 0) + 1);
  });

  console.log('\n📊 Memory type breakdown:');
  Array.from(memoryTypeCounts.entries()).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  // Find memories that should be wisdom (either memory_type='wisdom' OR ai_category suggests wisdom)
  console.log('\n🔍 Finding wisdom-related memories without knowledge_entries...');
  
  const { data: wisdomMemories, error: memoriesError } = await supabase
    .from('memories')
    .select('id, title, description, ai_summary, audio_url, created_at, ai_category, memory_type')
    .eq('user_id', user.id)
    .or('memory_type.eq.wisdom,ai_category.in.(life_lessons,relationships,career,parenting,health,spirituality,creativity,family,values,recipes,advice)')
    .order('created_at', { ascending: false });

  if (memoriesError) {
    console.error('Error fetching wisdom memories:', memoriesError);
    return;
  }

  console.log(`📊 Found ${wisdomMemories?.length || 0} wisdom memories`);

  if (!wisdomMemories || wisdomMemories.length === 0) {
    console.log('❌ No wisdom memories found. Maybe they were created with a different memory_type?');
    return;
  }

  // Check which ones already have knowledge_entries
  const { data: existingEntries, error: entriesError } = await supabase
    .from('knowledge_entries')
    .select('memory_id')
    .eq('user_id', user.id)
    .in('memory_id', wisdomMemories.map(m => m.id));

  if (entriesError) {
    console.error('Error fetching existing knowledge entries:', entriesError);
    return;
  }

  const existingMemoryIds = new Set(existingEntries?.map(e => e.memory_id) || []);
  const missingWisdom = wisdomMemories.filter(m => !existingMemoryIds.has(m.id));

  console.log(`\n✨ Found ${missingWisdom.length} wisdom memories without knowledge_entries`);

  if (missingWisdom.length === 0) {
    console.log('✅ All wisdom memories already have knowledge_entries!');
    return;
  }

  // Create knowledge_entries for missing wisdom
  console.log('\n📝 Creating missing knowledge_entries...');
  
  for (const memory of missingWisdom) {
    // Extract first Q&A from description if it's in conversation format
    let promptText = memory.title || 'Wisdom';
    let responseText = memory.ai_summary || memory.description || '';
    
    // Parse markdown Q&A format if present
    const qaMatch = memory.description?.match(/\*\*Q1:\*\*\s*(.+?)\n\n\*\*A1:\*\*\s*(.+?)(\n|$)/s);
    if (qaMatch) {
      promptText = qaMatch[1].trim();
      responseText = qaMatch[2].trim();
    }

    // Determine category from ai_category or default to life_lessons
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

    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert({
        user_id: user.id,
        memory_id: memory.id,
        category,
        prompt_text: promptText.slice(0, 500), // Limit length
        response_text: responseText.slice(0, 2000), // Limit length
        audio_url: memory.audio_url,
        word_count: responseText.split(/\s+/).length,
        is_featured: false,
        created_at: memory.created_at, // Preserve original timestamp
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create knowledge_entry for memory ${memory.id}:`, error);
    } else {
      console.log(`✅ Created knowledge_entry ${data.id} for "${promptText.slice(0, 50)}..."`);
    }
  }

  console.log('\n✨ Done! Check your feed page now.');
}

// Get email from command line args
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: tsx scripts/fix-wisdom-feed.ts <user-email>');
  process.exit(1);
}

fixWisdomFeed(userEmail).catch(console.error);
