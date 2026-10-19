---
name: Pristine Fairway
colors:
  surface: '#f4fbf6'
  surface-dim: '#d4dcd7'
  surface-bright: '#f4fbf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f0'
  surface-container: '#e8f0ea'
  surface-container-high: '#e3eae5'
  surface-container-highest: '#dde4df'
  on-surface: '#161d1a'
  on-surface-variant: '#414845'
  inverse-surface: '#2b322f'
  inverse-on-surface: '#ebf2ed'
  outline: '#717975'
  outline-variant: '#c0c8c3'
  surface-tint: '#3c6658'
  primary: '#00281e'
  on-primary: '#ffffff'
  primary-container: '#123f32'
  on-primary-container: '#7eaa99'
  inverse-primary: '#a3d0be'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#202323'
  on-tertiary: '#ffffff'
  tertiary-container: '#363838'
  on-tertiary-container: '#9fa1a1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#beedda'
  primary-fixed-dim: '#a3d0be'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#234e41'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#e1e3e2'
  tertiary-fixed-dim: '#c5c7c6'
  on-tertiary-fixed: '#191c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f4fbf6'
  on-background: '#161d1a'
  surface-variant: '#dde4df'
typography:
  display-brand:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-hero:
    fontFamily: Inter
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  metric-score:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1.25rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-clean, athletic-luxury aesthetic inspired by native iOS utility ecosystems like Apple Fitness and Apple Health, fused with the editorial dignity of high-end golf journals. The experience targets modern golfers who demand pristine legibility on the course and contemplative elegance when reviewing rounds off the fairway.

The visual direction centers on **Warm Editorial Minimalism**:
- **Canvas Purity:** Absolute `#FFFFFF` background surfaces create an unadulterated high-key baseline, deliberately avoiding muddy tints or synthetic colored fills.
- **Micro-Precision Metrics:** Performance indicators, yardages, shot tracks, and handicap trends utilize tabular, mono-spaced digits balanced against authoritative serif mastheads and razor-sharp system sans-serif typography.
- **Physical Restraint:** Depth is defined by whisper-light hairlines and structural tonal tiering rather than heavy artificial drop shadows. Tactile touches remain crisp, intentional, and quiet.

## Colors

The palette is engineered around pure whites, deep organic fairway greens, and precise architectural neutrals. 

- **Canvas & Primary Surfaces (`#FFFFFF`):** The primary view canvas and elevated card surfaces must remain strictly pure white. No pale mint or tinted washes are permitted on global canvas layers.
- **Secondary Surface (`#F7F8F7`):** Reserved for grouped list backings, nested meter troughs, segmented control tracks, and neutral interactive tile states.
- **Structure & Hairlines (`#E8ECE8`):** Ultra-subtle, clean neutral-cool gray used for 0.5pt/1px border definitions, card perimeters, and modular cell dividers.
- **Brand Primary Accent (`#123F32`):** Deep Forest Fairway Green. Applied to primary calls-to-action, core active states, active tab highlights, and key brand moments.
- **Achievement Accent (`#C5A059`):** Refined Fairway Gold. Reserved exclusively for celebratory metrics: birdies, eagles, personal bests, handicap improvements, and tournament trophies.
- **Typography Primary (`#1A211E`):** Deep carbon charcoal ensuring crisp legibility without the harshness of pure black.
- **Typography Secondary (`#6F7B74`):** Muted slate green-gray for labels, metric subtitles, timestamps, and hole metadata.

## Typography

The typographic hierarchy harmonizes editorial prestige with clinical athletic clarity:

- **Editorial Brand Presence:** Headings, section hero intros, and masthead lockups leverage `Playfair Display`. It injects an elite sporting club atmosphere reminiscent of high-end international golf publications.
- **Interface & Multi-Language Neutrality:** Body text, secondary headings, metadata, and all Korean localization fall back gracefully to modern neutral sans-serif rendering (Pretendard / Inter stack). Line heights are optimized to support Korean glyph vertical balance seamlessly.
- **Tabular Figures:** All numeric readouts, score totals, distances (yards/meters), and putts must activate `font-variant-numeric: tabular-nums` to ensure scorecards and data tables align down to the sub-pixel across multi-hole overviews.

## Layout & Spacing

This layout adheres strictly to an iOS Human Interface style fluid single-column hierarchy for mobile, expanding into a balanced multi-card structure on tablet viewports.

- **Edge Margins:** Standard horizontal margins are locked at `1.25rem` (20px) on mobile viewports and widen to `1.5rem` (24px) on wider displays, providing clean margins that allow pure white surfaces to breathe.
- **Rhythmic Vertical Stacking:** Component separation is governed by an 8pt base grid. Cards and aggregated insight modules stack with `1rem` vertical separation, while section titles introduce `2rem` of clearance above to emphasize editorial chapters.
- **Information Density:** For hole-by-hole scorecards and fairway radar charts, use `gutter-sm` (12px) to allow rich 9-hole/18-hole score comparisons to remain glanceable without horizontal scrolling friction.

## Elevation & Depth

Visual separation relies on physical structure and low-contrast boundaries rather than heavy, artificial drops.

- **Hairline Framing:** Cards, metric trays, and persistent bottom sheets sit encased in `1px` crisp structural outlines using `#E8ECE8`. When stacked upon `#FFFFFF`, this delivers precise, modern definition identical to modern Apple Health summary blocks.
- **Subtle Ambient Lift:** Where layered elevation is mandatory (floating action bars, modal score input drawers), use a whisper-light ambient bloom:
  - `box-shadow: 0 4px 20px -2px rgba(18, 63, 50, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02);`
- **Surface Nesting:** Secondary context (e.g., green-in-regulation badge wells, handicap diff containers) is recessed directly within parent cards via `#F7F8F7` fills without needing borders.

## Shapes

The design system employs refined rounded geometry, balancing ergonomic touch targets with architectural poise:

- **Base Cards & Modules:** Default card containers, round summary panels, and input surfaces implement a controlled `1rem` (16px) radius, preventing visual clutter while maintaining a welcoming hand-feel.
- **Pill Badges & Status Indicators:** Par indicators, shot tags (e.g., Fairway Hit, Bunker, Water), and achievement tags utilize full pill contours (`rounded-full` / `9999px`).
- **Interactive Buttons:** Primary action controls and mode switchers carry soft, confident corners (`0.75rem` / 12px) to communicate actionable tactility.

## Components

### Buttons & Interactive Controls
- **Primary Buttons:** Solid `#123F32` background with `#FFFFFF` text. Height is 50px for touch ergonomics, paired with semibold Inter text. No gradient; flat and resolute. Active states register a subtle 0.98 scale transform with `opacity: 0.92`.
- **Secondary Buttons:** Solid `#F7F8F7` container with `#1A211E` text and a hairline `#E8ECE8` stroke.
- **Tertiary / Text Controls:** Borderless, using `#123F32` with an inline chevron icon.

### Cards & Summary Modules
- Built exclusively on a `#FFFFFF` base, framed by a 1px `#E8ECE8` border and `1rem` corner rounding.
- Internal padding is set to `1.25rem`. 
- Metric headers display a small uppercase category tracker (`label-sm` in `#6F7B74`), followed by the large tabular metric (`metric-hero` in `#1A211E`), followed by subtext or trend delta pill.

### Achievement Badges & Golf Metric Rings
- Standard metrics (Putts per Hole, GIR percentage) use monochromatic rings filled with `#123F32` against `#F7F8F7` track backings.
- Exceptional milestones (Hole-in-one, Eagle, Handicap Drops) activate `#C5A059` highlights, paired with a soft warm-gold wash (`#C5A059` at 8% opacity) pill container.

### Lists & Hole Score Rows
- Grouped lists adopt the inset-grouped pattern from iOS: enclosed in a single white card container with full-width or inset 0.5px dividers (`#E8ECE8`).
- Row height is standardized to 56px, with tabular hole numbers on the far left, score indicator pill in the center, and yardage/strokes aligned right.

### Input Fields & Score Selectors
- Background is `#F7F8F7` in resting state, shifting to `#FFFFFF` with a crisp 1.5px `#123F32` border upon focus.
- Touch stepper buttons for stroke/putt counting adopt circular `#FFFFFF` surfaces with subtle `#E8ECE8` borders.