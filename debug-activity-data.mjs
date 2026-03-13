#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars. Run: source .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

const userId = '9009192d-2840-4ab5-adc7-c42cc9a60655' // Chuck's test account

console.log('🔍 Checking activity data for user:', userId)
console.log('')

// Check memory_shares
console.log('📸 MEMORY SHARES (shared WITH you):')
const { data: memoryShares, error: memError } = await supabase
  .from('memory_shares')
  .select(`
    id,
    memory_id,
    status,
    created_at,
    memory:memories!memory_shares_memory_id_fkey (
      id,
      title
    )
  `)
  .eq('shared_with_user_id', userId)
  .limit(5)

if (memError) {
  console.log('  ❌ Error:', memError.message)
} else if (!memoryShares || memoryShares.length === 0) {
  console.log('  ⚠️  No memory shares found')
} else {
  memoryShares.forEach(share => {
    const memory = Array.isArray(share.memory) ? share.memory[0] : share.memory
    console.log(`  ✓ Share ID: ${share.id.slice(0, 8)}...`)
    console.log(`    memory_id: ${share.memory_id}`)
    console.log(`    memory.id: ${memory?.id || 'null'}`)
    console.log(`    memory.title: ${memory?.title || 'null'}`)
    console.log(`    status: ${share.status}`)
    console.log('')
  })
}

// Check knowledge_shares via contacts
console.log('📚 WISDOM SHARES (via contacts):')
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, email')
  .eq('email', 'chuckpatel7@gmail.com')

if (!contacts || contacts.length === 0) {
  console.log('  ⚠️  No contact records found')
} else {
  const contactIds = contacts.map(c => c.id)
  const { data: wisdomShares, error: wisError } = await supabase
    .from('knowledge_shares')
    .select(`
      id,
      knowledge_id,
      created_at,
      knowledge:knowledge_entries!knowledge_shares_knowledge_id_fkey (
        id,
        prompt_text
      )
    `)
    .in('contact_id', contactIds)
    .limit(5)

  if (wisError) {
    console.log('  ❌ Error:', wisError.message)
  } else if (!wisdomShares || wisdomShares.length === 0) {
    console.log('  ⚠️  No wisdom shares found')
  } else {
    wisdomShares.forEach(share => {
      const knowledge = Array.isArray(share.knowledge) ? share.knowledge[0] : share.knowledge
      console.log(`  ✓ Share ID: ${share.id.slice(0, 8)}...`)
      console.log(`    knowledge_id: ${share.knowledge_id}`)
      console.log(`    knowledge.id: ${knowledge?.id || 'null'}`)
      console.log(`    knowledge.prompt_text: ${knowledge?.prompt_text?.slice(0, 50) || 'null'}...`)
      console.log('')
    })
  }
}

// Check circles
console.log('👥 CIRCLES (you are a member):')
const { data: memberships } = await supabase
  .from('circle_members')
  .select('circle_id')
  .eq('user_id', userId)
  .eq('status', 'active')

if (!memberships || memberships.length === 0) {
  console.log('  ⚠️  No circle memberships found')
} else {
  const circleIds = memberships.map(m => m.circle_id)
  console.log(`  ✓ Member of ${circleIds.length} circle(s)`)
  
  const { data: circleContent, error: ccError } = await supabase
    .from('circle_content')
    .select(`
      id,
      content_type,
      content_id,
      created_at
    `)
    .in('circle_id', circleIds)
    .neq('shared_by', userId)
    .limit(5)

  if (ccError) {
    console.log('  ❌ Error:', ccError.message)
  } else if (!circleContent || circleContent.length === 0) {
    console.log('  ⚠️  No circle content found')
  } else {
    circleContent.forEach(content => {
      console.log(`  ✓ Content ID: ${content.id.slice(0, 8)}...`)
      console.log(`    content_type: ${content.content_type}`)
      console.log(`    content_id: ${content.content_id}`)
      console.log('')
    })
  }
}

console.log('✅ Done')
