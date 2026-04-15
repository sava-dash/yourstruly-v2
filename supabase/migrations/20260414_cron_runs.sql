-- Cron idempotency guard: a single (name, run_date) row per daily job.
-- Insert with ON CONFLICT DO NOTHING; if no row was inserted, another
-- worker already picked up today's run and this invocation should exit.
CREATE TABLE IF NOT EXISTS cron_runs (
  name        text        NOT NULL,
  run_date    date        NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  notes       jsonb       NULL,
  PRIMARY KEY (name, run_date)
);

-- Cheap index for "when did X last run" queries.
CREATE INDEX IF NOT EXISTS cron_runs_name_started_idx
  ON cron_runs (name, started_at DESC);

-- Per-user dedup for weekly-story: skip users sent within last 6 days.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weekly_story_last_sent_at timestamptz NULL;
