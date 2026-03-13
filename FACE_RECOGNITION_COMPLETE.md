# Face Recognition & Smart Albums - Complete Implementation

## ✅ What's Implemented

### 1. **AWS Rekognition Integration**
- ✅ Face detection on photo upload
- ✅ Age, gender, emotion detection
- ✅ Face indexing (creates collections per user)
- ✅ Face matching/search
- ✅ Removed all TensorFlow.js dependencies

**Files:**
- `src/lib/aws/rekognition.ts` - Core face detection service
- `src/app/api/memories/[id]/media/route.ts` - Updated to use Rekognition

### 2. **Auto-Tagging with Suggestions**
- ✅ When uploading photos, automatically searches for face matches
- ✅ Shows AI suggestions with similarity scores (70%+ threshold)
- ✅ Top 3 suggestions displayed first, then all contacts
- ✅ When user tags a face, it's indexed in Rekognition for future auto-suggestions

**Files:**
- `src/app/api/face-tags/route.ts` - Tags faces + indexes in Rekognition
- `src/components/dashboard/PhotoUploadModal.tsx` - Shows suggestions in UI

**Flow:**
1. User uploads photo
2. Rekognition detects faces
3. System searches for matches in user's collection
4. UI shows: "AI Suggestions: Mom (92% match), Dad (87% match)"
5. User confirms → face is indexed for future recognition

### 3. **Smart Albums**
- ✅ People albums - photos grouped by tagged person
- ✅ Family album - photos with family members
- ✅ Events album (placeholder for future)
- ✅ Album detail pages showing all photos of a person

**Files:**
- `src/app/api/smart-albums/route.ts` - Smart album API
- `src/app/api/contacts/[id]/photos/route.ts` - Photos per contact
- `src/app/(dashboard)/dashboard/smart-albums/page.tsx` - Albums grid
- `src/app/(dashboard)/dashboard/smart-albums/[id]/page.tsx` - Album detail

**Features:**
- Auto-creates albums for each tagged person
- Shows photo count + cover photo
- Sorted by most photos first
- Relationship badges (Mom, Brother, etc.)

---

## 🎯 How It Works

### Face Detection Flow

```
1. User uploads photo
   ↓
2. Photo sent to AWS Rekognition
   ↓
3. Rekognition returns:
   - Face bounding boxes
   - Age range (e.g., 25-35)
   - Gender + confidence
   - Emotions (happy, calm, etc.)
   ↓
4. System searches Rekognition collection for matches
   ↓
5. Returns suggestions if found (70%+ similarity)
   ↓
6. User clicks face → sees AI suggestions at top
   ↓
7. User selects contact → face is indexed
   ↓
8. Next time: auto-suggests that person!
```

### Data Storage

**memory_media table:**
```json
{
  "ai_faces": [
    {
      "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2 },
      "confidence": 99.5,
      "age": { "low": 25, "high": 35 },
      "gender": "Female",
      "expression": "HAPPY"
    }
  ]
}
```

**memory_face_tags table:**
- `contact_id` - who is tagged
- `box_left/top/width/height` - face location
- `aws_face_id` - Rekognition face ID
- `is_confirmed` - user confirmed the tag
- `confidence` - match confidence (100 = user-confirmed)

**AWS Rekognition Collections:**
- Collection ID: `yourstruly-{userId}`
- Each face stored with `ExternalImageId = contactId`
- Searchable with 70%+ similarity threshold

---

## 🚀 Usage

### 1. Upload Photo with Face Detection

```bash
# Upload triggers face detection automatically
POST /api/memories/{memoryId}/media
Content-Type: multipart/form-data

# Response includes detected faces + suggestions:
{
  "media": { ... },
  "faces": [
    {
      "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2 },
      "age": { "low": 25, "high": 35 },
      "gender": "Female",
      "expression": "HAPPY",
      "suggestions": [
        { "contactId": "123", "contactName": "Mom", "similarity": 92 },
        { "contactId": "456", "contactName": "Sister", "similarity": 78 }
      ]
    }
  ]
}
```

### 2. Tag a Face (Indexes for Future Recognition)

```bash
POST /api/face-tags
{
  "mediaId": "media-uuid",
  "contactId": "contact-uuid",
  "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2 }
}

# This:
# 1. Creates face_tag record
# 2. Indexes face in Rekognition collection
# 3. Future uploads will auto-suggest this person
```

### 3. View Smart Albums

```bash
# Get people albums
GET /api/smart-albums?type=people

# Response:
{
  "albums": [
    {
      "contactId": "123",
      "contactName": "Mom",
      "avatarUrl": "...",
      "photoCount": 47,
      "coverPhoto": "...",
      "photos": [...]
    }
  ]
}

# Get photos of specific person
GET /api/contacts/{contactId}/photos

# UI: /dashboard/smart-albums
```

---

## 💰 Cost Estimate

AWS Rekognition pricing (us-east-2):

| Operation | Price | Monthly Estimate (1000 uploads) |
|-----------|-------|--------------------------------|
| DetectFaces | $1 / 1000 images | $1.00 |
| IndexFaces | $0.25 / 1000 faces | $0.25 |
| SearchFaces | $0.10 / 1000 searches | $0.10 |
| **Total** | | **~$1.35/month** |

**Storage:** Face vectors stored in Rekognition (no additional charge)

---

## 🔧 Configuration

### AWS Credentials

Already configured in `.env.local`:
```bash
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<set>
AWS_SECRET_ACCESS_KEY=<set>
```

### IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:IndexFaces",
        "rekognition:CreateCollection",
        "rekognition:DeleteFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📊 Database Schema

### memory_face_tags

```sql
CREATE TABLE memory_face_tags (
  id UUID PRIMARY KEY,
  media_id UUID REFERENCES memory_media(id),
  user_id UUID REFERENCES auth.users(id),
  contact_id UUID REFERENCES contacts(id),
  
  -- Face position (normalized 0-1)
  box_left DECIMAL(5,4),
  box_top DECIMAL(5,4),
  box_width DECIMAL(5,4),
  box_height DECIMAL(5,4),
  
  -- Rekognition data
  aws_face_id TEXT,  -- Rekognition's FaceId
  confidence DECIMAL(5,2),
  age INTEGER,
  gender TEXT,
  expression TEXT,
  
  -- Metadata
  is_auto_detected BOOLEAN DEFAULT FALSE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI Components

### PhotoUploadModal
- Shows detected faces with yellow boxes
- Click face → shows suggestions first (green badges with % match)
- Then shows all contacts in grid
- Tagged faces turn green

### Smart Albums Page
- Grid of person albums
- Cover photo + name + photo count
- Sorted by most photos
- Click → view all photos of that person

### Album Detail Page
- Header with person's avatar + name
- Grid of all photos they're tagged in
- Click photo → go to memory detail

---

## 🔮 Future Enhancements

### Phase 2: Advanced Recognition
- [ ] Bulk auto-tagging: "Find all photos of Mom"
- [ ] Face clustering: Group untagged faces by similarity
- [ ] Family resemblance detection
- [ ] Age progression tracking (child → adult photos)

### Phase 3: Event Detection
- [ ] Auto-create event albums (birthday, wedding, vacation)
- [ ] Detect group photos vs portraits
- [ ] Location + date + people clustering

### Phase 4: Smart Search
- [ ] "Show me photos with Mom and Dad"
- [ ] "Photos from last summer with friends"
- [ ] "Find photos where I'm smiling"

---

## 🐛 Troubleshooting

### No face suggestions
- **First upload:** No indexed faces yet (normal)
- **After tagging:** Wait for indexing to complete
- **Low similarity:** Increase threshold or improve photo quality

### Faces not detected
- **Too small:** Faces must be ≥40x40 pixels
- **Low quality:** Blurry/dark photos may fail
- **Obscured:** Sunglasses, masks reduce detection

### Check logs
```bash
tail -f /tmp/yt-dev.log | grep Rekognition

# Should see:
# [Rekognition] Detecting faces, buffer size: 4834784
# [Rekognition] ✅ Detected 2 faces
# [Media Upload] Found 1 face match suggestions
# [Face Tag] ✅ Indexed face in Rekognition: abc123
```

### Test Rekognition
```bash
# Test detection
curl -X POST http://localhost:3000/api/memories/{id}/media \
  -F "file=@photo.jpg"

# Check indexed faces
aws rekognition list-faces --collection-id yourstruly-{userId} --region us-east-2
```

---

## ✅ Migration Checklist

- [x] Remove TensorFlow.js dependencies
- [x] Implement AWS Rekognition service
- [x] Add face detection to upload flow
- [x] Implement face indexing on tag
- [x] Add auto-suggestions with similarity scores
- [x] Create Smart Albums API
- [x] Build Smart Albums UI
- [x] Add AWS credentials to .env
- [x] Test end-to-end flow
- [x] Document everything

---

## 🎉 Result

**Before:** Manual tagging only, no recognition, no smart organization

**After:**
- ✅ Auto-detect faces on upload
- ✅ AI-powered suggestions (70%+ similarity)
- ✅ Smart albums auto-created per person
- ✅ Family album
- ✅ Production-ready (AWS Rekognition)
- ✅ Scalable ($1-2/month for typical usage)

**Try it:**
1. Upload photo with people: `/dashboard` → quick photo upload
2. Click detected face → see AI suggestions
3. Tag someone → uploads will suggest them next time
4. View smart albums: `/dashboard/smart-albums`

🚀 **Face recognition complete!**
