-- Gift-a-Year subscriptions (F4).
CREATE TABLE IF NOT EXISTS gift_subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchaser_email           TEXT,
  purchaser_name            TEXT,
  recipient_email           TEXT NOT NULL,
  recipient_name            TEXT,
  recipient_user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tier                      TEXT NOT NULL CHECK (tier IN ('yt', 'yt_photobook', 'yt_interview')),
  amount_cents              INTEGER NOT NULL,
  stripe_session_id         TEXT,
  stripe_payment_intent_id  TEXT,
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'paid', 'redeemed', 'expired', 'refunded')),
  redemption_token          UUID NOT NULL DEFAULT gen_random_uuid(),
  redeemed_at               TIMESTAMPTZ DEFAULT NULL,
  expires_at                TIMESTAMPTZ DEFAULT NULL,
  message                   TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS gift_subscriptions_token_idx
  ON gift_subscriptions (redemption_token);

CREATE INDEX IF NOT EXISTS gift_subscriptions_recipient_email_idx
  ON gift_subscriptions (LOWER(recipient_email));

CREATE INDEX IF NOT EXISTS gift_subscriptions_status_idx
  ON gift_subscriptions (status, created_at DESC);

ALTER TABLE gift_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchasers read own gifts" ON gift_subscriptions;
CREATE POLICY "purchasers read own gifts" ON gift_subscriptions
  FOR SELECT USING (auth.uid() = purchaser_user_id OR auth.uid() = recipient_user_id);

COMMENT ON TABLE gift_subscriptions IS
  'Gift-a-Year purchases. A row is created on Stripe checkout.session.completed; recipient claims via redemption_token.';
