# GENTRADE Design System

## Direction
Tech-professional, Linear/Vercel style. Clean, precise, authoritative.
For non-technical salespeople — approachable but not playful.
All UI in Spanish.

## Accent
Indigo blue (#4f46e5). Single accent, used with intention.
Ghost variant (8% opacity) for subtle backgrounds.

## Depth Strategy
**Borders-first.** Cards and surfaces use 1px border (--border-light), not shadows.
Shadows reserved for: modals, dropdowns, floating elements only.

## Surfaces (light)
- Primary: #ffffff (cards, panels)
- Secondary: #f8f9fb (page canvas)
- Tertiary: #f0f1f5 (grouped sections)
- Inset: #f3f4f7 (inputs, recessed areas)

## Text Hierarchy
- Primary: #111827 (headings, body)
- Secondary: #4b5563 (supporting text)
- Tertiary: #6b7280 (metadata, labels)
- Muted: #9ca3af (placeholders, disabled)

## Border Progression
- Subtle: #f0f1f5 (barely there, group separation)
- Light: #e5e7eb (standard card/section borders)
- Medium: #d1d5db (emphasis, active states)
- Emphasis: #9ca3af (maximum, focus rings)

## Typography
- Family: Inter
- Headings: 600-700 weight, letter-spacing: -0.02em
- Body: 400 weight, line-height: 1.6
- Labels: 500 weight, 0.8125-0.875rem
- Data: tabular-nums variant

## Spacing
4px base grid. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.

## Radius
xs: 6px (badges), sm: 8px (buttons/inputs), md: 10px (cards), lg: 14px (panels), xl: 18px (modals)

## Navigation
Horizontal top bar. Same bg as content, separated by border-light.
Active nav item: accent bg ghost + accent text.

## Key Patterns
- Client cards: border-light, no shadow, radius-md
- Stat cards on dashboard: border-light, icon left with accent-ghost bg circle
- Buttons primary: accent solid, radius-sm, 500 weight
- Buttons secondary: bg-tertiary, text-secondary, radius-sm
- Inputs: bg-inset, border control-border, radius-sm
- Modals: bg-primary, border-light, shadow-xl, radius-xl
- Proposal progress: linear fill bar using accent
