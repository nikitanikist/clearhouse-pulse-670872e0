import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PermissionScope =
  | "all"
  | "own_department"
  | "own_team"
  | "self"
  | "linked_manager_only"
  | "specific_employees";

export interface PermissionResource {
  key: string;
  label: string;
  category: "nav" | "tab" | "action";
  supports_edit: boolean;
  supports_scope: boolean;
  sort_order: number;
  description: string | null;
}

export interface PositionPermissionRow {
  position_name: string;
  resource_key: string;
  can_view: boolean;
  can_edit: boolean;
  scope: PermissionScope;
  /** uuid[] of employees this cell is scoped to -- only used when scope='specific_employees'. */
  target_employee_ids: string[];
  updated_at: string;
}

export const usePermissionResources = () =>
  useQuery({
    queryKey: ["permission-resources"],
    queryFn: async (): Promise<PermissionResource[]> => {
      const { data, error } = await supabase
        .from("permission_resources")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PermissionResource[];
    },
  });

export const usePermissionMatrix = () =>
  useQuery({
    queryKey: ["permission-matrix"],
    queryFn: async (): Promise<PositionPermissionRow[]> => {
      const { data, error } = await supabase
        .from("position_permissions")
        .select("*");
      if (error) throw error;
      return (data ?? []) as PositionPermissionRow[];
    },
  });

/**
 * Upsert a single (position, resource) toggle. Caller passes the FULL target
 * state (view/edit/scope + target_employee_ids); server writes it as one row.
 */
export const useUpdatePermissionCell = () => {
  const qc = useQueryClient();
  return async (args: {
    position_name: string;
    resource_key: string;
    can_view: boolean;
    can_edit: boolean;
    scope: PermissionScope;
    target_employee_ids?: string[];
  }) => {
    const payload = {
      ...args,
      target_employee_ids: args.target_employee_ids ?? [],
    };
    const { error } = await supabase
      .from("position_permissions")
      .upsert(payload as never, { onConflict: "position_name,resource_key" });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["permission-matrix"] });
    await qc.invalidateQueries({ queryKey: ["my-permissions"] });
  };
};

/** Permissions for the signed-in user's current position. */
export const useMyPermissions = () =>
  useQuery({
    queryKey: ["my-permissions"],
    queryFn: async (): Promise<Record<string, PositionPermissionRow>> => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email?.toLowerCase();
      if (!email) return {};

      const { data: emp } = await supabase
        .from("employees")
        .select("position")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      const position = (emp as { position?: string } | null)?.position;
      if (!position) return {};

      const { data } = await supabase
        .from("position_permissions")
        .select("*")
        .eq("position_name", position);

      const out: Record<string, PositionPermissionRow> = {};
      for (const row of (data ?? []) as PositionPermissionRow[]) {
        out[row.resource_key] = row;
      }
      return out;
    },
  });
