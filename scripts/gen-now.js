const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function gen() {
  // Get any user (first one found)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.log('No users found');
    process.exit(1);
  }

  const profile = profiles[0];

  console.log(`📝 Generating prompts for: ${profile.email}`);
  console.log(`User ID: ${profile.id}\n`);

  const { data, error } = await supabase.rpc('generate_engagement_prompts', {
    p_user_id: profile.id,
    p_count: 20
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Generated ${data} new prompts!`);

  // Verify
  const { count } = await supabase
    .from('engagement_prompts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('status', 'pending');

  console.log(`📊 Total pending prompts: ${count}`);
  console.log('\n✨ Refresh your dashboard to see them!');

  process.exit(0);
}

gen();
