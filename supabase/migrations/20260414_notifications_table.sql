-- In-app notifications table used by Memory of the Day banner (F2)
-- and any future surface-level pings.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_type_day_idx
  ON notifications (user_id, type, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role inserts handled by cron via admin client (bypasses RLS).
COMMENT ON TABLE notifications IS
  'Lightweight in-app notification feed. Type values include: memory-of-the-day, weekly-story, time-capsule.';
