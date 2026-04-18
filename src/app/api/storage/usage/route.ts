import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getStorageQuota } from '@/lib/storage/quota'

export const dynamic = 'force-dynamic'

// GET /api/storage/usage - Get actual storage usage for the current user
export const GET = withAuth(async (_request, { user, supabase }) => {
  try {
    const { used, limit } = await getStorageQuota(supabase, user.id)

    const { count: fileCount } = await supabase
      .from('memory_media')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      total_bytes: used,
      file_count: fileCount ?? 0,
      limit_bytes: limit,
      used_gb: used / (1024 * 1024 * 1024),
      limit_gb: limit / (1024 * 1024 * 1024),
      percentage: (used / limit) * 100,
    })
  } catch (err) {
    console.error('Storage usage error:', err)
    return NextResponse.json({ error: 'Failed to calculate storage' }, { status: 500 })
  }
})
