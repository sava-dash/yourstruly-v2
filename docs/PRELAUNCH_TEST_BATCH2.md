# Pre-Launch Test Batch 2 — Seats / Storage / Groups / Activity / Photobook

## Seat management (Task 6)

Bug fixes landed in this batch:
- `nextSeatNumber` now uses `MAX(seat_number)+1` across all rows (incl. removed), preventing unique-constraint collisions after a remove → re-invite cycle.

Manual tests — test account: `ann@gmail.com`
1. **Premium required:** As a free user, POST `/api/subscription/seats` → expect 403 "Seats require Premium plan".
2. **Invite:** As premium owner, invite a fresh email → seat row created with `status='pending'`, invite email delivered via Resend.
3. **Pricing tiers:** Invite seats 2 → 10. Confirm `useSubscription`'s monthly cost math:
   - Seats 1-2: included ($0)
   - Seats 3-5: +$8/seat/mo
   - Seats 6-10: +$6/seat/mo
4. **Max cap:** Invite an 11th email → expect 400 "Maximum 10 seats allowed".
5. **Accept:** Open invite link, log in with invited email → `seats.status='active'`, `user_id` populated.
6. **Remove:** Owner removes seat 5 → row flips to `status='removed'`.
7. **Re-invite** same email or a different one → new row uses seat_number 6 (or higher), no collision.
8. **Resend invite:** PUT with `seatId` → new `invite_token`, Resend sends reminder.

## Storage limits by tier (Task 7)

Bug fixes landed:
- `/api/storage/usage` now reads `subscription_plans.storage_limit_bytes` instead of hardcoding 10GB for every user.

Caveat: we do **not** enforce the limit at the upload API boundary — uploads use the Supabase client directly. Enforcement today is display-only (sidebar bar). For hard enforcement we'd need either Supabase Storage RLS triggers or a pre-upload check endpoint. Flag this before launch if we need hard-gating.

Manual tests:
1. As free user with <1GB uploaded → `/api/storage/usage` returns `limit_gb: 10`.
2. As premium user (admin sets `subscription_plans.storage_limit_bytes = 107374182400` for 100GB) → `limit_gb: 100`.
3. Sidebar `DashboardSidebar` shows "X.X / 100 GB" for premium.
4. Upload a file when over limit → UI should warn (note: blocks not enforced server-side yet).

## Group interviews (Task 8)

No code changes this batch. Known path: `src/app/(dashboard)/dashboard/journalist/group/[groupId]/page.tsx`.

Manual tests:
1. Owner creates group interview with 2-3 questions + invites 2 participants.
2. Each participant opens link → records video response per question → saves.
3. Owner sees responses aggregated per question in group view.
4. Stitch/export → single reel or per-question reel plays back.

## Recent activity feed (Task 9)

No code changes this batch. Handler at `src/app/api/activity/route.ts` looks solid — 11 sources aggregated (memories, wisdom, contacts, photos, interviews, postscripts, circle messages/content/invites, shared memories/wisdom).

Manual tests:
1. Login → `/dashboard` activity rail loads.
2. Upload a photo → appears as `photos_uploaded`.
3. Share a memory with another user → recipient sees `memory_shared`.
4. Post to a circle → other circle members see `circle_content`.
5. Comment on wisdom → comment notification appears.
6. Create postscript → appears as `postscript_created`.
7. Sort order is newest first.

## Photobook builder (Task 10) — ⚠️ CRITICAL GAP FOUND

Code review turned up a real gap in the order flow:
- `POST /api/photobook/order` creates a Stripe PaymentIntent + `photobook_orders` row with `status='pending_payment'`.
- **There is no `payment_intent.succeeded` webhook handler** in `/api/webhooks/stripe/route.ts`.
- Result: orders that complete payment will sit at `pending_payment` forever and never get submitted to Prodigi for printing.

Fix scope (flag for Batch 3):
1. Add `payment_intent.succeeded` handler that, when `metadata.type === 'photobook_order'`:
   - Flips `photobook_orders.status → 'paid'`
   - Calls Prodigi `POST /orders` with the project pages + shipping + idempotency key
   - Stores Prodigi `order_id` + status back on the row
2. Ensure the Stripe Dashboard webhook is subscribed to `payment_intent.succeeded`.

Manual tests (once fix lands):
1. Template selection → choose photobook layout → project created
2. Add 10 photos via photo picker → pages populate
3. Edit caption/text on cover → persists to `photobook_pages.content`
4. Preview renders PDF/images correctly
5. Checkout with `4242 4242 4242 4242` → payment succeeds
6. Confirm `photobook_orders.status = 'paid'` and Prodigi has received the order
7. Order status page shows Prodigi tracking updates
