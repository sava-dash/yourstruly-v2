# YoursTruly V2 - Technical Documentation

**Version:** 2.0  
**Last Updated:** March 13, 2026  
**Environment:** Production (AWS ECS) + Local Development

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Core Features](#core-features)
6. [API Reference](#api-reference)
7. [AWS Infrastructure](#aws-infrastructure)
8. [Third-Party Integrations](#third-party-integrations)
9. [Development Setup](#development-setup)
10. [Deployment](#deployment)
11. [Code Structure](#code-structure)
12. [Security & Privacy](#security--privacy)

---

## Product Overview

**YoursTruly** is a digital legacy platform that helps people document their lives, create a digital version of themselves, and send future messages/gifts to loved ones.

### Core Value Propositions

1. **Memory Preservation** - Capture life stories through photos, videos, voice recordings, and written memories
2. **AI-Powered Digital Twin** - Create a conversational AI trained on your memories and wisdom
3. **Future Communication** - Schedule messages and gifts for future delivery
4. **Family Connection** - Strengthen relationships through shared memories and storytelling

### Target Users

- Primary: Adults 30-65 preserving family history
- Secondary: Parents documenting for children, people facing illness
- B2B: Elder care facilities, estate planning attorneys

### Business Model

- **Freemium:** Basic features free, premium features $20/month
- **Pricing Tiers:**
  - Free: 2GB storage, basic features
  - Premium ($20/mo): Unlimited storage, AI features, 2 seats included
  - Additional seats: $8/seat (3-5), $6/seat (6-10)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CloudFlare (CDN)                         │
│                    dzk4qp1jyvc4m.cloudfront.net              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Application Load Balancer                     │
│        yourstruly-alb-14463415.us-east-2.elb.amazonaws.com  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                      ECS Fargate                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js 16 App (Docker Container)                   │   │
│  │  - App Router (React Server Components)             │   │
│  │  - API Routes (/api/*)                               │   │
│  │  - Server Actions                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴────────────────┬─────────────────────┐
        │                              │                     │
┌───────▼────────┐          ┌──────────▼─────────┐  ┌───────▼────────┐
│   Supabase     │          │    AWS Services    │  │  Third-Party   │
│                │          │                    │  │                │
│ - PostgreSQL   │          │ - S3 (storage)     │  │ - Resend       │
│ - Auth         │          │ - Rekognition      │  │ - Telnyx       │
│ - Storage      │          │ - Secrets Manager  │  │ - Stripe       │
│ - Realtime     │          │ - CloudWatch       │  │ - Gemini       │
└────────────────┘          └────────────────────┘  └────────────────┘
```

### Request Flow

```
User → CloudFlare → ALB → ECS → Next.js App
                                    ↓
                            ┌───────┴────────┐
                            │                │
                      API Route      Page Render
                            │                │
                            ↓                ↓
                    ┌───────────────────────────┐
                    │   Supabase Client         │
                    │   - Row Level Security    │
                    │   - Server-side auth      │
                    └───────────┬───────────────┘
                                ↓
                        PostgreSQL Database
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework (App Router) |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Styling |
| **Framer Motion** | 11.x | Animations |
| **Lucide React** | Latest | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 24.13.0 | Runtime |
| **Next.js API Routes** | 16.1.6 | Backend API |
| **Supabase** | Latest | Database + Auth + Storage |
| **PostgreSQL** | 15+ | Primary database |

### AWS Services

| Service | Purpose |
|---------|---------|
| **ECS Fargate** | Container orchestration |
| **ECR** | Docker image registry |
| **RDS PostgreSQL** | Production database (planned migration) |
| **S3** | Media storage (via Supabase) |
| **CloudFront** | CDN |
| **ALB** | Load balancing |
| **Route 53** | DNS |
| **Rekognition** | Face detection & recognition |
| **Secrets Manager** | Credentials storage |

### Third-Party Services

| Service | Purpose | API Keys Location |
|---------|---------|-------------------|
| **Stripe** | Payments | Secrets Manager |
| **Resend** | Email delivery | Secrets Manager |
| **Telnyx** | SMS delivery | Secrets Manager |
| **Google Gemini** | AI generation | `.env.local` |
| **CookieYes** | GDPR compliance | Script ID: `58428a871654efaa39eb49e8ba3039f0` |

---

## Database Schema

### Core Tables

#### **users** (Supabase Auth)
```sql
-- Managed by Supabase Auth
auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

#### **profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  birth_date DATE,
  location TEXT,
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Usage
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 2147483648, -- 2GB
  
  -- Gamification
  xp_total INTEGER DEFAULT 0,
  xp_level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  streak_last_active DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **memories**
```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  memory_type TEXT, -- 'moment', 'story', 'milestone'
  memory_date DATE,
  
  -- Location
  location_name TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- AI analysis
  ai_summary TEXT,
  ai_mood TEXT,
  ai_category TEXT,
  ai_tags TEXT[],
  
  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_date ON memories(memory_date);
CREATE INDEX idx_memories_type ON memories(memory_type);
```

#### **memory_media**
```sql
CREATE TABLE memory_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- File info
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL, -- S3/Supabase Storage key
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio'
  mime_type TEXT,
  file_size BIGINT,
  
  -- Image metadata
  width INTEGER,
  height INTEGER,
  
  -- EXIF data
  exif_lat DECIMAL(10, 8),
  exif_lng DECIMAL(11, 8),
  taken_at TIMESTAMPTZ,
  camera_make TEXT,
  camera_model TEXT,
  
  -- AI analysis
  ai_labels JSONB, -- Vision API labels
  ai_faces JSONB, -- Detected faces data
  ai_processed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  is_cover BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_memory ON memory_media(memory_id);
CREATE INDEX idx_media_user ON memory_media(user_id);
CREATE INDEX idx_media_type ON memory_media(file_type);
```

#### **memory_face_tags**
```sql
CREATE TABLE memory_face_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES memory_media(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Tagged person
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Self-tag
  
  -- Face position (normalized 0-1)
  box_left DECIMAL(5, 4),
  box_top DECIMAL(5, 4),
  box_width DECIMAL(5, 4),
  box_height DECIMAL(5, 4),
  
  -- AWS Rekognition
  aws_face_id TEXT, -- Rekognition FaceId
  confidence DECIMAL(5, 2),
  age INTEGER,
  gender TEXT,
  expression TEXT,
  face_embedding VECTOR(128), -- For similarity search
  
  -- Metadata
  is_auto_detected BOOLEAN DEFAULT FALSE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_tagged_person CHECK (
    contact_id IS NOT NULL OR profile_id IS NOT NULL
  )
);

CREATE INDEX idx_face_tags_media ON memory_face_tags(media_id);
CREATE INDEX idx_face_tags_contact ON memory_face_tags(contact_id);
CREATE INDEX idx_face_tags_aws ON memory_face_tags(aws_face_id);
```

#### **contacts**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Basic info
  full_name TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  
  -- Relationship
  relationship TEXT, -- 'parent', 'sibling', 'child', 'spouse', 'friend'
  relationship_details TEXT,
  
  -- Contact info
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Dates
  birth_date DATE,
  anniversary_date DATE,
  
  -- Bio
  bio TEXT,
  notes TEXT,
  
  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_relationship ON contacts(relationship);
```

#### **postscripts**
```sql
CREATE TABLE postscripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Message
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'video', 'voice'
  media_url TEXT,
  
  -- Delivery
  delivery_trigger TEXT NOT NULL, -- 'date', 'event', 'death'
  delivery_date DATE,
  delivery_event TEXT,
  
  -- Recipients
  recipient_type TEXT DEFAULT 'contact', -- 'contact', 'email', 'group'
  recipient_ids UUID[], -- Contact IDs
  recipient_emails TEXT[],
  
  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_postscripts_user ON postscripts(user_id);
CREATE INDEX idx_postscripts_status ON postscripts(status);
CREATE INDEX idx_postscripts_date ON postscripts(delivery_date);
```

#### **engagement_prompts**
```sql
CREATE TABLE engagement_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Prompt content
  type TEXT NOT NULL, -- 'photo_backstory', 'memory_prompt', 'knowledge', etc.
  title TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  
  -- Display
  icon TEXT,
  color TEXT, -- 'yellow', 'green', 'red', 'blue', 'purple'
  xp_value INTEGER DEFAULT 10,
  
  -- Targeting
  requires_photo BOOLEAN DEFAULT FALSE,
  requires_contact BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  
  -- Scheduling
  frequency TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **user_activity**
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Activity
  activity_type TEXT NOT NULL, -- 'memory_created', 'photo_uploaded', 'prompt_completed'
  activity_data JSONB,
  
  -- XP
  xp_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_activity_type ON user_activity(activity_type);
CREATE INDEX idx_activity_date ON user_activity(created_at);
```

### Row Level Security (RLS)

All tables have RLS enabled. Example policies:

```sql
-- Users can only access their own data
CREATE POLICY "Users can manage own memories" ON memories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own media" ON memory_media
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);
```

---

## Core Features

### 1. Memory Management

**What:** Capture and organize life stories, moments, and milestones

**Key Components:**
- Memory creation with photos/videos/voice
- Rich text editor for descriptions
- Date, location, people tagging
- AI-powered categorization and mood analysis
- Photo backstories (audio narration)

**Implementation:**
- `/api/memories` - CRUD operations
- `/api/memories/[id]/media` - Media upload with face detection
- `/api/memories/[id]/backstory` - Voice recording for photos

**Tech Details:**
- EXIF extraction for photo metadata (date, location, camera)
- Filename parsing for date detection (WhatsApp, Screenshot formats)
- Reverse geocoding via `reverseGeocode()` helper
- Smart tags generation using Gemini Vision API

### 2. Face Detection & Recognition (AWS Rekognition)

**What:** Automatically detect and tag people in photos

**Flow:**
1. User uploads photo
2. AWS Rekognition detects faces → bounding boxes, age, gender, emotions
3. Search indexed faces for matches (70% similarity threshold)
4. Show AI suggestions with similarity scores
5. User confirms → face indexed for future recognition

**Key APIs:**
- `POST /api/memories/[id]/media` - Upload with face detection
- `POST /api/face-tags` - Tag face + index in Rekognition
- `GET /api/smart-albums` - Smart albums by person
- `GET /api/contacts/[id]/photos` - All photos of a person

**AWS Rekognition Collections:**
- Collection ID: `yourstruly-{userId}`
- Each face stored with `ExternalImageId = contactId`
- Supports similarity search, face comparison

**Cost:** ~$1-2/month for typical usage

### 3. Smart Albums

**What:** Auto-organize photos by people, family, events

**Types:**
- **People Albums** - One album per tagged person
- **Family Album** - Photos with family members (parent, sibling, child, spouse)
- **Events Album** - Placeholder for future event detection

**Implementation:**
- Face tags drive album creation
- Sorted by photo count (descending)
- Cover photo = most recent tagged photo
- Relationship badges from contacts table

### 4. Engagement System (Gamification)

**What:** Daily prompts to keep users engaged

**Mechanics:**
- XP for completing prompts (5-20 XP per prompt)
- Streak tracking (daily active days)
- Level progression (100 XP per level)
- Prompt types: photo backstory, memory prompt, contact info, wisdom, etc.

**Implementation:**
- Tile-based dashboard (2x2 grid + 1 tall tile)
- Prompt rotation based on user data
- XP awards stored in `user_activity` table
- Real-time progress updates

**Prompt Types:**

| Type | Icon | XP | Requires |
|------|------|----|----|
| `photo_backstory` | 📸 | 15 | Photo |
| `memory_prompt` | 💭 | 20 | - |
| `knowledge` | 🧠 | 15 | - |
| `quick_question` | 👤 | 5 | Contact |
| `missing_info` | 📝 | 5 | Contact |
| `tag_person` | 👤 | 5 | Photo |

### 5. Postscripts (Future Messages)

**What:** Schedule messages/gifts for future delivery

**Triggers:**
- **Date-based:** Specific date/time
- **Event-based:** Birthday, anniversary, milestone
- **Death-triggered:** Verified death certificate

**Delivery Methods:**
- Email
- SMS
- In-app notification
- Video message

**Implementation:**
- `postscripts` table with `delivery_trigger` field
- Cron job checks due postscripts daily
- Resend for email, Telnyx for SMS
- Media stored in Supabase Storage

### 6. AI Features

#### Voice Transcription
- Web Speech API (browser-based)
- Future: Whisper API for server-side

#### Smart Tags
- Gemini Vision API for image analysis
- Returns: scene, setting, activities, objects, mood, weather
- Stored in `memory_media.ai_labels` JSONB field

#### Mood Analysis
- Gemini API analyzes memory text
- Returns mood + suggestions
- Stored in `memories.ai_mood`

#### Future: Digital Twin
- Train model on user's memories + wisdom
- Conversational AI using RAG (Retrieval-Augmented Generation)
- Planned: LangChain + Pinecone vector store

---

## API Reference

### Authentication

All API routes require authentication via Supabase Auth.

**Headers:**
```
Authorization: Bearer <supabase-jwt-token>
```

**Server-side:**
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Memories API

#### `GET /api/memories`
Get user's memories

**Query params:**
- `limit` (number) - Max results
- `type` (string) - Filter by memory_type
- `search` (string) - Search title/description

**Response:**
```json
{
  "memories": [
    {
      "id": "uuid",
      "title": "Summer Vacation 2024",
      "description": "...",
      "memory_date": "2024-07-15",
      "memory_type": "moment",
      "location_name": "Paris, France",
      "ai_mood": "joyful",
      "created_at": "2024-07-20T10:00:00Z"
    }
  ],
  "total": 42
}
```

#### `POST /api/memories`
Create new memory

**Body:**
```json
{
  "title": "Memory title",
  "description": "Memory description",
  "memory_date": "2024-07-15",
  "memory_type": "moment",
  "location_name": "Paris, France",
  "location_lat": 48.8566,
  "location_lng": 2.3522
}
```

**Response:**
```json
{
  "memory": {
    "id": "uuid",
    "title": "...",
    ...
  }
}
```

#### `POST /api/memories/[id]/media`
Upload media to memory

**Content-Type:** `multipart/form-data`

**Body:**
- `file` (File) - Image/video file

**Response:**
```json
{
  "media": {
    "id": "uuid",
    "file_url": "https://...",
    "file_type": "image",
    "width": 1920,
    "height": 1080,
    "taken_at": "2024-07-15T14:30:00Z",
    "exif_lat": 48.8566,
    "exif_lng": 2.3522
  },
  "faces": [
    {
      "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.15, "height": 0.2 },
      "age": { "low": 25, "high": 35 },
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

### Face Tagging API

#### `POST /api/face-tags`
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
    "aws_face_id": "rekognition-face-id",
    "confidence": 100,
    "is_confirmed": true
  }
}
```

**Side Effects:**
- Indexes face in AWS Rekognition collection
- Future uploads will auto-suggest this contact

### Smart Albums API

#### `GET /api/smart-albums`
Get smart albums

**Query params:**
- `type` (string) - 'people', 'family', 'events'

**Response:**
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
      "photos": [...]
    }
  ],
  "type": "people"
}
```

#### `GET /api/contacts/[id]/photos`
Get all photos of a contact

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

### Contacts API

#### `GET /api/contacts`
Get user's contacts

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "full_name": "Jane Doe",
      "relationship": "parent",
      "avatar_url": "https://...",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "birth_date": "1970-05-15",
      "bio": "My amazing mother..."
    }
  ]
}
```

#### `POST /api/contacts`
Create contact

**Body:**
```json
{
  "full_name": "Jane Doe",
  "relationship": "parent",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "birth_date": "1970-05-15"
}
```

### Postscripts API

#### `GET /api/postscripts`
Get user's postscripts

**Response:**
```json
{
  "postscripts": [
    {
      "id": "uuid",
      "title": "Happy 18th Birthday!",
      "message": "...",
      "delivery_trigger": "date",
      "delivery_date": "2035-05-15",
      "status": "scheduled",
      "recipient_type": "contact",
      "recipient_ids": ["uuid"]
    }
  ]
}
```

#### `POST /api/postscripts`
Create postscript

**Body:**
```json
{
  "title": "Happy 18th Birthday!",
  "message": "Dear future you...",
  "delivery_trigger": "date",
  "delivery_date": "2035-05-15",
  "recipient_type": "contact",
  "recipient_ids": ["contact-uuid"]
}
```

### Activity API

#### `GET /api/activity`
Get user activity feed

**Query params:**
- `limit` (number) - Max results (default 20)

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
      "created_at": "2024-07-15T10:00:00Z"
    }
  ]
}
```

---

## AWS Infrastructure

### Account Details
- **Account ID:** 549083880218
- **Region:** us-east-2 (Ohio)
- **IAM User:** YourRootUser

### ECS Deployment

**Cluster:** `yourstruly-cluster`  
**Service:** `yourstruly-service`  
**Task Definition:** `yourstruly-task`

**Container:**
- Image: `549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly:latest`
- CPU: 512
- Memory: 1024 MB
- Port: 3000

**Environment Variables:**
- Stored in AWS Secrets Manager
- Secret ARN: `arn:aws:secretsmanager:us-east-2:549083880218:secret:yourstruly/database-url-ArKPWb`

### Load Balancer

**ALB:** `yourstruly-alb-14463415.us-east-2.elb.amazonaws.com`

**Target Group:** `yourstruly-tg`
- Protocol: HTTP
- Port: 3000
- Health check: `/api/health`

### CloudFront CDN

**Distribution ID:** E1ILTY91SH2SDQ  
**Domain:** dzk4qp1jyvc4m.cloudfront.net  
**Custom Domain:** app.yourstruly.love

**Behaviors:**
- `/` → ALB
- `/_next/static/*` → Cache for 1 year
- `/api/*` → No cache

### DNS (Route 53)

**Hosted Zone:** yourstruly.love

**Records:**
- `app.yourstruly.love` → CloudFront (CNAME)
- `yourstruly.love` → Webflow (CNAME)
- Email verification records (Resend)

### RDS (Planned Migration)

**Instance:** `yourstruly-db.c90ye68omrju.us-east-2.rds.amazonaws.com`  
**Engine:** PostgreSQL 15.x  
**Status:** Provisioned but not yet migrated (still using Supabase)

**Migration Plan:**
1. Export Supabase data
2. Import to RDS
3. Update connection strings
4. Test thoroughly
5. Switch DNS

### Rekognition

**Collections:** Per-user collections (`yourstruly-{userId}`)

**IAM Policy Required:**
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

## Third-Party Integrations

### Stripe (Payments)

**Mode:** Live  
**Product ID:** `prod_U2rXLfgtPvpmfE`

**Prices:**
- Monthly ($20/mo): `price_1T4lnyH94XbyUkwA9PV0uiIz`
- Annual ($220/yr): `price_1T4ltlH94XbyUkwABUSWR6f7`

**Webhooks:**
```
POST /api/webhooks/stripe
Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
```

**Implementation:**
```typescript
import { getStripeServer } from '@/lib/stripe/server'

const stripe = getStripeServer()
const session = await stripe.checkout.sessions.create(...)
```

### Resend (Email)

**Domain:** app.yourstruly.love

**DNS Records:** (In Route 53)
```
resend._domainkey.app.yourstruly.love → CNAME
_dmarc.app.yourstruly.love → TXT
```

**From Address:** `noreply@app.yourstruly.love`

**Templates:**
- Welcome email
- Password reset
- Postscript delivery
- Subscription confirmations

**Implementation:**
```typescript
import { getResend } from '@/lib/resend/server'

const resend = getResend()
await resend.emails.send({
  from: 'YoursTruly <noreply@app.yourstruly.love>',
  to: user.email,
  subject: 'Welcome to YoursTruly',
  html: '<p>...</p>'
})
```

### Telnyx (SMS)

**Status:** Toll-free verification pending

**Phone Numbers:** (TBD)

**Use Cases:**
- SMS postscript delivery
- 2FA (future)
- Reminder notifications

### Google Gemini (AI)

**Models Used:**
- `gemini-2.0-flash` - General AI tasks
- `gemini-2.0-flash-vision` - Image analysis

**Use Cases:**
- Smart tags generation (vision API)
- Mood analysis
- Memory suggestions
- Future: Digital twin training

**API Key:** In `.env.local` (separate from AWS)

**Rate Limits:** 60 requests/minute (free tier)

### CookieYes (GDPR Compliance)

**Script ID:** `58428a871654efaa39eb49e8ba3039f0`

**Implementation:**
```html
<script id="cookieyes" 
  type="text/javascript" 
  src="https://cdn-cookieyes.com/client_data/58428a871654efaa39eb49e8ba3039f0/script.js">
</script>
```

---

## Development Setup

### Prerequisites

- **Node.js:** 24.13.0 (use `nvm`)
- **npm:** 10.x
- **Git**
- **Docker** (for local containerization)
- **AWS CLI** (for deployment)

### Initial Setup

```bash
# Clone repo
git clone https://github.com/yourrepo/yourstruly-v2.git
cd yourstruly-v2

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in credentials (see below)
nano .env.local

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kviepobclupcjnqnykco.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-key>

# AWS (for Rekognition)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (Email)
RESEND_API_KEY=re_...

# Telnyx (SMS)
TELNYX_API_KEY=KEY...

# Google Gemini
GOOGLE_GEMINI_API_KEY=AIzaSy...

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MARKETING_URL=https://yourstruly.love
```

### Development Commands

```bash
# Start dev server (Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Database migrations (Supabase)
npx supabase db push
```

### Database Setup

**Using Supabase (current):**
```bash
# Migrations are in supabase/migrations/
# Push to remote:
npx supabase db push

# Pull latest schema:
npx supabase db pull
```

**Using Local Postgres (future):**
```bash
# Run migrations
psql -U postgres -d yourstruly < supabase/migrations/*.sql
```

---

## Deployment

### Docker Build

```bash
# Build image
docker build -t yourstruly .

# Test locally
docker run -p 3000:3000 --env-file .env.local yourstruly
```

### Deploy to AWS ECS

```bash
# Login to ECR
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  549083880218.dkr.ecr.us-east-2.amazonaws.com

# Tag image
docker tag yourstruly:latest \
  549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly:latest

# Push to ECR
docker push 549083880218.dkr.ecr.us-east-2.amazonaws.com/yourstruly:latest

# Force new deployment
aws ecs update-service \
  --cluster yourstruly-cluster \
  --service yourstruly-service \
  --force-new-deployment \
  --region us-east-2
```

### Deployment Checklist

- [ ] Update version in `package.json`
- [ ] Run tests: `npm test`
- [ ] Build locally: `npm run build`
- [ ] Check for TypeScript errors: `npm run type-check`
- [ ] Update environment variables in Secrets Manager (if changed)
- [ ] Build Docker image
- [ ] Push to ECR
- [ ] Force ECS deployment
- [ ] Monitor CloudWatch logs
- [ ] Test production site
- [ ] Verify database migrations applied

### Rollback Procedure

```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix yourstruly --region us-east-2

# Update service to previous revision
aws ecs update-service \
  --cluster yourstruly-cluster \
  --service yourstruly-service \
  --task-definition yourstruly-task:REVISION_NUMBER \
  --region us-east-2
```

---

## Code Structure

```
yourstruly-v2/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, signup)
│   │   ├── (dashboard)/         # Protected dashboard pages
│   │   │   └── dashboard/
│   │   │       ├── page.tsx     # Main dashboard
│   │   │       ├── memories/    # Memory pages
│   │   │       ├── contacts/    # Contact pages
│   │   │       ├── smart-albums/ # Smart albums
│   │   │       └── settings/    # User settings
│   │   ├── (admin)/             # Admin panel
│   │   ├── api/                 # API routes
│   │   │   ├── memories/        # Memory APIs
│   │   │   ├── contacts/        # Contact APIs
│   │   │   ├── face-tags/       # Face tagging API
│   │   │   ├── smart-albums/    # Smart albums API
│   │   │   ├── postscripts/     # Postscripts API
│   │   │   └── webhooks/        # Stripe, etc.
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   │
│   ├── components/              # React components
│   │   ├── dashboard/           # Dashboard components
│   │   ├── contacts/            # Contact components
│   │   ├── conversation/        # Voice/text conversation UI
│   │   ├── engagement/          # Engagement prompts
│   │   ├── subscription/        # Subscription UI
│   │   └── ui/                  # Shared UI components
│   │
│   ├── lib/                     # Utilities & services
│   │   ├── supabase/            # Supabase clients
│   │   │   ├── client.ts        # Client-side
│   │   │   └── server.ts        # Server-side
│   │   ├── aws/                 # AWS services
│   │   │   └── rekognition.ts   # Face detection
│   │   ├── stripe/              # Stripe integration
│   │   ├── resend/              # Email service
│   │   ├── ai/                  # AI helpers
│   │   │   ├── smartTags.ts     # Image analysis
│   │   │   └── moodAnalysis.ts  # Mood detection
│   │   └── geo/                 # Geolocation helpers
│   │
│   ├── hooks/                   # React hooks
│   │   ├── useEngagementPrompts.ts
│   │   ├── useSubscription.ts
│   │   └── useProfile.ts
│   │
│   └── styles/                  # CSS modules
│
├── supabase/                    # Supabase config
│   └── migrations/              # SQL migrations
│
├── infrastructure/              # Terraform (AWS)
│   └── terraform/
│
├── public/                      # Static assets
│   └── models/                  # (Removed - was face-api models)
│
├── .env.local                   # Environment variables
├── .env.example                 # Template
├── next.config.js               # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── Dockerfile                   # Docker build
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/server.ts` | Server-side Supabase client factory |
| `src/lib/aws/rekognition.ts` | Face detection service |
| `src/app/api/memories/[id]/media/route.ts` | Media upload with face detection |
| `src/app/api/face-tags/route.ts` | Face tagging + indexing |
| `src/components/dashboard/PhotoUploadModal.tsx` | Photo upload UI with face tagging |
| `src/app/(dashboard)/dashboard/page.tsx` | Main dashboard |

---

## Security & Privacy

### Authentication

- **Provider:** Supabase Auth
- **Methods:** Email/password, Google OAuth (future)
- **Session:** JWT stored in httpOnly cookie
- **Expiry:** 7 days

### Authorization

- **Row Level Security (RLS):** All queries filtered by `user_id`
- **Server-side validation:** All API routes check `auth.uid()`
- **Client-side protection:** Protected routes use middleware

### Data Privacy

- **Encryption at rest:** AWS RDS + Supabase (AES-256)
- **Encryption in transit:** TLS 1.2+
- **Secrets:** AWS Secrets Manager (not in code)
- **GDPR:** CookieYes consent management

### Best Practices

1. **Never trust client input** - Validate everything server-side
2. **Use RLS policies** - Automatic user isolation
3. **Sanitize user content** - Prevent XSS
4. **Rate limiting** - Prevent abuse (TODO: implement middleware)
5. **Audit logs** - Track sensitive operations (TODO)

### Known Security TODOs

- [ ] Implement rate limiting on API routes
- [ ] Add CSRF protection
- [ ] Audit logging for sensitive operations
- [ ] 2FA support
- [ ] IP whitelisting for admin routes

---

## Performance Considerations

### Caching Strategy

- **Static assets:** CloudFront CDN (1 year cache)
- **API routes:** No cache (dynamic data)
- **Images:** Supabase Storage + CloudFront

### Database Optimization

- **Indexes:** All foreign keys + frequently queried fields
- **Pagination:** Use `limit` + `offset` for large result sets
- **Eager loading:** Use `.select()` joins to reduce queries

### Image Optimization

- **Next.js Image:** Automatic optimization + lazy loading
- **Responsive images:** `srcset` for different devices
- **WebP/AVIF:** Modern formats when supported

### Code Splitting

- **Route-based:** Automatic with Next.js App Router
- **Component-based:** Dynamic imports for heavy components
- **Third-party libraries:** Lazy load when needed

---

## Monitoring & Logging

### CloudWatch Logs

**Log Groups:**
- `/ecs/yourstruly-task` - Application logs
- `/aws/lambda/yourstruly-*` - Lambda functions (future)

**Log Format:**
```
[Rekognition] ✅ Detected 2 faces
[Media Upload] Successfully saved media: { mediaId: "...", userId: "..." }
[Face Tag] ✅ Indexed face in Rekognition: abc123
```

### Metrics to Monitor

- **Request rate:** CloudFront + ALB metrics
- **Error rate:** 4xx/5xx responses
- **Database connections:** RDS metrics
- **API latency:** Average response time
- **Storage usage:** S3/Supabase storage growth

### Alerts (TODO)

- [ ] High error rate (>5% 5xx)
- [ ] Database connection pool exhaustion
- [ ] Storage quota exceeded
- [ ] Payment failures (Stripe webhook)

---

## Common Issues & Troubleshooting

### Build Errors

**Issue:** `Module not found: @tensorflow/tfjs-node`  
**Fix:** TensorFlow.js removed. If error persists, clean `.next/` and rebuild.

**Issue:** `Can't resolve 'canvas'`  
**Fix:** Canvas package removed. Update imports to use AWS Rekognition.

### Database Issues

**Issue:** RLS policy blocking query  
**Fix:** Check `auth.uid()` matches `user_id` in query. Use server client, not client client.

**Issue:** Slow queries  
**Fix:** Add index to frequently queried columns. Check `EXPLAIN ANALYZE`.

### AWS Issues

**Issue:** Rekognition `ResourceNotFoundException`  
**Fix:** Collection doesn't exist yet (normal for first face index). It's auto-created.

**Issue:** ECR push denied  
**Fix:** Re-login to ECR. Token expires after 12 hours.

### Face Detection Not Working

1. Check AWS credentials in `.env.local`
2. Verify IAM permissions include `rekognition:DetectFaces`
3. Check CloudWatch logs for Rekognition errors
4. Test image format (must be JPEG/PNG, <5MB)

---

## Team Onboarding

### First Week Tasks

1. **Day 1:**
   - Clone repo, install dependencies
   - Set up `.env.local` with credentials
   - Run `npm run dev`, verify it works
   - Read this document thoroughly

2. **Day 2:**
   - Explore database schema in Supabase
   - Test key APIs with Postman/curl
   - Upload a photo, tag faces

3. **Day 3:**
   - Make small feature: "Add favorite button to memories"
   - Submit PR for review

4. **Day 4-5:**
   - Pick a TODO from GitHub Issues
   - Work on it with guidance from senior dev

### Code Review Standards

- **All PRs require review** before merge
- **Tests required** for new features (TODO: set up testing)
- **TypeScript strict mode** - No `any` types
- **Meaningful commit messages**
- **Update documentation** if changing APIs

---

## Roadmap

### Q2 2026

- [x] Face detection with AWS Rekognition
- [x] Smart albums (people, family)
- [ ] Event detection (date + location clustering)
- [ ] Bulk face tagging
- [ ] Mobile app (React Native)

### Q3 2026

- [ ] Digital twin (RAG-based AI)
- [ ] Voice conversations with AI twin
- [ ] Photobook printing integration
- [ ] Calendar integration (Google/Apple)

### Q4 2026

- [ ] B2B features (elder care, estate planning)
- [ ] Multi-language support
- [ ] Advanced search (natural language)
- [ ] API for third-party integrations

---

## Support & Contact

**Repository:** https://github.com/yourrepo/yourstruly-v2  
**Documentation:** https://docs.yourstruly.love  
**Production:** https://app.yourstruly.love  
**Marketing:** https://yourstruly.love

**Team Slack:** #yourstruly-dev  
**Bug Reports:** GitHub Issues  
**Feature Requests:** GitHub Discussions

---

**End of Technical Documentation**  
*Last updated: March 13, 2026*
