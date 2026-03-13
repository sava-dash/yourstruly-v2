import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAccountData(email: string) {
  // Get user
  const { data: userData } = await supabase.auth.admin.listUsers();
  const user = userData.users.find(u => u.email === email);
  
  if (!user) {
    console.error('User not found:', email);
    return;
  }

  console.log(`✅ Found user: ${user.email}\n`);

  // Check memories
  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  console.log(`📝 Memories: ${memories?.length || 0}`);
  memories?.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.title || 'Untitled'}`);
    console.log(`   Type: ${m.memory_type}`);
    console.log(`   Category: ${m.ai_category || 'none'}`);
    console.log(`   Created: ${new Date(m.created_at).toLocaleDateString()}`);
    if (m.description) {
      console.log(`   Description: ${m.description.slice(0, 100)}...`);
    }
  });

  // Check knowledge_entries
  const { data: wisdom } = await supabase
    .from('knowledge_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false});

  console.log(`\n\n🧠 Wisdom Entries: ${wisdom?.length || 0}`);
  wisdom?.forEach((w, i) => {
    console.log(`\n${i + 1}. ${w.prompt_text?.slice(0, 60) || 'No prompt'}...`);
    console.log(`   Category: ${w.category}`);
    console.log(`   Created: ${new Date(w.created_at).toLocaleDateString()}`);
  });
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: tsx scripts/check-account-data.ts <email>');
  process.exit(1);
}

checkAccountData(email).catch(console.error);
