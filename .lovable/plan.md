

# Overview Tab — Collapsed-by-Default Accordion Redesign

## Problem
All 4 sections (Performance, BFF, Career Aspirations, PDRs) are expanded by default, making the page feel like a wall of text. Users have to scroll extensively to find what they need.

## Solution
Simple but effective changes to the existing `Section` component:

1. **All sections collapsed by default** — change `defaultOpen` from `true` to `false`. Users click to expand only what they need.
2. **Only one section open at a time** — lift the open state to the parent so expanding one section auto-collapses the others (accordion behavior).
3. **Add summary previews on collapsed cards** — show a one-line snippet on each collapsed section header so users can scan without opening:
   - **Performance**: Show current year rating inline (e.g., "★ 4.2 / 5")
   - **BFF**: First ~80 chars of the BFF summary
   - **Career Aspirations**: Short-term goal preview
   - **PDRs**: Document count (e.g., "3 documents")

## Layout

```text
┌─────────────────────────────────────────────┐
│ ▸ Performance                    ★ 4.2 / 5  │
├─────────────────────────────────────────────┤
│ ▼ Bigger Brighter Future (BFF)              │
│   ┌─────────────────────────────────────┐   │
│   │ BFF Summary content expanded...     │   │
│   └─────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ ▸ Career Aspirations        CPA by Q3 2026  │
├─────────────────────────────────────────────┤
│ ▸ PDRs                        3 documents   │
└─────────────────────────────────────────────┘
```

## Implementation — single file

**`src/components/portal/tabs/Overview.tsx`**:
- Replace individual `Section` `useState` with a single `openSection` state at the `Overview` component level (string or null)
- Pass `isOpen` and `onToggle` props to each `Section` instead of internal state
- Add a `subtitle` prop to `Section` — displayed as muted text on the right side of the header when collapsed
- Set initial `openSection` to `null` (all collapsed) or optionally to `"performance"` (first section open)

No other files change.

