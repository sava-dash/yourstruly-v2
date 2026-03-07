import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/admin/migrate
 * 
 * Runs pending schema migrations.
 * Only callable with the admin secret.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: string[] = [];

  const migrations = [
    // Allow standalone gallery photos (not attached to a memory)
    'ALTER TABLE memory_media ALTER COLUMN memory_id DROP NOT NULL',
    // Track photo origin
    "ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'",
    // Link engagement prompts to specific photos
    'ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES memory_media(id) ON DELETE SET NULL',
  ];

  for (const sql of migrations) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) throw error;
      results.push(`OK: ${sql.substring(0, 60)}`);
    } catch (e: unknown) {
      // Some errors are OK (e.g. column already exists)
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('already exists') || msg.includes('does not exist')) {
        results.push(`SKIP: ${sql.substring(0, 60)} (${msg})`);
      } else {
        results.push(`ERR: ${sql.substring(0, 60)} - ${msg}`);
      }
    }
  }

  return NextResponse.json({ results });
}
