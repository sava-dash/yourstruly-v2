import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const dbStart = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) throw error;
    
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart
    };
  } catch (err) {
    checks.database = {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
    overallStatus = 'degraded';
  }

  // Check environment variables
  // Only check server-side env vars here.
  // NEXT_PUBLIC_* vars are baked into the JS bundle at build time
  // and may not exist as runtime process.env values.
  const requiredEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: 'error',
      error: `Missing: ${missingEnvVars.join(', ')}`
    };
    overallStatus = 'unhealthy';
  } else {
    checks.environment = { status: 'ok' };
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    latencyMs: Date.now() - startTime,
    checks
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  
  return NextResponse.json(response, { status: statusCode });
}
