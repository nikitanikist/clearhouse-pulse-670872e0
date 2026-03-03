

# Sticky Header & Management Notes Filter

## Problem
1. When scrolling on an employee detail page, the entire view scrolls — the back button, profile header, and tab bar all disappear. Only the tab content should scroll.
2. Management Notes has no way to filter by author.

## Solution

### 1. Fix Sticky Header (Dashboard.tsx)
Make the back button, ProfileHeader, and tab bar **sticky at the top** so only the tab content area scrolls. The current structure already has `overflow-y-auto` on the content div (line 127), but the parent container needs to be a flex column with `overflow-hidden` so that the header sections don't scroll away.

Change the employee detail section (lines 100-131):
- Wrap the detail view in a flex column with `h-full overflow-hidden`
- Keep back button, ProfileHeader, and tabs as non-scrolling (they'll stay fixed naturally)
- The `flex-1 overflow-y-auto` div already handles the scrollable content

Specifically: change `<>` to `<div className="flex flex-col h-full overflow-hidden">` and close with `</div>`.

### 2. Author Filter in Management Notes (ManagementNotes.tsx)
- Add an `authorFilter` state
- Extract unique authors from notes
- Add a dropdown/select above the table to filter by author
- Filter displayed notes based on selection

### UX Improvements
- Add a subtle "Showing X of Y notes" count next to the filter
- Style the filter consistently with other dropdowns in the app

## Files to Modify
- `src/pages/Dashboard.tsx` — sticky header fix
- `src/components/portal/tabs/ManagementNotes.tsx` — author filter dropdown

