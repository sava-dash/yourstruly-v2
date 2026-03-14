const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('📊 Checking engagement_prompts table schema...\n');

  const { data, error } = await supabase
    .from('engagement_prompts')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('Column names:');
    Object.keys(data[0]).forEach((col, i) => {
      console.log(`  ${i + 1}. ${col}: ${typeof data[0][col]}`);
    });
  } else {
    console.log('No data found - checking with pg_catalog...');
  }

  process.exit(0);
}

checkSchema();
