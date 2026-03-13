# YoursTruly V2 - Fixes Applied (2026-03-11)

## ✅ Completed

### 1. Supabase URL Fix (CRITICAL)
**Problem:** Docker image was built with `placeholder.supabase.co`, causing all auth/database calls to fail.

**Fix:** Rebuilt Docker image with correct environment variables:
- `NEXT_PUBLIC_SUPABASE_URL=https://ffgetlejrwhpwvwtviqm.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- All other `NEXT_PUBLIC_*` variables

**Status:** ✅ Deployed to ECS

### 2. Voice WebSocket URL Fix
**Problem:** App was connecting to `ws://localhost:8000/api/chat` instead of the PersonaPlex server.

**Fix:** Added to Docker build:
- `NEXT_PUBLIC_PERSONAPLEX_URL=wss://100.97.242.10:8998/api/chat`
- `NEXT_PUBLIC_VOICE_PROVIDER=personaplex`

**Status:** ✅ Included in latest build

## 🔧 Requires Manual Action

### 3. RLS Policies (CRITICAL SECURITY)
**Problem:** Users can see other users' data due to missing/incorrect RLS policies.

**Files Created:**
- `URGENT_RLS_FIX.sql` - Primary fix for all tables
- `FIX_CONTACTS_RLS.sql` - Specific fix for contacts + media type tracking

**Action Required:**
1. Open https://supabase.com/dashboard/project/ffgetlejrwhpwvwtviqm/sql/new
2. Run `URGENT_RLS_FIX.sql`
3. Then run `FIX_CONTACTS_RLS.sql`
4. Clear browser cache and test

**Tables Fixed:**
- `engagement_prompts` ✅
- `knowledge_entries` ✅
- `memories` ✅
- `memory_media` ✅
- `contacts` ✅
- `postscripts` ✅

## ⚠️ Known Non-Critical Issues

### 4. Face Detection on Non-Images
**Problem:** Face detection API is being called on video/audio files, returning 400 errors.

**Current Behavior:** 
- API correctly rejects non-images with "Not an image" error
- Frontend calls detect-faces on ALL media uploads

**Fix Needed (Frontend):**
Add check in frontend to only call `/api/media/[id]/detect-faces` for image files:
```typescript
if (media.file_type?.includes('image')) {
  // Only then call detect-faces
}
```

**Impact:** Low - just console errors, doesn't break functionality

### 5. Missing Routes (404s)
**Problem:** App tries to load:
- `/dashboard/text-only` → 404
- `/dashboard/conversation` → 404

**Investigation Needed:** Check if these routes were removed or renamed.

## 📋 Deployment Timeline

1. **06:07 EDT** - Built Docker image with Supabase credentials
2. **06:12 EDT** - Pushed to ECR
3. **06:15 EDT** - ECS deployment started
4. **06:26 EDT** - Container running, app accessible
5. **09:02 EDT** - Rebuilt with voice server URL + all NEXT_PUBLIC_* vars
6. **09:XX EDT** - Current: Pushing to ECR

## 🔐 Environment Variables in Docker Image

The following are baked into the Docker image at build time (NEXT_PUBLIC_*):
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ NEXT_PUBLIC_MAPBOX_TOKEN
- ✅ NEXT_PUBLIC_APP_URL
- ✅ NEXT_PUBLIC_VOICE_PROVIDER
- ✅ NEXT_PUBLIC_PERSONAPLEX_URL

Server-side variables (passed via ECS secrets):
- DATABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- GEMINI_API_KEY
- ANTHROPIC_API_KEY
- etc.

## 🎯 Next Steps

1. ⚠️  **RUN THE RLS SQL SCRIPTS IMMEDIATELY** (security critical)
2. Deploy the new Docker image (in progress)
3. Test voice/video functionality
4. Fix face detection frontend logic (low priority)
5. Investigate missing routes (low priority)

## 📝 Notes

- The app is now functional but **INSECURE** until RLS policies are applied
- Voice server needs to be running on 100.97.242.10:8998 (PersonaPlex)
- All deployments require rebuilding Docker image (NEXT_PUBLIC_* vars are build-time)
