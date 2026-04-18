# Subscription Checkout — E2E Test Checklist

## Local webhook loop (one terminal)
```bash
# Start Next.js dev server
npm run dev

# In another terminal, bridge Stripe → local webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the `whsec_...` it prints into .env.local as STRIPE_WEBHOOK_SECRET
# then restart `npm run dev`.
```

## Monthly plan
1. Sign in as fresh test user → `/dashboard/settings`
2. Click **Upgrade → Monthly ($20/mo)**
3. At Stripe Checkout, use `4242 4242 4242 4242` / any future date / any CVC
4. Confirm redirect to `/dashboard/settings?success=true`
5. In the `stripe listen` terminal, verify these events fire **in order**:
   - `checkout.session.completed` → 200
   - `customer.subscription.created` → 200
   - `invoice.payment_succeeded` → 200
6. In Supabase, open `subscriptions` table → confirm row exists:
   - `stripe_customer_id` populated
   - `stripe_price_id` = `price_1T4lnyH94XbyUkwA9PV0uiIz`
   - `status` = `active`
7. Confirm premium gates unlock (seat slots, increased storage limit, PostScripts unlocked).

## Annual plan
Repeat with **Annual ($220/yr)** and `price_1T4ltlH94XbyUkwABUSWR6f7`.

## Failure path
Use card `4000 0000 0000 9995` (payment fails). Confirm:
- `invoice.payment_failed` fires
- `subscriptions.status` flips to `past_due`

## Recovery path
1. With a `past_due` subscription, update card to `4242...` via `/dashboard/settings → Manage billing`.
2. In Stripe dashboard, retry the invoice.
3. Confirm `invoice.payment_succeeded` flips row back to `active`.

## Cancel path
1. `/dashboard/settings → Cancel subscription`
2. Confirm `customer.subscription.updated` sets `cancel_at_period_end = true`
3. In Stripe dashboard, fast-forward → `customer.subscription.deleted` → row status = `canceled`

## Production webhook registration
1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://app.yourstruly.love/api/webhooks/stripe`
3. Events to subscribe:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy signing secret → ECS env var `STRIPE_WEBHOOK_SECRET` → redeploy with `sudo -E env "PATH=$PATH" ./deploy.sh`
5. Send test event from Stripe Dashboard → confirm 200.
