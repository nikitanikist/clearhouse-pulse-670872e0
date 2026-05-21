import { supabase } from "@/lib/supabase";
import type { ParsedPdr } from "./types";
import type { CoreCompetencyName } from "@/types/database";

const COMPETENCY_NAMES: CoreCompetencyName[] = ["Thought", "Results", "Expertise", "People", "Self"];

export async function applyParsedPdr(employeeId: string, parsed: ParsedPdr): Promise<void> {
  // 1. Update employee row
  const employeeUpdate: Record<string, unknown> = {
    bff_summary: parsed.bff_summary,
    performance_what_went_well: parsed.performance_what_went_well,
    performance_what_could_go_better: parsed.performance_what_could_go_better,
    performance_summary: parsed.performance_summary,
    career_aspirations_summary: parsed.career_aspirations_summary,
  };
  if (parsed.current_year_rating_code) {
    employeeUpdate.current_year_rating_code = parsed.current_year_rating_code;
  }
  const { error: empErr } = await supabase.from("employees").update(employeeUpdate).eq("id", employeeId);
  if (empErr) throw empErr;

  // 2. Upsert competencies (unique on employee_id + competency_name)
  const compRows = parsed.competencies
    .filter((c) => COMPETENCY_NAMES.includes(c.competency_name) && c.rating_code)
    .map((c) => ({
      employee_id: employeeId,
      competency_name: c.competency_name,
      rating_code: c.rating_code!,
      commentary: c.commentary ?? "",
    }));
  if (compRows.length) {
    const { error: compErr } = await supabase
      .from("employee_core_competencies")
      .upsert(compRows, { onConflict: "employee_id,competency_name" });
    if (compErr) throw compErr;
  }

  // 3. Replace dev plan rows
  const { error: delErr } = await supabase.from("employee_dev_plan_rows").delete().eq("employee_id", employeeId);
  if (delErr) throw delErr;
  if (parsed.dev_plan.length) {
    const devRows = parsed.dev_plan.map((r, i) => ({
      employee_id: employeeId,
      objective: r.objective,
      activities: r.activities,
      support_resources: r.support_resources,
      target_date: r.target_date,
      sort_order: i,
    }));
    const { error: insErr } = await supabase.from("employee_dev_plan_rows").insert(devRows);
    if (insErr) throw insErr;
  }
}
