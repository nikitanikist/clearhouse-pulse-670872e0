import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SkillAreaRow {
  name: string;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

export const useInterpersonalSkillAreas = () =>
  useQuery({
    queryKey: ["interpersonal-skill-areas"],
    queryFn: async (): Promise<SkillAreaRow[]> => {
      const { data, error } = await supabase
        .from("interpersonal_skill_areas")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SkillAreaRow[];
    },
  });

/** Convenience: only active rows (for the Interpersonal Skills tab form). */
export const useActiveInterpersonalSkillAreas = () => {
  const q = useInterpersonalSkillAreas();
  return {
    ...q,
    data: (q.data ?? []).filter((r) => r.is_active),
  };
};

export const useAddSkillArea = () => {
  const qc = useQueryClient();
  return async (args: { name: string }) => {
    const name = args.name.trim();
    if (!name) throw new Error("Name cannot be empty");
    const { data: existing } = await supabase
      .from("interpersonal_skill_areas")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder =
      ((existing as Array<{ sort_order: number }> | null)?.[0]?.sort_order ?? 0) + 10;
    const { error } = await supabase
      .from("interpersonal_skill_areas")
      .insert([{ name, sort_order: nextOrder, is_active: true }] as never);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["interpersonal-skill-areas"] });
  };
};

export const useUpdateSkillArea = () => {
  const qc = useQueryClient();
  return async (args: {
    original_name: string;
    patch: Partial<Pick<SkillAreaRow, "name" | "sort_order" | "is_active">>;
  }) => {
    const { error } = await supabase
      .from("interpersonal_skill_areas")
      .update(args.patch as never)
      .eq("name", args.original_name);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["interpersonal-skill-areas"] });
  };
};

export const useDeleteSkillArea = () => {
  const qc = useQueryClient();
  return async (args: { name: string }) => {
    const { error } = await supabase
      .from("interpersonal_skill_areas")
      .delete()
      .eq("name", args.name);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["interpersonal-skill-areas"] });
  };
};
