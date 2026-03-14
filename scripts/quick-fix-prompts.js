// Quick fix: Activate a few basic templates and generate prompts
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function quickFix() {
  console.log('🔧 Quick fix: Activating basic prompt templates...\n');

  // Activate some basic templates
  const basicTemplates = [
    {
      id: 'quick_childhood_memory',
      type: 'memory_prompt',
      category: 'childhood',
      prompt_text: 'What is your earliest childhood memory?',
      priority_boost: 10,
      is_active: true
    },
    {
      id: 'quick_favorite_food',
      type: 'favorites_firsts',
      category: 'favorites',
      prompt_text: 'What was your favorite food growing up?',
      priority_boost: 5,
      is_active: true
    },
    {
      id: 'quick_best_friend',
      type: 'memory_prompt',
      category: 'relationships',
      prompt_text: 'Who was your best friend in elementary school?',
      priority_boost: 10,
      is_active: true
    }
  ];

  for (const template of basicTemplates) {
    const { error } = await supabase
      .from('prompt_templates')
      .upsert(template, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Failed to add template ${template.id}:`, error.message);
    } else {
      console.log(`✅ Added template: ${template.prompt_text}`);
    }
  }

  console.log('\n✅ Templates activated! Now click "Generate More" in your dashboard.');
  process.exit(0);
}

quickFix();
