# YoursTruly V2 - TODO

## Post-Deployment Tasks

### Stripe Webhook Setup ✅ DONE
- [x] Webhook endpoint live at `/api/webhooks/stripe` (handles 7 event types incl. `payment_intent.succeeded` for photobooks)
- [x] `STRIPE_WEBHOOK_SECRET` present in ECS task def (rev 7), and `STRIPE_WEBHOOK_SECRET_GIFTS` for the gifts variant
- [ ] Confirm event subscriptions in Stripe Dashboard cover: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `customer.subscription.trial_will_end`, `payment_intent.succeeded`

### Interview Security & Claiming ✅ DONE
- [x] Migration `20260418_interview_claimable.sql` adds `interviewee_email` + `claimed_by_user_id` to `interview_sessions`
- [x] `/api/interviews/claimable?email=` returns unclaimed sessions
- [x] `/api/interviews/claim-account` copies responses into the new user
- [x] `ClaimAccountFlow` mounted on the interview completion page
- [x] Signup page checks for claimable interviews on email entry and offers to claim

### Testing
- [ ] Test face detection on uploaded photos (manual — see `docs/PRELAUNCH_TEST_BATCH3.md`)
- [ ] Verify Resend email delivery for seat invites (manual)
- [ ] Test photobook builder flow end-to-end (manual)
- [ ] Test live transcription/conversations end-to-end (manual)
- [ ] Test group interviews end-to-end (manual)

### Other
- [ ] Set up Prodigi API keys (production)

## Stripe IDs (Live)

| Item | ID |
|------|-----|
| Product: Premium | `prod_U2rXLfgtPvpmfE` |
| Price: Monthly ($20/mo) | `price_1T4lnyH94XbyUkwA9PV0uiIz` |
| Price: Annual ($220/yr) | `price_1T4ltlH94XbyUkwABUSWR6f7` |

## Pricing Model

- **Premium Base**: $20/month or $220/year (1 month free)
- **Included**: 2 family seats
- **Additional Seats**:
  - Seats 3-5: $8/seat/month
  - Seats 6-10: $6/seat/month
- **Max seats**: 10 per subscription
