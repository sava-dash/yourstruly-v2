# YoursTruly V2 Codebase Audit
*Generated: 2026-03-06*

## Summary Stats
- **API Routes:** 135
- **Components:** 221
- **Pages:** 81

---

## 1. DUPLICATE APIs (Need Consolidation)

### Transcription APIs (3 identical endpoints)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/conversation/transcribe` | KEEP | Main endpoint - has all providers |
| `/api/engagement/transcribe` | DELETE | Duplicate - redirect to main |
| `/api/interviews/transcribe` | DELETE | Duplicate - redirect to main |

**Action:** Create single `/api/transcribe` endpoint, deprecate others.

### Similar Voice/Memory APIs
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/voice/memory` | REVIEW | Creates memories from voice |
| `/api/conversation/save` | REVIEW | Also creates memories/knowledge |
| `/api/engagement/prompts/[id]` | KEEP | Handles engagement flow |

---

## 2. UNUSED/DEAD COMPONENTS

### Confirmed Unused (0 imports)
- `DashboardShell.tsx` - DELETE
- `DashboardCanvas.tsx` - DELETE  
- `XPDisplay.tsx` - DELETE (replaced?)
- `PageTransition.tsx` - DELETE
- `Skeletons.tsx` - DELETE or consolidate

### Low Usage (1 import - verify before delete)
- `OnThisDayWidget.tsx`
- `ContactsWidget.tsx`
- `StatsWidget.tsx`
- `StreakWidget.tsx`
- `CreateCapsuleModal.tsx`
- `CapsuleCard.tsx`

---

## 3. UNUSED/TEST PAGES

### Safe to Delete
- `/dashboard/conversation-test` - Test page
- `/dashboard/voice-personaplex` - Test page
- `/dashboard/voice-test` - Test page
- `/voice-demo` - Demo page

### Review Before Delete
- `/admin/subscriptions` - May be needed
- `/auth/google-callback` - Check auth flow
- `/reset-password` - Likely needed
- `/marketplace/checkout/success` - Check Stripe flow

---

## 4. TYPE INCONSISTENCIES

### Current Type Files
```
src/types/
├── admin.ts
├── album.ts
├── engagement.ts
├── gallery.ts
├── group-interview.ts
├── marketplace.ts
├── subscription.ts
├── verification.ts
└── voice.ts
```

### Missing Shared Types
- **TranscriptionResponse** - Each API returns different shapes
- **MemoryCreate/MemoryUpdate** - Inconsistent across APIs
- **KnowledgeEntry** - No shared type
- **APIError** - No standard error type

---

## 5. RECOMMENDED ACTIONS

### Phase 1: API Consolidation ✅ COMPLETE
1. ✅ Created `/api/transcribe/route.ts` (unified endpoint)
2. ✅ Created `src/types/api.ts` (shared response types)
3. ✅ Created `/lib/ai/transcription.ts` (shared transcription logic)
4. ✅ Updated all transcription endpoints to use shared lib

### Phase 2: Dead Code Removal ✅ COMPLETE
1. ✅ Deleted 5 unused components (-1391 lines)
2. ✅ Deleted 4 test/demo pages
3. ✅ Build verified, deployed

### Phase 3: Type Safety (In Progress)
1. ✅ Added TranscriptionResponse type
2. ✅ Added MemoryBase, KnowledgeEntryBase types
3. [ ] Add TypeScript strict mode checks
4. [ ] Generate types from Supabase schema

---

## 6. FILES TO DELETE

### Components (confirmed unused)
```
src/components/dashboard/DashboardShell.tsx
src/components/dashboard/DashboardCanvas.tsx
src/components/gamification/XPDisplay.tsx
src/components/navigation/PageTransition.tsx
src/components/ui/Skeletons.tsx
```

### Pages (test/demo)
```
src/app/(dashboard)/dashboard/conversation-test/
src/app/(dashboard)/dashboard/voice-personaplex/
src/app/(dashboard)/dashboard/voice-test/
src/app/voice-demo/
```

### APIs (after consolidation)
```
src/app/api/engagement/transcribe/  (use /api/transcribe)
src/app/api/interviews/transcribe/  (use /api/transcribe)
```

---

## 7. IMMEDIATE FIXES NEEDED

### Critical
- [x] HeartfeltConversation reads wrong field (`text` vs `transcription`)
- [ ] Knowledge entries use `prompt_text`, some code uses `title`
- [ ] Memory shares use `shared_with`, some code uses `contact`

### Important  
- [ ] Consolidate transcription to single endpoint
- [ ] Add shared TranscriptionResponse type
- [ ] Standardize API error responses

---

*Next: Execute Phase 1 - API Consolidation*
