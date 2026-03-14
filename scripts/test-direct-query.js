const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirect() {
  console.log('🔍 Testing direct SELECT from engagement_prompts...\n');

  // First, just select from the table directly
  const { data, error } = await supabase
    .from('engagement_prompts')
    .select('*')
    .eq('status', 'pending')
    .limit(1);

  if (error) {
    console.error('❌ Direct SELECT error:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('✅ Direct SELECT works!');
    console.log(`Found ${data.length} pending prompt(s)`);
    console.log('\nColumns returned:');
    Object.keys(data[0]).forEach((key, i) => {
      console.log(`  ${i + 1}. ${key}`);
    });
    console.log(`\nTotal columns: ${Object.keys(data[0]).length}`);
    
    // Check if life_chapter exists
    if ('life_chapter' in data[0]) {
      console.log(`\n✅ life_chapter column exists: "${data[0].life_chapter}"`);
    } else {
      console.log('\n❌ life_chapter column MISSING!');
    }
  } else {
    console.log('⚠️  No pending prompts found');
  }

  process.exit(0);
}

testDirect();
