# Pre-Launch Test Batch 3 — Storage enforcement / Photobook webhook / Gifts / Face / Resend / Claim

## Storage enforcement (Task 7 — now hard-gated)

Code changes this batch:
- New shared helper `src/lib/storage/quota.ts` — pulls per-tier `storage_limit_bytes` and current usage.
- `/api/upload`, `/api/mobile-upload`, `/api/memories/upload-photos` now return **413 Payload Too Large** with `{used, limit, remaining}` when an upload would exceed the user's plan cap.
- `/api/upload` now writes `file_size` onto `memory_media` (previously absent → quota silently undercounted).
- `/api/storage/usage` delegates to the same helper, so sidebar bar and enforcement agree.

Manual tests:
1. Free user at 9.9GB → upload a 200MB video → expect 413 with JSON body.
2. Premium user at 9.9GB with 100GB plan → same upload → succeeds.
3. Upload a small photo → `memory_media.file_size` populated in DB.
4. `GET /api/storage/usage` → `limit_gb` equals plan value (10 for free, 100 for premium).
5. Sidebar bar reflects live usage.

Caveat: direct Supabase client calls (`supabase.storage.from().upload()` from browser) still bypass the API. Only `src/app/(dashboard)/dashboard/profile/page.tsx` does this today (avatar upload, tiny). Acceptable.

## Photobook payment webhook (Task 11)

Code changes:
- New `src/lib/photobook/submit.ts` — idempotent helper that does the Prodigi submission.
- `/api/webhooks/stripe` now handles `payment_intent.succeeded` → if `metadata.type === 'photobook_order'` and row is still `pending_payment`, submits to Prodigi and flips status to `processing`.
- Browser-side `/api/photobook/order/[id]` POST still works (primary path); webhook is the tab-closed fallback. Both call the shared helper, so behaviour is identical.

**Your action before Stripe webhook test:**
- Register `payment_intent.succeeded` on the Stripe Dashboard webhook (in addition to the 6 subscription events).
- Update `docs/SUBSCRIPTION_TEST.md`'s event list.

Manual tests:
1. Start checkout → pay → **close the tab before the success redirect**.
2. In Stripe CLI (`stripe listen ...`) confirm `payment_intent.succeeded` fires → 200.
3. In DB, `photobook_orders.status` flips `pending_payment → processing`, `prodigi_order_id` populated.
4. Restart happy path (don't close tab) → confirm `already_submitted` path is idempotent (no double-submit to Prodigi).

## Postscript gift webhook (Task 12) — no code change needed

Verified: postscript gifts use Stripe **Checkout Sessions** (not PaymentIntents). `handlePostscriptGiftPayment` already exists in the main webhook and handles `checkout.session.completed` with `metadata.type === 'postscript_gift'`. Row flips to `paid`, `postscripts.has_gift = true`.

Manual tests:
1. Attach gift to postscript → checkout with `4242...` → success page.
2. `postscript_gifts.payment_status = 'paid'`, `postscript_gifts.status = 'paid'`.
3. `postscripts.has_gift = true` for the parent postscript.

## Face detection (Task 13)

Manual tests only. Path: `/api/upload` → `detectFaces` + `searchFaces` in `src/lib/aws/rekognition`. Requires `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`.

1. Upload a group photo → response includes `faces: [{boundingBox, confidence, suggestions}]`.
2. Second upload of someone whose face was previously indexed → expect `suggestions[0].similarity >= 80`.
3. Auto-tag: high-confidence matches (≥80%) should auto-insert `memory_face_tags` rows.

If `detectFaces` returns empty silently, check: credentials present? Rekognition region set? CloudWatch logs.

## Resend seat invites (Task 14)

Manual tests. `RESEND_API_KEY` required in ECS env.

1. Premium owner invites new email via `/dashboard/settings → Family → Invite`.
2. Check Resend dashboard logs → email sent from `invites@yourstruly.love`.
3. Recipient receives "You're Invited" email with CTA → clicks → `/invite/:token` page → accept → `subscription_seats.status = 'active'`.
4. Try **Resend** on a pending seat → new token generated, new email sent.
5. If RESEND_API_KEY unset, invite still creates seat row (email is best-effort).

## Interview claim-account UI (Task 15) — scope note

Backend **exists**: `POST /api/interviews/claim-account` accepts `{token, email, fullName}`, creates/finds user, ingests answers as memories, sends magic link.

**Gap:** signup page (`src/app/(auth)/signup/page.tsx`) has no logic to detect a matching respondent and offer to claim. Migration 061's `interview_respondents` lookup table is unused by the UI.

Proposed scope (Batch 4 or later):
- Add `GET /api/interviews/claimable?email=` — returns unclaimed completed sessions tied to this email in `interview_respondents`.
- On signup form blur (after email entered), hit that endpoint; if matches, show a "We found previous interviews — claim them?" card.
- On accept, call the existing claim-account endpoint with the token for each matched session.

Not started in this batch — flag for priority decision.
