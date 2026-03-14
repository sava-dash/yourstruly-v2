const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.log('No users');
    process.exit(1);
  }

  const userId = profiles[0].id;
  console.log(`User: ${profiles[0].email} (${userId})\n`);

  const { data: prompts } = await supabase
    .from('engagement_prompts')
    .select('id, type, category, life_chapter, prompt_text')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(10);

  if (!prompts || prompts.length === 0) {
    console.log('❌ No pending prompts');
    process.exit(0);
  }

  console.log(`Found ${prompts.length} pending prompts:\n`);
  prompts.forEach((p, i) => {
    console.log(`${i + 1}. ${p.type} / ${p.category} / life_chapter="${p.life_chapter}"`);
    console.log(`   "${p.prompt_text.substring(0, 60)}..."`);
  });

  // Check distribution
  const chapters = {};
  prompts.forEach(p => {
    const ch = p.life_chapter || 'NULL';
    chapters[ch] = (chapters[ch] || 0) + 1;
  });

  console.log('\nLife chapter distribution:');
  Object.entries(chapters).forEach(([ch, count]) => {
    console.log(`  ${ch}: ${count}`);
  });

  process.exit(0);
}

check();
