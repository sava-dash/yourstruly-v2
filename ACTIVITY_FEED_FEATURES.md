# Activity Feed Enhancement - 2026-03-11

## What Was Added

### 1. Expanded Activity Types

**Previously showed:**
- ✅ Memories shared WITH you (by others)
- ✅ Wisdom shared WITH you (by others)  
- ✅ Circle messages
- ✅ Engagement prompt completions (XP)

**Now also shows YOUR OWN activity:**
- 📸 **Memories you created** → `/dashboard/memories/{id}`
- 💡 **Wisdom you captured** → `/dashboard/wisdom/{id}`
- 👤 **Contacts you added** → `/dashboard/contacts/{id}`
- 🖼️ **Photos you uploaded** → `/dashboard/memories/{id}`

### 2. Full-Screen Activity Feed Modal

**Trigger:** Click the maximize button (⛶) in the Recent Activity widget header

**Features:**
- **Instagram/TikTok-style vertical scrolling**
- Full-screen overlay with branded styling
- Activity cards with:
  - Author info & avatar
  - Date/timestamp (relative)
  - Activity description & blurb
  - Link to detail page
- **Interactive features:**
  - ❤️ Like button (toggles red heart)
  - 💬 Comment input (expandable)
  - 😊 React button (placeholder for emoji reactions)
- **X button** in top-right corner to close
- Clean, cream/terra cotta brand styling
- Auto-fetches up to 50 most recent activities

## Files Modified

### API Layer
**`src/app/api/activity/route.ts`**
- Added 4 new activity types to enum
- Added 4 new queries:
  1. User's memories (from `memories` table)
  2. User's wisdom (from `knowledge_entries` table)
  3. User's contacts (from `contacts` table)
  4. User's photos (from `memory_media` table)
- Fixed `media_url` column error (doesn't exist in `memories` table)
- Robust ID fallbacks for all queries

### Components
**`src/components/dashboard/ActivityFeed.tsx`**
- Added maximize button in header
- Added state for full-screen modal
- Updated activity type interface
- Added icons for new activity types (Plus, UserPlus)
- Integrated modal component

**`src/components/dashboard/ActivityFeedModal.tsx`** (NEW)
- Full-screen modal overlay
- Vertical scrolling cards
- Like/Comment/React interactions
- Brand-styled design
- Auto-fetches full activity feed (50 items)

## How to Test

### 1. Widget Shows Your Activity
1. Create a new memory → should appear in Recent Activity
2. Add a contact → should appear in Recent Activity
3. Capture wisdom → should appear in Recent Activity
4. Upload photos → should appear in Recent Activity

### 2. Full-Screen Feed
1. Click maximize button (⛶) in widget header
2. Should open full-screen modal
3. Scroll through activity cards
4. Click ❤️ Like → should turn red
5. Click 💬 Comment → should show input field
6. Type comment + press Enter or click send
7. Click X in top-right → should close modal

### 3. Links Work
1. Click on any activity card
2. Should navigate to the specific item (memory/wisdom/contact)
3. Should NOT go to parent list page

## Known Limitations

### Comments & Reactions
- **Like button:** Works (toggles state) but doesn't persist to database yet
- **Comments:** Input works but doesn't save to database yet
- **Emoji reactions:** Button exists but no picker UI yet

**To implement:**
- Need to create `activity_likes` table
- Need to create `activity_comments` table
- Need to add emoji picker component

### Performance
- Currently fetches up to 50 activities (may be slow with lots of data)
- No pagination/infinite scroll yet
- No caching strategy

## Next Steps (Optional)

1. **Persist interactions:**
   - Create database tables for likes/comments/reactions
   - Hook up POST endpoints
   - Real-time updates via Supabase subscriptions

2. **Pagination:**
   - Implement infinite scroll in modal
   - Load more as user scrolls down

3. **Filters:**
   - Filter by activity type (memories only, wisdom only, etc.)
   - Date range filter

4. **Notifications:**
   - Badge count on widget when new activity
   - Mark as read/unread

5. **Rich media:**
   - Show thumbnails for photos/memories
   - Embed media in cards

## Deployment Notes

- Previous deployment removed `media_url` queries (column doesn't exist)
- Fixed activity routing to use correct foreign keys
- Next deployment will include all new activity types + modal

**Build command:**
```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://ffgetlejrwhpwvwtviqm.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -t yourstruly:latest .
```
