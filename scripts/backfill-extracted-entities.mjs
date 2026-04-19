#!/usr/bin/env node
/**
 * One-shot backfill: extract entities from every memory.description and
 * video_response.transcript that doesn't already have extracted_entities
 * populated.
 *
 * The extraction logic mirrors src/lib/interviews/extract-entities.ts —
 * duplicated here so the script runs without a TypeScript toolchain.
 *
 *   node scripts/backfill-extracted-entities.mjs --dry-run
 *   node scripts/backfill-extracted-entities.mjs                   # both tables, all users
 *   node scripts/backfill-extracted-entities.mjs --table memories
 *   node scripts/backfill-extracted-entities.mjs --user <uuid>     # one user only
 *   node scripts/backfill-extracted-entities.mjs --limit 50        # cap rows per table
 *   node scripts/backfill-extracted-entities.mjs --concurrency 5   # parallel workers
 *
 * Idempotent: rows where extracted_entities IS NOT NULL are skipped, so
 * re-running picks up where you left off.
 *
 * Pricing (Claude Haiku 4.5 list, 2026-04):
 *   $1.00 / M input tokens, $5.00 / M output tokens
 *   ~6000-char input, ~600-token output → roughly $0.005 per row.
 *   Print a running cost estimate so you can stop early if needed.
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ─── Env loading ─────────────────────────────────────────────────────────
function loadEnv() {
  const env = readFileSync(resolve(PROJECT_ROOT, '.env.local'), 'utf8');
  const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  };
  return {
    supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'),
    serviceKey: get('SUPABASE_SERVICE_ROLE_KEY'),
    anthropicKey: get('ANTHROPIC_API_KEY'),
  };
}

// ─── CLI args ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    table: 'both',           // memories | video_responses | both
    user: null,              // single uuid filter
    dryRun: false,
    limit: null,             // per-table cap
    concurrency: 3,
    minLength: 40,
    throttleMs: 100,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--table') args.table = next();
    else if (a === '--user') args.user = next();
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = parseInt(next(), 10);
    else if (a === '--concurrency') args.concurrency = parseInt(next(), 10);
    else if (a === '--min-length') args.minLength = parseInt(next(), 10);
    else if (a === '--throttle-ms') args.throttleMs = parseInt(next(), 10);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const HELP_TEXT = `
Usage: node scripts/backfill-extracted-entities.mjs [options]

Options:
  --table <both|memories|video_responses>   Which table(s) to backfill (default: both)
  --user <uuid>                             Restrict to one user
  --dry-run                                 Print what would happen, no LLM calls / writes
  --limit <n>                               Cap rows processed per table
  --concurrency <n>                         Parallel workers (default: 3)
  --min-length <n>                          Skip rows whose body < n chars (default: 40)
  --throttle-ms <n>                         Delay between calls per worker (default: 100)
  --help                                    Show this message
`;

// ─── Extraction (mirrors src/lib/interviews/extract-entities.ts) ─────────
const MAX_TEXT_LENGTH = 6000;

const SYSTEM_PROMPT = `You extract structured entities from interview transcripts.

Return STRICT JSON with this exact shape:
{
  "topics":    [string, ...],   // 3-7 short topical phrases (2-4 words each)
  "people":    [string, ...],   // names or relationships ("Grandma Rose", "my brother")
  "times":     [string, ...],   // dates, years, decades, life stages ("the 1980s", "when I was 12")
  "locations": [string, ...],   // cities, countries, specific places ("Brooklyn", "the kitchen")
  "summary":   string           // ONE sentence (max 25 words) capturing the core memory
}

Rules:
- Use the speaker's own phrasing where possible. Don't invent details.
- Prefer specific over generic ("Grandma Rose" beats "a relative"; "Brooklyn" beats "the city").
- If a field has nothing concrete, return an empty array — never guess.
- Topics should describe the THEME (e.g. "family tradition"), not the time/place/people, which have their own arrays.
- Return JSON only. No prose, no code fences.`;

function parseEntities(raw) {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  let parsed = null;
  try { parsed = JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { return null; } }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const arr = (v) => Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x.trim().length > 0)
    : [];
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const topics = arr(parsed.topics);
  const people = arr(parsed.people);
  const times = arr(parsed.times);
  const locations = arr(parsed.locations);
  if (!summary && topics.length === 0 && people.length === 0 && times.length === 0 && locations.length === 0) {
    return null;
  }
  return {
    topics, people, times, locations, summary,
    extracted_at: new Date().toISOString(),
  };
}

async function extractEntities(anthropic, text) {
  const trimmed = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: trimmed }],
    });
    const block = response.content.find((b) => b.type === 'text');
    const raw = block?.type === 'text' ? block.text : '';
    if (!raw) return { entities: null, usage: response.usage };
    return { entities: parseEntities(raw), usage: response.usage };
  } catch (err) {
    return { entities: null, error: err?.message || String(err), usage: null };
  }
}

// ─── Worker pool ────────────────────────────────────────────────────────
async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const results = [];
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, next));
  return results;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Per-table runners ──────────────────────────────────────────────────
async function backfillMemories({ admin, anthropic, args }) {
  console.log('\n=== memories ===');
  let q = admin.from('memories')
    .select('id, user_id, title, description, ai_summary, embedding_text')
    .is('extracted_entities', null);
  if (args.user) q = q.eq('user_id', args.user);
  if (args.limit) q = q.limit(args.limit);
  const { data: rows, error } = await q;
  if (error) {
    console.error('memories query error:', error);
    return { processed: 0, written: 0, skipped: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };
  }
  console.log(`fetched ${rows.length} candidate rows`);

  const eligible = rows
    .map((r) => ({
      ...r,
      _body: (r.description || r.ai_summary || r.embedding_text || '').toString(),
    }))
    .filter((r) => r._body.length >= args.minLength);
  console.log(`${eligible.length} pass min-length ≥ ${args.minLength}`);

  const stats = { processed: 0, written: 0, skipped: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };

  await runPool(eligible, args.concurrency, async (row, i) => {
    if (args.dryRun) {
      console.log(`[dry] memory ${row.id} (${row._body.length} chars) — would extract`);
      stats.processed++;
      return;
    }
    const { entities, usage, error } = await extractEntities(anthropic, row._body);
    if (usage) {
      stats.totalInputTokens += usage.input_tokens || 0;
      stats.totalOutputTokens += usage.output_tokens || 0;
    }
    if (error || !entities) {
      stats.failed++;
      console.warn(`✗ memory ${row.id}: ${error || 'no entities returned'}`);
    } else {
      const { error: updErr } = await admin.from('memories')
        .update({ extracted_entities: entities })
        .eq('id', row.id);
      if (updErr) {
        stats.failed++;
        console.warn(`✗ memory ${row.id} write: ${updErr.message}`);
      } else {
        stats.written++;
        console.log(`✓ memory ${row.id} — ${entities.topics.length} topics, ${entities.people.length} people, ${entities.locations.length} places, ${entities.times.length} times`);
      }
    }
    stats.processed++;
    if (args.throttleMs) await sleep(args.throttleMs);
  });

  return stats;
}

async function backfillVideoResponses({ admin, anthropic, args }) {
  console.log('\n=== video_responses ===');
  let q = admin.from('video_responses')
    .select('id, user_id, transcript')
    .is('extracted_entities', null)
    .not('transcript', 'is', null);
  if (args.user) q = q.eq('user_id', args.user);
  if (args.limit) q = q.limit(args.limit);
  const { data: rows, error } = await q;
  if (error) {
    console.error('video_responses query error:', error);
    return { processed: 0, written: 0, skipped: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };
  }
  console.log(`fetched ${rows.length} candidate rows`);

  const eligible = rows.filter((r) => (r.transcript || '').length >= args.minLength);
  console.log(`${eligible.length} pass min-length ≥ ${args.minLength}`);

  const stats = { processed: 0, written: 0, skipped: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };

  await runPool(eligible, args.concurrency, async (row, i) => {
    if (args.dryRun) {
      console.log(`[dry] video_response ${row.id} (${row.transcript.length} chars) — would extract`);
      stats.processed++;
      return;
    }
    const { entities, usage, error } = await extractEntities(anthropic, row.transcript);
    if (usage) {
      stats.totalInputTokens += usage.input_tokens || 0;
      stats.totalOutputTokens += usage.output_tokens || 0;
    }
    if (error || !entities) {
      stats.failed++;
      console.warn(`✗ video_response ${row.id}: ${error || 'no entities returned'}`);
    } else {
      const { error: updErr } = await admin.from('video_responses')
        .update({ extracted_entities: entities })
        .eq('id', row.id);
      if (updErr) {
        stats.failed++;
        console.warn(`✗ video_response ${row.id} write: ${updErr.message}`);
      } else {
        stats.written++;
        console.log(`✓ video_response ${row.id} — ${entities.topics.length} topics, ${entities.people.length} people, ${entities.locations.length} places`);
      }
    }
    stats.processed++;
    if (args.throttleMs) await sleep(args.throttleMs);
  });

  return stats;
}

// Claude Haiku 4.5 list pricing (2026-04)
const HAIKU_INPUT_PER_MTOK = 1.00;
const HAIKU_OUTPUT_PER_MTOK = 5.00;
function estimateCost(inTok, outTok) {
  return ((inTok / 1_000_000) * HAIKU_INPUT_PER_MTOK + (outTok / 1_000_000) * HAIKU_OUTPUT_PER_MTOK).toFixed(4);
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  const env = loadEnv();
  if (!env.supabaseUrl || !env.serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  if (!args.dryRun && !env.anthropicKey) {
    console.error('Missing ANTHROPIC_API_KEY in .env.local (required unless --dry-run)');
    process.exit(1);
  }

  const admin = createClient(env.supabaseUrl, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anthropic = args.dryRun ? null : new Anthropic({ apiKey: env.anthropicKey });

  console.log('Backfill config:', JSON.stringify({
    table: args.table,
    user: args.user || '(all)',
    dryRun: args.dryRun,
    limit: args.limit || '(none)',
    concurrency: args.concurrency,
    minLength: args.minLength,
    throttleMs: args.throttleMs,
  }, null, 2));

  const totals = { processed: 0, written: 0, failed: 0, totalInputTokens: 0, totalOutputTokens: 0 };

  if (args.table === 'memories' || args.table === 'both') {
    const s = await backfillMemories({ admin, anthropic, args });
    totals.processed += s.processed;
    totals.written += s.written;
    totals.failed += s.failed;
    totals.totalInputTokens += s.totalInputTokens;
    totals.totalOutputTokens += s.totalOutputTokens;
  }

  if (args.table === 'video_responses' || args.table === 'both') {
    const s = await backfillVideoResponses({ admin, anthropic, args });
    totals.processed += s.processed;
    totals.written += s.written;
    totals.failed += s.failed;
    totals.totalInputTokens += s.totalInputTokens;
    totals.totalOutputTokens += s.totalOutputTokens;
  }

  console.log('\n=== summary ===');
  console.log(`processed: ${totals.processed}`);
  console.log(`written:   ${totals.written}`);
  console.log(`failed:    ${totals.failed}`);
  if (!args.dryRun) {
    console.log(`tokens in: ${totals.totalInputTokens.toLocaleString()}`);
    console.log(`tokens out: ${totals.totalOutputTokens.toLocaleString()}`);
    console.log(`est. cost: $${estimateCost(totals.totalInputTokens, totals.totalOutputTokens)}`);
  }
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
