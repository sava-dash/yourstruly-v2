# YoursTruly V2 - Component Reference

Visual specifications for all UI components with states.

---

## 🔘 BUTTONS

### Primary Button (Default)
```
┌──────────────────────────────────────┐
│           Save Changes               │  
└──────────────────────────────────────┘
Background: #406A56
Text: white, 14px, semibold
Height: 40px
Padding: 10px 16px
Border-radius: 12px
```

**States:**
- **Hover:** bg #4a7a64
- **Active:** scale(0.97)
- **Disabled:** opacity 50%
- **Focus:** ring-2 rgba(64,106,86,0.5)

### Outline Button
```
┌──────────────────────────────────────┐
│           Cancel                     │  
└──────────────────────────────────────┘
Background: transparent
Border: 1px solid rgba(64,106,86,0.2)
Text: #406A56
```

### Ghost Button
```
│   Skip   │
Background: transparent
Text: #406A56
Hover: bg rgba(64,106,86,0.1)
```

### Size Variants
- **sm:** h-32px, px-12px, text-12px
- **default:** h-40px, px-16px, text-14px
- **lg:** h-48px, px-24px, text-16px
- **icon:** 40x40px square

---

## 📝 INPUTS

### Text Input
```
┌───────────────────────────────────────┐
│ Enter your name...                    │
└───────────────────────────────────────┘
Background: white
Border: 1px solid #e5e5e5
Border-radius: 12px
Padding: 10px 16px
Text: #2d2d2d
Placeholder: #9ca3af
```

**States:**
- **Focus:** border #406A56, ring-2 rgba(64,106,86,0.3)
- **Disabled:** opacity 50%, cursor not-allowed
- **Error:** border red-500

### Textarea
Same styling, multiple rows, resize-none

---

## 🏷️ BADGES & PILLS

### Category Badge
```
┌─────────────┐
│  PHOTO      │  
└─────────────┘
Font: 11px, uppercase, 600 weight, 0.05em spacing
Padding: 4px 10px
Border-radius: 12px
```

**Color Variants:**
| Type | Background | Text |
|------|------------|------|
| Yellow/Photo | rgba(217,198,26,0.15) | #8a7c08 |
| Green/Contact | rgba(64,106,86,0.12) | #406A56 |
| Blue/Info | rgba(141,172,171,0.2) | #5d7a79 |
| Purple/Memory | rgba(74,53,82,0.15) | #4A3552 |
| Red/Knowledge | rgba(195,95,51,0.12) | #C35F33 |

### XP Badge
```
┌──────────────────┐
│  ⭐ +15 XP       │
└──────────────────┘
Background: linear-gradient(135deg, rgba(217,198,26,0.15), rgba(217,198,26,0.25))
Border: 1px solid rgba(217,198,26,0.3)
Border-radius: 20px
Padding: 6px 14px
Text: #8a7c08, 16px bold
```

---

## 👤 AVATARS

### Default Avatar (with initials)
```
  ╭───────╮
  │   J   │
  ╰───────╯
Shape: Circle
Background: gradient from-amber-500 to-orange-600
Text: white, centered
```

### Sizes
- **xs:** 24px
- **sm:** 32px
- **md:** 40px (default)
- **lg:** 48px
- **xl:** 64px

### Avatar Stack (overlapping)
```
  ╭───╮╭───╮╭───╮
  │ J ││ M ││ A │
  ╰───╯╰───╯╰───╯
    ←─8px overlap─→
Border: 2px solid white
```

---

## 📦 CARDS

### Default Card
```
╭────────────────────────────────╮
│                                │
│    Card Content                │
│                                │
╰────────────────────────────────╯
Background: white
Border: 1px solid #e5e5e5
Border-radius: 16px
Shadow: card-shadow-sm
Padding: 20-24px
```

### Glass Card
```
╭────────────────────────────────╮
│        ░░░ (blur) ░░░          │
│    Glass Card Content          │
│        ░░░ (blur) ░░░          │
╰────────────────────────────────╯
Background: rgba(255,255,255,0.8)
Backdrop-blur: 20px
Border: 1px solid rgba(255,255,255,0.5)
Border-radius: 20px
Shadow: glass shadow
```

**Hover State:**
- bg rgba(255,255,255,0.85)
- transform translateY(-2px)
- shadow increased

### Warm Card
```
Background: #F2F1E5
Border: 1px solid rgba(64,106,86,0.1)
```

---

## 🧩 BUBBLE TILE (Engagement Card)

```
╭──────────────────────────────────────────────╮
│  ┌─────────────┐              ┌─────────┐   │
│  │  PHOTO      │              │ +15 XP  │   │
│  └─────────────┘              └─────────┘   │
│                                              │
│  ┌──────────────────────────────┐           │
│  │ [Photo Image]                │           │
│  └──────────────────────────────┘           │
│                                              │
│  "Tell us about this memory..."             │
│                                              │
│  ┌─────┐  ┌─────────────────────┐           │
│  │ 👤  │  │ John Smith          │           │
│  │     │  │ Family • Tagged     │           │
│  └─────┘  └─────────────────────┘           │
│                                              │
│                          Tap to answer →    │
╰──────────────────────────────────────────────╯

Width: 244px (fixed)
Background: glass style
Border-radius: 20px
Padding: 16px
```

---

## 🪟 MODALS

### Standard Modal
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Modal Title                           ✕   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                             ┃
┃  Modal content goes here with              ┃
┃  appropriate padding and spacing.          ┃
┃                                             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                              [Done]         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Max-width: varies (default md = 448px)
Background: rgba(255,255,255,0.9)
Backdrop-blur: 24px
Border-radius: 20px
Shadow: modal shadow

Overlay: bg-black/50 backdrop-blur-sm
Animation: zoom-in-95, fade-in
```

### Header
- Padding: 20px
- Border-bottom: 1px solid rgba(64,106,86,0.1)
- Title: 18px, semibold, #2d2d2d
- Close button: 20px icon, hover bg #406A56/10

### Footer
- Padding: 16px 20px
- Border-top: 1px solid rgba(64,106,86,0.1)
- Button aligned right

---

## 🧭 NAVIGATION

### Sidebar (Dark)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ YoursTruly              ┃
┃ Document your legacy    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ╭───╮                  ┃
┃  │ J │  John Smith      ┃
┃  ╰───╯  john@email.com  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  🏠  Home         ←active┃
┃  👤  My Profile         ┃
┃  👥  Contacts           ┃
┃  📷  Memories           ┃
┃  💬  Wisdom             ┃
┃  📤  PostScripts        ┃
┃  ...                    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ⚙️  Settings           ┃
┃  🚪  Sign Out           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛

Width: 224px
Background: rgb(9,10,11) 95% opacity + blur
Position: fixed left
```

**Nav Item States:**
- **Default:** text white/60
- **Hover:** bg white/5, text white/90
- **Active:** gradient bg (amber), text amber-400

### Top Nav (Glass)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [Logo]     Home   Memories   Contacts   Gallery        [Avatar] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Height: 56px
Background: rgba(255,255,255,0.8)
Backdrop-blur: 20px
Border-bottom: 1px solid rgba(255,255,255,0.5)
Position: fixed top
```

### Slide-Up Link Animation
```
Default:         Hover:
┌─────────┐      ┌─────────┐
│ Home    │  →   │ Home    │ (slides up, turns #C35F33)
└─────────┘      └────━━━━━┘ (underline slides in from left)
```

---

## 💬 CONVERSATION UI

### AI Prompt Bubble
```
╭───────────────────────────────────────────────╮
│  ╭───╮                                        │
│  │YT │  YoursTruly AI                         │
│  ╰───╯                                        │
│                                               │
│  "What's a favorite memory you have           │
│   from your childhood?"                       │
│                                               │
╰───────────────────────────────────────────────╯
Background: glass-warm (cream tint)
Avatar: 24px, green bg, "YT"
```

### User Response Bubble
```
╭───────────────────────────────────────────────╮
│                                               │
│  "I remember the summers at grandma's         │
│   house, playing in the garden..."            │
│                                               │
╰───────────────────────────────────────────────╯
Background: glass-light
Alignment: right (ml-12)
```

### Voice Recorder
```
        ╭─────────────────╮
        │       🎙️        │
        │                 │
        │   [  ● REC  ]   │
        │                 │
        │   0:00 / 2:00   │
        ╰─────────────────╯

Recording button: 80x80px circle
Active (recording): bg #C35F33
Inactive: bg #406A56
```

---

## 📸 MEMORY CARD

```
╭────────────────────────────────╮
│  ┌───────┐             ❤️     │
│  │ TRAVEL│         [🟡 mood]  │
│  └───────┘                     │
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │      [Photo Image]         │ │
│ │                            │ │
│ └────────────────────────────┘ │
│  Summer in Paris              │
│  📍 Paris • Aug 15, 2025      │
╰────────────────────────────────╯

Aspect: square (1:1)
Image: cover, rounded-lg
Gradient overlay: from-black/80 to transparent
Hover: scale 1.05, reveal AI summary
```

---

## 📊 PROGRESS TRACKER

```
┌─────────────────────────────────────────────────────────────────────┐
│  Progress │ ╭─╮ ╭─╮ ╭─╮ ╭─╮ ╭─╮ │ ⭐ 75 XP                        │
│           │ │▣││▣││▣││▣││▣│ │                                    │
│           │ ╰─╯ ╰─╯ ╰─╯ ╰─╯ ╰─╯ │                                    │
└─────────────────────────────────────────────────────────────────────┘

Background: glass
Border-radius: 20px
Min-height: 56px
Tiles: 40x40px, rounded-lg, 2px white border
```

---

## 🎯 INTERACTION STATES SUMMARY

| Component | Hover | Active | Focus | Disabled |
|-----------|-------|--------|-------|----------|
| Button | Lighter bg | scale(0.97) | ring-2 | opacity 50% |
| Card | translateY(-2px), shadow↑ | - | ring-2 | opacity 50% |
| Input | - | - | border + ring | opacity 50% |
| Link | color change, underline | - | outline | opacity 50% |
| Avatar | scale(1.05) | - | ring-2 | - |

---

## 📐 LAYOUT GRID

### Dashboard Layout
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [TopNav - 56px fixed]                                        ┃
┣━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃           ┃                                                   ┃
┃           ┃                                                   ┃
┃  Sidebar  ┃              Main Content Area                   ┃
┃   224px   ┃              (flexible width)                    ┃
┃   fixed   ┃                                                   ┃
┃           ┃                                                   ┃
┃           ┃                                                   ┃
┣━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  [Command Bar - fixed bottom center]                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Content Grids
- **Cards:** 2-4 columns responsive
- **Gap:** 16-24px
- **Max content width:** ~1200px

---

## 🎬 ANIMATION SPECS

### Modal Enter
```
duration: 200ms
easing: cubic-bezier(0.16, 1, 0.3, 1)
opacity: 0 → 1
scale: 0.95 → 1
```

### Modal Exit
```
duration: 150ms
easing: ease-in
opacity: 1 → 0
scale: 1 → 0.95
```

### Card Hover
```
duration: 300ms
easing: cubic-bezier(0.16, 1, 0.3, 1)
transform: translateY(-2px)
shadow: increase intensity
```

### Staggered Children
```
delay-increment: 50ms
duration: 400ms per child
animation: slide-up + fade-in
```
