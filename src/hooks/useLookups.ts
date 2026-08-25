import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DepartmentRow {
  id: string;
  name: string;
  is_active: boolean;
}

export interface PositionRow {
  id: string;
  name: string;
  visibility_tier: number;
  is_active: boolean;
}

export const useDepartments = () =>
  useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<DepartmentRow[]> => {
      const { data, error } = await supabase
        .from("departments" as never)
        .select("id, name, is_active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as DepartmentRow[];
    },
  });

export const usePositions = () =>
  useQuery({
    queryKey: ["positions"],
    queryFn: async (): Promise<PositionRow[]> => {
      const { data, error } = await supabase
        .from("positions" as never)
        .select("id, name, visibility_tier, is_active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PositionRow[];
    },
  });

/** Active names only, alphabetical — convenient for dropdowns. */
export const useDepartmentNames = () => {
  const q = useDepartments();
  return { ...q, names: (q.data ?? []).filter((d) => d.is_active !== false).map((d) => d.name) };
};

export const usePositionNames = () => {
  const q = usePositions();
  return { ...q, names: (q.data ?? []).filter((p) => p.is_active !== false).map((p) => p.name) };
};
