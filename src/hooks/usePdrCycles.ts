import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  emptyPdrContent,
  type PdrContent,
  type PdrCycleHalf,
  type PdrCycleRow,
  type PdrCycleStatus,
  type PdrScheduleRow,
} from "@/types/pdr";

export const usePdrCycles = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["pdr-cycles", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<PdrCycleRow[]> => {
      const { data, error } = await supabase
        .from("pdr_cycles")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("year", { ascending: false })
        .order("half", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: unknown) => normalizeRow(r as PdrCycleRow));
    },
  });

export const usePdrSchedule = () =>
  useQuery({
    queryKey: ["pdr-schedule"],
    queryFn: async (): Promise<PdrScheduleRow[]> => {
      const { data, error } = await supabase
        .from("pdr_cycle_schedule")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PdrScheduleRow[];
    },
  });

const normalizeRow = (r: PdrCycleRow): PdrCycleRow => ({
  ...r,
  content: mergeContent(r.content as Partial<PdrContent> | null),
});

/** Fill missing jsonb fields with defaults so the form never crashes on an
 *  older row that was saved before a new field was added. */
export const mergeContent = (c: Partial<PdrContent> | null | undefined): PdrContent => {
  const base = emptyPdrContent();
  if (!c) return base;
  return {
    bbf:              { ...base.bbf,              ...(c.bbf              ?? {}) },
    looking_back:     { ...base.looking_back,     ...(c.looking_back     ?? {}) },
    competencies: {
      thought:   { ...base.competencies.thought,   ...((c.competencies?.thought   ?? {}) as object) },
      results:   { ...base.competencies.results,   ...((c.competencies?.results   ?? {}) as object) },
      expertise: { ...base.competencies.expertise, ...((c.competencies?.expertise ?? {}) as object) },
      people:    { ...base.competencies.people,    ...((c.competencies?.people    ?? {}) as object) },
      self:      { ...base.competencies.self,      ...((c.competencies?.self      ?? {}) as object) },
    },
    self_assessment:    (c.self_assessment    ?? base.self_assessment),
    reviewer_assessment:(c.reviewer_assessment?? base.reviewer_assessment),
    summary:            { ...base.summary,            ...(c.summary            ?? {}) },
    other_considerations:(c.other_considerations ?? base.other_considerations),
    looking_forward:    { ...base.looking_forward,    ...(c.looking_forward    ?? {}) },
    dev_plan:            Array.isArray(c.dev_plan) ? c.dev_plan : base.dev_plan,
  };
};

export const useCreatePdrCycle = () => {
  const qc = useQueryClient();
  return async (args: {
    employee_id: string;
    year: number;
    half: PdrCycleHalf;
    reviewer_name_snapshot: string | null;
  }): Promise<PdrCycleRow> => {
    const { data, error } = await supabase
      .from("pdr_cycles")
      .insert([{
        employee_id: args.employee_id,
        year: args.year,
        half: args.half,
        status: "open",
        content: emptyPdrContent() as unknown,
        reviewer_name_snapshot: args.reviewer_name_snapshot,
      }] as never)
      .select("*")
      .single();
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pdr-cycles", args.employee_id] });
    return normalizeRow(data as PdrCycleRow);
  };
};

export const useSavePdrContent = () => {
  const qc = useQueryClient();
  return async (args: { id: string; employee_id: string; content: PdrContent }) => {
    const { error } = await supabase
      .from("pdr_cycles")
      .update({ content: args.content as unknown } as never)
      .eq("id", args.id);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pdr-cycles", args.employee_id] });
  };
};

export const useSetPdrStatus = () => {
  const qc = useQueryClient();
  return async (args: {
    id: string;
    employee_id: string;
    status: PdrCycleStatus;
  }) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "archived") patch.archived_at = new Date().toISOString();
    const { error } = await supabase
      .from("pdr_cycles")
      .update(patch as never)
      .eq("id", args.id);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pdr-cycles", args.employee_id] });
  };
};

export const useUpsertPdrSchedule = () => {
  const qc = useQueryClient();
  return async (args: PdrScheduleRow) => {
    const { error } = await supabase
      .from("pdr_cycle_schedule")
      .upsert([args] as never, { onConflict: "year,half" });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pdr-schedule"] });
  };
};
