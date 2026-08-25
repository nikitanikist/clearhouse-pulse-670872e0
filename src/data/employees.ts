// V2: Employee data is now sourced from Supabase. This module only exports
// shared TypeScript types and presentation helper maps used across components.

export type PotentialRating = "Well Placed" | "Ready Now" | "Ready Soon" | "Ready Later";
/** Departments and positions are admin-managed lookup tables now, so these are free text. */
export type Department = string;
export type Location = "Canada" | "India";
export type Position = string;

export interface Employee {
  id: string;
  name: string;
  initials: string;
  position: Position;
  department: Department;
  location: Location;
  potential: PotentialRating;
  email: string;
  phone: string;
  tenure: string;
  tenureInRole: string;
  /** ISO date (yyyy-mm-dd) or null. When present, drives the tenure display. */
  joiningDate: string | null;
  /** ISO date (yyyy-mm-dd) or null. When present, drives the role-tenure display. */
  roleStartDate: string | null;
  supervisor: string;
  /** Null when the employee has not yet been rated. */
  currentYearRating: number | null;
  /** Removed from V2 spec but kept optional for legacy components. */
  previousYearRating?: number;
  bffSummary: string;
  /** false = deactivated employee (hidden by default). Undefined treated as active. */
  isActive?: boolean;
}

/** Known department badge classes; unknown (admin-added) departments fall back. */
export const departmentColors: Record<string, string> = {
  Assurance: "bg-primary/15 text-primary",
  Tax: "bg-success/15 text-success",
  Advisory: "bg-warning/15 text-warning",
  Operations: "bg-secondary/15 text-secondary",
};

const FALLBACK_DEPT_CLASSES = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-secondary/15 text-secondary",
  "bg-muted text-muted-foreground",
];

export const departmentBadgeClass = (dept: string): string => {
  if (departmentColors[dept]) return departmentColors[dept];
  let hash = 0;
  for (let i = 0; i < dept.length; i++) hash = (hash * 31 + dept.charCodeAt(i)) >>> 0;
  return FALLBACK_DEPT_CLASSES[hash % FALLBACK_DEPT_CLASSES.length];
};

export const potentialColors: Record<PotentialRating, string> = {
  "Well Placed": "bg-primary",
  "Ready Now": "bg-success",
  "Ready Soon": "bg-warning",
  "Ready Later": "bg-muted-foreground",
};

export type SecurityLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Empty array kept so legacy components that still import `employees` directly
// (Sidebar.tsx, EmployeeListPanel.tsx are unused but reference it) compile.
export const employees: Employee[] = [];

/**
 * V2: server-side RLS handles level filtering. The client receives only rows
 * the signed-in user is allowed to see, so this becomes a pass-through.
 */
export function filterBySecurityLevel(emps: Employee[], _level: SecurityLevel): Employee[] {
  return emps;
}
