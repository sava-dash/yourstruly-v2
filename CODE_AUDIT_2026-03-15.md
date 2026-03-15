# YoursTruly V2 Code Audit Report
**Date:** 2026-03-15
**Auditor:** Zima

## Executive Summary
Reviewed 577 source files (8MB). Found several security issues, dead code, and areas for improvement.

---

## 🔴 CRITICAL - Security Issues

### 1. SMS Webhook - No Signature Validation
**File:** `src/app/api/sms/webhook/route.ts`
**Risk:** HIGH
**Issue:** Telnyx webhook endpoint accepts any POST request without validating the webhook signature. Attackers could send fake delivery status updates.

**Fix:**
```typescript
import crypto from 'crypto';

const signature = request.headers.get('telnyx-signature-ed25519');
const timestamp = request.headers.get('telnyx-timestamp');
const publicKey = process.env.TELNYX_PUBLIC_KEY;

// Verify signature before processing
if (!verifyTelnyxSignature(signature, timestamp, body, publicKey)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

### 2. TTS Endpoint - No Auth or Rate Limiting
**File:** `src/app/api/tts/route.ts`
**Risk:** MEDIUM-HIGH
**Issue:** Anyone can call this endpoint to generate TTS, running up Deepgram API costs.

**Fix:** Add authentication or rate limiting:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 3. Goody Webhook - Incomplete Signature Verification
**File:** `src/app/api/webhooks/goody/route.ts:87`
**Issue:** Comment says "TODO: Implement full signature verification when Svix library is added"

---

## 🟡 MEDIUM - Dead Code & Unused Components

### Unused Component Directories (can be deleted)
| Directory | Files | Notes |
|-----------|-------|-------|
| `src/components/brand/` | Decorations.tsx, LogoOutro.tsx, TornPaperEdge.tsx | Not imported anywhere |
| `src/components/scrapbook/` | PhotoCard.tsx, ScrapbookSection.tsx, WashiTape.tsx | Not imported anywhere |
| `src/components/settings/` | NotificationSettings.tsx | Not imported anywhere |

### Commented Out Code
- `src/app/(dashboard)/dashboard/page.tsx:16` - CommandBar import
- `src/app/(dashboard)/dashboard/page.tsx:25` - PersonalityDashboard import

### Unused Environment Variables in .env.example
- `SPOCKET_API_KEY` - Not used in codebase (dead integration?)
- `AWS_S3_BUCKET` - Not referenced in code

### Missing from .env.example (but used in code)
- `ADMIN_SECRET`
- `CRON_SECRET`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `INTERNAL_API_KEY`
- `OPENAI_API_KEY`
- `REPLICATE_API_TOKEN`
- `RESEND_API_KEY`
- `GOODY_WEBHOOK_SECRET`
- All `STRIPE_*` variables

---

## 🟡 MEDIUM - Code Quality Issues

### Console.log Statements
**Count:** 211 statements across codebase
**Recommendation:** Remove or replace with proper logging (e.g., winston, pino)

### TODO/FIXME Comments
**Count:** 29 items
**Notable:**
- `circles/[id]/page.tsx` - Multiple TODO items for API endpoints
- `webhooks/goody/route.ts:87` - Signature verification
- `subscription/invite-seat/route.ts:79` - Send invite email

### Type Safety
**`any` usage:** 235 instances
**Recommendation:** Gradually replace with proper types

### Large Files (needs refactoring)
| File | Lines | Recommendation |
|------|-------|----------------|
| `photobook/create/page.tsx` | 3,147 | Split into smaller components |
| `QuickOnboardingFlow.tsx` | 3,003 | Extract steps into separate components |
| `feed/page.tsx` | 2,281 | Already addressed, but could extract more |
| `profile/page.tsx` | 1,751 | Extract sections |
| `dashboard/page.tsx` | 1,441 | Extract engagement cluster, sidebar |

---

## 🟢 LOW - Inconsistencies

### Mixed Supabase Client Patterns
Some API routes use both `createClient` and `createAdminClient`. While sometimes intentional, review these files:
- `src/app/api/admin/ai/config/route.ts`
- `src/app/api/subscription/invite-seat/route.ts`
- `src/app/api/subscription/seats/route.ts`

### Duplicate Auth Pattern
The pattern `const { data: { user } } = await supabase.auth.getUser()` appears 123 times.
**Recommendation:** Create a middleware or utility function.

---

## Recommendations - Priority Order

### Immediate (Security)
1. ✅ Add Telnyx webhook signature validation
2. ✅ Add auth to TTS endpoint
3. ✅ Complete Goody webhook signature verification

### Short-term (Cleanup)
1. Delete unused component directories (brand/, scrapbook/, settings/)
2. Update .env.example with all used variables
3. Remove console.log statements in production code

### Medium-term (Quality)
1. Refactor large files (photobook/create, QuickOnboardingFlow)
2. Replace `any` types with proper types
3. Address TODO comments or remove stale ones
4. Create auth middleware to reduce duplicate code

---

## Files to Delete
```
src/components/brand/
src/components/scrapbook/
src/components/settings/
```

## Summary Statistics
- **Total Files:** 577
- **Security Issues:** 3 (2 high, 1 medium)
- **Dead Code Directories:** 3
- **Console.logs:** 211
- **TODOs:** 29
- **Type any usage:** 235
- **Files > 1000 lines:** 14
