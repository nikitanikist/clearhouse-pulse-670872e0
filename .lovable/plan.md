

# Employees Section UX Redesign

## Problem
The current Employees view shows a cramped sidebar-style employee list alongside the profile detail — it feels like a nested sidebar within a sidebar, not a standard HR dashboard. The user wants a cleaner, more intuitive flow similar to modern HR platforms (like the RazorpayX reference screenshot).

## Proposed Approach: Table-First Employee Directory

When the user clicks **Employees** in the nav, they first see a **full-width employee table/directory** — not a split-panel. Clicking a row opens that employee's profile (either as a full-page detail view with a back button, or a slide-in panel).

### Step 1: Employee Directory View (replaces the list panel)

A clean, full-width content area with:
- **Header**: "Employees" title + employee count badge
- **Search bar** (full-width, prominent) + **Filter chips/dropdowns** in a toolbar row below
- **Table** with columns: Name (with initials avatar), Position, Department (colored pill), Location, Performance Rating, Potential (colored dot + label)
- Rows are clickable — clicking a row opens that employee's profile
- Subtle hover highlight on rows

### Step 2: Employee Profile View (detail)

When a row is clicked:
- Show a **back arrow + "Back to Employees"** link at the top
- Then the existing ProfileHeader + 6 tabs layout (unchanged)
- This replaces the table view entirely (no split panel)

### Step 3: Remove EmployeeListPanel split layout

The old 280px side panel is removed. The Employees section now has two internal states:
- `list` — shows the directory table
- `detail` — shows the selected employee's profile with tabs

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `employeeView` state (`list` | `detail`), switch between directory table and profile detail |
| `src/components/portal/EmployeeListPanel.tsx` | **Rewrite** into `EmployeeDirectory.tsx` — full-width table with search, filters, clickable rows |
| `src/components/portal/ProfileHeader.tsx` | No changes needed |

## Layout Comparison

```text
BEFORE:
┌──────────┬──────────┬────────────────────┐
│ Nav      │ Emp List │ Profile + Tabs     │
│ sidebar  │ (280px)  │                    │
└──────────┴──────────┴────────────────────┘

AFTER:
Click "Employees" → Full-width table
┌──────────┬───────────────────────────────┐
│ Nav      │ Employee Directory (table)    │
│ sidebar  │ Search + Filters + Rows       │
└──────────┴───────────────────────────────┘

Click a row → Full-width profile
┌──────────┬───────────────────────────────┐
│ Nav      │ ← Back to Employees           │
│ sidebar  │ ProfileHeader + Tabs          │
└──────────┴───────────────────────────────┘
```

This matches standard HR SaaS patterns — users see the full directory first, then drill into a profile. No teaching needed.

