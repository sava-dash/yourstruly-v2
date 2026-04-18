# Engagement tests

Vitest scaffold seeded for the engagement & prompts surface.

## Setup

```bash
pnpm install   # picks up the new vitest devDependency in package.json
pnpm test      # runs once
pnpm test:watch
```

## What's covered

- `tests/engagement/prompt-scoring.test.ts` — exercises the
  `PROMPT-ORDERING-STRATEGY.md` scorer (variety penalty, time-of-day,
  freshness, photo relevance) and the variety-aware re-rank.
- `tests/engagement/seed-types.test.ts` — type/category alias collapse and
  text normalization used by the dedup pass in `generate-ai-prompts`.
- `tests/engagement/follow-up-engine.test.ts` — the synchronous skip-and-log
  paths of the fire-and-forget wrapper. Anthropic-call paths require
  network + API key and live in the integration plan
  (`docs/ENGAGEMENT_TEST_PLAN.md`), not here.

All three files are pure-function tests with no Supabase, network, or DOM
dependencies, so they run in the default `node` Vitest environment without
extra setup.
