import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number }> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check Supabase connection using anon key (never expose service role key in health checks)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const dbStart = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) throw error;

    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: 'error' };
    overallStatus = 'degraded';
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 200;

  return NextResponse.json(response, { status: statusCode });
}
