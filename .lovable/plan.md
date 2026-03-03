

# Clearhouse LLP Employee Portal — Implementation Plan

## Overview
A polished, management-facing Employee Portal for Clearhouse LLP (CPA firm). Pre-filled with realistic dummy data, branded to match their corporate identity, with full interactivity across all screens.

## Page 1: Login Screen
- Full-screen navy gradient background with centered login card
- Clearhouse LLP branding, email/password fields (pre-filled), security level dropdown
- "Sign In" navigates to Dashboard

## Page 2: Dashboard Layout
- **Left Sidebar** (~280px, navy `#1B3A5C`): Logo/tagline, search bar with real-time filtering, collapsible filter dropdowns (Department, Location, Position, Potential, Supervisor), scrollable employee list (10 employees) with colored department pills and potential-rating dots. Selected employee highlighted with blue left-border.
- **Right Content Area**: Profile header bar (name, position, department, avatar initials), 6 horizontal tabs with blue active indicator.

## Six Content Tabs (all pre-filled with dummy data for Priya Sharma)

1. **Employee Profile** — Two-column info card (name, position, department, tenure, supervisor, contact info, avatar)
2. **Overview** — 4 collapsible sub-sections: Performance (ratings, quality, contributions), Bigger Brighter Future, Career Aspirations (short/long term, gaps, training), PDRs (drag-drop upload zone + document table with download/delete icons)
3. **Technical Competencies** — Animated progress bars for Accounting Skills and Software Proficiency (color-coded by level: Beginner/Intermediate/Advanced)
4. **Interpersonal Skills & Firm Fit** — 9 skill assessment cards with free-form text
5. **Growth & Potential** — Potential rating pill selector, visual dot ratings for readiness, leadership, and independence with descriptive text
6. **Management Notes** — Timeline log with blue dot connectors, "Add Note" input that appends new notes to the list

## Branding & Design
- Colors: Primary `#0072BC`, Accent `#00A4E4`, Navy `#1B3A5C`, Background `#F5F7FA`
- Fonts: Inter (body) + Plus Jakarta Sans (headings)
- 8px card radius, 6px button radius, subtle shadows, smooth 200-300ms transitions
- Lucide React icons throughout

## Interactions
- Login → Dashboard routing via React Router
- Sidebar employee selection updates header and highlights card
- Tab switching with animated content panels
- Real-time search + dropdown filters on employee list
- Collapsible sections in Overview tab
- Add Note appends to Management Notes timeline
- Skill bar animations on load
- File upload zone with drag hover state (visual only)

