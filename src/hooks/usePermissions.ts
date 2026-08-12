import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDefaultPermissions,
  mergePermissions,
  type Permissions,
} from "@/lib/permissions";

interface PermissionProfile {
  security_level: number;
  custom_permissions: Partial<Permissions> | null;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data } = useQuery({
    queryKey: ["permissions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PermissionProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("security_level, custom_permissions")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PermissionProfile | null;
    },
  });

  if (!data) return getDefaultPermissions(5);
  return mergePermissions(data.security_level, data.custom_permissions);
};
