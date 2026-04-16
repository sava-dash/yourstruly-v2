# Apple Pay & Google Pay Implementation Plan

## Current State

Four checkout flows exist in the app:

| Flow | Route | Method |
|------|-------|--------|
| **Photobook** | `POST /api/photobook/order` | PaymentIntent + `<PaymentElement />` (in-page via `@stripe/react-stripe-js`) |
| **Gift-a-Year** | `POST /api/gifts/checkout` | Stripe Checkout Session (redirect to Stripe-hosted page) |
| **PostScript Gift** | `POST /api/postscripts/[id]/gifts/checkout` | Stripe Checkout Session (redirect) |
| **Subscription** | `POST /api/subscription/checkout` | Stripe Checkout Session (redirect) |

## What Apple Pay & Google Pay Require

Stripe supports both wallets natively through two mechanisms:

1. **Stripe Checkout Sessions** -- Apple Pay and Google Pay buttons appear automatically on the Stripe-hosted checkout page when enabled in the Dashboard. No code changes needed.
2. **PaymentElement** (`@stripe/react-stripe-js`) -- The `<PaymentElement />` component automatically renders Apple Pay / Google Pay options when enabled in the Dashboard. No code changes needed.

### Apple Pay Requirements
- Domain verification: Stripe provides a file that must be served at `/.well-known/apple-developer-merchantid-domain-association`
- HTTPS required (already have it on `app.yourstruly.love`)
- Testing requires Safari with an enrolled card (or Apple Pay sandbox)

### Google Pay Requirements
- No domain verification needed
- Enable in Stripe Dashboard
- Testing requires Chrome with an enrolled card (or Google Pay test environment)

## Implementation Per Checkout Flow

### Photobook (PaymentElement)
Already uses `<PaymentElement />` in `src/components/photobook/CheckoutFlow.tsx`. This component auto-shows Apple Pay / Google Pay when enabled in the Stripe Dashboard. **No code change required.**

### Gift-a-Year (Checkout Session)
Uses `stripe.checkout.sessions.create()` in `src/app/api/gifts/checkout/route.ts`. Stripe's hosted checkout page handles wallet buttons automatically. **No code change required.**

### PostScript Gift (Checkout Session)
Uses `stripe.checkout.sessions.create()` in `src/app/api/postscripts/[id]/gifts/checkout/route.ts`. Same as above. **No code change required.**

### Subscription Checkout (Checkout Session)
Uses Stripe Checkout Session. Same as above. **No code change required.**

## Steps to Enable (Ordered)

1. **Stripe Dashboard** -- Go to Settings > Payment methods > enable "Apple Pay" and "Google Pay" for the account.

2. **Apple Pay domain verification** -- In the Stripe Dashboard under Settings > Payment methods > Apple Pay, add the domain `app.yourstruly.love`. Stripe provides a verification file. Download it and place it at:
   ```
   public/.well-known/apple-developer-merchantid-domain-association
   ```
   Next.js serves files from `public/` at the root, so this will be accessible at `https://app.yourstruly.love/.well-known/apple-developer-merchantid-domain-association`.

3. **Deploy** -- Deploy the verification file to production so Apple can verify the domain.

4. **Verify PaymentElement flows** -- Open the photobook checkout in Safari (Apple Pay) and Chrome (Google Pay) to confirm wallet buttons appear in the `<PaymentElement />`.

5. **Verify Checkout Session flows** -- Open a gift checkout flow and confirm wallet buttons appear on the Stripe-hosted checkout page.

## Effort Estimate

~1 hour total:
- 10 min: Enable payment methods in Stripe Dashboard
- 10 min: Download and commit Apple Pay domain verification file
- 10 min: Deploy
- 30 min: Manual testing across all four checkout flows in Safari + Chrome

## Risks

- **Apple Pay testing** requires Safari on macOS or iOS with an enrolled card. Cannot test in Chrome or Firefox.
- **HTTPS required** for Apple Pay -- already satisfied on production (`app.yourstruly.love`). Local dev (`localhost`) will not show Apple Pay unless using HTTPS tunneling.
- **Stripe test mode** supports both wallets with test cards, but Apple Pay in test mode still requires domain verification on a real domain or `localhost` with HTTPS.
- **No code changes** means no risk of regressions in existing checkout flows.
