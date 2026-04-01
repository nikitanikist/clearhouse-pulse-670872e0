

# V2 Update Plan

## Changes Summary

### 1. Remove Technical Competencies Tab
- **Dashboard.tsx**: Remove import, update `tabs` array to 5 items, update `renderTab` switch cases (shift indices: Interpersonal=2, Growth=3, ManagementNotes=4)
- **Delete** `src/components/portal/tabs/TechnicalCompetencies.tsx`

### 2. Restructure Overview Tab
Complete rewrite of `src/components/portal/tabs/Overview.tsx`:
- **Performance section**: Replace old fields with new E/G/M/NI rating system, free-form text areas for "What Has Gone Well", "What Could Have Gone Better", "Summary of Overall Performance", and 5 Core Competency cards (Thought/Results/Expertise/People/Self) each showing a colored rating badge and commentary
- **BFF section**: Rename label to "My Bigger, Brighter Future"
- **Career Aspirations section**: Replace old 6 fields with "Career Aspirations Summary" textarea, "Professional Development Plan Summary" textarea, and a 4-column development plan table (Development Objectives / Activities / Support & Resources / Target Date) with Clearhouse blue header styling
- **PDRs section**: Keep as-is
- Remove Previous Year Performance Rating and old star-based RatingBadge

### 3. Rewrite Growth & Potential Tab
Complete rewrite of `src/components/portal/tabs/GrowthPotential.tsx`:
- Replace High/Medium/Developing pills with: Well Placed / Ready Now / Ready Soon (12-24 months) / Ready Later (2+ years)
- Pre-select "Ready Soon"
- Active pill = Clearhouse blue, inactive = gray outline
- Add "Rationale for Potential Rating" free-form textarea below with dummy data
- Remove all dot ratings and indicator cards
- Add info banner at top (light blue bg, Info icon): "This section is entered manually by the manager..."

### 4. Add Info Banner to Interpersonal Skills
- **InterpersonalSkills.tsx**: Add info banner at top with light blue background (#EFF6FF), Info icon, text: "This section is entered manually by the manager based on their direct observations and feedback."

### 5. Remove Previous Year Rating Filter
- **EmployeeDirectory.tsx**: Remove `prevRatingFilter` state, its `<select>`, filter logic, and references in `clearFilters` and `hasActiveFilters`

## Files Modified
- `src/pages/Dashboard.tsx`
- `src/components/portal/tabs/Overview.tsx`
- `src/components/portal/tabs/GrowthPotential.tsx`
- `src/components/portal/tabs/InterpersonalSkills.tsx`
- `src/components/portal/EmployeeDirectory.tsx`

## File Deleted
- `src/components/portal/tabs/TechnicalCompetencies.tsx`

