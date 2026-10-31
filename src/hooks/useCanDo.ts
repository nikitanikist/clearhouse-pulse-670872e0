import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissionScope, PositionPermissionRow } from "./usePermissionMatrix";

/**
 * Shape returned by useCanDo(): a lookup function and raw matrix map.
 *
 * `can('tab:growth_impact', 'view')` -> boolean
 * `scope('nav:employees')`          -> 'all' | 'own_department' | ...
 *
 * L1 admins bypass everything: `can()` returns true and `scope()` returns 'all'.
 */
export interface MatrixAccess {
  isLoading: boolean;
  isAdmin: boolean;
  /** Returns true when the signed-in user may perform `action` on `resource`. */
  can: (resource: string, action: "view" | "edit") => boolean;
  /** Returns the effective scope for `resource` (defaults to 'self'). */
  scope: (resource: string) => PermissionScope;
  /** Raw matrix row for a given resource (undefined if no row). */
  rowFor: (resource: string) => PositionPermissionRow | undefined;
  /**
   * True if the signed-in user is listed as a manager of `employeeId` in
   * public.employee_managers. L1 admins always get true.
   */
  isLinkedManagerOf: (employeeId: string) => boolean;
  /**
   * True when the signed-in user is allowed to see `employeeId` on
   * `resource` given scope (including specific_employees). L1 admin bypasses.
   */
  canSeeEmployeeForResource: (employeeId: string, resource: string) => boolean;
  /** When true the linked-manager lookup is still fetching. */
  linksLoading: boolean;
}

export const useCanDo = (): MatrixAccess => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const email = user?.email?.toLowerCase() ?? null;

  // Pull the user's security_level (for the admin bypass) and position in
  // one shared query so this hook can be used by multiple components without
  // thundering herd.
  const { data, isLoading } = useQuery({
    queryKey: ["can-do", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{
      securityLevel: number;
      byResource: Record<string, PositionPermissionRow>;
    }> => {
      const [{ data: profile }, { data: emp }] = await Promise.all([
        supabase
          .from("profiles")
          .select("security_level")
          .eq("user_id", userId!)
          .maybeSingle(),
        email
          ? supabase
              .from("employees")
              .select("position")
              .ilike("email", email)
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null } as const),
      ]);

      const securityLevel =
        (profile as { security_level?: number } | null)?.security_level ?? 6;
      const position =
        (emp as { position?: string } | null)?.position ?? null;

      // Load this user's overrides in parallel with the position row (if any).
      const [posRows, overrideRows] = await Promise.all([
        position
          ? supabase.from("position_permissions").select("*").eq("position_name", position)
          : Promise.resolve({ data: [] } as const),
        supabase.from("user_permission_overrides").select("*").eq("user_id", userId!),
      ]);

      const byResource: Record<string, PositionPermissionRow> = {};
      // 1. Seed from position defaults
      for (const r of ((posRows as { data: PositionPermissionRow[] | null }).data ?? [])) {
        byResource[r.resource_key] = {
          ...r,
          target_employee_ids: r.target_employee_ids ?? [],
        };
      }
      // 2. Overlay user overrides -- these take precedence per-cell.
      for (const o of ((overrideRows as { data: Array<Partial<PositionPermissionRow>> | null }).data ?? [])) {
        if (!o.resource_key) continue;
        byResource[o.resource_key] = {
          position_name: position ?? "",
          resource_key: o.resource_key,
          can_view: !!o.can_view,
          can_edit: !!o.can_edit,
          scope: (o.scope ?? "self") as PositionPermissionRow["scope"],
          target_employee_ids: o.target_employee_ids ?? [],
          updated_at: o.updated_at ?? new Date().toISOString(),
        };
      }
      return { securityLevel, byResource };
    },
  });

  const isAdmin = (data?.securityLevel ?? 6) === 1;

  // Pull the signed-in user's full name once, then fetch the employee ids
  // where they are a linked manager. Stored as a Set for O(1) lookup.
  const { data: linkInfo, isLoading: linksLoading } = useQuery({
    queryKey: ["my-linked-managed", userId],
    enabled: !!userId && !!email,
    queryFn: async (): Promise<Set<string>> => {
      // Resolve my employee row (for my name) and the employee_managers rows
      // in one round-trip.
      const { data: me } = await supabase
        .from("employees")
        .select("name")
        .ilike("email", email!)
        .limit(1)
        .maybeSingle();
      const myName = (me as { name?: string } | null)?.name?.trim();
      if (!myName) return new Set();
      const { data: rows } = await supabase
        .from("employee_managers")
        .select("employee_id, manager_name")
        .ilike("manager_name", myName);
      return new Set(((rows ?? []) as Array<{ employee_id: string }>).map((r) => r.employee_id));
    },
  });

  const linkedSet = useMemo(() => linkInfo ?? new Set<string>(), [linkInfo]);

  const can = (resource: string, action: "view" | "edit"): boolean => {
    // L1 admin bypass -- Partners / Nikist / Bryon never get locked out.
    if (isAdmin) return true;
    const row = data?.byResource[resource];
    if (!row) return false; // fail-closed: unknown resource => no access
    if (action === "view") return row.can_view;
    return row.can_view && row.can_edit;
  };

  const scope = (resource: string): PermissionScope => {
    if (isAdmin) return "all";
    return (data?.byResource[resource]?.scope ?? "self") as PermissionScope;
  };

  const rowFor = (resource: string) => data?.byResource[resource];

  const isLinkedManagerOf = (employeeId: string): boolean => {
    if (isAdmin) return true;
    return linkedSet.has(employeeId);
  };

  /**
   * True when the signed-in user is allowed to see employeeId on the given
   * tab/nav resource, respecting scope -- including the new
   * 'specific_employees' option. Used by UI gates so hidden tabs stay hidden.
   */
  const canSeeEmployeeForResource = (employeeId: string, resource: string): boolean => {
    if (isAdmin) return true;
    const row = data?.byResource[resource];
    if (!row || !row.can_view) return false;
    switch (row.scope) {
      case "all": return true;
      case "self": return false;
      case "linked_manager_only": return linkedSet.has(employeeId);
      case "specific_employees": return (row.target_employee_ids ?? []).includes(employeeId);
      // own_team / own_department currently fall through to RLS for the data
      // fetch; the UI treats them as "show the tab, let the DB filter".
      default: return true;
    }
  };

  return {
    isLoading,
    isAdmin,
    can,
    scope,
    rowFor,
    isLinkedManagerOf,
    canSeeEmployeeForResource,
    linksLoading,
  };
};
