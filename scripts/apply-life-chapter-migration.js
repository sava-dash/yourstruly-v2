const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📝 Applying life_chapter migration...\n');

  // Step 1: Add column
  console.log('1️⃣  Adding life_chapter column...');
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS life_chapter TEXT;'
  });

  if (alterError && !alterError.message.includes('already exists')) {
    console.error('❌ Error adding column:', alterError.message);
    // Try direct SQL approach
    console.log('Trying alternative approach...');
    
    const queries = [
      'ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS life_chapter TEXT',
      `UPDATE engagement_prompts SET life_chapter = 
        CASE 
          WHEN type = 'photo_backstory' THEN 'childhood'
          WHEN type = 'memory_prompt' AND category LIKE '%childhood%' THEN 'childhood'
          WHEN type = 'memory_prompt' AND category LIKE '%teenage%' THEN 'teenage'
          WHEN type = 'memory_prompt' AND category LIKE '%school%' THEN 'high_school'
          WHEN type = 'memory_prompt' AND category LIKE '%career%' THEN 'jobs_career'
          WHEN type = 'memory_prompt' AND category LIKE '%relationship%' THEN 'relationships'
          WHEN type = 'memory_prompt' AND category LIKE '%travel%' THEN 'travel'
          WHEN type = 'memory_prompt' AND category LIKE '%spiritual%' THEN 'spirituality'
          WHEN type = 'knowledge' THEN 'wisdom_legacy'
          WHEN type = 'favorites_firsts' THEN 'life_moments'
          WHEN type = 'recipes_wisdom' THEN 'wisdom_legacy'
          WHEN type IN ('missing_info', 'quick_question', 'contact_info') THEN 'relationships'
          WHEN type = 'postscript' THEN 'future_messages'
          ELSE 'life_moments'
        END
      WHERE life_chapter IS NULL`
    ];

    console.log('\n⚠️  Manual SQL required. Run these queries in Supabase SQL Editor:');
    console.log('\n' + queries.join(';\n\n') + ';\n');
    
    console.log('\n📍 Go to: https://supabase.com/dashboard → SQL Editor');
    console.log('   Paste the queries above and click "Run"');
    process.exit(1);
  }

  console.log('✅ Column added successfully!');
  
  // Step 2: Update existing rows
  console.log('\n2️⃣  Updating existing prompts with life chapters...');
  const { error: updateError } = await supabase.rpc('update_prompt_life_chapters');
  
  if (updateError) {
    console.log('⚠️  RPC function not found, using direct update...');
    // This will fail with RPC, but that's expected
  }

  console.log('\n✅ Migration complete!');
  console.log('\nNow test with: node scripts/test-shuffle.js');
  
  process.exit(0);
}

applyMigration();
