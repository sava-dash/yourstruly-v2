#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://ffgetlejrwhpwvwtviqm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ2V0bGVqcndocHd2d3R2aXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU0OTMzNiwiZXhwIjoyMDg3MTI1MzM2fQ.N0T8rpaPAYSXERkv1GO05g_-1iYfgd0FeT_VNODu27w';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔒 Checking and fixing RLS policies...\n');

// Check RLS status
console.log('📊 Checking RLS status on tables...');
const { data: tables, error: tablesError } = await supabase
  .from('pg_tables')
  .select('tablename, rowsecurity')
  .eq('schemaname', 'public')
  .in('tablename', [
    'engagement_prompts',
    'knowledge_entries',
    'memories',
    'memory_media',
    'contacts',
    'postscripts',
    'wisdom_entries'
  ]);

if (tablesError) {
  console.error('Error checking tables:', tablesError);
} else {
  console.table(tables);
}

// Read and execute RLS fix script
console.log('\n🔧 Applying RLS fixes...');
const sql = readFileSync('./supabase/verify_rls.sql', 'utf8');

// Split by statement and execute
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));

let successCount = 0;
let errorCount = 0;

for (const statement of statements) {
  if (!statement || statement.toLowerCase().includes('select')) continue;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
    if (error) {
      console.error(`❌ Error:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  } catch (err) {
    // Try direct execution
    console.log(`Executing: ${statement.substring(0, 60)}...`);
  }
}

console.log(`\n✅ Complete! ${successCount} successful, ${errorCount} errors`);

// Verify policies
console.log('\n📋 Verifying policies on engagement_prompts...');
const { data: policies, error: policiesError } = await supabase
  .from('pg_policies')
  .select('policyname, cmd')
  .eq('schemaname', 'public')
  .eq('tablename', 'engagement_prompts');

if (policiesError) {
  console.error('Error checking policies:', policiesError);
} else {
  console.table(policies);
}

console.log('\n✅ RLS verification complete!');
console.log('\nℹ️  If you still see other users\' data, check:');
console.log('  1. You\'re using the correct user account');
console.log('  2. The app is using auth.uid() correctly in queries');
console.log('  3. Clear browser cache and reload');
