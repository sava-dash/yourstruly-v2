import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env
const envPath = resolve(process.cwd(), '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim()))
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Run raw SQL via PostgREST
async function runSQL(sql) {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    method: 'OPTIONS',
  });
  
  // Use the pg endpoint
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`HTTP ${r.status}: ${txt}`);
  }
  return await r.json();
}

const migrations = [
  'ALTER TABLE memory_media ALTER COLUMN memory_id DROP NOT NULL',
  "ALTER TABLE memory_media ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload'",
  'ALTER TABLE engagement_prompts ADD COLUMN IF NOT EXISTS photo_id UUID REFERENCES memory_media(id) ON DELETE SET NULL',
];

for (const sql of migrations) {
  try {
    await runSQL(sql);
    console.log('✅', sql.substring(0, 70));
  } catch (e) {
    const msg = e.message;
    if (msg.includes('already exists') || msg.includes('does not exist')) {
      console.log('⏭️  SKIP:', sql.substring(0, 70));
    } else {
      console.error('❌', sql.substring(0, 70));
      console.error('   ', msg.substring(0, 200));
    }
  }
}
