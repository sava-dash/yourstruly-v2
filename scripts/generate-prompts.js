// Generate fresh engagement prompts
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generatePrompts() {
  // Get current user (you'll need to pass the user ID)
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Usage: node scripts/generate-prompts.js <user_id>');
    process.exit(1);
  }

  console.log(`🔄 Generating prompts for user: ${userId}\n`);

  // Call the generate function
  const { data, error } = await supabase.rpc('generate_engagement_prompts', {
    p_user_id: userId,
    p_count: 20
  });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Generated ${data} new prompts!`);
  
  // Check pending count
  const { count } = await supabase
    .from('engagement_prompts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  console.log(`📊 Total pending prompts: ${count}`);
  
  process.exit(0);
}

generatePrompts();
