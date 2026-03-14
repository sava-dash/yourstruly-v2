const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testShuffle() {
  // Get first user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.log('No users found');
    process.exit(1);
  }

  const userId = profiles[0].id;
  console.log(`Testing shuffle for user: ${profiles[0].email}`);
  console.log(`User ID: ${userId}\n`);

  // Call shuffle_engagement_prompts
  const { data, error } = await supabase.rpc('shuffle_engagement_prompts', {
    p_user_id: userId,
    p_count: 5,
    p_regenerate: false,
  });

  if (error) {
    console.error('❌ Error details:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    process.exit(1);
  }

  console.log('✅ Success! Got', data?.length || 0, 'prompts');
  if (data && data.length > 0) {
    console.log('\nFirst prompt:');
    console.log('  Type:', data[0].type);
    console.log('  Text:', data[0].prompt_text?.substring(0, 60) + '...');
  }

  process.exit(0);
}

testShuffle();
