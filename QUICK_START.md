# YoursTruly V2 - Quick Start Guide

**For backend developers joining the team**

---

## What is YoursTruly?

A digital legacy platform where people:
- Document memories with photos/videos/voice
- Get AI-powered face detection & smart albums
- Schedule future messages (postscripts)
- Create an AI digital twin (future feature)

**Tech Stack:** Next.js 16, Supabase, AWS ECS, Stripe, Rekognition

---

## 5-Minute Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd yourstruly-v2
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Get credentials from team lead, add to .env.local:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - STRIPE_SECRET_KEY
# - GOOGLE_GEMINI_API_KEY

# 4. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Architecture Overview

```
User → CloudFront CDN → ALB → ECS (Next.js App)
                                    ↓
                    ┌───────────────┴──────────┐
                    ↓                          ↓
              Supabase                    AWS Services
              (Database/Auth/Storage)     (Rekognition/Secrets)
```

---

## Key Directories

```
src/
├── app/
│   ├── api/              # Backend API routes
│   └── (dashboard)/      # Frontend pages
├── components/           # React components
├── lib/
│   ├── supabase/         # Database client
│   ├── aws/              # AWS Rekognition
│   └── stripe/           # Payments
└── hooks/                # React hooks

supabase/migrations/      # Database schema
infrastructure/terraform/ # AWS infrastructure
```

---

## Core Features You'll Work On

### 1. Memory Management
- Users upload photos/videos with metadata (date, location, people)
- EXIF extraction for automatic date/location
- AI mood analysis via Gemini

**Key Files:**
- `src/app/api/memories/route.ts`
- `src/app/api/memories/[id]/media/route.ts`

### 2. Face Detection (AWS Rekognition)
- Auto-detect faces when uploading photos
- Search indexed faces for auto-suggestions
- Tag people → face gets indexed for future recognition

**Key Files:**
- `src/lib/aws/rekognition.ts`
- `src/app/api/face-tags/route.ts`

### 3. Smart Albums
- Auto-create albums per tagged person
- Family album (photos with family members)
- Event detection (planned)

**Key Files:**
- `src/app/api/smart-albums/route.ts`
- `src/app/(dashboard)/dashboard/smart-albums/page.tsx`

### 4. Postscripts (Future Messages)
- Schedule messages for future delivery
- Triggers: date, event, death
- Delivery: email, SMS, in-app

**Key Files:**
- `src/app/api/postscripts/route.ts`

---

## Database Quick Reference

### Main Tables

```sql
profiles         -- User profiles, subscription, XP
memories         -- Life stories, moments, milestones
memory_media     -- Photos/videos attached to memories
memory_face_tags -- Face tags with AWS Rekognition data
contacts         -- People in user's life
postscripts      -- Scheduled future messages
user_activity    -- Activity feed + XP tracking
```

### Row Level Security (RLS)

**All tables filter by `user_id` automatically**

```typescript
// Server-side query - RLS enforced
const { data } = await supabase
  .from('memories')
  .select('*')
// Returns only memories where user_id = auth.uid()
```

---

## API Examples

### Create Memory
```bash
POST /api/memories
{
  "title": "Summer 2024",
  "memory_date": "2024-07-15",
  "location_name": "Paris, France"
}
```

### Upload Photo (with Face Detection)
```bash
POST /api/memories/{id}/media
Content-Type: multipart/form-data

file=@photo.jpg
```

**Response includes detected faces:**
```json
{
  "media": { ... },
  "faces": [
    {
      "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2 },
      "suggestions": [
        { "contactId": "uuid", "contactName": "Mom", "similarity": 92 }
      ]
    }
  ]
}
```

### Tag Face
```bash
POST /api/face-tags
{
  "mediaId": "uuid",
  "contactId": "uuid",
  "boundingBox": { ... }
}
# Side effect: indexes face in Rekognition for future auto-suggestions
```

---

## Common Tasks

### Add a New API Route

```typescript
// src/app/api/my-feature/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Query database (RLS enforced)
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
  
  return NextResponse.json({ data })
}
```

### Add Database Migration

```sql
-- supabase/migrations/XXX_my_feature.sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data" ON my_table
  FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_my_table_user ON my_table(user_id);
```

Apply migration:
```bash
npx supabase db push
```

### Test Face Detection Locally

```bash
# Make sure AWS credentials in .env.local
# Upload a photo via UI or curl:
curl -X POST http://localhost:3000/api/memories/{id}/media \
  -F "file=@test-photo.jpg" \
  -H "Authorization: Bearer <supabase-jwt>"

# Check logs for:
# [Rekognition] ✅ Detected 2 faces
# [Media Upload] Found 1 face match suggestions
```

---

## Deployment

### To Production (AWS ECS)

```bash
# 1. Build Docker image
docker build -t yourstruly .

# 2. Login to ECR
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  549083880218.dkr.ecr.us-east-2.amazonaws.com

# 3. Tag & push
docker tag yourstruly:latest \
  549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly:latest
docker push 549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly:latest

# 4. Deploy to ECS
aws ecs update-service \
  --cluster yourstruly-cluster \
  --service yourstruly-service \
  --force-new-deployment \
  --region us-east-2

# 5. Monitor deployment
aws ecs describe-services \
  --cluster yourstruly-cluster \
  --services yourstruly-service \
  --region us-east-2
```

**Live URL:** https://app.yourstruly.love

---

## Debugging

### Check Logs

```bash
# Local dev
tail -f .next/dev/server.log

# Production (CloudWatch)
aws logs tail /ecs/yourstruly-task --follow --region us-east-2
```

### Common Issues

**Face detection not working:**
1. Check AWS credentials in `.env.local`
2. Verify IAM permissions: `rekognition:DetectFaces`
3. Test image format (JPEG/PNG only, <5MB)

**Database query blocked:**
- RLS policy issue - check `user_id` matches `auth.uid()`
- Use server client (`@/lib/supabase/server`), not client client

**Build failing:**
- Clear `.next/` folder: `rm -rf .next/`
- Reinstall: `rm -rf node_modules && npm install`

---

## Testing Your First Feature

### Task: Add "Favorite" button to memories

1. **Add database column:**
```sql
-- supabase/migrations/XXX_add_favorites.sql
ALTER TABLE memories ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
```

2. **Create API endpoint:**
```typescript
// src/app/api/memories/[id]/favorite/route.ts
export async function POST(request, { params }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { data, error } = await supabase
    .from('memories')
    .update({ is_favorite: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()
  
  return NextResponse.json({ memory: data })
}
```

3. **Add UI button:**
```tsx
// src/components/dashboard/MemoryCard.tsx
<button onClick={async () => {
  await fetch(`/api/memories/${memory.id}/favorite`, { method: 'POST' })
  // Refresh data
}}>
  ⭐ Favorite
</button>
```

4. **Test it:**
- Click favorite button
- Refresh page
- Verify `is_favorite` in database

5. **Submit PR** 🎉

---

## Team Communication

**Questions?** Ask in #yourstruly-dev Slack  
**Bug?** Create GitHub Issue  
**Feature idea?** GitHub Discussions

**Production site:** https://app.yourstruly.love  
**Marketing site:** https://yourstruly.love

---

## Next Steps

1. **Read full technical docs:** `TECHNICAL_DOCUMENTATION.md`
2. **Explore codebase:** Start with `src/app/api/memories/`
3. **Test features:** Create account, upload photos, tag faces
4. **Pick a task:** Check GitHub Issues for "good first issue"
5. **Ship something:** Make a small PR by end of week 1

Welcome to the team! 🚀
