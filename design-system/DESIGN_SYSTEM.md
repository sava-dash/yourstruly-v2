# YoursTruly — Design System

**Version:** 3.0 (reverse-engineered from codebase)
**Last updated:** 2026-04-17
**Source of truth:** This file is the canonical spec. Everything below is extracted from what the app actually renders today. When the design team edits a token value in this file, engineering will propagate it to the code locations listed in **§2 How edits flow back to code**.

---

## 1. Brand overview

YoursTruly is a memoir / storytelling app. The visual language is **warm analog**: cream paper, terracotta shadow tints, DM Serif Display headlines, torn-paper edges, washi tape, polaroids, handwritten captions. Think "shoebox of letters and photos" — not "SaaS dashboard."

Three core sensations the UI should evoke:
1. **Heirloom** — elegant serif display, subtle hand-drawn edges, muted saturation
2. **Paper** — cream background, soft noise textures, terra-tinted shadows (not neutral gray)
3. **Handmade intimacy** — scattered polaroids, tilted cards, washi tape accents

Dark mode is **not** supported. The product is light-only and currently has no seasonal themes.

---

## 2. How edits flow back to code

| When you edit a token in this file… | Engineering updates… |
|---|---|
| Any color under **§3 Palette** | `src/styles/themes.css` `:root` block **and** the `--yt-*` variables in `src/app/globals.css` |
| Any font family | `src/app/layout.tsx` (`next/font/google` imports) |
| Typography utility (`.title-elegant`, `.memory-title-*`, etc.) | `src/app/globals.css` or `src/styles/ui-enhancements.css` |
| Spacing / radius scale | `src/styles/responsive.css` + `src/styles/themes.css` |
| Shadow values | `src/app/globals.css` (canonical) + `src/styles/home.css` / `page-styles.css` |
| Glass variants | `src/app/globals.css` (`.glass*` classes) + `src/components/ui/GlassCard.tsx` |
| Any component variant (Button, Card, Modal, etc.) | `src/components/ui/` |
| Motion durations / easings | `src/app/globals.css` (canonical keyframes) |
| Torn-paper SVGs | `public/images/torn-*.svg`, `TornEdge.tsx` variants |

**Rule of thumb:** change a value here → engineer finds its CSS variable → one edit propagates everywhere.

---

## 3. Palette

### 3.1 Brand core

| Token | Hex | CSS variable | Primary use |
|---|---|---|---|
| Evergreen (primary) | `#2D5A3D` | `--yt-green`, `--color-primary` | Buttons, links, focus ring, active nav, brand identity |
| Evergreen hover | `#234A31` | `--color-primary-hover` | Button hover |
| Evergreen tint | `#E6F0EA` | `--color-primary-light` | Subtle highlight, selected bg |
| Evergreen dark | `#2d4f3e` | `--yt-green-dark` | Gradient ends |
| Evergreen pale | `#D3E1DF` | `--yt-green-light` | Avatar bg, sidebar pill |
| Terracotta (secondary) | `#B8562E` | `--yt-red`, `--color-secondary` | Accents, shadow tint, active underline |
| Terracotta tint | `#FBF0EB` | `--color-secondary-light` | Avatar gradient start |
| Heirloom gold (accent) | `#C4A235` | `--yt-yellow`, `--color-accent` | Gold CTA, highlights, tape |
| Gold tint | `#FAF5E4` | `--color-accent-light` | Banner bg |
| Gold dark | `#8a7c08` | `--yt-yellow-dark` | XP badge text |
| Sage blue | `#7A9B88` | `--yt-blue` | Tertiary accent |
| Plum (optional) | `#4A3552` | `--yt-purple` | Interview/wisdom tiles only |

### 3.2 Surfaces

| Token | Hex | Use |
|---|---|---|
| Cream (page bg) | `#FAFAF7` | `--background`, `body`, page canvas |
| White surface | `#FFFFFF` | Cards, modals, inputs |
| Warm surface | `#F5F3EE` | Scrapbook cards, warm glass variant |
| Warm gradient end | `#F2EDE7` | Radial / warm-gradient bg stops |
| Paper aged | `#f5f0e6` | Paper texture variant |
| Washi base | `#F2F1E5` | Tape base, product bg |

### 3.3 Text

| Token | Hex | Use |
|---|---|---|
| Text primary | `#1A1F1C` | Body text, main headings |
| Text secondary | `#5A6660` | Secondary copy |
| Text muted | `#94A09A` | Captions, disabled |
| Text placeholder | `#aaaaaa` | Input placeholders |

### 3.4 Borders & dividers

| Token | Hex | Use |
|---|---|---|
| Border default | `#DDE3DF` | Cards, scrollbar thumb |
| Border light | `#E6F0EA` | Subtle dividers |
| Border dark | `#B8C4BD` | Step connectors |

### 3.5 Semantic

| Token | Hex | Use |
|---|---|---|
| Success | `#2D7A4F` | Confirmation, saved states |
| Error | `#C23B2E` | Destructive, validation |
| Warning | `#CC8B18` | Caution |
| Info | `#7A9B88` | Neutral info (uses sage blue) |
| Notification dot | `#F31260` | Unread bell badge |

### 3.6 Feed tile palette (dashboard engagement bubbles)

A **secondary, louder palette** used ONLY for engagement feed cards (`bubble-tile` by `data-type`). Designers can retire this in favor of brand tints if they want — it's the loudest inconsistency in the product.

| Type | Gradient start → end |
|---|---|
| Memory / postscript | `#A855F7` → `#C084FC` (purple) |
| Knowledge / favorites | `#3448FF` → `#5C7CFF` (blue) |
| Photo / highlight / wisdom | `#FFB020` → `#FFC857` (amber) |
| Tag person / connect-dots | `#34D7FF` → `#6BE7FF` (cyan) |
| Missing info / quick Q | `#00B87C` → `#34D399` (green) |

XP badge text colors (on white) per type: amber `#CC8800`, green `#00875A`, blue `#0065FF`, red `#C73622`, purple `#8B5CF6`.

---

## 4. Typography

### 4.1 Loaded fonts

Loaded via `next/font/google` in `src/app/layout.tsx`:

| Role | Family | Weights | CSS variable |
|---|---|---|---|
| Body / UI | **DM Sans** | 400, 500, 600, 700, 800 | `--font-dm-sans` |
| Display / serif | **DM Serif Display** | 400 | `--font-dm-serif` |
| Mono (fallback) | Geist | 400-900 | `--font-geist-sans` |

**"Handwritten" = DM Serif Display italic.** There is no separate handwritten font loaded (Caveat, Patrick Hand, etc. are referenced in CSS but not actually loaded — they fall back to DM Serif italic in production).

**Decision point for design team:** either accept DM Serif italic as "handwritten" OR commission loading Caveat/Patrick Hand. If you add a font, engineering adds one `next/font` import + one CSS variable.

### 4.2 Size scale

| Token | Mobile | Tablet ≥640 | Desktop ≥1024 | Senior-mode |
|---|---|---|---|---|
| `--text-xs` | 12 | 12 | 12 | 14 |
| `--text-sm` | 14 | 14 | 14 | 16 |
| `--text-base` | 16 | 16 | 16 | 18 |
| `--text-lg` | 18 | 18 | 18 | 20 |
| `--text-xl` | 20 | 20 | 22 | 24 |
| `--text-2xl` | 24 | 24 | 28 | 30 |
| `--text-3xl` | 30 | 30 | 36 | 36 |

All values in px. Senior-mode is a user-toggled accessibility mode that scales up.

### 4.3 Weights

`400` regular · `500` medium · `600` semibold · `700` bold · `800` extrabold

### 4.4 Letter-spacing

| Token | Value | Use |
|---|---|---|
| Tight | `-0.02em` | Display / headline |
| Normal | `0` | Body |
| Wide | `0.05em` | Small labels |
| Wider | `0.1em` | All-caps refined labels |

### 4.5 Semantic typography utilities

| Class | Font | Size | Weight | Letter-spacing | Role |
|---|---|---|---|---|---|
| `.title-elegant` | DM Serif | — | 400 | -0.02em | Hero / display |
| `.memory-title-lg` | DM Serif | 40px (2.5rem) | 600 | -0.02em | Page hero |
| `.memory-title-md` | DM Serif | 28px (1.75rem) | 600 | -0.01em | Section title |
| `.memory-title-sm` | DM Serif | 20px (1.25rem) | 500 | -0.01em | Card title |
| `.memory-title-xs` | DM Serif | 16px (1rem) | 500 | 0 | Small heading |
| `.memory-title-italic` | DM Serif italic | — | 500 | — | Handwritten heading |
| `.heartfelt-question` | DM Serif | 28px | 500 | — | Prompt question |
| `.signature-handwritten` | DM Serif italic | 24px | 500 | — | Signatures (evergreen) |
| `.label-refined` | inherit | 0.7rem | 600 | 0.1em | All-caps terra label |
| `.bubble-type` | DM Sans | 11px | 700 | 0.08em | Uppercase card type |
| `.bubble-type-handwritten` | DM Serif | 16px | 600 | 0.01em | Handwritten card type |
| `.category-pill` | DM Sans | 10px | 600 | 0.5px | Uppercase category pill |

### 4.6 Line heights

Tight `1.2` · Normal `1.4` · Relaxed `1.5` (defined in themes.css tokens).

---

## 5. Spacing

| Token | px | Role |
|---|---|---|
| `--space-xs` | 4 | Icon gaps, tight chips |
| `--space-sm` | 8 | Default small gap |
| `--space-md` | 16 | Card padding, section gaps |
| `--space-lg` | 24 | Page gutters, large cards |
| `--space-xl` | 32 | Section break |
| `--space-2xl` | 48 | Hero padding, major breaks |

Tailwind utilities (`p-2`, `gap-4`, etc.) map to the same 4-px scale.

### 5.1 Touch targets

| Token | Value | Senior-mode |
|---|---|---|
| `--touch-target-min` | 44px | 56px |
| `--touch-target-senior` | 56px | 64px |

All primary interactive elements must be at least 44×44.

### 5.2 Layout constants

| Token | Value | Role |
|---|---|---|
| `--sidebar-width` | 280px | Dashboard sidebars |
| `--sidebar-gap` | 48px | Dashboard flex gap |
| `--content-max-width` | 1000px | Dashboard center column |
| `--tile-width` | 243px | Feed tile width |
| `--tile-height-short` | 194px | Short tile |
| `--tile-height-tall` | 223px | Tall tile (3n+1, 5n+2) |
| `--tile-gap` | 20px | Grid gap |
| `--nav-height` | 56px | TopNav |
| `--page-padding` | 24px | Page gutter |
| Bottom nav height (mobile) | 64px | `.bottom-nav` |

---

## 6. Radius

| Token | Value |
|---|---|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--radius-xl` | 20px — **canonicalize to 20px** (was 24 in one file) |
| `--radius-full` | 9999px (pill / circle) |
| `.rounded-refined` | 14px (0.875rem) |
| `.rounded-refined-lg` | 20px (1.25rem) |

Glass surfaces default to **20px** radius. Pills & avatars use `full`. Inputs default to **12px**. Buttons use **12px** or **full** depending on variant.

---

## 7. Shadows & elevation

Shadows use **terracotta-tinted rgba** (not neutral gray) to match the warm palette.

### 7.1 Card shadows (canonical — `rgba(184, 86, 46, …)`)

```css
--shadow-card-sm: 0 1px 3px rgba(184,86,46,.04), 0 4px 12px rgba(184,86,46,.06);
--shadow-card-md: 0 2px 4px rgba(184,86,46,.04), 0 8px 24px rgba(184,86,46,.08);
--shadow-card-lg: 0 4px 6px rgba(184,86,46,.03), 0 12px 40px rgba(184,86,46,.12);
--shadow-card-hover: 0 4px 8px rgba(184,86,46,.06), 0 16px 48px rgba(184,86,46,.14);
--shadow-hover-lift: 0 8px 24px rgba(184,86,46,.10), 0 16px 48px rgba(184,86,46,.08);
```

### 7.2 Glass shadows

```css
--shadow-glass: 0 4px 16px rgba(184,86,46,.06), 0 12px 32px rgba(0,0,0,.06);
--shadow-glass-hover: 0 6px 20px rgba(184,86,46,.08), 0 16px 40px rgba(0,0,0,.08);
--shadow-modal: 0 4px 16px rgba(184,86,46,.06), 0 20px 60px rgba(0,0,0,.10);
```

### 7.3 Elevation ladder

| Level | Use |
|---|---|
| 0 (flat) | page bg, inline text |
| 1 (`--shadow-card-sm`) | default card at rest |
| 2 (`--shadow-card-md`) | card hover, dropdown |
| 3 (`--shadow-card-lg`) | dropped card, list cover |
| 4 (`--shadow-modal`) | modal / dialog |

---

## 8. Glass / frosted surfaces

All glass uses **white-based translucency + 20 px blur + white hairline border**. It's the signature surface of the app.

| Variant | Background | Blur | Border | Radius | Role |
|---|---|---|---|---|---|
| `.glass` | `rgba(255,255,255,.80)` | 20 | `rgba(255,255,255,.50)` | 20 | Default card |
| `.glass-subtle` | `rgba(255,255,255,.70)` | 16 | `rgba(255,255,255,.40)` | 20 | Secondary card, no shadow |
| `.glass-warm` | `rgba(255,255,255,.80)` | 20 | `rgba(255,255,255,.50)` | 20 | Warm-gradient page variant |
| `.glass-modal` | `rgba(255,255,255,.90)` | 24 | `rgba(255,255,255,.50)` | 20 | Dialog |
| `.glass-nav` | `rgba(255,255,255,.80)` | 20 | bottom `rgba(255,255,255,.50)` | — | Top nav |
| `.glass-dark` | `rgba(42,31,26,.75)` | 20 | `rgba(255,255,255,.10)` | — | Rare — contrast areas only |

GlassCard React variants:
- `light` → `bg-white/60 backdrop-blur-xl border-white/40`
- `warm` → `bg-[#F5F3EE]/70 backdrop-blur-xl border-[#C4A235]/20`
- `dark` → `bg-[#2D5A3D]/80 backdrop-blur-xl border-[#2D5A3D]/40 text-white`

All glass transitions use the signature easing: `0.3s cubic-bezier(0.16, 1, 0.3, 1)`.

---

## 9. Motion

### 9.1 Easings

| Token | Value | Use |
|---|---|---|
| **Signature spring** | `cubic-bezier(0.16, 1, 0.3, 1)` | Glass hover, card lift, page entry, modal |
| Material ease-out | `cubic-bezier(0.25, 0.8, 0.25, 1)` | Bubble tiles, bloom |
| Standard ease | `cubic-bezier(0.4, 0, 0.2, 1)` | Fine transitions, polaroid |
| Fast linear | `linear` | Progress bars |

### 9.2 Durations

| Token | Value | Use |
|---|---|---|
| Instant | 100 ms | Button press |
| Fast | 150 ms | Tooltip, micro-feedback |
| Quick | 200 ms | Dropdown, backdrop |
| Normal | 250 ms | Default, hover-lift |
| Slow | 300 ms | Glass hover, page entry, drawer |
| Emphasis | 400 ms | Stagger, bloom, shake |
| Feature | 600 ms | Envelope, bubble-bloom |
| Ambient | 2-20 s | Blob float, shimmer, celebration |

### 9.3 Core keyframes (designer-named)

`fade-in/out`, `zoom-in-95/out-95`, `slide-up/down`, `slide-in-right/out-right`, `slide-in-bottom/out-bottom`, `scale-bounce`, `shake`, `dropdown-open`, `tooltip-appear`, `float` (blobs), `bubble-bloom`, `shimmer`, `confetti-fall/pop`, `pulse-dot`, `wax-seal-pulse`, `envelope-flap-open`, `typewriter-cursor`, `heartbeat`.

### 9.4 Stagger

Children of `.stagger-children` animate in 50 ms apart, slide-up + fade, 400 ms spring. Use for feed tiles, list reveals, onboarding.

### 9.5 Reduced motion

`@media (prefers-reduced-motion: reduce)` disables all animations to 0.01 ms. **Designers must ensure no component relies on animation to communicate state.**

---

## 10. Breakpoints & layout

| Name | Range | Tailwind |
|---|---|---|
| Mobile | 0 – 639 | default |
| Tablet | 640 – 1023 | `sm:` / `md:` |
| Desktop | 1024 – 1279 | `lg:` |
| Large | 1280 – 1535 | `xl:` |
| XL | 1536+ | `2xl:` |

### 10.1 Max-widths by context

| Container | Max width |
|---|---|
| App shell (TopNav) | 1800 |
| Dashboard center column | 1000 |
| Marketing / long-form page | 1024 (`max-w-4xl`) |
| Forms / modals / conversation | 640 (`max-w-2xl`) |
| Default modal | 448 (`max-w-md`) |

### 10.2 Grid defaults

- **Feed tiles:** `grid-template-columns: repeat(auto-fit, 243px); gap: 20px;`
- **Card grids:** 1 → 2 (≥640) → 3 (≥1024) columns
- **Scrapbook:** 2 → 3 → 4 → 5 columns, with cascading `margin-top` offsets on 4n+1..4 children for "scattered on a table" layout
- **Photo grid:** 2 → 3 → 4 → 5 columns

### 10.3 Page padding

- Mobile: 16 top / 16 sides
- Tablet: 20
- Desktop: 24+
- Top padding `80px` (56 nav + 24 gutter)
- Bottom padding `100px` (clears mobile bottom nav + safe area)

---

## 11. Components

Source: `src/components/ui/`. Every variant listed is currently rendered in production.

### 11.1 Button

| Variant | Background | Text | Border | Shadow |
|---|---|---|---|---|
| **Primary** | `#2D5A3D` | white | — | `shadow-sm` |
| **Primary hover** | `#234A31` | white | — | lift |
| **Outline** | transparent | `#2D5A3D` | `rgba(45,90,61,.20)` | — |
| **Ghost** | transparent | `#2D5A3D` | — | — |
| **Secondary** | white | `#2D5A3D` | `#DDE3DF` | `shadow-sm` |
| **Destructive** | `#C23B2E` | white | — | — |
| **Accent (gold)** | `#C4A235` | `#1A1F1C` | — | — |
| **Link** | transparent | `#B8562E` | — | underline on hover |

Sizes (all with 12 px radius):

| Size | Height | Padding-x | Font |
|---|---|---|---|
| `sm` | 32 | 12 | 13 |
| `default` | 40 | 16 | 14 |
| `lg` | 48 | 24 | 16 |
| `icon` | 40 × 40 | — | — |

All buttons use `transition-colors` + `focus-visible:ring-2 focus-visible:ring-[#2D5A3D]/50`.

### 11.2 Input

| Prop | Value |
|---|---|
| Background | white |
| Border | `1px solid #DDE3DF` |
| Radius | 12 |
| Padding | `10px 16px` |
| Focus ring | `2px solid rgba(45,90,61,.30)` |
| Focus border | `#2D5A3D` |
| Placeholder | `#aaa` |

Textarea matches Input with min-height `96px`.

### 11.3 Card

Three flavors:
- **Default** — white, border `#DDE3DF`, radius 16, `shadow-card-sm`
- **Glass** — see §8
- **Warm** — `#F5F3EE`, gold border `rgba(196,162,53,.20)`

Padding 24 default, 32 for feature cards.

### 11.4 Modal / Dialog

- Overlay: `rgba(0,0,0,.50)` + `backdrop-blur(4px)`
- Content: glass-modal (`rgba(255,255,255,.90)` + blur 24 + border `rgba(255,255,255,.50)` + radius 20 + `shadow-modal`)
- Mobile: bottom-sheet (`items-end`)
- Desktop: centered (`items-center`)
- Entry: `scale-bounce` 300 ms spring

### 11.5 Chips / pills / badges

| Type | Bg | Text | Radius | Padding |
|---|---|---|---|---|
| Filter pill (inactive) | white | `#1A1F1C/70` | full | 6/14 |
| Filter pill (active) | `#2D5A3D` | white | full | 6/14 |
| Status (green) | `rgba(45,90,61,.12)` | `#2D5A3D` | 20 | 4/12 |
| Status (amber) | `rgba(196,162,53,.15)` | `#8a7c08` | 20 | 4/12 |
| Status (red) | `rgba(184,86,46,.12)` | `#B8562E` | 20 | 4/12 |
| Status (blue) | `rgba(122,155,136,.20)` | `#5d7a79` | 20 | 4/12 |
| XP badge | `rgba(255,255,255,.95)` | per-type color | 20 | 4/10 |
| Category pill | per-category bg | per-category text | full | 4/10 |

### 11.6 Avatar

| Size | px |
|---|---|
| xs | 24 |
| sm | 32 |
| md (default) | 40 |
| lg | 48 |
| xl | 64 |
| Profile hero | 100 |

- Empty / initials: `linear-gradient(135deg, #2D5A3D, #7A9B88)` + white initials
- Soft bg: `linear-gradient(135deg, #D3E1DF, rgba(45,90,61,.12))` + evergreen initials
- Always `border-radius: full`

### 11.7 Navigation

**TopNav (desktop)** — fixed, 56 h, glass-nav, max-w 1800, max-w content 1800, active link uses `slide-up-link` with torn-edge SVG active-bg + terra underline.

**BottomNav (mobile only, ≤1023)** — fixed, 64 h, `bg #1A2B20/95 backdrop-blur-lg`, 5 items, inactive `#8DACAB`, active `#C4A235`, icons 20, labels 10.

**Slide-up link:** text slides up `-100%` on hover, terra underline (`#B8562E`) scales in from left, 300 ms spring.

### 11.8 Toggle / switch

Currently uses off-brand `#6f6fd2`. **Design team: pick brand green (`#2D5A3D`) or gold (`#C4A235`) for the "on" state — this is an open bug.**

### 11.9 Specialty components

- **TornEdge.tsx** — 5 SVG variants (a–e), positions top/bottom/left/right, 8–12 px height, default fill `#F5F3EE`
- **TapeDecoration.tsx** — 4 colors (cream/yellow/blue/pink), 4 positions, framer-motion spring, rotation randomized
- **GlassCard.tsx** — 3 variants (light/warm/dark) + 3 presets (StatsGlassCard, PhotoGlassCard, AIChatGlassCard)
- **PhotoCard.tsx** — 3 variants (polaroid/taped/plain), 6 tilt presets (−3° to +2.5°), 3 aspect ratios

---

## 12. Signature motifs

These are the non-negotiable brand elements. Keep them, refine them — don't remove.

### 12.1 Torn paper

SVG or `clip-path` generated serrated edges. Used on:
- Active nav item background (`/images/nav-active-bg.svg`)
- Question cards (engagement feed)
- Bottom of interview question card
- Scrapbook page edges

Colors available: cream (default), yellow, green, blue, red, purple (for bubble-type labels).

### 12.2 Washi tape

Decorative tape strips (`/images/washi-tape.svg` blue, `brown-tape-02.png` cream) at 120×24 or 180×36 px, rotated ±12–15°. Used on polaroids, scrapbook grid items, postscript letters. The `TapeDecoration` React component generates procedurally with spring animation.

**Text variant — highlighter:** `.tape-highlight` inline spans render a pseudo-`::before` at 80 % height behind text, creating a "marker highlight" feel. Colors: yellow `rgba(217,198,26,.25)`, blue `rgba(141,172,171,.35)`, cream `rgba(201,168,108,.30)`.

### 12.3 Polaroid

`bg: #fff; padding: 12 12 40 12;` with handwritten caption at bottom. Tilt variants `-3° to +2.5°`. Hover: `scale(1.02) rotate(0)` + lift shadow.

### 12.4 Sticky notes

Pastel squares (yellow `#fff8b8`, pink `#ffd4e0`, blue `#d4e8ff`, green `#d4ffd8`), 16 px padding, 2/3 px box-shadow, random rotation via `--rotation` CSS var.

### 12.5 Paper textures

3 tones: `paper-texture` (white), `paper-texture-cream` (`#f9f7f0`), `paper-texture-aged` (`#f5f0e6`). All use inline `feTurbulence` noise at 2 % opacity. Pair with `paper-vignette` for full "aged photograph" look.

### 12.6 Organic blobs

4 blurred color circles (200–400 px, `filter: blur(60px)`, opacity 0.4–0.5) slowly float behind hero/empty states via 20 s `float` keyframe. Use brand colors only.

### 12.7 Envelope + wax seal

Postscript feature uses full-bleed envelope illustration with a `#B8562E → #a84d28` circular wax seal (50×50) that pulses and shakes. Letter content fades in 60 px up when envelope opens.

### 12.8 Measuring-tape timeline

Gallery year-filter uses a 60 px-tall numbered ruler with draggable handles — a literal metaphor for "going back in time." Accent is evergreen.

### 12.9 Voice / record button

Circular, 64 px, green gradient (`#2D5A3D → #7A9B88`) default, switches to red gradient (`#dc2626 → #ef4444`) while recording, with pulsing recording dot and live waveform bars. Signature component — keep recognizable.

### 12.10 Scrapbook scatter grid

Grid children get cascading `margin-top: 0 / 16 / 8 / 24 px` on 4n+1, 4n+2, 4n+3, 4n+4 to simulate photos scattered on a table. Combined with `photo-tilt-1..5` rotations (−3° to +2.5°) gives the signature "just-emptied-the-shoebox" layout.

---

## 13. Accessibility

- **Focus ring** — `2px solid #2D5A3D, offset 2px` — applied via `:focus-visible` only (no focus ring on mouse click)
- **Screen-reader** — `.sr-only` utility, `.sr-only-focusable` for skip-links
- **Reduced motion** — all animation disabled under `prefers-reduced-motion`
- **High contrast** — `prefers-contrast: high` adds `2px border currentColor` to interactives
- **Senior mode** — opt-in via `.senior-mode` class on `<html>`: +2 px text scale throughout, 56–64 px touch targets, 180 px min feed-card height
- **Touch targets** — minimum 44×44 (56 in senior mode)

Designers: every interactive element needs a visible focus state in the design file. Every color pairing needs AA contrast (4.5:1 body, 3:1 large).

---

## 14. Known inconsistencies to resolve

These are real conflicts in the current code. The design team's first deliverable could be a decision on each:

1. **Two primary greens.** Dashboard / buttons use `#2D5A3D`. Voice / conversation flow uses `#4A7C59`. Pick one or explicitly scope the second.
2. **Three sage blues.** `#7A9B88`, `#8DACAB`, `#5d8585` all show up as "blue." Collapse to one.
3. **Two shadow tints.** `rgba(184,86,46)` vs `rgba(195,95,51)` are both used as "terra shadow." Pick one rgb triplet.
4. **Toggle off-brand purple `#6f6fd2`.** Replace with brand.
5. **Bubble feed palette (§3.6) vs. brand tints.** Keep bright type-coded feed OR retire in favor of brand-tinted tiles — currently inconsistent.
6. **Category pill bright colors** (`#00B87C`, `#34D7FF`, `#FF5C34`, `#FFB020`, `#3448FF`) are not brand colors. Decide.
7. **Font aliases.** `--font-playfair`, `--font-inter-tight`, `--font-caveat`, `--font-patrick-hand` are referenced but not loaded. Either load them or delete the aliases.
8. **Dead purple.** `--yt-purple-mid` is referenced but never defined. Define or remove references.
9. **`--radius-xl` conflict.** Currently 24 in themes.css and 20 in responsive.css. Canonical: **20**.
10. **Sidebar width conflict.** 240 vs 280 depending on file. Canonical: **280**.

---

## 15. How to propose a change

Edit any value in this file, send it back to engineering. A single-value change (e.g. "make `--yt-green` `#2F5E41`") will propagate to every surface automatically because the value is already a CSS variable. Structural changes (new component, new font) require a PR and one engineering session.

Please **do** include:
- The token name you edited (e.g. `--yt-red`)
- Old value → new value
- A one-line rationale

Please **don't** rewrite this entire document — we want a diff, not a replacement.

---

*End of design system.*
