// Diagnostic: Check if prompts exist in database
// Run with: node scripts/check-prompts.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for admin access
);

async function checkPrompts() {
  console.log('🔍 Checking engagement prompts...\n');

  // Check total pending prompts
  const { data: pending, error: pendingError } = await supabase
    .from('engagement_prompts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (pendingError) {
    console.error('❌ Error:', pendingError.message);
    return;
  }

  console.log(`Total pending prompts: ${pending?.count || 0}`);

  // Check by type
  const { data: byType } = await supabase
    .from('engagement_prompts')
    .select('type')
    .eq('status', 'pending');

  if (byType) {
    const typeCounts = {};
    byType.forEach(p => {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
    });
    console.log('\nPrompts by type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  // Check prompt templates
  const { data: templates } = await supabase
    .from('prompt_templates')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`\nActive templates: ${templates?.count || 0}`);

  process.exit(0);
}

checkPrompts();
