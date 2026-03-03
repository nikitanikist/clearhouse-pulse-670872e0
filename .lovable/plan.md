

# Teams View Redesign — Card-First with Expandable Table

## What changes

Rewrite `TeamsView.tsx` to show **4 department summary cards** in a grid first. Clicking a card expands a **member table below the cards** for that department. Only one department table is visible at a time (clicking another card switches it).

## Layout

```text
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Assurance  │ │    Tax     │ │  Advisory  │ │ Operations │
│  3 members │ │  2 members │ │  3 members │ │  2 members │
│  ★ 4.1 avg │ │  ★ 3.8 avg │ │  ★ 4.0 avg │ │  ★ 3.5 avg │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

▼ Assurance — 3 members
┌──────────────────────────────────────────────────────────┐
│ Name          Position          Location   Rating        │
│ Priya Sharma  Senior Associate  Canada     ★ 4.2         │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

## Implementation — single file change

**`src/components/portal/TeamsView.tsx`**:
- Add `selectedDept` state (initially `null`)
- Render a 4-column card grid — each card shows: department name (colored), member count, average rating, and an icon
- Clicking a card sets `selectedDept`; clicking the active card again collapses it
- Below the grid, if `selectedDept` is set, render a table of that department's members (Name, Position, Location, Rating, Potential) — rows clickable via existing `onSelectEmployee`
- Active card gets a highlighted border/ring to show selection state

No other files need changes.

