import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface EmployeeManagerRow {
  employee_id: string;
  manager_name: string;
  sort_order: number;
}

export const useEmployeeManagers = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["employee-managers", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeManagerRow[]> => {
      const { data, error } = await supabase
        .from("employee_managers")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmployeeManagerRow[];
    },
  });

/**
 * Replace the full manager list for an employee. Takes an ordered array of
 * manager NAMES (free text matching another employee's name). Dual-writes
 * the first two entries into employees.supervisor + co_supervisor so the
 * existing Org Chart, supervisor-chain RLS, and scope filters all keep
 * working without a mass rewrite.
 */
export const useSaveEmployeeManagers = () => {
  const qc = useQueryClient();
  return async (args: { employee_id: string; manager_names: string[] }) => {
    const names = args.manager_names
      .map((n) => n.trim())
      .filter((n, i, a) => n.length > 0 && a.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);

    // 1. Nuke the current list, insert the new one in order.
    const { error: delErr } = await supabase
      .from("employee_managers")
      .delete()
      .eq("employee_id", args.employee_id);
    if (delErr) throw delErr;

    if (names.length > 0) {
      const rows = names.map((manager_name, sort_order) => ({
        employee_id: args.employee_id,
        manager_name,
        sort_order,
      }));
      const { error: insErr } = await supabase
        .from("employee_managers")
        .insert(rows as never);
      if (insErr) throw insErr;
    }

    // 2. Dual-write supervisor + co_supervisor for backwards compatibility.
    const { error: upErr } = await supabase
      .from("employees")
      .update({
        supervisor: names[0] ?? "",
        co_supervisor: names[1] ?? null,
      } as never)
      .eq("id", args.employee_id);
    if (upErr) throw upErr;

    await qc.invalidateQueries({ queryKey: ["employee-managers", args.employee_id] });
    await qc.invalidateQueries({ queryKey: ["employees"] });
    await qc.invalidateQueries({ queryKey: ["employee", args.employee_id] });
  };
};
