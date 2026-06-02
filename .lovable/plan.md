# UX/UI Fix Plan — Clearhouse HR Portal

Grouped by the audit's priority. Each phase is independently shippable. Nothing changes the PDR flow, login/security model, or RLS beyond what's noted.

---

## Phase 1 — Routing (M1)

Convert the single `/dashboard` shell into real client routes so Back, refresh, deep-links, and bookmarks work.

- Add routes in `App.tsx`:
  - `/dashboard` (home)
  - `/employees`, `/employees/:id`, `/employees/:id/:tab` (tab = `profile|overview|interpersonal|growth|notes`)
  - `/teams`, `/teams/:dept`
  - `/settings`
- Refactor `Dashboard.tsx` from local `section`/`employeeId`/`tab` state to read/write the URL (`useParams`, `useNavigate`).
- Update `AppSidebar`, `EmployeeDirectory` row click, "Back to Employees", and tab bar to use `<Link>`/`navigate()`.
- Add a `ScrollToTop` component on route change.
- Lovable hosting already serves SPA fallback for unknown paths, so deep links resolve correctly; the existing `NotFound` stays for truly unknown URLs.

## Phase 2 — Rating model + data integrity (M2, M3, M4, M7)

**Single source of truth = letter code** (E/G/M/NI), numeric is derived.

- Migration:
  - Make `employees.current_year_rating` nullable, drop the `0` default; backfill: leave `NULL` where rating was never set.
  - Add a SQL helper `rating_code_to_number(code)` → 5/4/3/1.
  - Add a one-time UPDATE to repair known mojibake (`‚Äî` → `—`, `‚Äì` → `–`, `‚Äú/‚Äù` → `"`, `‚Äô` → `'`).
  - Delete the `ZZ TEST DELETE ME` row and any obvious junk (confirm list with user before running).
- Frontend:
  - Aggregates (Dashboard avg, Top Performers, Teams dept avg, High Potential count) exclude unrated employees; show `n of m rated` caption.
  - Directory RATING column: show the letter badge **plus** full label on hover (tooltip) and add a small legend strip above the table (E Excellent · G Good · M Meets · NI Needs Improvement).
  - Unrated rows show a neutral `—` chip, not `★0`.
  - Add/Edit forms: remove the separate numeric input; user picks the letter only, numeric is computed on save.
  - Teams + Dashboard show `★4.6 · E` consistently.

## Phase 3 — Forms & modal accessibility (M5, M6, m6, m9)

- Wire every input with `htmlFor`/`id` (shadcn `Label` + `Input` already supports this — just add matching ids).
- Add `required` to Name/Position/Department/Location in both Add and Edit; show inline errors on blur/submit (zod + react-hook-form, matching existing patterns).
- Phone field → `type="tel"` with placeholder `+1 (555) 123-4567`.
- Add Employee dialog already uses shadcn `Dialog` (Radix) which provides `role="dialog"`, focus trap, Escape, and X — verify the X is visible and Escape works; if a custom modal is used, swap to shadcn `Dialog`.
- Management Notes textarea: add a proper `<Label>` above it.
- Edit form Cancel: prompt "Discard changes?" only when dirty (m16).

## Phase 4 — Polish & credibility (M8, m1–m5, m10–m15)

- Remove the `V2` badges from the three tab labels.
- Add favicon set in `index.html` (16/32/SVG + apple-touch-icon) — needs a logo asset; will generate a simple Clearhouse mark if none provided.
- Demote the sidebar "CLEARHOUSE" logo from `<h1>` so only the page title is `<h1>` (m2).
- Darken muted text token to meet 4.5:1; bump sidebar footer to ≥12px / ≥70% opacity (m3, m4).
- Standardize all table headers to the same casing (pick UPPERCASE to match the Employees list).
- Search input: add inline clear (×) button.
- Filters: add "Clear filters" link + active-count badge.
- Empty result state: icon + "Clear filters" CTA.
- Loading state: replace bare "Loading…" with skeleton rows matching the table/cards.
- Sortable headers on Employees (Name, Department, Rating, Potential).
- Constrain Overview long-prose blocks to `max-w-[70ch]`.

## Phase 5 — Settings safety (m17)

- Add a confirm dialog before changing a security level ("Change Sarah to Level 2? They will lose access to …") and a success toast — auto-save stays, but the confirm is the safety net. No RLS change.

---

## Out of scope / deferred

- E6 mobile/responsive pass — large effort; recommend as a follow-up after Phase 1–4 land.
- E5 bulk actions / column visibility — premature at 13 rows.

---

## Technical notes

- Routing: React Router v6 (already in the project). State that currently lives in `Dashboard.tsx` (`section`, `selectedEmployeeId`, `activeTab`) moves into URL params.
- Rating derivation: keep `current_year_rating_code` as the source; treat `current_year_rating` as a generated/derived value populated on insert/update via the form (no DB generated column needed — keeps existing types stable).
- Mojibake repair runs once via a data migration (uses the insert tool, not schema migration).
- All toasts continue to use sonner; queries continue to invalidate via react-query keys already in use.

---

## Suggested shipping order

1. Phase 2 (data + ratings) — highest trust impact, no UI churn.
2. Phase 1 (routing) — biggest "feels broken" fix.
3. Phase 3 (forms/a11y) — quick wins, mostly mechanical.
4. Phase 4 (polish) — visible quality lift.
5. Phase 5 (settings confirm) — small, isolated.

Want me to proceed with all five phases in order, or pick a subset to start?
