

# Overview & Technical Competencies Updates

## Changes

### 1. Overview — Fix Section clickability & remove BFF subtitle

**`src/components/portal/tabs/Overview.tsx`**:

- **Remove BFF subtitle**: Remove the `subtitle={bffPreview}` prop from the BFF section and delete the `bffPreview` variable
- **Make sections look clickable**: Update the `Section` button styling to have:
  - A left colored accent bar (4px left border, colored with primary) on hover
  - `cursor-pointer` explicitly
  - Slightly bolder hover background (`hover:bg-muted/50`)
  - Add a subtle `rounded-l-none` on the button with a colored left border on the card when hovered
  - Add a transition `group` class and animate the chevron icon color on hover (e.g., from muted to foreground)
  - This makes the collapsed sections visually communicate "click me"

### 2. Technical Competencies — Add checkbox-based skill assessment

**`src/components/portal/tabs/TechnicalCompetencies.tsx`**:

- Replace the progress-bar skill view with a **checkbox checklist** approach
- Group competencies into categories (Accounting Skills, Software Proficiency) as before
- Each skill becomes a row with: **Checkbox** (checked = competent), **Skill name**, and optionally a **level indicator** (Beginner/Intermediate/Advanced as a badge)
- Checkboxes are read-only for now (visual representation of assessed competencies)
- This mirrors a "document checklist" pattern where the CA has uploaded/verified competencies

## Files to modify

| File | Change |
|------|--------|
| `src/components/portal/tabs/Overview.tsx` | Remove BFF subtitle, improve section hover/click affordance |
| `src/components/portal/tabs/TechnicalCompetencies.tsx` | Replace progress bars with checkbox checklist rows |

