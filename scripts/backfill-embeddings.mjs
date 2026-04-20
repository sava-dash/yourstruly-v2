#!/usr/bin/env node
/**
 * Backfill pgvector embeddings on rows where `embedding IS NULL`.
 *
 * Without an embedding, rows are invisible to `search_user_content` — so
 * every engagement-card answer, wisdom entry, or memory written before
 * we started auto-embedding never appears in the Concierge / self-avatar
 * RAG results. This script fills the gap.
 *
 *   node scripts/backfill-embeddings.mjs --dry-run
 *   node scripts/backfill-embeddings.mjs                        # memories only, all users
 *   node scripts/backfill-embeddings.mjs --user <uuid>
 *   node scripts/backfill-embeddings.mjs --types memory,contact,postscript,pet
 *   node scripts/backfill-embeddings.mjs --limit 100            # cap rows per type
 *   node scripts/backfill-embeddings.mjs --concurrency 5
 *
 * Idempotent — WHERE embedding IS NULL means re-runs skip already-indexed
 * rows. Gemini embedding-001 is 768-dim (matches the live RPC signature)
 * and free-tier limit is 1500 req/min, so this is effectively free.
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const env = readFileSync(resolve(PROJECT_ROOT, '.env.local'), 'utf8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const args = {
  types: ['memory'],
  user: null,
  dryRun: false,
  limit: null,
  // Default 1 worker + 650ms throttle → ~92 req/min, comfortably under
  // Gemini free-tier 100 embed-req/min. Bump via flags on paid tier.
  concurrency: 1,
  throttleMs: 650,
  help: false,
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  const next = () => process.argv[++i];
  if (a === '--types') args.types = next().split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--user') args.user = next();
  else if (a === '--dry-run') args.dryRun = true;
  else if (a === '--limit') args.limit = parseInt(next(), 10);
  else if (a === '--concurrency') args.concurrency = parseInt(next(), 10);
  else if (a === '--throttle-ms') args.throttleMs = parseInt(next(), 10);
  else if (a === '--help' || a === '-h') args.help = true;
}

const HELP = `
Usage: node scripts/backfill-embeddings.mjs [options]

Options:
  --types <csv>          Comma-separated types (default: memory).
                         Supported: memory, contact, postscript, pet, profile
  --user <uuid>          Restrict to one user
  --dry-run              Count rows + show sample text, no embeddings written
  --limit <n>            Cap rows processed per type
  --concurrency <n>      Parallel workers (default: 3)
  --throttle-ms <n>      Delay between calls per worker (default: 50)
  --help                 Show this message
`;
if (args.help) { console.log(HELP); process.exit(0); }

if (!get('NEXT_PUBLIC_SUPABASE_URL') || !get('SUPABASE_SERVICE_ROLE_KEY')) {
  console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!args.dryRun && !get('GEMINI_API_KEY')) {
  console.error('missing GEMINI_API_KEY (required unless --dry-run)');
  process.exit(1);
}

const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));
const gemini = args.dryRun ? null : new GoogleGenerativeAI(get('GEMINI_API_KEY'));

// Mirrors buildEmbeddingText() from /api/embeddings/route.ts. Kept in sync
// manually — a mismatch would split the embedding space between organic
// creates and this backfill, so if you change the route, change both.
function buildEmbeddingText(type, data) {
  switch (type) {
    case 'memory':
      return [
        `Memory: ${data.title || 'Untitled memory'}`,
        data.description,
        data.memory_date ? `Date: ${data.memory_date}` : '',
        data.location_name ? `Location: ${data.location_name}` : '',
        data.ai_category ? `Category: ${data.ai_category}` : '',
        data.ai_mood ? `Mood: ${data.ai_mood}` : '',
        data.ai_summary,
      ].filter(Boolean).join(' | ');
    case 'contact':
      return [
        `Person: ${data.full_name}`,
        data.relationship_type ? `Relationship: ${data.relationship_type}` : '',
        data.nickname ? `Also known as: ${data.nickname}` : '',
        data.date_of_birth ? `Birthday: ${data.date_of_birth}` : '',
        (data.city || data.state || data.country)
          ? `Lives in: ${[data.city, data.state, data.country].filter(Boolean).join(', ')}`
          : '',
        data.notes ? `Notes: ${data.notes}` : '',
        data.relationship_details,
      ].filter(Boolean).join(' | ');
    case 'postscript':
      return [
        `PostScript message: ${data.title || 'Untitled'}`,
        data.recipient_name ? `Written for: ${data.recipient_name}` : '',
        data.deliver_on ? `To be delivered: ${data.deliver_on}` : '',
        data.message,
      ].filter(Boolean).join(' | ');
    case 'pet':
      return [
        `Pet: ${data.name}`,
        data.species ? `Species: ${data.species}` : '',
        data.breed ? `Breed: ${data.breed}` : '',
        data.personality ? `Personality: ${data.personality}` : '',
      ].filter(Boolean).join(' | ');
    case 'profile':
      return [
        `User Profile: ${data.full_name || 'User'}`,
        data.bio ? `Bio: ${data.bio}` : '',
        data.interests?.length ? `Interests: ${data.interests.join(', ')}` : '',
        data.personality?.length ? `Personality: ${data.personality.join(', ')}` : '',
        data.life_goals?.length ? `Life goals: ${data.life_goals.join(', ')}` : '',
      ].filter(Boolean).join(' | ');
    default:
      return JSON.stringify(data);
  }
}

async function generateEmbedding(text, attempt = 1) {
  // Request 768 dims so we match the vector(768) column / RPC signature.
  // gemini-embedding-001 defaults to 3072; it supports Matryoshka
  // truncation down to 768 via outputDimensionality.
  const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });
  try {
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: 768,
    });
    return result.embedding.values;
  } catch (err) {
    // Free tier is 100 embed req/min; when we hit that, the SDK throws
    // a 429 with a retryDelay hint in the message. Parse it and wait
    // instead of surfacing the failure to the caller — a stuck worker
    // is better than a half-filled corpus.
    const msg = err?.message || '';
    const is429 = /429/.test(msg) || /Too Many Requests/i.test(msg);
    if (!is429 || attempt > 4) throw err;
    const retryHint = (msg.match(/retry in ([\d.]+)s/i) || [])[1];
    const waitMs = retryHint ? Math.ceil(parseFloat(retryHint) * 1000) + 500 : 20_000 * attempt;
    console.warn(`  rate-limited, waiting ${Math.round(waitMs / 1000)}s…`);
    await new Promise((r) => setTimeout(r, waitMs));
    return generateEmbedding(text, attempt + 1);
  }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, next));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TABLE_OF = {
  memory: 'memories',
  contact: 'contacts',
  postscript: 'postscripts',
  pet: 'pets',
  profile: 'profiles',
};
const USER_COL_OF = (type) => (type === 'profile' ? 'id' : 'user_id');

async function backfillType(type) {
  const table = TABLE_OF[type];
  if (!table) { console.log(`\nunknown type: ${type}`); return; }
  console.log(`\n=== ${type} (${table}) ===`);

  let q = admin.from(table).select('*').is('embedding', null);
  if (args.user) q = q.eq(USER_COL_OF(type), args.user);
  if (args.limit) q = q.limit(args.limit);
  const { data: rows, error } = await q;
  if (error) { console.error(error); return; }
  console.log(`candidate rows: ${rows.length}`);

  const stats = { processed: 0, written: 0, skipped: 0, failed: 0 };

  await runPool(rows, args.concurrency, async (row) => {
    const text = buildEmbeddingText(type, row);
    if (!text || text.length < 10) {
      stats.skipped++;
      return;
    }
    if (args.dryRun) {
      console.log(`[dry] ${type} ${row.id} (text_len=${text.length})`);
      stats.processed++;
      return;
    }
    try {
      const embedding = await generateEmbedding(text);
      const { error: updErr } = await admin.from(table)
        .update({ embedding, embedding_text: text })
        .eq('id', row.id);
      if (updErr) {
        stats.failed++;
        console.warn(`✗ ${type} ${row.id}: ${updErr.message}`);
      } else {
        stats.written++;
        if (stats.written % 20 === 0) console.log(`  ${stats.written} written…`);
      }
    } catch (err) {
      stats.failed++;
      console.warn(`✗ ${type} ${row.id}: ${err?.message ?? err}`);
    }
    stats.processed++;
    if (args.throttleMs) await sleep(args.throttleMs);
  });

  console.log(`processed=${stats.processed}  written=${stats.written}  skipped=${stats.skipped}  failed=${stats.failed}`);
}

console.log('config:', JSON.stringify({
  types: args.types, user: args.user || '(all)', dryRun: args.dryRun,
  limit: args.limit || '(none)', concurrency: args.concurrency, throttleMs: args.throttleMs,
}, null, 2));

for (const t of args.types) await backfillType(t);

console.log('\ndone.');
