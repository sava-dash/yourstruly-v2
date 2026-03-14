const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testShuffle() {
  const { data: profiles } = await supabase.from('profiles').select('id, email').limit(1);
  const userId = profiles[0].id;
  
  console.log(`Testing shuffle with count=40 for ${profiles[0].email}\n`);

  const { data, error } = await supabase.rpc('shuffle_engagement_prompts', {
    p_user_id: userId,
    p_count: 40,
    p_regenerate: false
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Shuffle returned ${data?.length || 0} prompts\n`);

  if (data && data.length > 0) {
    // Group by life_chapter
    const byChapter = {};
    data.forEach(p => {
      const ch = p.life_chapter || 'NULL';
      byChapter[ch] = (byChapter[ch] || 0) + 1;
    });

    console.log('Distribution in shuffle response:');
    Object.entries(byChapter).sort((a, b) => b[1] - a[1]).forEach(([ch, count]) => {
      console.log(`  ${ch}: ${count} prompts`);
    });

    // Check for missing categories
    const expected = ['childhood', 'teenage', 'high_school', 'college', 'jobs_career', 'relationships', 'travel', 'spirituality', 'wisdom_legacy', 'life_moments'];
    const missing = expected.filter(cat => !byChapter[cat]);
    
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing categories: ${missing.join(', ')}`);
    } else {
      console.log('\n✅ All categories present!');
    }
  }

  process.exit(0);
}

testShuffle();
