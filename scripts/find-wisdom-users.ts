import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findWisdomUsers() {
  console.log('🔍 Scanning for users with wisdom entries...\n');

  // Get all knowledge_entries
  const { data: knowledgeEntries, error } = await supabase
    .from('knowledge_entries')
    .select('user_id, id, prompt_text, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by user
  const userWisdomMap = new Map<string, any[]>();
  knowledgeEntries?.forEach(entry => {
    const existing = userWisdomMap.get(entry.user_id) || [];
    existing.push(entry);
    userWisdomMap.set(entry.user_id, existing);
  });

  // Get user emails
  const { data: userData } = await supabase.auth.admin.listUsers();
  
  const userEmailMap = new Map(
    userData.users.map(u => [u.id, u.email])
  );

  console.log(`✨ Found ${userWisdomMap.size} users with wisdom entries:\n`);

  Array.from(userWisdomMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([userId, entries]) => {
      const email = userEmailMap.get(userId) || 'unknown';
      console.log(`📧 ${email}`);
      console.log(`   ${entries.length} wisdom entries`);
      console.log(`   Latest: "${entries[0].prompt_text.slice(0, 60)}..."`);
      console.log(`   Created: ${new Date(entries[0].created_at).toLocaleDateString()}\n`);
    });
}

findWisdomUsers().catch(console.error);
