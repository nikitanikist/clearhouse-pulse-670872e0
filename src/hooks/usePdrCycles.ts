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

export const useDeletePdrSchedule = () => {
  const qc = useQueryClient();
  return async (args: { year: number; half: PdrCycleHalf }) => {
    const { error } = await supabase
      .from("pdr_cycle_schedule")
      .delete()
      .eq("year", args.year)
      .eq("half", args.half);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["pdr-schedule"] });
  };
};

/**
 * One-click archive: writes a summary snapshot into the employees row, then
 * sets the cycle status to 'archived'. The order matters -- if the employee
 * update fails we abort before locking the cycle. The projected text ends up
 * in the Employee Profile -> Overview section automatically.
 */
export const useArchiveAndProject = () => {
  const qc = useQueryClient();
  return async (args: { cycle: PdrCycleRow }) => {
    const { cycle } = args;
    const c = mergeContent(cycle.content);

    const join = (parts: Array<string | null | undefined>) =>
      parts.map((p) => (p ?? "").trim()).filter(Boolean).join("\n\n");

    const bbfSummary = join([
      c.bbf.future && `Future I want to create:\n${c.bbf.future}`,
      c.bbf.goals && `Bold goals and dreams:\n${c.bbf.goals}`,
      c.bbf.firm_support && `How the firm can support me:\n${c.bbf.firm_support}`,
    ]);

    const performanceSummary = join([
      c.summary.reviewee_commentary && `Reviewee: ${c.summary.reviewee_commentary}`,
      c.summary.reviewer_commentary && `Reviewer: ${c.summary.reviewer_commentary}`,
      c.other_considerations && `Other considerations: ${c.other_considerations}`,
    ]);

    const devPlanSummary = c.dev_plan
      .map((row, i) =>
        [
          `${i + 1}. ${row.objective || "(no objective)"}`,
          row.activities && `   Activities: ${row.activities}`,
          row.support && `   Support: ${row.support}`,
          row.target_date && `   Target: ${row.target_date}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");

    const empPatch: Record<string, unknown> = {
      bff_summary: bbfSummary,
      performance_what_went_well: c.looking_back.what_went_well ?? "",
      performance_what_could_go_better: c.looking_back.what_could_be_better ?? "",
      performance_summary: performanceSummary,
      career_aspirations_summary: c.looking_forward.career_aspirations ?? "",
      dev_plan_summary: devPlanSummary,
      performance_updated_at: new Date().toISOString(),
    };
    if (c.reviewer_assessment) {
      empPatch.current_year_rating_code = c.reviewer_assessment;
    }

    const { error: empErr } = await supabase
      .from("employees")
      .update(empPatch as never)
      .eq("id", cycle.employee_id);
    if (empErr) throw empErr;

    const { error: cycErr } = await supabase
      .from("pdr_cycles")
      .update({ status: "archived", archived_at: new Date().toISOString() } as never)
      .eq("id", cycle.id);
    if (cycErr) throw cycErr;

    await qc.invalidateQueries({ queryKey: ["pdr-cycles", cycle.employee_id] });
    await qc.invalidateQueries({ queryKey: ["employee", cycle.employee_id] });
    await qc.invalidateQueries({ queryKey: ["employees"] });
  };
};
