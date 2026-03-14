const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  const { data: profiles } = await supabase.from('profiles').select('id, email').limit(1);
  const userId = profiles[0].id;
  
  console.log(`User: ${profiles[0].email}\n`);
  
  // Check pending prompts
  const { data: prompts } = await supabase
    .from('engagement_prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending');
  
  console.log(`Total pending prompts: ${prompts?.length || 0}\n`);
  
  if (!prompts || prompts.length === 0) {
    console.log('❌ NO PROMPTS - Need to generate them\n');
    console.log('Run in Supabase SQL Editor:');
    console.log(`SELECT generate_engagement_prompts('${userId}', 60);`);
    process.exit(0);
  }
  
  // Group by life_chapter
  const byChapter = {};
  prompts.forEach(p => {
    const ch = p.life_chapter || 'NULL';
    byChapter[ch] = (byChapter[ch] || 0) + 1;
  });
  
  console.log('Distribution by life_chapter:');
  const chapters = ['childhood', 'teenage', 'high_school', 'college', 'jobs_career', 'relationships', 'travel', 'spirituality', 'wisdom_legacy', 'life_moments', 'NULL'];
  
  chapters.forEach(ch => {
    const count = byChapter[ch] || 0;
    const status = count >= 6 ? '✅' : count > 0 ? '⚠️ ' : '❌';
    console.log(`  ${status} ${ch}: ${count} prompts`);
  });
  
  const nullCount = byChapter['NULL'] || 0;
  if (nullCount > 0) {
    console.log(`\n⚠️  ${nullCount} prompts have NULL life_chapter - they won't show in filters!`);
    
    // Show sample NULL prompts
    const nullPrompts = prompts.filter(p => !p.life_chapter).slice(0, 3);
    nullPrompts.forEach(p => {
      console.log(`  - category="${p.category}" type="${p.type}"`);
      console.log(`    "${p.prompt_text.substring(0, 60)}..."`);
    });
  }
  
  // Check how UI would filter them
  console.log('\n📱 UI Filter Test (lifeChapter field):');
  const uiField = prompts[0].hasOwnProperty('lifeChapter') ? 'lifeChapter' : 'life_chapter';
  console.log(`  Field name in response: "${uiField}"`);
  
  if (uiField === 'life_chapter') {
    console.log('  ✅ Correct - using life_chapter (snake_case)');
  } else {
    console.log('  ⚠️  Using lifeChapter (camelCase) - check if UI matches');
  }
  
  process.exit(0);
}

diagnose();
