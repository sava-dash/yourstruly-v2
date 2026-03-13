# YoursTruly V2 - API Reference

**Base URL:** `https://app.yourstruly.love`  
**Auth:** Bearer token (Supabase JWT) in `Authorization` header

---

## Authentication

All endpoints require authentication unless marked `[public]`.

**Get auth token:**
```typescript
// Client-side
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Use in requests
fetch('/api/memories', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

---

## Memories

### `GET /api/memories`
Get user's memories

**Query params:**
- `limit` (number, default: 20) - Max results
- `offset` (number, default: 0) - Pagination offset
- `type` (string) - Filter by memory_type
- `search` (string) - Search title/description
- `favorite` (boolean) - Filter favorites only

**Response:**
```json
{
  "memories": [
    {
      "id": "uuid",
      "title": "Summer Vacation 2024",
      "description": "Amazing trip to Paris",
      "memory_date": "2024-07-15",
      "memory_type": "moment",
      "location_name": "Paris, France",
      "location_lat": 48.8566,
      "location_lng": 2.3522,
      "ai_mood": "joyful",
      "ai_category": "travel",
      "is_favorite": false,
      "created_at": "2024-07-20T10:00:00Z",
      "updated_at": "2024-07-20T10:00:00Z"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### `POST /api/memories`
Create new memory

**Body:**
```json
{
  "title": "Memory title",
  "description": "Optional description",
  "memory_date": "2024-07-15",
  "memory_type": "moment",
  "location_name": "Paris, France",
  "location_lat": 48.8566,
  "location_lng": 2.3522
}
```

**Required:** `title`, `memory_date`

**Response:**
```json
{
  "memory": {
    "id": "uuid",
    "title": "Memory title",
    "user_id": "uuid",
    "created_at": "2024-07-20T10:00:00Z",
    ...
  }
}
```

**Awards:** 20 XP

---

### `GET /api/memories/[id]`
Get single memory

**Response:**
```json
{
  "memory": {
    "id": "uuid",
    "title": "...",
    "media": [
      {
        "id": "uuid",
        "file_url": "https://...",
        "file_type": "image",
        "is_cover": true
      }
    ],
    "face_tags": [
      {
        "id": "uuid",
        "contact_id": "uuid",
        "contact": {
          "full_name": "Jane Doe"
        }
      }
    ]
  }
}
```

---

### `PATCH /api/memories/[id]`
Update memory

**Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "is_favorite": true
}
```

**Response:**
```json
{
  "memory": { ... }
}
```

---

### `DELETE /api/memories/[id]`
Delete memory (soft delete)

**Response:**
```json
{
  "success": true
}
```

---

### `POST /api/memories/[id]/media`
Upload media to memory

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (File) - Image/video/audio file

**Max size:** 100MB

**Supported formats:**
- Images: JPEG, PNG, HEIC, WebP
- Videos: MP4, MOV, AVI
- Audio: MP3, WAV, M4A

**Response:**
```json
{
  "media": {
    "id": "uuid",
    "memory_id": "uuid",
    "file_url": "https://...",
    "file_type": "image",
    "mime_type": "image/jpeg",
    "file_size": 2048576,
    "width": 1920,
    "height": 1080,
    
    "exif_lat": 48.8566,
    "exif_lng": 2.3522,
    "taken_at": "2024-07-15T14:30:00Z",
    "camera_make": "Apple",
    "camera_model": "iPhone 15 Pro",
    
    "ai_labels": {
      "scene": ["outdoor", "urban"],
      "mood": ["happy", "relaxed"],
      "caption": "A sunny day in Paris"
    },
    "ai_processed": true,
    
    "is_cover": true,
    "created_at": "2024-07-20T10:00:00Z"
  },
  "faces": [
    {
      "boundingBox": {
        "x": 0.2,
        "y": 0.3,
        "width": 0.15,
        "height": 0.2
      },
      "age": {
        "low": 25,
        "high": 35
      },
      "gender": "Female",
      "expression": "HAPPY",
      "suggestions": [
        {
          "contactId": "uuid",
          "contactName": "Mom",
          "similarity": 92
        }
      ]
    }
  ]
}
```

**Side effects:**
- Extracts EXIF data (location, date, camera)
- Detects faces via AWS Rekognition
- Searches for face matches (auto-suggestions)
- Generates smart tags via Gemini Vision API
- Updates memory location/date if not set

**Awards:** No XP (only backstory earns XP)

---

### `GET /api/memories/on-this-day`
Get memories from this day in previous years

**Response:**
```json
{
  "memories": [
    {
      "id": "uuid",
      "title": "Last year's vacation",
      "memory_date": "2023-07-15",
      "years_ago": 1,
      "media": [...]
    }
  ]
}
```

---

## Face Tagging

### `POST /api/face-tags`
Tag a face in a photo

**Body:**
```json
{
  "mediaId": "uuid",
  "contactId": "uuid",
  "boundingBox": {
    "x": 0.2,
    "y": 0.3,
    "width": 0.15,
    "height": 0.2
  }
}
```

**Response:**
```json
{
  "faceTag": {
    "id": "uuid",
    "media_id": "uuid",
    "contact_id": "uuid",
    "box_left": 0.2,
    "box_top": 0.3,
    "box_width": 0.15,
    "box_height": 0.2,
    "aws_face_id": "rekognition-face-id-123",
    "confidence": 100,
    "is_confirmed": true,
    "created_at": "2024-07-20T10:00:00Z"
  }
}
```

**Side effects:**
- Indexes face in AWS Rekognition collection (`yourstruly-{userId}`)
- Future uploads will auto-suggest this contact

**Awards:** 5 XP

---

### `GET /api/media/[id]/faces`
Get all faces tagged in a photo

**Response:**
```json
{
  "faces": [
    {
      "id": "uuid",
      "box_left": 0.2,
      "box_top": 0.3,
      "box_width": 0.15,
      "box_height": 0.2,
      "contact": {
        "id": "uuid",
        "full_name": "Jane Doe",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

---

## Smart Albums

### `GET /api/smart-albums`
Get smart albums

**Query params:**
- `type` (string) - 'people', 'family', 'events'

**Response (type=people):**
```json
{
  "albums": [
    {
      "contactId": "uuid",
      "contactName": "Mom",
      "avatarUrl": "https://...",
      "relationship": "parent",
      "photoCount": 47,
      "coverPhoto": "https://...",
      "photos": [
        {
          "mediaId": "uuid",
          "fileUrl": "https://...",
          "memoryId": "uuid",
          "createdAt": "2024-07-15T10:00:00Z"
        }
      ]
    }
  ],
  "type": "people"
}
```

**Response (type=family):**
```json
{
  "albums": [
    {
      "albumId": "family",
      "albumName": "Family",
      "photoCount": 123,
      "coverPhoto": "https://...",
      "photos": [...]
    }
  ],
  "type": "family"
}
```

---

### `GET /api/contacts/[id]/photos`
Get all photos tagged with a specific contact

**Response:**
```json
{
  "albumInfo": {
    "name": "Mom",
    "avatarUrl": "https://...",
    "photoCount": 47
  },
  "photos": [
    {
      "mediaId": "uuid",
      "fileUrl": "https://...",
      "memoryId": "uuid",
      "createdAt": "2024-07-15T10:00:00Z",
      "memoryTitle": "Summer Vacation",
      "memoryDate": "2024-07-15",
      "location": "Paris, France"
    }
  ]
}
```

---

## Contacts

### `GET /api/contacts`
Get user's contacts

**Query params:**
- `limit` (number, default: 100)
- `search` (string) - Search name
- `relationship` (string) - Filter by relationship type

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "full_name": "Jane Doe",
      "nickname": "Mom",
      "avatar_url": "https://...",
      "relationship": "parent",
      "relationship_details": "Mother",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "birth_date": "1970-05-15",
      "anniversary_date": null,
      "bio": "My amazing mother...",
      "notes": "Loves gardening",
      "is_favorite": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 15
}
```

---

### `POST /api/contacts`
Create contact

**Body:**
```json
{
  "full_name": "Jane Doe",
  "nickname": "Mom",
  "relationship": "parent",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "birth_date": "1970-05-15",
  "bio": "My amazing mother..."
}
```

**Required:** `full_name`

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "full_name": "Jane Doe",
    ...
  }
}
```

**Awards:** 10 XP

---

### `PATCH /api/contacts/[id]`
Update contact

**Body:** Same as POST (partial updates allowed)

**Response:**
```json
{
  "contact": { ... }
}
```

---

### `DELETE /api/contacts/[id]`
Delete contact

**Note:** Sets face_tags.contact_id to NULL (doesn't delete tags)

**Response:**
```json
{
  "success": true
}
```

---

## Postscripts

### `GET /api/postscripts`
Get user's postscripts

**Query params:**
- `status` (string) - Filter by status ('scheduled', 'sent', 'failed')

**Response:**
```json
{
  "postscripts": [
    {
      "id": "uuid",
      "title": "Happy 18th Birthday!",
      "message": "Dear future you...",
      "message_type": "text",
      "media_url": null,
      
      "delivery_trigger": "date",
      "delivery_date": "2035-05-15",
      "delivery_event": null,
      
      "recipient_type": "contact",
      "recipient_ids": ["contact-uuid"],
      "recipient_emails": null,
      
      "status": "scheduled",
      "sent_at": null,
      "created_at": "2024-07-20T10:00:00Z"
    }
  ]
}
```

---

### `POST /api/postscripts`
Create postscript

**Body:**
```json
{
  "title": "Happy 18th Birthday!",
  "message": "Dear future you...",
  "message_type": "text",
  "media_url": null,
  
  "delivery_trigger": "date",
  "delivery_date": "2035-05-15",
  
  "recipient_type": "contact",
  "recipient_ids": ["contact-uuid"]
}
```

**Delivery triggers:**
- `date` - Specific date (requires `delivery_date`)
- `event` - Birthday, anniversary (requires `delivery_event`)
- `death` - After verified death (no additional fields)

**Recipient types:**
- `contact` - Contact IDs (requires `recipient_ids`)
- `email` - Email addresses (requires `recipient_emails`)
- `group` - Circle/group (future feature)

**Response:**
```json
{
  "postscript": {
    "id": "uuid",
    "title": "...",
    ...
  }
}
```

**Awards:** 20 XP

---

### `DELETE /api/postscripts/[id]`
Cancel postscript

**Response:**
```json
{
  "success": true
}
```

---

## Activity & XP

### `GET /api/activity`
Get user activity feed

**Query params:**
- `limit` (number, default: 20)
- `type` (string) - Filter by activity_type

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "activity_type": "memory_created",
      "activity_data": {
        "memory_id": "uuid",
        "memory_title": "Summer Vacation"
      },
      "xp_earned": 20,
      "created_at": "2024-07-20T10:00:00Z"
    }
  ],
  "total": 156
}
```

---

### `GET /api/profile/stats`
Get user stats (XP, level, streak)

**Response:**
```json
{
  "profile": {
    "xp_total": 450,
    "xp_level": 5,
    "xp_to_next_level": 50,
    "streak_days": 12,
    "streak_last_active": "2024-07-20"
  },
  "stats": {
    "memories_count": 42,
    "contacts_count": 15,
    "postscripts_count": 3,
    "photos_uploaded": 127
  }
}
```

---

## Subscription

### `GET /api/subscription`
Get subscription details

**Response:**
```json
{
  "subscription": {
    "tier": "premium",
    "status": "active",
    "stripe_customer_id": "cus_...",
    "stripe_subscription_id": "sub_...",
    "current_period_end": "2025-08-20T00:00:00Z",
    "cancel_at_period_end": false
  },
  "usage": {
    "storage_used_bytes": 1073741824,
    "storage_quota_bytes": 107374182400,
    "storage_used_gb": 1.0,
    "storage_quota_gb": 100.0,
    "percentage_used": 1.0
  }
}
```

---

### `POST /api/create-checkout-session`
Create Stripe checkout session

**Body:**
```json
{
  "priceId": "price_1T4lnyH94XbyUkwA9PV0uiIz",
  "successUrl": "https://app.yourstruly.love/dashboard/subscription?success=true",
  "cancelUrl": "https://app.yourstruly.love/dashboard/subscription?canceled=true"
}
```

**Price IDs:**
- Monthly ($20/mo): `price_1T4lnyH94XbyUkwA9PV0uiIz`
- Annual ($220/yr): `price_1T4ltlH94XbyUkwABUSWR6f7`

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/..."
}
```

**Client-side redirect:**
```typescript
const res = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ priceId, successUrl, cancelUrl })
})
const { url } = await res.json()
window.location.href = url
```

---

### `POST /api/create-portal-session`
Create Stripe customer portal session (manage subscription)

**Body:**
```json
{
  "returnUrl": "https://app.yourstruly.love/dashboard/subscription"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

---

## Webhooks

### `POST /api/webhooks/stripe`
Stripe webhook endpoint

**Events handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Webhook secret:** In AWS Secrets Manager

**Stripe signature verification:** Required in `stripe-signature` header

---

## Errors

All errors return:

```json
{
  "error": "Error message"
}
```

**Status codes:**
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `429` - Too many requests (rate limit)
- `500` - Internal server error

---

## Rate Limiting

**Not yet implemented** - Coming soon

Planned limits:
- 100 requests/minute per user
- 1000 requests/hour per user
- 10 file uploads/minute

---

## Pagination

Use `limit` and `offset` for pagination:

```typescript
// Page 1 (first 20)
GET /api/memories?limit=20&offset=0

// Page 2 (next 20)
GET /api/memories?limit=20&offset=20

// Page 3 (next 20)
GET /api/memories?limit=20&offset=40
```

**Response includes:**
```json
{
  "data": [...],
  "total": 156,
  "hasMore": true
}
```

---

## Testing

### Test Account Credentials

**Email:** chuckpatel7@gmail.com  
**UUID:** 9009192d-2840-4ab5-adc7-c42cc9a60655

### cURL Examples

```bash
# Get auth token (replace with your credentials)
TOKEN=$(curl -X POST 'https://kviepobclupcjnqnykco.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.access_token')

# Get memories
curl -H "Authorization: Bearer $TOKEN" \
  https://app.yourstruly.love/api/memories

# Create memory
curl -X POST https://app.yourstruly.love/api/memories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Memory","memory_date":"2024-07-20"}'

# Upload photo
curl -X POST https://app.yourstruly.love/api/memories/{id}/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg"
```

---

**End of API Reference**  
*For full technical documentation, see `TECHNICAL_DOCUMENTATION.md`*
