export interface Permissions {
  can_add_employee: boolean;
  can_edit_profile: boolean;
  can_edit_performance: boolean;
  can_edit_interpersonal: boolean;
  can_edit_growth: boolean;
  can_manage_notes: boolean;
  can_view_salary: boolean;
  can_edit_salary: boolean;
  can_manage_lookups: boolean;
  can_import_data: boolean;
}

export type PermissionKey = keyof Permissions;

export const PERMISSION_KEYS: PermissionKey[] = [
  "can_add_employee",
  "can_edit_profile",
  "can_edit_performance",
  "can_edit_interpersonal",
  "can_edit_growth",
  "can_manage_notes",
  "can_view_salary",
  "can_edit_salary",
  "can_manage_lookups",
  "can_import_data",
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_add_employee: "Add new employees",
  can_edit_profile: "Edit employee profiles",
  can_edit_performance: "Edit performance & competencies",
  can_edit_interpersonal: "Edit interpersonal assessments",
  can_edit_growth: "Edit growth & potential",
  can_manage_notes: "Add and manage notes",
  can_view_salary: "View salary information",
  can_edit_salary: "Edit salary history",
  can_manage_lookups: "Manage departments & positions",
  can_import_data: "Import data from spreadsheets",
};

export const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: "Employee Management", keys: ["can_add_employee", "can_edit_profile"] },
  {
    title: "Performance & Development",
    keys: ["can_edit_performance", "can_edit_interpersonal", "can_edit_growth"],
  },
  { title: "Notes", keys: ["can_manage_notes"] },
  { title: "Salary", keys: ["can_view_salary", "can_edit_salary"] },
  { title: "Administration", keys: ["can_manage_lookups", "can_import_data"] },
];

const all = (value: boolean): Permissions =>
  PERMISSION_KEYS.reduce((acc, k) => {
    acc[k] = value;
    return acc;
  }, {} as Permissions);

export function getDefaultPermissions(level: number): Permissions {
  switch (level) {
    case 1:
      return all(true);
    case 2:
      return { ...all(true), can_manage_lookups: false, can_import_data: false };
    case 3:
    case 4:
      return {
        ...all(true),
        can_view_salary: false,
        can_edit_salary: false,
        can_manage_lookups: false,
        can_import_data: false,
      };
    case 6:
      // Employee self-service: read-only, no capabilities.
      return all(false);
    default:
      return all(false);
  }
}

export function mergePermissions(
  level: number,
  custom: Partial<Permissions> | null | undefined,
): Permissions {
  const defaults = getDefaultPermissions(level);
  if (!custom || typeof custom !== "object") return defaults;
  const merged = { ...defaults };
  for (const key of PERMISSION_KEYS) {
    const value = (custom as Record<string, unknown>)[key];
    if (typeof value === "boolean") merged[key] = value;
  }
  return merged;
}
