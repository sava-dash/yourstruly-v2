import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
  console.log('🔍 Checking knowledge_entries schema...\n');

  // Try to get one record to see what columns exist
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 Columns in knowledge_entries:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n📄 Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('❌ No records found in knowledge_entries table');
  }
}

checkSchema().catch(console.error);
