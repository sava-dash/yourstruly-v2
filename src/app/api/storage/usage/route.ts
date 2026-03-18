import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/storage/usage - Get actual storage usage for the current user
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let totalBytes = 0
    let fileCount = 0

    // 1. Sum file_size from memory_media (covers photos, uploaded audio/video)
    const { data: mediaFiles } = await supabase
      .from('memory_media')
      .select('file_size')
      .eq('user_id', user.id)
      .not('file_size', 'is', null)
    
    for (const m of (mediaFiles || [])) {
      totalBytes += m.file_size || 0
      fileCount++
    }

    // 2. Estimate text content (memories descriptions, wisdom entries)
    const { data: memories } = await supabase
      .from('memories')
      .select('description, title')
      .eq('user_id', user.id)
    
    for (const m of (memories || [])) {
      totalBytes += Buffer.byteLength(m.description || '') + Buffer.byteLength(m.title || '')
    }

    const { data: knowledge } = await supabase
      .from('knowledge_entries')
      .select('response_text, prompt_text, audio_url')
      .eq('user_id', user.id)

    for (const k of (knowledge || [])) {
      totalBytes += Buffer.byteLength(k.response_text || '') + Buffer.byteLength(k.prompt_text || '')
    }

    // 3. Estimate audio recordings from knowledge entries (not in memory_media)
    // These are typically 50-200KB each
    const audioRecordings = (knowledge || []).filter(k => k.audio_url && k.audio_url.includes('supabase'))
    // Estimate ~150KB per audio recording not tracked in memory_media
    totalBytes += audioRecordings.length * 150 * 1024

    // 4. Contributions with media
    const { data: contributions } = await supabase
      .from('memory_contributions')
      .select('media_url')
      .not('media_url', 'is', null)
    
    // Estimate ~500KB per contribution image
    totalBytes += (contributions || []).filter(c => c.media_url).length * 500 * 1024

    const limitBytes = 10 * 1024 * 1024 * 1024 // 10 GB free tier

    return NextResponse.json({
      total_bytes: totalBytes,
      file_count: fileCount,
      limit_bytes: limitBytes,
      used_gb: totalBytes / (1024 * 1024 * 1024),
      limit_gb: 10,
      percentage: (totalBytes / limitBytes) * 100,
    })
  } catch (err) {
    console.error('Storage usage error:', err)
    return NextResponse.json({ error: 'Failed to calculate storage' }, { status: 500 })
  }
}
