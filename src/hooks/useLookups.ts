import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DepartmentRow {
  id: string;
  name: string;
}

export interface PositionRow {
  id: string;
  name: string;
  visibility_tier: number;
}

export const useDepartments = () =>
  useQuery({
    queryKey: ["departments"],
    queryFn: async (): Promise<DepartmentRow[]> => {
      const { data, error } = await supabase
        .from("departments" as never)
        .select("id, name")
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
        .select("id, name, visibility_tier")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PositionRow[];
    },
  });

/** Names only, alphabetical — convenient for dropdowns. */
export const useDepartmentNames = () => {
  const q = useDepartments();
  return { ...q, names: (q.data ?? []).map((d) => d.name) };
};

export const usePositionNames = () => {
  const q = usePositions();
  return { ...q, names: (q.data ?? []).map((p) => p.name) };
};
