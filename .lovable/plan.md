

# UX/UI Redesign & Security Level Implementation

## Problems Identified

1. **Security levels do nothing** — all 5 levels show the same dashboard with all employees visible
2. **Sidebar is just an employee list** — no proper navigation structure. A real portal needs nav items like Dashboard, Teams/Employees, Settings, etc.
3. **Poor discoverability** — a new user logging in sees a wall of employee cards with no context or orientation

## Proposed Redesign

### 1. Restructure the Sidebar Navigation

Replace the current "flat employee list" sidebar with a proper app navigation sidebar:

```text
┌──────────────────────┐
│ CLEARHOUSE LLP       │
│ CPA Tagline          │
│                      │
│ ▸ Dashboard          │  ← Landing page with summary stats
│ ▸ Employees          │  ← Opens employee directory (current view)
│ ▸ Teams              │  ← Group view by department
│ ▸ Settings           │  ← Placeholder page
│                      │
│ ─────────────────    │
│ Logged in as:        │
│ sarb@clearhouse.ca   │
│ Level 1: Full Access │
│ [Sign Out]           │
└──────────────────────┘
```

- **Dashboard**: A new landing page with cards showing headcount, department breakdown, top performers, recent management notes — gives users an orientation point after login
- **Employees**: This is where the current employee list + profile tabs live. The employee list becomes a sub-panel within this section (either a left sub-sidebar or a list-detail layout)
- **Teams**: A department-grouped view of employees (cards grouped under Assurance, Tax, Advisory, Operations headers)
- **Settings**: A placeholder page for future configuration

### 2. Implement Security Level Filtering

Pass the selected security level from Login to Dashboard (via URL param or React context). Then filter the employee list based on the level:

- **Level 1**: All employees visible
- **Level 2**: Hide Partners — show Manager, Senior Associate, Intermediate, Associate only
- **Level 3**: Hide Partners & Managers — show Senior Associate, Intermediate, Associate
- **Level 4**: Show Intermediate and Associate only
- **Level 5**: Show Operations position only

The security level also appears in the sidebar footer so the user knows what access they have.

### 3. Employees Section — Improved Layout

When user clicks "Employees" in the nav, show a **list-detail split view**:

```text
┌─────────┬──────────────────────────────────────┐
│ Nav     │  Employee List (left)  │  Profile    │
│ sidebar │  ┌──────────────┐     │  (right)    │
│         │  │ Search...    │     │             │
│         │  │ Filters ▾    │     │  [Tabs]     │
│         │  │ Priya Sharma │     │  [Content]  │
│         │  │ Arun Patel   │     │             │
│         │  │ David Chen   │     │             │
│         │  └──────────────┘     │             │
└─────────┴──────────────────────────────────────┘
```

The employee list panel (~280px) with search + filters stays, but it's nested inside the Employees section — not the global sidebar.

### 4. Dashboard Landing Page

A new page with summary cards:
- Total employees (filtered by security level)
- Department breakdown (small bar chart or stat cards)
- Average performance rating
- Recent management notes (last 3-5 across all employees)
- Quick links to high-potential employees

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Login.tsx` | Pass security level via URL search param on navigate |
| `src/pages/Dashboard.tsx` | Major restructure — add nav sidebar + route-like section switching |
| `src/components/portal/Sidebar.tsx` | Convert to app nav sidebar (Dashboard, Employees, Teams, Settings) |
| `src/components/portal/EmployeeListPanel.tsx` | **New** — extract current employee list + search/filters into its own panel |
| `src/components/portal/DashboardHome.tsx` | **New** — summary/stats landing page |
| `src/components/portal/TeamsView.tsx` | **New** — department-grouped employee cards |
| `src/data/employees.ts` | Add security level type + filtering utility function |

### Security Level Flow

1. Login page stores selected level in state
2. On sign-in, navigate to `/dashboard?level=1` (or use React context)
3. Dashboard reads the level and filters the employee list accordingly
4. Sidebar footer displays current access level
5. Employees not visible at that level are completely hidden from the list, search, and all views

