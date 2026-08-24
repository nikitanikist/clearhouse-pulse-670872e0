import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type AccessScope =
  | "all"
  | "own_department"
  | "own_location"
  | "own_reports"
  | "own_reports_tree"
  | "self"
  | "custom";

export interface AccessRule {
  position: string;
  visibility_scope: AccessScope;
  visible_position_titles: string[];
  notes_scope: AccessScope;
  notes_visible_position_titles: string[];
  can_manage_access_rules: boolean;
  can_manage_lookups: boolean;
  can_manage_users: boolean;
  can_import_data: boolean;
  can_add_employee: boolean;
  can_edit_employee_profile: boolean;
  can_edit_performance: boolean;
  can_edit_interpersonal: boolean;
  can_edit_growth: boolean;
  can_edit_notes: boolean;
}

/** Fetch every access rule, ordered by position name. */
export const useAccessRules = (enabled = true) =>
  useQuery({
    queryKey: ["access_rules"],
    enabled,
    queryFn: async (): Promise<AccessRule[]> => {
      const { data, error } = await supabase
        .from("access_rules" as never)
        .select("*")
        .order("position");
      if (error) throw error;
      return (data ?? []) as unknown as AccessRule[];
    },
  });

/** True when the caller's position rule (or L1 fallback) allows managing access rules. */
export const useCanManageAccessRules = () =>
  useQuery({
    queryKey: ["can_manage_access_rules"],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc(
        "current_user_can" as never,
        { cap: "can_manage_access_rules" } as never,
      );
      if (error) throw error;
      return Boolean(data);
    },
  });

/** Insert or update a single rule, keyed by position. */
export const useUpsertAccessRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: AccessRule) => {
      const { error } = await supabase
        .from("access_rules" as never)
        .upsert(rule as never, { onConflict: "position" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access_rules"] });
    },
  });
};
