const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPending() {
  const { data: profiles } = await supabase.from('profiles').select('id, email').limit(1);
  const userId = profiles[0].id;
  
  console.log(`Checking ALL 80 pending prompts for ${profiles[0].email}\n`);

  const { data, error } = await supabase
    .from('engagement_prompts')
    .select('id, life_chapter, prompt_text, category, type')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('life_chapter');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`Total: ${data.length} prompts\n`);

  // Group by life_chapter
  const byChapter = {};
  data.forEach(p => {
    const ch = p.life_chapter || 'NULL';
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(p);
  });

  console.log('Distribution across ALL pending prompts:');
  Object.entries(byChapter).sort((a, b) => b[1].length - a[1].length).forEach(([ch, prompts]) => {
    console.log(`\n${ch}: ${prompts.length} prompts`);
    prompts.slice(0, 2).forEach(p => {
      console.log(`  - "${p.prompt_text.substring(0, 60)}..."`);
    });
  });

  process.exit(0);
}

checkPending();
