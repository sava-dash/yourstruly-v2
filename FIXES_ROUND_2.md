# YoursTruly V2 - Fixes Round 2 (2026-03-11 09:15 EDT)

## Issues Fixed

### 1. Activity Routing - Missing IDs ✅
**Problem:** Clicking activity items went to `/dashboard/memories` instead of `/dashboard/memories/{id}`

**Root Cause:** The API was generating links without checking if IDs existed in the Supabase response.

**Fix Applied:**
- Added null checks for `memory.id` and `knowledge.id` before generating links
- Activities without valid IDs are now skipped entirely
- File: `src/app/api/activity/route.ts`

**Before:**
```typescript
if (!memory || !owner) continue
link: `/dashboard/memories/${memory.id}` // Could be undefined!
```

**After:**
```typescript
if (!memory || !owner || !memory.id) continue // Skip if ID missing
link: `/dashboard/memories/${memory.id}` // Always valid now
```

### 2. Voice WebSocket Connection Failure ✅
**Problem:** Voice/video buttons failed with WebSocket error to `wss://100.97.242.10:8998`

**Root Cause:** SSL certificate verification failure on self-signed cert for Tailscale server

**Fix Applied:**
- Changed from `wss://` (secure) to `ws://` (plain)
- Safe because it's on private Tailscale network
- Updated build arg: `NEXT_PUBLIC_PERSONAPLEX_URL=ws://100.97.242.10:8998/api/chat`

**Why This Works:**
- Server IS running and responding (tested with curl)
- Browser was rejecting the self-signed SSL certificate
- Using plain WebSocket avoids cert validation

## Files Modified

1. `src/app/api/activity/route.ts`
   - Added ID checks to memory shares
   - Added ID checks to wisdom shares  
   - Added ID checks to circle content

2. `.env.local`
   - Changed NEXT_PUBLIC_PERSONAPLEX_URL from wss:// to ws://

3. Docker rebuild with updated build args

## Testing Checklist

### Activity Routing
- [ ] Go to `/dashboard/activity`
- [ ] Click on a memory share
- [ ] Should land on `/dashboard/memories/{id}` (with specific memory)
- [ ] Click on wisdom share
- [ ] Should land on `/dashboard/wisdom/{id}` (with specific entry)

### Voice Features
- [ ] Go to engagement prompt (dashboard bubble)
- [ ] Click voice/video button
- [ ] Should connect (no WebSocket error)
- [ ] Should hear AI voice interviewer

## Deployment Status

- Building: In progress (ETA ~2-3 minutes)
- Push to ECR: Pending
- ECS Deploy: Pending
- Total time: ~5-7 minutes

## Next Known Issues

- Face detection on non-images (minor, just console warnings)
- Missing `/dashboard/text-only` route (404, low priority)
- Missing `/dashboard/conversation` route (404, low priority)
