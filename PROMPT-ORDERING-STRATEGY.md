# YoursTruly V2 — Prompt Ordering & Engagement Strategy

> Generated: 2026-03-22 | Based on analysis of onboarding flow, engagement types, profile model, and dashboard

---

## A. Data Collection Audit

### What Onboarding Collects

| Step | Data Collected | Storage |
|------|---------------|---------|
| **Birth Info** | Name, birthday (YYYY-MM-DD), birthplace (city with geocode) | `profiles` table |
| **Globe → Places Lived** | Cities with lat/lng, optional "when" text | `location_history` + `memories` (one per place) |
| **Globe → Contacts** | Name + relationship type (Family/Friend/Professional/Other) | `contacts` table |
| **Globe → Interests** | Curated + custom interest pills (e.g. "Cooking", "Travel") | `profiles.interests[]` |
| **Globe → Why Here** | 6 predefined motivations (multi-select) + freeform text | `memories` (tagged `onboarding`, `why-here`) |
| **Globe → Photos** | Uploaded images with EXIF GPS extraction, placed on globe | `memory_media` |
| **Heartfelt Q** | AI-generated personalized question → multi-turn conversation | `memories` (via ConversationEngine) |

### What's Still Missing After Onboarding

| Profile Field | Current State Post-Onboarding | Engagement Type to Fill |
|--------------|-------------------------------|------------------------|
| **Personality traits** | Empty (only interest pills collected, not traits) | `personality` |
| **Religion/spirituality** | Step exists in code but **skipped** in `ALL_STEPS` | `religion` |
| **Skills** | Empty — no onboarding step | `skills` |
| **Languages** | Empty — no onboarding step | `languages` |
| **Occupation/company** | Empty | `missing_info` |
| **Education** | Empty (education_history[]) | `missing_info` |
| **Biography** | Empty | `memory_prompt` or `knowledge` |
| **Favorite quote** | Empty | `highlight` or `favorites_firsts` |
| **Favorite books/movies/music/foods** | All empty | `favorites_firsts` |
| **Life goals** | Empty | `knowledge` |
| **Hobbies** | Partially covered by interests | `missing_info` |
| **Gender** | Empty | `missing_info` |
| **Contact details** (phone, email, address for contacts) | Only name + relationship stored | `missing_info` / `contact_info` |
| **Photo backstories** | Photos uploaded but no context/story | `photo_backstory` |
| **Photo dates/locations** (non-GPS) | Only GPS-tagged photos have location | `photo_metadata` |
| **Memory depth** | Only place-based stubs + heartfelt conversation | `memory_prompt` |
| **Wisdom/life lessons** | None | `knowledge` |
| **Postscripts** (future messages) | None | `postscript` |
| **Personality type** (MBTI etc.) | Empty — quiz exists but not triggered | `personality` |

### Key Insight
Onboarding collects **breadth** (birthplace, places, contacts, interests, motivation). The engagement system needs to add **depth** (stories behind places, details about contacts, personality/skills/religion, photo context, wisdom).

---

## B. First-Week Prompt Ordering (Priority-Ranked)

### Design Principles
1. **Day 1–2**: Quick wins → build confidence that the platform is easy
2. **Day 3–4**: Emotional hooks → memories that create attachment
3. **Day 5–6**: Depth → wisdom, reflection, longer content
4. **Day 7**: Celebration + future → milestone + postscript teaser

### Daily Prompt Schedule

#### Day 1 — "Quick Wins" (Post-Onboarding, Same Session)
**Goal:** Immediate gratification. User just finished onboarding and sees their first dashboard.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `binary_choice` | "Which photo is your favorite?" (from uploads) | ~10s | Effortless first interaction. Builds habit of tapping cards. |
| 2 | `personality` | "How would you describe yourself?" (pill selection) | ~30s | Easy pill taps they already know from onboarding. Fills a profile gap. |
| 3 | `photo_backstory` | "Tell us about this photo" (pick their best upload) | ~2min | First real content creation. Photo provides visual anchor. |
| 4 | `tag_person` | "Who's in this photo?" (if faces detected) | ~30s | Connects photos to contacts. Quick win. |
| 5 | `daily_checkin` | "What's one thing you're grateful for today?" | ~30s | Sets the tone. Gratitude = emotional hook. |

**Total time: ~4 minutes** | **Emotional arc: Easy → Personal → Reflective**

#### Day 2 — "Your People"
**Goal:** Strengthen the emotional thread through relationships. People-focused prompts reduce churn because users feel accountable to the people they've added.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "Who made you smile yesterday?" | ~30s | Warm start, gratitude-oriented |
| 2 | `missing_info` | "What's [contact]'s birthday?" | ~30s | Quick data fill, practical value |
| 3 | `memory_prompt` | "Tell us about how you met [contact]" | ~3min | First deep memory. Person-anchored = more emotional. |
| 4 | `languages` | "What languages do you speak?" | ~30s | Quick pill selection, breaks up depth |
| 5 | `favorites_firsts` | "What was your first job?" | ~1min | Fun, nostalgic, easy to answer |

**Total time: ~5.5 minutes** | **Emotional arc: Warm → Practical → Deep → Easy → Nostalgic**

#### Day 3 — "Where You've Been"
**Goal:** Leverage the places from onboarding. Location-based memories are vivid and easy to recall.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "What's a sound from your childhood that you'd recognize anywhere?" | ~30s | Sensory prompt = instant engagement |
| 2 | `photo_metadata` | "Where was this photo taken?" (non-GPS photo) | ~30s | Fills data gap, easy |
| 3 | `memory_prompt` | "What's your favorite memory from [place they lived]?" | ~3min | Deep place-based memory |
| 4 | `skills` | "What skills have you developed over the years?" | ~30s | Pill selection, quick |
| 5 | `connect_dots` | "How did moving from [place A] to [place B] change you?" | ~2min | Reflective, connects their data |

**Total time: ~6.5 minutes** | **Emotional arc: Sensory → Quick → Deep → Quick → Reflective**

#### Day 4 — "The Heart of It"
**Goal:** First deeply emotional session. By now they trust the platform. Time for gratitude and meaning.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "Who are you thankful for today?" | ~30s | Gratitude = retention |
| 2 | `knowledge` | "What's the best advice you've ever received?" | ~3min | Wisdom capture begins |
| 3 | `religion` | "What role does faith or spirituality play in your life?" | ~30s | Sensitive but important. Day 4 = enough trust built. |
| 4 | `photo_backstory` | "What was happening in your life when this was taken?" | ~2min | Context-rich memory creation |
| 5 | `highlight` | "What's one thing you'd want your grandchildren to know about you?" | ~1min | Legacy-oriented, ties to platform mission |

**Total time: ~7 minutes** | **Emotional arc: Grateful → Wise → Personal → Nostalgic → Legacy**

#### Day 5 — "Pass It Down"
**Goal:** Introduce the legacy/wisdom pillar. This is when users start to understand the platform's deeper value.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "What made today worth remembering?" | ~30s | Anchoring daily reflection habit |
| 2 | `recipes_wisdom` | "Do you have a family recipe worth preserving?" | ~3min | Practical + emotional. Recipes are powerful memory anchors. |
| 3 | `binary_choice` | "Which photo captures your personality better?" (A vs B) | ~10s | Palette cleanser between deep prompts |
| 4 | `knowledge` | "What's a lesson you learned the hard way?" | ~3min | Deep wisdom. By day 5, users are invested. |
| 5 | `missing_info` | "What's your occupation?" or "Where did you go to school?" | ~30s | Profile completion, quick |

**Total time: ~7 minutes** | **Emotional arc: Reflective → Warm → Quick → Deep → Practical**

#### Day 6 — "Then and Now"
**Goal:** Connect past and present. Show users how much they've already captured.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "If you could relive one day from last year, which would it be?" | ~30s | Nostalgic opener |
| 2 | `connect_dots` | "Compare your life at 20 vs now. What changed most?" | ~2min | Reflective depth |
| 3 | `favorites_firsts` | "What's your favorite book/movie/song of all time?" | ~1min | Fun, fills profile favorites |
| 4 | `memory_prompt` | "What's a moment that changed the direction of your life?" | ~3min | Peak depth for the week |
| 5 | `tag_person` | "Tag people in your remaining untagged photos" | ~30s | Data enrichment, quick |

**Total time: ~7 minutes** | **Emotional arc: Nostalgic → Reflective → Fun → Profound → Quick**

#### Day 7 — "Your First Week 🎉"
**Goal:** Celebrate. Introduce postscripts. Show progress visualization.

| Order | Prompt Type | Example | Time | Why |
|-------|------------|---------|------|-----|
| 1 | `daily_checkin` | "What's the best part of your week?" | ~30s | Positive reflection |
| 2 | **🏆 MILESTONE** | "You've captured X memories in your first week!" | ~0s | Celebration moment. Trigger confetti. |
| 3 | `postscript` | "Write a letter to someone you love, to be delivered in the future" | ~5min | The platform's unique differentiator. Save for when emotional investment is highest. |
| 4 | `highlight` | "In one sentence, what does your life mean to you?" | ~1min | Powerful summary prompt |
| 5 | `binary_choice` | "Which memory from this week was your favorite?" | ~10s | Reflection on their own week |

**Total time: ~7 minutes** | **Emotional arc: Positive → Celebratory → Legacy → Meaningful → Reflective**

---

## C. Engagement Hooks for Retention

### 1. Streak System

| Streak Day | Visual | Reward |
|-----------|--------|--------|
| 1 | 🔥 (flame icon) | — |
| 3 | 🔥🔥🔥 + "3-day streak!" toast | +5 bonus XP |
| 7 | 🏆 "1 Week Streak!" badge | +20 bonus XP + badge |
| 14 | ⭐ "2 Week Streak!" | +50 bonus XP + badge |
| 30 | 💎 "Monthly Storyteller" | +100 bonus XP + badge + email recap |

**When to surface:** Show streak counter on dashboard header. Animate flame on first daily interaction. Push notification at 7pm if no activity that day: _"Don't break your 5-day streak! Here's a quick 30-second prompt."_

### 2. Milestone Celebrations

| Milestone | Trigger | Celebration |
|-----------|---------|-------------|
| First memory | 1 memory created | Confetti + "Your story has begun!" |
| 5 memories | 5 memories | Progress ring fills + "5 memories preserved" |
| First wisdom | 1 knowledge entry | "Your wisdom is being captured 🧠" |
| First postscript | 1 postscript created | Special envelope animation |
| First week | 7 days since signup | Weekly recap card + stats |
| 10 contacts | 10 contacts added | "Your circle of people" visualization |
| 25 memories | 25 memories | "Silver Storyteller" badge |
| 50 photos | 50 photos uploaded | Photo collage auto-generated |
| First month | 30 days | Monthly recap email + "Memory Keeper" badge |

### 3. Progress Visualization Ideas

1. **Profile Completeness Ring** — Circular progress showing % of profile filled (name, birthday, interests, skills, languages, religion, etc.). Visible on profile page. Target: "Complete your profile" card when <80%.

2. **Memory Map** — Already exists (FeedMap). Enhance with heat map of memory density by location. Show "blank spots" on the map as gentle prompts.

3. **Life Chapter Progress** — Visual bars showing how many memories per life chapter (Childhood, Teenage, College, Career, etc.). Highlight empty chapters.

4. **People Constellation** — Network graph showing contacts and their connected memories. Contacts without memories glow as "add a memory about X."

5. **Weekly Story Pulse** — Small sparkline on dashboard showing daily engagement over the past 7 days. Gamifies consistency.

### 4. Weekly Recap Emails/Notifications

**Email: "Your Week in Memories"** (sent Sunday 10am)
- Stats: X memories, X photos, X wisdom entries
- Highlight: Best quote or memory snippet
- Streak status
- Preview of next week's theme
- CTA: "Continue your story →"

**Push Notification Schedule:**
| Time | Trigger | Message |
|------|---------|---------|
| 9am | No activity today | "Good morning! Here's a quick question to start your day 🌅" |
| 7pm | No activity today | "Before the day ends — one quick memory? 💭" |
| 9am Sun | Weekly recap | "Your week: X memories, Y streak days 📊" |
| Random | At-risk (skipped 2+ days) | "We saved a photo prompt just for you 📸" |

### 5. Handling Users Who Skip Multiple Days

| Days Skipped | Strategy |
|-------------|----------|
| 1 day | Normal — show a gentle "Welcome back" |
| 2-3 days | Surface **only quick prompts** (binary_choice, daily_checkin, missing_info). Goal: get ANY interaction to restart momentum. |
| 4-7 days | "We missed you" card + show their streak before it broke. Lead with their most compelling photo. Push notification with personal touch. |
| 7-14 days | Email: "Your story is waiting" with a preview of their best content. Dashboard shows a single large "Start here" card instead of 5 tiles. |
| 14+ days | Re-onboarding light: show a single heartfelt question based on their profile. "A lot can happen in 2 weeks. What's been on your mind?" |
| 30+ days | Win-back email with stats: "You've captured X memories that your family will treasure." CTA to write a postscript. |

---

## D. New Card Types to Create

### Recommended New Types

| Type | UI Pattern | Prompt Example | Time | XP | Priority |
|------|-----------|---------------|------|-----|----------|
| `personality` | Pill selection (multi) | "How would you describe yourself?" (Adventurous, Caring, Analytical...) | ~30s | 10 | HIGH — fills key profile gap |
| `religion` | Single/multi selection | "What role does faith play in your life?" | ~30s | 10 | MEDIUM — sensitive, show after Day 3 |
| `skills` | Pill selection (multi) | "What skills have you developed?" (Leadership, Cooking, Public Speaking...) | ~30s | 10 | HIGH — fills profile, builds identity |
| `languages` | Selection (multi) | "What languages do you speak?" | ~30s | 5 | MEDIUM — quick win |
| `binary_choice` | Two large tappable cards | "Which photo means more to you?" / "Coffee or tea person?" | ~10s | 5 | HIGH — friction-free engagement keeper |
| `daily_checkin` | Single text input + voice | "What's one thing you're grateful for today?" (rotates through gratitude/reflection/memory themes) | ~30s | 5 | CRITICAL — daily habit anchor |
| `gratitude` *(new)* | Text/voice + optional contact tag | "Who are you thankful for today, and why?" | ~1min | 10 | HIGH — gratitude = retention |
| `this_or_that` *(new)* | Swipe left/right (Tinder-style) | "Mountains or beach? / Books or movies? / Cooking or ordering?" | ~10s | 3 | MEDIUM — fun, profile-building, shareable |
| `photo_prompt` *(new)* | Camera/upload CTA | "Take a photo of something that makes you happy right now" | ~1min | 15 | MEDIUM — fresh content generation |
| `letter_to_self` *(new)* | Long-form text | "Write a letter to your 18-year-old self" | ~5min | 25 | LOW — deep, only for engaged users (week 2+) |
| `memory_chain` *(new)* | Follow-up to previous memory | "You mentioned [memory]. Tell us more about what happened next." | ~2min | 15 | HIGH — depth without the user starting from scratch |

### Already Implemented (Confirmed in Code)
These types exist in `engagement.ts` and `constants.ts`:
- ✅ `personality` — pill selection
- ✅ `religion` — selection
- ✅ `skills` — pill selection
- ✅ `languages` — selection
- ✅ `binary_choice` — A/B tap
- ✅ `daily_checkin` — quick text/voice

### New Types to Build
- 🆕 `gratitude` — Dedicated gratitude prompt with contact linking
- 🆕 `this_or_that` — Swipeable binary choices for fun profile building
- 🆕 `photo_prompt` — "Take a photo now" prompts for fresh content
- 🆕 `letter_to_self` — Deep reflective writing (week 2+ only)
- 🆕 `memory_chain` — Follow-up prompts that reference a previous answer

---

## E. Smart Prompt Ordering Algorithm

### Core Algorithm: Weighted Priority Score

Each prompt gets a **priority score** calculated dynamically:

```
score = base_priority
      + completion_boost        (0–20)
      + profile_gap_weight      (0–30)
      + time_of_day_modifier    (-10 to +10)
      + streak_risk_modifier    (-15 to +15)
      + variety_penalty         (-20 to 0)
      + freshness_bonus         (0–10)
      + photo_relevance         (0–15)
```

### Factor Breakdown

#### 1. Completion Rate Boost (`completion_boost`)
Prioritize prompt types the user actually completes.

```
user_completion_rate = answered[type] / (answered[type] + skipped[type])

if rate > 0.8 → +20
if rate > 0.6 → +10
if rate > 0.4 → +5
if rate < 0.2 → -10 (stop showing types they always skip)
```

**Rule:** If a user has skipped a type 3+ times in a row, demote it for 7 days.

#### 2. Profile Gap Weight (`profile_gap_weight`)
Prompts that fill empty profile fields get a boost.

| Missing Field | Weight |
|--------------|--------|
| `personality_traits` (empty) | +30 |
| `skills` (empty) | +25 |
| `languages` (empty) | +20 |
| `religions` (empty) | +15 |
| `occupation` (empty) | +15 |
| `favorite_quote` (empty) | +10 |
| `favorites` (books/movies/etc empty) | +10 |
| Contact missing birthday | +10 |
| Contact missing email/phone | +5 |

**Rule:** Once a field is filled, its weight drops to 0.

#### 3. Time of Day Modifier (`time_of_day_modifier`)

| Time | Preferred Types | Modifier |
|------|----------------|----------|
| 6am–9am (Morning) | `daily_checkin`, `binary_choice`, `missing_info` | Quick types: +10, Deep types: -10 |
| 9am–12pm | `favorites_firsts`, `skills`, `personality` | Balanced: +5 for selection types |
| 12pm–5pm | `photo_backstory`, `tag_person`, `photo_metadata` | Photo types: +10 |
| 5pm–9pm (Evening) | `memory_prompt`, `knowledge`, `connect_dots` | Deep types: +10, Quick types: -5 |
| 9pm–12am (Night) | `postscript`, `letter_to_self`, `highlight` | Reflective types: +10 |
| 12am–6am | Only show `daily_checkin` if user is active | All others: -15 |

#### 4. Streak Risk Modifier (`streak_risk_modifier`)

| Streak Status | Modifier |
|--------------|----------|
| Active streak, engaged today | Normal (0) |
| Active streak, NOT engaged today, <6pm | Quick types: +10 |
| Active streak, NOT engaged today, >6pm | Quick types: +15, Deep types: -10 |
| Streak broken yesterday | Easy wins only: `binary_choice` +15, `daily_checkin` +15 |
| No streak (new/lapsed user) | `daily_checkin` +10, `photo_backstory` +10 (visual hook) |

**Goal:** When a streak is at risk, make it as easy as possible to maintain. One `binary_choice` tap should count.

#### 5. Variety Penalty (`variety_penalty`)

```
if last_prompt_type == candidate_type → -20
if last_2_prompts include candidate_type → -10
if same_type shown 3+ times today → -15
```

**Rule:** Never show the same type back-to-back. Alternate between quick (<30s) and deep (>2min) prompts.

#### 6. Freshness Bonus (`freshness_bonus`)

```
if prompt references new photo (uploaded <24h) → +10
if prompt references new contact (added <48h) → +8
if prompt references unengaged contact (no memories) → +5
if seasonal/anniversary prompt → +10 (e.g. near a contact's birthday)
```

#### 7. Photo Relevance (`photo_relevance`)

```
if photo has faces but no tags → +15 (tag_person)
if photo has no backstory → +10 (photo_backstory)
if photo missing date/location → +8 (photo_metadata)
if photo has GPS near a place_lived → +5 (connect_dots)
```

### Queue Construction Algorithm

```python
def build_prompt_queue(user, count=5):
    candidates = get_all_pending_prompts(user)
    
    for prompt in candidates:
        prompt.score = calculate_score(prompt, user)
    
    # Sort by score descending
    candidates.sort(key=lambda p: p.score, reverse=True)
    
    # Apply variety constraint
    queue = []
    last_type = None
    last_time_class = None  # 'quick' or 'deep'
    
    for prompt in candidates:
        if len(queue) >= count:
            break
        
        # Skip if same type as last
        if prompt.type == last_type:
            continue
        
        # Alternate quick/deep
        time_class = 'quick' if prompt.estimated_time <= 30 else 'deep'
        if time_class == last_time_class and len(queue) > 0:
            # Look for opposite type in remaining candidates
            alt = find_opposite_time_class(candidates, time_class, queue)
            if alt:
                queue.append(alt)
                last_type = alt.type
                last_time_class = 'quick' if alt.estimated_time <= 30 else 'deep'
                continue
        
        queue.append(prompt)
        last_type = prompt.type
        last_time_class = time_class
    
    # Always start with a quick win (swap if needed)
    if queue and queue[0].estimated_time > 60:
        quick = next((i for i, p in enumerate(queue) if p.estimated_time <= 30), None)
        if quick:
            queue[0], queue[quick] = queue[quick], queue[0]
    
    return queue
```

### Ideal Queue Shape (5 prompts)

```
Position 1: Quick win          (~10-30s)  → Momentum builder
Position 2: Medium depth       (~1-2min)  → Core engagement
Position 3: Quick palette cleanser (~10-30s)  → Prevent fatigue
Position 4: Deep engagement    (~2-3min)  → Highest value content
Position 5: Quick or fun       (~10-30s)  → End on a positive note
```

### Implementation Notes

1. **Current system** uses `shuffle_engagement_prompts` Supabase RPC. The algorithm above should be implemented as scoring logic within or wrapping that function.

2. **Stats tracking** already exists (`engagement_stats` table with `total_prompts_answered`, `total_prompts_skipped`, `current_streak_days`). Add per-type completion rates.

3. **Time of day** can be inferred from the request timestamp. Store user timezone in profile.

4. **New DB fields needed:**
   - `engagement_stats.type_completion_rates` (JSONB): `{ "binary_choice": 0.95, "memory_prompt": 0.62, ... }`
   - `engagement_stats.last_shown_types` (text[]): Last 5 types shown, for variety constraint
   - `engagement_prompts.estimated_seconds` (int): Pre-calculated time estimate per prompt

5. **A/B test opportunity:** Test "always start with daily_checkin" vs "start with highest-scored prompt" to see which drives better session completion.

---

## Summary: Key Priorities

### Immediate (This Sprint)
1. ✅ Implement `daily_checkin` as Day 1 onboarding follow-up
2. ✅ Add profile gap detection to prompt scoring
3. ✅ Enforce variety constraint (no same-type back-to-back)
4. Build `gratitude` card type (combines daily_checkin + contact tag)
5. Add time-of-day modifier to prompt API

### Next Sprint
6. Build `memory_chain` (follow-up prompts referencing previous answers)
7. Implement streak-risk easy mode
8. Weekly recap email template
9. Milestone celebration UI (confetti, badges, toasts)
10. `this_or_that` swipeable card for fun engagement

### Future
11. `photo_prompt` (camera CTA for fresh content)
12. `letter_to_self` (deep reflective, week 2+ only)
13. A/B testing framework for prompt ordering
14. ML-based personalization (learn optimal ordering per user cohort)
