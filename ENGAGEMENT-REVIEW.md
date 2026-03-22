# Engagement Cards System — Review & Improvement Plan

*Generated 2026-03-22 by Zima*

---

## A. Card Type Analysis

### Current Types (11 total)

| Type | Label | XP | Renders As | UX Flow |
|------|-------|----|-----------|---------|
| `photo_backstory` | Photo Story | 15 | Bubble → ConversationModal | Multi-turn AI conversation about a photo |
| `tag_person` | Tag Person | 5 | Bubble → ConversationModal | Identify/name people in photos |
| `missing_info` | Contact Info | 5 | Bubble → ContactInfoModal | Fill in contact fields (phone, email, birthday, etc.) |
| `memory_prompt` | Memory | 20 | Bubble → ConversationModal | Open-ended memory question |
| `knowledge` | Knowledge | 15 | Bubble → ConversationModal | Capture life lessons/wisdom |
| `connect_dots` | Connect | 10 | Bubble → ConversationModal | Compare photos/contacts/memories |
| `highlight` | Highlight | 5 | Bubble (inline) | Featured/important prompts |
| `quick_question` | Contact Info | 5 | Bubble → ContactInfoModal | Same as missing_info (alias) |
| `postscript` | Future Message | 20 | Bubble → ConversationModal | Write messages to be delivered later |
| `favorites_firsts` | Favorites | 10 | Bubble → ConversationModal | "What was your first...", "What's your favorite..." |
| `recipes_wisdom` | Wisdom | 15 | Bubble → ConversationModal | Family recipes, traditions, practical wisdom |
| `photo_metadata` | 📍 | — | Bubble → PhotoMetadataModal | Add location/date to a photo |
| `photo_location` | 🗺️ | — | Bubble → PhotoMetadataModal | Tag where a photo was taken |
| `photo_date` | 📅 | — | Bubble → PhotoMetadataModal | Add when a photo was taken |

### Redundancy Issues

1. **`missing_info` ≡ `quick_question`**: Both use `ContactInfoModal`, have identical XP (5), and `quick_question` shares the same label ("Contact Info"). These should be **merged into one type**.
   - *File: `types/engagement.ts:169-170`, `EngagementBubbles.tsx:23`*

2. **`photo_metadata` / `photo_location` / `photo_date`**: Three types that all open `PhotoMetadataModal`. Should be **one type** (`photo_metadata`) with the modal smart enough to show only the relevant field(s).
   - *File: `types/engagement.ts:176-178`, `EngagementBubbles.tsx:24`*

3. **`knowledge` vs `recipes_wisdom`**: Both capture wisdom/life lessons. `recipes_wisdom` is a subcategory of `knowledge`. Consider merging with a `subcategory` field instead of separate types.

4. **`favorites_firsts` vs `memory_prompt`**: Very similar — both are open-ended memory questions. `favorites_firsts` is a narrower category of `memory_prompt`.

### Types That Could Be More Intuitive

- **`connect_dots`**: Vague label. Users won't know what "Connect" means. Better: "Compare & Reflect" or "Then & Now"
- **`highlight`**: Only 5 XP and no dedicated modal — feels low-effort. Should either be elevated (special visual treatment) or removed
- **`tag_person`**: Uses ConversationModal but the task is simple (name someone). Could use a lighter-weight UI

### Suggested New Types

- **`milestone`**: "What was happening in your life when this photo was taken?" — combines photo + life chapter
- **`gratitude`**: "Who are you thankful for today?" — lightweight daily engagement
- **`this_day`**: "On this day X years ago..." — anniversary-based prompts (infrastructure exists via `anniversary_based` field but no dedicated type)

---

## B. Code Duplication & Unification

### Modal Sprawl (7 separate modal components!)

The biggest issue. Currently:
1. **Bubble.tsx** — inline expanded view with text/voice input (657 lines)
2. **UnifiedEngagementModal.tsx** — text/voice/video with ConversationEngine (456 lines)
3. **EngagementConversationModal.tsx** — ConversationEngine wrapper (183 lines)
4. **VoiceEngagementModal.tsx** — VoiceVideoChat wrapper (179 lines)
5. **ContactInfoModal.tsx** — Form for contact fields (335 lines)
6. **PhotoTaggingModal.tsx** — Photo face tagging (88 lines)
7. **PhotoMetadataModal** — (imported from gallery/) Location/date for photos

**Problem**: `UnifiedEngagementModal` was supposed to unify everything (per its name) but `EngagementConversationModal` is what's actually used in `EngagementBubbles.tsx`. The `UnifiedEngagementModal` and `VoiceEngagementModal` appear **unused** or only used from other entry points.

**Recommendation**: Consolidate into **3 modals**:
- **ConversationModal** — for all conversation-based prompts (photo_backstory, memory_prompt, knowledge, etc.)
- **QuickInfoModal** — for contact info, photo metadata, quick selections
- **Delete** `UnifiedEngagementModal` and `VoiceEngagementModal` (or fold voice/video into ConversationModal as input mode toggles)

### Duplicated Response Handling

- `Bubble.tsx` has its own text input + voice recording logic (~200 lines, lines 62-260)
- `UnifiedEngagementModal.tsx` has nearly identical text/voice logic
- `inputs/TextInput.tsx`, `inputs/VoiceInput.tsx` exist as separate input components but aren't used consistently

**Recommendation**: Use the `inputs/` components everywhere. Remove inline voice/text logic from `Bubble.tsx`.

### Duplicated "Completed" State

- `EngagementBubbles.tsx` manages `completedTiles` state
- `EngagementConversationModal.tsx` has its own `saved` state + animation
- `VoiceEngagementModal.tsx` has its own `completed` state + animation

Each shows a "Memory Saved! +XP" animation independently. This should be a shared `<CompletionOverlay xp={n} />` component.

### CSS Issues

- `engagement.css` is 2,575 lines — very large, lots of dead styles
- Mixes component-specific styles that should be co-located
- Some styles use CSS variables (`--yt-green`) while others hardcode `#406A56`

---

## C. UX/Intuitiveness Improvements

### The Bubble Metaphor

**Currently works well for**: Showing 3-5 prompts in a visually engaging way. The masonry layout with slight rotations feels like a scrapbook.

**Pain points**:
- Clicking a bubble expands it inline (for simple types) OR opens a modal (for conversation types) — **inconsistent behavior**. User doesn't know what will happen on click.
- The inline expansion in `Bubble.tsx` is cramped for voice/text input
- No visual distinction between "quick tap" prompts and "sit down and talk" prompts

**Recommendation**: 
- Add a visual indicator on the bubble card: small icon showing expected interaction type (⌨️ type, 🎙️ talk, 📋 form)
- Already partially done with `showConversationIndicator` but not visible enough
- Consider showing estimated time: "~30 sec" vs "~3 min"

### Card Category Labels

- Labels like "Connect" and "Highlight" are meaningless to users
- `quick_question` and `missing_info` both show as "Contact Info" — confusing
- `knowledge` and `recipes_wisdom` could both be "Life Wisdom" with subcategory distinction

**Recommendation**: User-facing labels should be action-oriented:
- "Tell the story behind this photo" (not "Photo Story")
- "Who's in this photo?" (not "Tag Person")  
- "Update {name}'s info" (not "Contact Info")
- "Share a life lesson" (not "Knowledge")

### Input Flow

- **Text input**: Works well. Auto-focus is good.
- **Voice input**: Recording logic is duplicated and inconsistent. `Bubble.tsx` has inline recording, `VoiceInput.tsx` exists separately but isn't used in bubbles.
- **Selection input**: `QuickButtons.tsx` exists for multi-choice but only used in ConversationEngine, not in bubbles.

### Engagement Patterns Worth Borrowing

1. **Duolingo streaks**: YT already has `currentStreakDays` in stats — surface it more prominently. Add streak-saving prompts ("Don't lose your 5-day streak! Answer one quick question")
2. **Headspace "daily check-in"**: A single, low-friction daily prompt that's always the same format (e.g., "What's one thing you're grateful for today?")
3. **Apple Photos "Memories"**: Auto-curated collections with a story arc — could generate engagement prompts grouped by theme ("Your 2023 travels", "Photos with Mom")
4. **Instagram Stories polls**: Simple tap-based binary choices ("Was this in summer or winter?", "Were you happy or nervous?") — faster than typing

---

## D. Architecture Recommendations

### Component Structure

```
components/engagement/
├── EngagementFeed.tsx          ← renamed from EngagementBubbles (feed, not just bubbles)
├── PromptCard.tsx              ← renamed from Bubble (it's a card, not a bubble)
├── modals/
│   ├── ConversationModal.tsx   ← merge Engagement + Voice + Unified
│   ├── QuickInfoModal.tsx      ← merge ContactInfo + PhotoMetadata  
│   └── CompletionOverlay.tsx   ← shared "Memory Saved! +XP" animation
├── inputs/                     ← keep, but use consistently
│   ├── TextInput.tsx
│   ├── VoiceInput.tsx
│   ├── QuickButtons.tsx
│   ├── DatePicker.tsx
│   └── ContactPicker.tsx
└── animations.ts               ← keep
```

### State Management

Current: Each modal manages its own save state, completion state, and error state independently.

Better: A `useEngagementAction` hook that handles:
```ts
const { answer, skip, dismiss, isSubmitting, error } = useEngagementAction(promptId);
```

This replaces the 5+ separate handler functions in `EngagementBubbles.tsx` (handleAnswer, handleConversationComplete, handleMissingInfoComplete, handleMissingInfoSkip, handleMissingInfoDismiss, etc.)

### API Optimization

- `EngagementBubbles` fetches prompts, then `handleBubbleClick` for photo_metadata types makes another DB query for photo data. The prompts API should include photo data when `type=photo_metadata`.
- Answer endpoint could return the next prompt (like Duolingo does) to avoid re-fetching the full list.

---

## Priority Action Plan

### P0 — Quick Wins (1-2 hours each)

1. **Merge `quick_question` into `missing_info`** — Remove `quick_question` from PROMPT_TYPES, update DB records, simplify routing logic
2. **Merge `photo_location` + `photo_date` into `photo_metadata`** — One type, modal shows relevant fields
3. **Create shared `<CompletionOverlay />`** — Replace 3 duplicated "Memory Saved" animations
4. **Rename user-facing labels** — Make them action-oriented in TYPE_CONFIG

### P1 — Medium Effort (half day each)

5. **Consolidate modals** — Merge VoiceEngagementModal + UnifiedEngagementModal into EngagementConversationModal (add input mode toggle)
6. **Remove inline Bubble expansion** — All prompts open a modal (consistent behavior)
7. **Use `inputs/` components in all modals** — Remove duplicated voice/text logic from Bubble.tsx
8. **Clean up engagement.css** — Remove dead styles, migrate to component-scoped styles

### P2 — Larger Improvements (1-2 days)

9. **Add interaction type indicators to cards** — Show estimated time + input type on each bubble
10. **Streak integration** — Surface streak in engagement UI, add "streak saver" emergency prompt
11. **Themed prompt groups** — "Your 2023 travels" style curated collections
12. **Binary choice prompts** — Quick tap "Was this summer or winter?" style questions

### P3 — Future Consideration

13. **Daily check-in** — Single low-friction daily prompt
14. **Smart prompt ordering** — Use engagement stats to prioritize types the user responds to most
15. **Merge `favorites_firsts` and `recipes_wisdom` into `knowledge`** with subcategories

---

*This review is analysis-only. No code changes were made.*
