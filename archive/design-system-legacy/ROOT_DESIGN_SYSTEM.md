# YoursTruly Design System

**Official Standard:** HeroUI  
**Source:** https://github.com/sava-dash/heroui  
**Figma:** https://www.figma.com/design/F9VrW5esdIH3eIPpfBp1Ru/-YT--HeroUI-Figma-Kit

---

## Decision

**YoursTruly adopts HeroUI as its design system without customization.**

All colors, spacing, typography, and component patterns follow the HeroUI Figma kit exactly as designed.

### Rationale

1. **Professional UX** - HeroUI is a thoroughly tested, production-ready design system
2. **Consistency** - Using HeroUI as-is ensures visual consistency across all features
3. **Component Library** - Access to 84 pre-built React components
4. **Maintainability** - Future HeroUI updates can be integrated easily
5. **Time Savings** - No need to maintain custom color mappings or variants

---

## Core Colors

| Token | Value | Usage |
|-------|-------|-------|
| **Primary** | `#52325d` | Buttons, active states, brand accents |
| **Surface** | `#f4f4f5` | Input backgrounds, card surfaces |
| **Border Light** | `#e4e4e7` | Default borders, dividers |
| **Border Dark** | `#d4d4d8` | Step connectors, inactive states |
| **Text Primary** | `#2D2D2D` | Headings, body text |
| **Text Secondary** | `#71717a` | Descriptions, helper text |
| **Text Muted** | `#a1a1aa` | Placeholders, disabled text |
| **Background** | `white` | Page background, cards |

---

## Component Patterns

### Buttons

**Primary:**
```tsx
className="bg-[#52325d] text-white rounded-[12px] px-4 py-2.5
  hover:shadow-xl hover:scale-[1.02] transition-all"
```

**Secondary:**
```tsx
className="bg-white border-2 border-[#e4e4e7] text-[#2D2D2D] 
  rounded-[12px] px-4 py-2.5 hover:bg-[#f9fafb] transition-colors"
```

**Ghost:**
```tsx
className="bg-transparent text-[#52325d] hover:bg-[#52325d]/5 
  rounded-[12px] px-4 py-2.5 transition-colors"
```

### Cards

**Glass Morphism:**
```tsx
className="bg-gradient-to-b from-white/90 to-white/50 backdrop-blur-sm
  rounded-[20px] p-8 shadow-[0_8px_40px_rgba(82,50,93,0.08)]"
```

**Elevated:**
```tsx
className="bg-white rounded-[20px] p-8 
  shadow-[0_8px_40px_rgba(82,50,93,0.12)]"
```

### Input Fields

**Default:**
```tsx
className="w-full rounded-[12px] border-2 border-[#e4e4e7] 
  bg-[#f4f4f5] px-4 py-2.5 text-sm 
  focus:border-[#52325d] focus:outline-none
  shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
```

### Toggle Chips (Multi-Select)

**Selected:**
```tsx
className="border-2 border-[#52325d] bg-[#52325d]/10 
  text-[#52325d] font-medium rounded-full px-3 py-1.5"
```

**Unselected:**
```tsx
className="border-2 border-[#d4d4d8] bg-[#f4f4f5] 
  text-[#2D2D2D]/70 hover:border-[#52325d]/40 
  rounded-full px-3 py-1.5 transition-all"
```

### Radio Cards (Single-Select)

**Selected:**
```tsx
className="border-2 border-[#52325d] bg-[#52325d]/8 
  text-[#2D2D2D] rounded-[12px] px-4 py-3"
```

**Unselected:**
```tsx
className="border-2 border-[#e4e4e7] bg-[#f4f4f5] 
  text-[#2D2D2D]/70 hover:border-[#52325d]/40 
  rounded-[12px] px-4 py-3 transition-all"
```

---

## Typography

**Font Family:**
```css
font-family: Inter, system-ui, -apple-system, sans-serif
```

**Heading Scale:**
```tsx
h1: text-[28px] md:text-[32px] font-medium leading-tight
h2: text-2xl font-medium
h3: text-xl font-medium
```

**Body Text:**
```tsx
base: text-sm leading-relaxed text-[#2D2D2D]
description: text-sm leading-relaxed text-[#71717a]
helper: text-xs text-[#a1a1aa]
```

---

## Spacing

**Scale (Tailwind):**
```
xs:  4px   → gap-1, p-1
sm:  8px   → gap-2, p-2
md:  16px  → gap-4, p-4
lg:  24px  → gap-6, p-6
xl:  32px  → gap-8, p-8
2xl: 48px  → gap-12, p-12
3xl: 64px  → gap-16, p-16
```

---

## Border Radius

**Scale:**
```
sm:   8px   → rounded-lg
md:   12px  → rounded-[12px]
lg:   14px  → rounded-[14px]
xl:   20px  → rounded-[20px]
full: 9999px → rounded-full
```

---

## Shadows

**Elevation Scale:**
```tsx
// Light (hover states)
shadow-[0_4px_12px_rgba(82,50,93,0.08)]

// Medium (cards)
shadow-[0_8px_40px_rgba(82,50,93,0.12)]

// Heavy (modals, dropdowns)
shadow-[0_12px_48px_rgba(82,50,93,0.16)]

// Input subtle
shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]
```

---

## Animation

**Transitions:**
```tsx
// Default
transition-all duration-200

// Hover scale
hover:scale-[1.02]

// Shadow + scale
hover:shadow-xl hover:scale-[1.02]
```

**Framer Motion:**
```tsx
// Page transitions
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.3 }}
```

---

## Accessibility

**Focus States:**
```tsx
focus:border-[#52325d] focus:outline-none
```

**ARIA Labels:**
- Use `aria-label` for icon-only buttons
- Use `aria-pressed` for toggle chips
- Use `aria-current="step"` for active step

**Keyboard Nav:**
- All interactive elements must be focusable
- Tab order follows visual flow
- Enter/Space activate buttons

---

## Do's and Don'ts

### ✅ Do

- Use HeroUI colors exactly as specified
- Follow the component patterns above
- Use provided spacing/radius scales
- Test with HeroUI component library
- Reference design-map.json for tokens

### ❌ Don't

- Don't customize HeroUI colors (no green theme)
- Don't create new color variants
- Don't use arbitrary spacing values
- Don't mix design systems
- Don't override HeroUI components unless necessary

---

## Migration Guide

### From YoursTruly Green Theme

**Old (YT Green):**
```tsx
bg-[#406A56]  // Primary green
bg-[#8DACAB]  // Light green
bg-[#FDF8F3]  // Cream background
```

**New (HeroUI Purple):**
```tsx
bg-[#52325d]  // Primary purple
bg-[#f4f4f5]  // Light gray surface
bg-white      // White background
```

### Update Process

1. Replace all `#406A56` with `#52325d`
2. Replace all `#FDF8F3` with `white`
3. Replace gradients with solid colors
4. Use HeroUI shadow tokens
5. Test all components visually

---

## Resources

**Figma Kit:** https://www.figma.com/design/F9VrW5esdIH3eIPpfBp1Ru  
**GitHub Repo:** https://github.com/sava-dash/heroui  
**Local Components:** `~/clawd/projects/heroui/packages/react/`  
**Design Map:** `design-map.json` (color tokens reference)

**Component Catalog:** 84 components available
- Buttons, inputs, cards, modals
- Tables, dropdowns, tooltips
- Date pickers, color pickers
- Accordions, tabs, alerts
- And more...

---

## Future Updates

When HeroUI releases updates:

1. Pull latest from GitHub
2. Check `design-map.json` for token changes
3. Update local components if needed
4. Test onboarding flow
5. Deploy updates

---

**Last Updated:** 2026-03-13  
**Version:** 1.0  
**Status:** ✅ Official Design System
