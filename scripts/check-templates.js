const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplates() {
  console.log('Checking prompt_templates table...\n');

  // Get all active templates
  const { data: templates, error } = await supabase
    .from('prompt_templates')
    .select('id, type, category, prompt_text, is_active, priority_boost')
    .eq('is_active', true)
    .order('category');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`Total active templates: ${templates.length}\n`);

  // Group by category
  const byCategory = {};
  templates.forEach(t => {
    const cat = t.category || 'NULL';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  });

  console.log('Distribution by category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([cat, temps]) => {
      console.log(`\n${cat}: ${temps.length} templates`);
      // Show first 3
      temps.slice(0, 3).forEach(t => {
        console.log(`  - [${t.type}] "${t.prompt_text.substring(0, 70)}..."`);
      });
    });

  // Group by type
  console.log('\n\n=== By Type ===');
  const byType = {};
  templates.forEach(t => {
    const type = t.type || 'NULL';
    byType[type] = (byType[type] || 0) + 1;
  });

  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

  process.exit(0);
}

checkTemplates();
