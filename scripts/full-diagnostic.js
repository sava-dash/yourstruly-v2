const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fullDiagnostic() {
  console.log('🔍 COMPLETE DIAGNOSTIC\n');
  
  // Get user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1);
  
  if (!profiles || profiles.length === 0) {
    console.log('No users found');
    process.exit(1);
  }
  
  const userId = profiles[0].id;
  console.log(`User: ${profiles[0].email}\n`);
  
  // Step 1: Check templates by category (simplified - just count by category)
  console.log('📚 TEMPLATES BY CATEGORY:');
  const { data: templates } = await supabase
    .from('prompt_templates')
    .select('category, type')
    .eq('is_active', true)
    .in('type', ['knowledge', 'memory_prompt'])
    .in('category', [
      'childhood', 'early_life', 'teenage', 'high_school', 'school',
      'college', 'university', 'education', 'career', 'jobs_career', 'work',
      'relationships', 'marriage', 'family', 'parenting',
      'travel', 'places_lived', 'spirituality', 'faith', 'religion',
      'wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values',
      'life_moments', 'milestones', 'celebration', 'firsts'
    ]);
  
  const categoryMap = {
    childhood: ['childhood', 'early_life'],
    teenage: ['teenage'],
    high_school: ['high_school', 'school'],
    college: ['college', 'university', 'education'],
    jobs_career: ['career', 'jobs_career', 'work'],
    relationships: ['relationships', 'marriage', 'family', 'parenting'],
    travel: ['travel', 'places_lived'],
    spirituality: ['spirituality', 'faith', 'religion'],
    wisdom_legacy: ['wisdom_legacy', 'wisdom', 'legacy', 'life_lessons', 'values'],
    life_moments: ['life_moments', 'milestones', 'celebration', 'firsts']
  };
  
  const templateCounts = {};
  templates.forEach(t => {
    for (const [chapter, cats] of Object.entries(categoryMap)) {
      if (cats.includes(t.category)) {
        templateCounts[chapter] = (templateCounts[chapter] || 0) + 1;
        break;
      }
    }
  });
  
  Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([chapter, count]) => {
      console.log(`  ${chapter}: ${count} templates`);
    });
  
  // Step 2: Generate fresh prompts
  console.log('\n🔄 GENERATING PROMPTS...');
  const { data: generated, error: genError } = await supabase.rpc('generate_engagement_prompts', {
    p_user_id: userId,
    p_count: 60
  });
  
  if (genError) {
    console.error('❌ Generate error:', genError.message);
    process.exit(1);
  }
  
  console.log(`✅ Generated ${generated} prompts\n`);
  
  // Step 3: Check what was created
  console.log('📊 ACTUAL PROMPTS IN DATABASE:');
  const { data: prompts } = await supabase
    .from('engagement_prompts')
    .select('id, type, category, life_chapter, prompt_text')
    .eq('user_id', userId)
    .eq('status', 'pending');
  
  if (!prompts || prompts.length === 0) {
    console.log('❌ NO PROMPTS CREATED!');
    process.exit(1);
  }
  
  console.log(`Total pending: ${prompts.length}\n`);
  
  // Group by life_chapter
  const byChapter = {};
  prompts.forEach(p => {
    const ch = p.life_chapter || 'NULL';
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(p);
  });
  
  console.log('Distribution:');
  Object.entries(byChapter)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([chapter, proms]) => {
      console.log(`  ${chapter}: ${proms.length} prompts`);
      if (proms.length <= 3) {
        proms.forEach(p => {
          console.log(`    - "${p.prompt_text.substring(0, 50)}..."`);
        });
      }
    });
  
  // Step 4: Test shuffle function
  console.log('\n🎲 TESTING SHUFFLE FUNCTION:');
  const { data: shuffled, error: shuffleError } = await supabase.rpc('shuffle_engagement_prompts', {
    p_user_id: userId,
    p_count: 5,
    p_regenerate: false
  });
  
  if (shuffleError) {
    console.error('❌ Shuffle error:', shuffleError.message);
    process.exit(1);
  }
  
  console.log(`✅ Shuffle returned ${shuffled?.length || 0} prompts`);
  if (shuffled && shuffled.length > 0) {
    shuffled.forEach((p, i) => {
      console.log(`  ${i+1}. [${p.life_chapter || 'NULL'}] ${p.prompt_text.substring(0, 60)}...`);
    });
  }
  
  // Step 5: Check for NULL life_chapters
  const nullCount = byChapter['NULL']?.length || 0;
  if (nullCount > 0) {
    console.log(`\n⚠️  WARNING: ${nullCount} prompts have NULL life_chapter!`);
    console.log('These will NOT show in category filters.');
  }
  
  console.log('\n✅ DIAGNOSTIC COMPLETE');
  process.exit(0);
}

fullDiagnostic();
