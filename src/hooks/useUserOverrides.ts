import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PermissionScope } from "./usePermissionMatrix";

export interface UserRow {
  user_id: string;
  full_name: string;
  email: string;
  security_level: number;
  position: string | null;
}

export interface UserOverrideRow {
  user_id: string;
  resource_key: string;
  can_view: boolean;
  can_edit: boolean;
  scope: PermissionScope;
  updated_at: string;
}

export interface EffectiveMatrixCell {
  resource_key: string;
  resource_label: string;
  category: "nav" | "tab" | "action";
  can_view: boolean;
  can_edit: boolean;
  scope: PermissionScope;
  is_overridden: boolean;
}

/**
 * Full list of portal users with their position. Used by the User Overrides
 * card to let an admin pick someone to override.
 */
export const useAllUsersForOverrides = () =>
  useQuery({
    queryKey: ["user-overrides", "users"],
    queryFn: async (): Promise<UserRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, security_level")
        .order("full_name");
      if (error) throw error;

      const emails = ((profiles ?? []) as Array<{ email: string | null }>)
        .map((p) => (p.email ?? "").toLowerCase())
        .filter(Boolean);
      let posByEmail = new Map<string, string>();
      if (emails.length > 0) {
        const { data: emps } = await supabase
          .from("employees")
          .select("email, position")
          .in("email", emails);
        for (const e of (emps ?? []) as Array<{ email: string; position: string }>) {
          posByEmail.set((e.email ?? "").toLowerCase(), e.position);
        }
      }

      return ((profiles ?? []) as Array<UserRow>).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name ?? p.email ?? "—",
        email: p.email ?? "",
        security_level: p.security_level ?? 6,
        position: posByEmail.get((p.email ?? "").toLowerCase()) ?? null,
      }));
    },
  });

/**
 * The effective matrix for ONE target user: every resource, with the actual
 * can_view / can_edit / scope they end up with (override OR position default),
 * plus a flag telling us whether the row IS an override. Powered by the SQL
 * function effective_matrix_for_user(uuid).
 */
export const useEffectiveMatrixForUser = (userId: string | null) =>
  useQuery({
    queryKey: ["user-overrides", "effective", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EffectiveMatrixCell[]> => {
      const { data, error } = await supabase.rpc("effective_matrix_for_user", {
        target_user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as EffectiveMatrixCell[];
    },
  });

export const useSetUserOverride = () => {
  const qc = useQueryClient();
  return async (args: {
    user_id: string;
    resource_key: string;
    can_view: boolean;
    can_edit: boolean;
    scope: PermissionScope;
  }) => {
    const { error } = await supabase
      .from("user_permission_overrides")
      .upsert([args] as never, { onConflict: "user_id,resource_key" });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["user-overrides"] });
    await qc.invalidateQueries({ queryKey: ["can-do"] });
  };
};

export const useClearUserOverride = () => {
  const qc = useQueryClient();
  return async (args: { user_id: string; resource_key: string }) => {
    const { error } = await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("user_id", args.user_id)
      .eq("resource_key", args.resource_key);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["user-overrides"] });
    await qc.invalidateQueries({ queryKey: ["can-do"] });
  };
};
