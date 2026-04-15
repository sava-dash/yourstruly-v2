-- Add event_type column to postscripts so we can categorize the source
-- of the scheduled event (contact_birthday / profile_birthday / holiday /
-- anniversary / other). The existing `delivery_event` column continues
-- to store the specific event key (e.g. 'birthday', 'christmas').
--
-- Safe to re-run: IF NOT EXISTS guard.

ALTER TABLE postscripts
  ADD COLUMN IF NOT EXISTS event_type TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_postscripts_event_type
  ON postscripts(event_type)
  WHERE event_type IS NOT NULL;
