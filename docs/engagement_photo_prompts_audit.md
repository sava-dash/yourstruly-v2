# YoursTruly V2 Engagement Photo Prompts Audit Report

**Date:** 2026-03-02
**Auditor:** Subagent
**Project:** /home/cp7/clawd/projects/yourstruly-v2/

## Summary

The photo_backstory prompts are **configured correctly** in the database migrations. The SQL functions are properly set up to generate photo prompts, and the API route has the correct column names. However, there may be a logic issue with how photos are selected for prompts.

---

## Findings

### 1. ✅ prompt_templates Table - CORRECT

**Migration:** `075_comprehensive_engagement_fix.sql`

The following photo_backstory templates are properly configured:

| ID | Type | Category | Prompt Text | Priority | Active |
|----|------|----------|-------------|----------|--------|
| photo_story_001 | photo_backstory | photos | What's the story behind this photo? | 10 | true |
| photo_story_002 | photo_backstory | photos | Tell me about this moment - where were you and who were you with? | 10 | true |
| photo_story_003 | photo_backstory | photos | What makes this photo special to you? | 10 | true |
| photo_story_004 | photo_backstory | photos | I'd love to hear the story behind this picture! | 10 | true |
| photo_story_005 | photo_backstory | photos | What happy memory does this photo bring back? | 10 | true |
| photo_story_006 | photo_backstory | photos | Who took this photo? What was the occasion? | 9 | true |
| photo_story_007 | photo_backstory | photos | What were you feeling in this moment? | 9 | true |
| photo_story_008 | photo_backstory | photos | Is there a fun story behind this picture? | 9 | true |
| face_tag_001 | tag_person | photos | Who is this person in the photo? | 8 | true |
| face_tag_002 | tag_person | photos | Do you recognize who this is? | 8 | true |
| face_tag_003 | tag_person | photos | Help me learn - who is this? | 8 | true |

**Status:** ✅ Templates exist and are active

---

### 2. ✅ engagement_prompts Table Structure - CORRECT

**Migration:** `017_engagement_prompts.sql`

The table has the required columns:
- `photo_id UUID REFERENCES memory_media(id)` - ✅ Exists
- `contact_id UUID REFERENCES contacts(id)` - ✅ Exists
- `memory_id UUID REFERENCES memories(id)` - ✅ Exists
- `type prompt_type` - ✅ Enum includes 'photo_backstory'

**Status:** ✅ Table structure supports photo prompts

---

### 3. ⚠️ generate_engagement_prompts Function - POTENTIAL ISSUE

**Migration:** `076_add_photo_prompt_generation.sql`

The function correctly queries for photos and creates photo_backstory prompts:

```sql
FOR v_photo IN 
  SELECT mm.id as media_id, mm.file_url
  FROM memory_media mm
  WHERE mm.user_id = p_user_id
    AND mm.memory_id IS NULL   -- <-- POTENTIAL ISSUE
    AND mm.file_type LIKE 'image/%'
    AND NOT EXISTS (
      SELECT 1 FROM engagement_prompts ep 
      WHERE ep.photo_id = mm.id 
        AND ep.status IN ('answered', 'pending') 
        AND ep.created_at > NOW() - INTERVAL '30 days'
    )
  ORDER BY mm.created_at DESC
  LIMIT (p_count * 0.25)::INTEGER
```

**⚠️ Issue:** The query only selects photos where `memory_id IS NULL` (standalone photos NOT attached to memories). Photos that ARE attached to memories are excluded.

**Impact:** If users have photos primarily attached to memories (rather than standalone uploads), no photo prompts will be generated.

**Recommendation:** Consider changing the logic to include all photos, or add a separate query for photos attached to memories:
```sql
-- Option 1: Include all photos
WHERE mm.user_id = p_user_id
  AND mm.file_type LIKE 'image/%'
  
-- Option 2: Separate queries for standalone and memory-attached photos
-- (standalone first, then memory-attached as fallback)
```

---

### 4. ✅ API Route - CORRECT

**File:** `src/app/api/engagement/prompts/route.ts`

The API correctly:
1. Calls `shuffle_engagement_prompts()` to get prompts
2. Enriches prompts with photo data:
   - Queries `memory_media` table for `file_url` (correct column name)
   - Returns `photo_url` in the response

```typescript
if (prompt.photo_id) {
  const { data: photo } = await supabase
    .from('memory_media')
    .select('file_url')  // ✅ Correct column name
    .eq('id', prompt.photo_id)
    .single();
  photoUrl = photo?.file_url;
}
```

**Status:** ✅ API code is correct

---

### 5. ✅ Debug Endpoint - CORRECT

**File:** `src/app/api/engagement/debug/route.ts`

The debug endpoint:
1. Checks user profile for personalization data
2. Counts existing prompts
3. Calls `generate_engagement_prompts()`
4. Returns sample prompts with their types

**Note:** The debug endpoint does NOT specifically check for photo_backstory prompts. To debug photo prompt generation, you could add:
```typescript
// Check for photo prompts specifically
const { data: photoPrompts } = await admin
  .from('engagement_prompts')
  .select('id, type, photo_id, prompt_text')
  .eq('user_id', user.id)
  .eq('type', 'photo_backstory')
  .eq('status', 'pending');
```

---

## memory_media Table Structure

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| memory_id | UUID | FK to memories (nullable) |
| user_id | UUID | FK to auth.users |
| file_url | TEXT | ✅ The correct column name |
| file_key | TEXT | Storage key |
| file_type | TEXT | 'image', 'video' |
| mime_type | TEXT | MIME type |
| file_size | INTEGER | Bytes |
| width | INTEGER | Image width |
| height | INTEGER | Image height |
| duration | INTEGER | Video duration |
| ai_labels | JSONB | AI tags |
| ai_faces | JSONB | Face detection |
| ai_text | JSONB | OCR text |
| ai_processed | BOOLEAN | Processing flag |
| taken_at | TIMESTAMPTZ | EXIF date |
| is_cover | BOOLEAN | Cover photo flag |
| created_at | TIMESTAMPTZ | Upload time |

**Note:** There is NO `thumbnail_url` column. If thumbnails are needed, they would need to be:
1. Added as a new column with a migration
2. Generated via a storage transformer (e.g., Supabase Image Transformations on the `file_url`)

---

## Recommendations

### 1. Fix Photo Selection Logic (HIGH PRIORITY)

Update the `generate_engagement_prompts` function in migration 076 to include photos attached to memories:

```sql
-- Change this:
WHERE mm.user_id = p_user_id
  AND mm.memory_id IS NULL  -- Only standalone photos
  
-- To this:
WHERE mm.user_id = p_user_id
  -- Include all photos, whether standalone or attached to memories
```

### 2. Add Thumbnail Support (MEDIUM PRIORITY)

Option A: Add a `thumbnail_url` column to `memory_media`:
```sql
ALTER TABLE memory_media ADD COLUMN thumbnail_url TEXT;
```

Option B: Generate thumbnails on-the-fly using Supabase Image Transformations in the API:
```typescript
// Add resize parameters to file_url
const thumbnailUrl = photo?.file_url 
  ? `${photo.file_url}?width=300&height=300&resize=cover`
  : null;
```

### 3. Verify Templates Are Deployed (HIGH PRIORITY)

Run this SQL to verify templates exist in production:
```sql
SELECT id, type, is_active 
FROM prompt_templates 
WHERE type = 'photo_backstory';
```

Expected: 11 rows (8 photo_story + 3 face_tag)

### 4. Test Photo Prompt Generation (HIGH PRIORITY)

Use the debug endpoint or run this SQL to verify prompts are being created:
```sql
-- Count photo prompts by user
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE type = 'photo_backstory') as photo_prompts,
  COUNT(*) FILTER (WHERE type = 'contact_story') as contact_prompts,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_total
FROM engagement_prompts
GROUP BY user_id;
```

---

## Conclusion

| Component | Status | Notes |
|-----------|--------|-------|
| prompt_templates | ✅ | Photo templates exist and active |
| engagement_prompts table | ✅ | Has photo_id column |
| generate_engagement_prompts | ⚠️ | Only uses standalone photos (memory_id IS NULL) |
| shuffle_engagement_prompts | ✅ | Should include photo prompts |
| API route | ✅ | Correct column names (file_url) |
| Debug endpoint | ✅ | Functional |

**Overall Status:** The system is mostly configured correctly, but the photo selection logic may be too restrictive. The function only generates prompts for standalone photos not attached to memories. If your users primarily upload photos as part of memory creation, they won't see photo prompts.

**Next Steps:**
1. Verify templates are deployed in production
2. Modify migration 076 to include photos attached to memories
3. Test with a user who has photos (both standalone and memory-attached)
4. Monitor the debug endpoint output to confirm photo prompts are being generated
