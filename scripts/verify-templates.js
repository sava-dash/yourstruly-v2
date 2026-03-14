const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('id, prompt_text, is_active')
    .in('id', ['quick_childhood_memory', 'quick_favorite_food', 'quick_best_friend']);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Templates:');
    console.table(data);
  }
  
  // Check all active
  const { data: allActive } = await supabase
    .from('prompt_templates')
    .select('id')
    .eq('is_active', true);
    
  console.log(`\nTotal active templates: ${allActive?.length || 0}`);
  process.exit(0);
}

verify();
