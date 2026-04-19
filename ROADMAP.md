# YoursTruly V2 — Development Roadmap

> **Vision**: A life platform for documenting the past, planning the future, and staying connected across generations.

---

## 🎯 Core Features

1. **Async Video Journalist** — Capture family stories remotely
2. **AI Avatar** — Digital version of yourself for loved ones
3. **Smart Life Documentation** — Timeline, albums, memories
4. **PostScripts** — Future messages and gifts
5. **Collaboration** — Shared memories, group planning
6. **Trip Planning + AI Deals** — Bucket list adventures

---

## 📦 Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 14 | App router, React Server Components |
| Database | Supabase (Postgres) | Auth, realtime, storage built-in |
| AI | OpenAI + Whisper | Chat, transcription |
| Video | Twilio | SMS prompts, video calls |
| Maps | Mapbox | Globe visualization |
| Payments | Stripe | Subscriptions |
| Storage | Supabase Storage / S3 | Media files |

---

# 🚀 PHASES

## Phase 1: Foundation ✅ COMPLETE
**Goal**: Core app with user profiles and life data capture

### Deliverables
- [x] Next.js app with Supabase auth
- [x] User onboarding flow (login/signup)
- [x] Profile dashboard with all life fields:
  - Basic info (name, DOB, gender, location)
  - Personality traits
  - Interests & skills
  - Personal motto / credo
  - Life goals
  - Religions / beliefs
- [x] Contacts management (add/remove in modal)
- [x] Relationship types
- [x] Glassmorphic UI with scenic backgrounds
- [x] Mobile responsive design
- [x] Avatar upload to Supabase Storage
- [ ] Pet profiles (scaffolded, not fully built)

### Completed: 2026-02-19

---

## Phase 2: Memories & Timeline ✅ COMPLETE
**Goal**: Smart photo/video storage with timeline view

### Deliverables
- [x] Memory/Event creation
- [x] Photo/video upload to Supabase Storage
- [x] Date, location, people tagging (face detection + manual tagging)
- [x] Timeline view (chronological by month/year)
- [x] Mapbox globe view (3D rotating globe with markers)
- [x] Smart albums:
  - By person
  - By location
  - By year
  - By AI category
- [x] Gallery grid view
- [x] AWS Rekognition integration (labels, faces, text detection)
- [x] AI auto-categorization and mood detection

### Completed: 2026-02-19

---

## Phase 3: Async Video Journalist ✅ COMPLETE
**Goal**: Send questions, capture video responses remotely

### Deliverables
- [x] Question bank (suggested + custom)
- [x] Interview session creation
- [x] Public interview recording page (no auth)
- [x] Video recording with MediaRecorder API
- [x] Video storage in Supabase
- [x] Send question to contact (SMS via Telnyx + email fallback, with retry)
- [x] Transcription (async, via Deepgram through `lib/ai/transcription`)
- [x] Topic + people + time + location extraction from transcript (folded into `memories.metadata`)
- [x] Interview history per contact (`/dashboard/journalist/[id]`, `/inbox`, `/group/[groupId]`)
- [x] Suggested follow-up questions (AI) — `lib/engagement/follow-up-engine` + `lib/interviews/branching` + `lib/interviews/sentiment`

### Testable
✅ Create interview → Copy link → Open link → Record response → See in app

---

## Phase 4: AI Avatar 🚧 IN PROGRESS
**Goal**: Chat with a digital version of yourself/loved one

### Architecture
Mode-switch on the existing AI Concierge surface (single floating button,
toggle between Concierge and Avatar). Shared RAG runtime (`lib/ai/rag-runtime`)
backs both modes; mode determines which system prompt is composed.

### Deliverables
- [x] **4.1 Foundation** — `avatar_personas` table; `chat_sessions.mode` column;
      RAG runtime extracted from `/api/chat`; mode toggle in `AIConcierge`;
      Avatar mode wired end-to-end through `/api/chat`
- [x] **4.2 Persona Card synthesis** — `lib/avatar/synthesize-persona`
      auto-derives voice/themes/phrases/facts/tone from profile + memories,
      no extended questionnaire needed; on-demand at first Avatar use
- [x] **4.3 Conversation memory** — reuses existing `chat_messages` history
      window (last 10 turns) per-mode
- [ ] **4.4 "What your avatar knows" panel** — visible knowledge + manual
      fact-add + source citations on responses
- [x] **4.5 Loved-one avatars** — per-contact personas built from interview
      responses; subject picker in the Concierge modal; ownership-checked
      throughout (`/api/avatar/personas`, `?contactId=` on /persona, contact
      verification before any synth/chat work)
- [ ] **4.6 Voice synthesis (optional)** — ElevenLabs voice clone from
      interview audio

### Testable
✅ Open Concierge → toggle to "Avatar (you)" → Avatar replies in first
person, drawing on your memories

---

## Phase 5: PostScripts + Gifts (Week 10-11)
**Goal**: Schedule messages AND gifts for the future

### Deliverables
- [ ] Create future message (text, video, audio)
- [ ] Set delivery date/trigger:
  - Specific date
  - Birthday
  - Anniversary
  - Custom milestone
- [ ] Multiple recipients
- [ ] Attach memories/photos
- [ ] **Gift marketplace**:
  - Browse curated gifts
  - Physical gifts (flowers, merchandise)
  - Digital gifts (gift cards, subscriptions)
  - Custom gift requests
- [ ] Gift scheduling with message
- [ ] Delivery via email/SMS
- [ ] Recipient view (beautiful reveal + gift claim)
- [ ] Order tracking

### Testable
✅ Schedule message + gift for tomorrow → Receive it → Claim gift

---

## Phase 6: Collaboration (Week 12-13)
**Goal**: Shared memories and group efforts

### Deliverables
- [ ] Shared memory albums
- [ ] Invite collaborators
- [ ] Contribution requests:
  - "Add your photos from Mom's 70th"
  - Link to upload directly
- [ ] Activity feed (who added what)
- [ ] Group celebration planning:
  - Surprise milestone events
  - Everyone contributes secretly
  - Reveal to honoree
- [ ] Comments on memories

### Testable
✅ Create shared album → Send invite → Collaborator uploads → See in your app

---

## Phase 7: Smart AI Features (Week 14-15)
**Goal**: AI-powered organization and insights

### Deliverables
- [ ] Face detection (auto-tag people)
- [ ] Auto-location from EXIF
- [ ] AI topic categorization:
  - Travel, Family, Career, Milestones, Pets, Holidays
- [ ] "On This Day" memories
- [ ] AI-generated memory summaries
- [ ] Life story auto-generation

### Testable
✅ Upload photos → AI tags faces/topics → Browse by smart category

---

## Phase 8: Bucket List & Trip Planning (Week 16-18)
**Goal**: Plan adventures together with AI assistance + crowdfunding

### Deliverables
- [ ] Personal bucket list
- [ ] Shared bucket lists
- [ ] Trip workspace:
  - Destination picker
  - Date range
  - Invite travelers
- [ ] AI deal finder:
  - Flight search (Skyscanner API)
  - Hotel search
  - Price alerts
- [ ] Collaborative itinerary
- [ ] **Trip crowdfunding**:
  - Set trip goal amount
  - Invite contributors (family, friends)
  - Everyone sends money toward goal
  - Progress tracker
  - Thank you messages to contributors
  - Stripe Connect for payouts
- [ ] Budget tracking / splitting
- [ ] Convert trip → memories after

### Testable
✅ Create "Family Japan Trip" → Set $5000 goal → Share link → Friends contribute → Hit goal

---

## Phase 9: Polish & Launch (Week 19-22)
**Goal**: Production ready

### Deliverables
- [ ] Mobile responsive (PWA)
- [ ] Email notifications
- [ ] Subscription tiers (Stripe)
- [ ] Onboarding tutorial
- [ ] Data export
- [ ] Privacy controls
- [ ] Performance optimization
- [ ] Security audit

---

# 📊 Summary

| Phase | Name | Duration | Key Testable |
|-------|------|----------|--------------|
| 1 | Foundation | 2 weeks | Profile + Contacts |
| 2 | Memories | 2 weeks | Timeline + Globe |
| 3 | Video Journalist | 3 weeks | Send question → Get video |
| 4 | AI Avatar | 2 weeks | Chat with yourself |
| 5 | PostScripts + Gifts | 2 weeks | Future message + gift delivery |
| 6 | Collaboration | 2 weeks | Shared albums |
| 7 | Smart AI | 2 weeks | Auto-tagging |
| 8 | Trip Planning + Crowdfunding | 3 weeks | AI deals + group funding |
| 9 | Polish | 4 weeks | Launch ready |

**Total: ~22 weeks (5.5 months) to full platform**

---

# 🏃 Quick Start (Phase 1)

```bash
# Clone and setup
git clone https://github.com/ibechuckp/yourstruly-v2
cd yourstruly-v2
npm install

# Configure
cp .env.example .env.local
# Add your Supabase keys

# Run
npm run dev
```

---

*Last updated: 2026-02-19*
