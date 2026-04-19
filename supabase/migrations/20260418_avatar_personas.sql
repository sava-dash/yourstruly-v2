-- ============================================================================
-- Avatar personas + chat-session mode
--
-- Phase 4 (AI Avatar) reuses the existing chat_sessions / chat_messages /
-- search_user_content RAG pipeline but swaps the system prompt at runtime.
-- The Concierge mode keeps its "warm AI friend" voice; the Avatar mode
-- speaks AS the user (first person) using a synthesized Persona Card.
--
-- This migration adds:
--   1. `avatar_personas` — one row per user holding the latest synthesized
--      Persona Card. Regenerated on demand and on a background cadence as
--      new memories land.
--   2. `mode` column on `chat_sessions` so concierge and avatar conversation
--      threads stay separated and the UI can list each independently.
--
-- Persona Card JSON shape (kept loose so the synthesizer can evolve it
-- without a schema change):
--   {
--     "voice_description":  "warm, sometimes wry, prefers concrete detail",
--     "recurring_themes":   ["family resilience", "small-town roots"],
--     "signature_phrases":  ["honest to goodness", "the long way around"],
--     "life_facts":         ["grew up in Akron in the 60s", "two daughters"],
--     "tone_guidance":      "speaks gently; never lectures; pauses on hard topics",
--     "vocabulary_notes":   "avoids jargon; reaches for sensory imagery",
--     "synthesized_from":   { memories: 47, transcripts: 12 }
--   }
-- ============================================================================

CREATE TABLE IF NOT EXISTS avatar_personas (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_card       JSONB NOT NULL,
  version            INTEGER NOT NULL DEFAULT 1,
  source_count       INTEGER NOT NULL DEFAULT 0,
  last_synthesized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS avatar_personas_synthesized_idx
  ON avatar_personas (last_synthesized_at);

ALTER TABLE avatar_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own persona" ON avatar_personas;
CREATE POLICY "Users can read their own persona" ON avatar_personas
  FOR SELECT USING (auth.uid() = user_id);

-- No public INSERT/UPDATE policy: persona writes happen via the service
-- role from the synthesizer endpoint.

COMMENT ON TABLE avatar_personas IS
  'Per-user Persona Card synthesized from memories + transcripts. Drives the first-person Avatar chat mode. Regenerated on demand and on cadence; version bumps invalidate cached system prompts.';

COMMENT ON COLUMN avatar_personas.persona_card IS
  'JSONB Persona Card: voice_description, recurring_themes, signature_phrases, life_facts, tone_guidance, vocabulary_notes, synthesized_from. Schema is intentionally loose so the synthesizer can evolve.';

-- Mode column on chat_sessions ----------------------------------------------
-- Existing rows default to 'concierge' (the only mode before this migration).
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'concierge'
    CHECK (mode IN ('concierge', 'avatar'));

CREATE INDEX IF NOT EXISTS chat_sessions_user_mode_idx
  ON chat_sessions (user_id, mode, updated_at DESC);

COMMENT ON COLUMN chat_sessions.mode IS
  'Which AI surface owns this thread: concierge (assistant about your life) or avatar (speaks AS you). Drives the system prompt selection in /api/chat.';
