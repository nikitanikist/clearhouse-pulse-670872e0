

# Add View Button to PDR Documents

## Problem
The PDR documents table in the Overview tab only has Download and Delete action buttons. There's no way to view/read a document inline.

## Solution
Add an **Eye (View)** button to each document row in the Actions column, placed before the Download button. This will open the document in a new browser tab (simulated for now since docs are hardcoded).

## Implementation

**`src/components/portal/tabs/Overview.tsx`**:
- Import `Eye` icon from `lucide-react`
- Add a View button before the existing Download button in the actions `<div>`
- Style it consistently with the existing action buttons (primary color, hover state)
- On click, open in a new tab via `window.open()` (placeholder behavior for now)

Single file, minimal change — just adding one icon button per row.

