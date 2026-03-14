const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCategoryFilter() {
  const { data: profiles } = await supabase.from('profiles').select('id, email').limit(1);
  const userId = profiles[0].id;
  
  console.log(`Testing category filtering for ${profiles[0].email}\n`);

  // Test 1: Fetch travel prompts
  console.log('=== Test 1: Fetch TRAVEL prompts ===');
  const { data: travelPrompts, error: travelError } = await supabase.rpc('shuffle_engagement_prompts', {
    p_user_id: userId,
    p_count: 6,
    p_regenerate: false,
    p_life_chapter: 'travel'
  });

  if (travelError) {
    console.error('❌ Error:', travelError.message);
  } else {
    console.log(`Returned ${travelPrompts.length} prompts`);
    travelPrompts.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.life_chapter || 'NULL'}] "${p.prompt_text.substring(0, 60)}..."`);
    });
  }

  // Test 2: Fetch wisdom prompts
  console.log('\n=== Test 2: Fetch WISDOM prompts ===');
  const { data: wisdomPrompts, error: wisdomError } = await supabase.rpc('shuffle_engagement_prompts', {
    p_user_id: userId,
    p_count: 6,
    p_regenerate: false,
    p_life_chapter: 'wisdom_legacy'
  });

  if (wisdomError) {
    console.error('❌ Error:', wisdomError.message);
  } else {
    console.log(`Returned ${wisdomPrompts.length} prompts`);
    wisdomPrompts.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.life_chapter || 'NULL'}] "${p.prompt_text.substring(0, 60)}..."`);
    });
  }

  // Check if they're the same
  if (travelPrompts && wisdomPrompts) {
    const samePrompts = travelPrompts.filter(tp => 
      wisdomPrompts.some(wp => wp.id === tp.id)
    );
    console.log(`\n${samePrompts.length > 0 ? '❌' : '✅'} Overlap: ${samePrompts.length} prompts appear in both categories`);
  }

  process.exit(0);
}

testCategoryFilter();
