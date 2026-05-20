import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CoreCompetencyRow,
  DevPlanRow,
  EmployeeRow,
  InterpersonalRow,
  ManagementNoteRow,
  PdrDocumentRow,
} from "@/integrations/supabase/types";
import type { Employee } from "@/data/employees";

const initialsFromName = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const rowToEmployee = (r: EmployeeRow): Employee => ({
  id: r.id,
  name: r.name,
  initials: initialsFromName(r.name),
  position: r.position,
  department: r.department,
  location: r.location,
  potential: r.potential_rating,
  email: r.email,
  phone: r.phone,
  tenure: r.tenure_with_firm,
  tenureInRole: r.tenure_in_role,
  supervisor: r.supervisor,
  currentYearRating: Number(r.current_year_rating),
  previousYearRating: 0,
  bffSummary: r.bff_summary,
});

export const useEmployees = () =>
  useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(rowToEmployee);
    },
  });

export const useEmployeeRow = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async (): Promise<EmployeeRow | null> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useEmployeeCoreCompetencies = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id, "competencies"],
    enabled: !!id,
    queryFn: async (): Promise<CoreCompetencyRow[]> => {
      const { data, error } = await supabase
        .from("employee_core_competencies")
        .select("*")
        .eq("employee_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEmployeeDevPlan = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id, "devplan"],
    enabled: !!id,
    queryFn: async (): Promise<DevPlanRow[]> => {
      const { data, error } = await supabase
        .from("employee_dev_plan_rows")
        .select("*")
        .eq("employee_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useEmployeeInterpersonal = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id, "interpersonal"],
    enabled: !!id,
    queryFn: async (): Promise<InterpersonalRow[]> => {
      const { data, error } = await supabase
        .from("employee_interpersonal")
        .select("*")
        .eq("employee_id", id!);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useManagementNotes = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id, "notes"],
    enabled: !!id,
    queryFn: async (): Promise<ManagementNoteRow[]> => {
      const { data, error } = await supabase
        .from("management_notes")
        .select("*")
        .eq("employee_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePdrDocuments = (id: string | undefined) =>
  useQuery({
    queryKey: ["employee", id, "pdrs"],
    enabled: !!id,
    queryFn: async (): Promise<PdrDocumentRow[]> => {
      const { data, error } = await supabase
        .from("pdr_documents")
        .select("*")
        .eq("employee_id", id!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
