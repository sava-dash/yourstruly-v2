#!/usr/bin/env node
// Simulate what the activity API returns for Chuck's user

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ffgetlejrwhpwvwtviqm.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = '9009192d-2840-4ab5-adc7-c42cc9a60655'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

console.log('🧪 Testing activity API logic for user:', userId)
console.log('')

const activities = []

// 1. Memory shares
console.log('1️⃣ MEMORY SHARES (shared_with_user_id = user):')
const { data: memoryShares, error: memError } = await supabase
  .from('memory_shares')
  .select(`
    id,
    created_at,
    memory_id,
    memory:memories (
      id,
      title,
      description
    ),
    owner:profiles!memory_shares_shared_by_user_id_fkey (
      id,
      full_name,
      avatar_url
    )
  `)
  .eq('shared_with_user_id', userId)
  .eq('status', 'accepted')
  .order('created_at', { ascending: false })
  .limit(10)

console.log('  Query result:', memError || `${memoryShares?.length || 0} shares`)

if (memoryShares && memoryShares.length > 0) {
  for (const share of memoryShares) {
    const memory = Array.isArray(share.memory) ? share.memory[0] : share.memory
    const owner = Array.isArray(share.owner) ? share.owner[0] : share.owner
    const memoryId = memory?.id || share.memory_id
    
    console.log(`  ✓ Share ${share.id.slice(0,8)}:`)
    console.log(`    memory.id: ${memory?.id}`)
    console.log(`    share.memory_id: ${share.memory_id}`)
    console.log(`    fallback memoryId: ${memoryId}`)
    console.log(`    owner: ${owner?.full_name}`)
    console.log('')
    
    if (!owner || !memoryId) {
      console.log('    ⚠️  SKIPPED (missing owner or memoryId)')
      continue
    }
    
    activities.push({
      id: `memory_share_${share.id}`,
      type: 'memory_shared',
      title: memory?.title || 'A memory',
      description: `${owner.full_name} shared a memory with you`,
      link: `/dashboard/memories/${memoryId}`,
      timestamp: share.created_at
    })
  }
}

console.log('')
console.log('📊 FINAL ACTIVITIES ARRAY:')
console.log(JSON.stringify(activities, null, 2))
console.log('')
console.log(`✅ Total activities: ${activities.length}`)
