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

      if (!position) return { securityLevel, byResource: {} };

      const { data: rows } = await supabase
        .from("position_permissions")
        .select("*")
        .eq("position_name", position);

      const byResource: Record<string, PositionPermissionRow> = {};
      for (const r of (rows ?? []) as PositionPermissionRow[]) {
        byResource[r.resource_key] = r;
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

  return { isLoading, isAdmin, can, scope, rowFor, isLinkedManagerOf, linksLoading };
};
