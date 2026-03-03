

# Add Performance Rating & BFF Filters

## What's changing
Add two new filter fields to the sidebar: **Current Year Performance Rating** and **BFF Summary keyword search**. This requires adding performance and BFF data to each employee in the data layer, then wiring up new filter controls.

## Data layer changes (`src/data/employees.ts`)
- Add `currentYearRating` (number, e.g. 4.2) and `previousYearRating` (number, e.g. 3.8) fields to the `Employee` interface
- Add `bffSummary` (string) field to the `Employee` interface
- Populate all 10 employees with unique, realistic values for these three fields

## Sidebar filter changes (`src/components/portal/Sidebar.tsx`)
- Add a **Performance Rating** dropdown with options: "4.0+" / "3.0–3.9" / "Below 3.0" — filters on `currentYearRating`
- Add a **BFF Keywords** text input (similar to the search bar) that filters employees whose `bffSummary` contains the typed text
- Wire both into the existing `useMemo` filter chain

## Tab updates
- **Overview tab**: Pull `currentYearRating`, `previousYearRating`, and `bffSummary` from the selected employee's data instead of hardcoded values (so switching employees shows different data)
- **Employee Profile tab**: No changes needed

## Scope
- 2 files modified: `employees.ts`, `Sidebar.tsx`
- 1 file updated to use dynamic data: `Overview.tsx`
- No new dependencies

