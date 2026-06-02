// Hand-written DB row types matching supabase/migrations/0001_schema.sql.
// When Supabase is connected, generated types appear at src/integrations/supabase/types.ts;
// this file is the app-facing schema layer that stays stable.

export type Position =
  | "Partner"
  | "Manager"
  | "Senior Associate"
  | "Intermediate"
  | "Associate"
  | "Operations";

export type Department = "Assurance" | "Tax" | "Advisory" | "Operations";
export type Location = "Canada" | "India";
export type CompetencyRating = "E" | "G" | "M" | "NI";
export type PotentialRating =
  | "Well Placed"
  | "Ready Now"
  | "Ready Soon"
  | "Ready Later";
export type CoreCompetencyName =
  | "Thought"
  | "Results"
  | "Expertise"
  | "People"
  | "Self";
export type InterpersonalArea =
  | "Client Communication"
  | "Team Collaboration"
  | "Adaptability"
  | "Problem-Solving"
  | "Initiative"
  | "Commitment to Firm Values"
  | "Dependability During Peak Seasons"
  | "Support for Team Members"
  | "Contributions to Firm Culture";

export interface ProfileRow {
  user_id: string;
  full_name: string;
  security_level: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface EmployeeRow {
  id: string;
  name: string;
  position: Position;
  department: Department;
  location: Location;
  tenure_with_firm: string;
  tenure_in_role: string;
  supervisor: string;
  email: string;
  phone: string;
  current_year_rating: number | null;
  current_year_rating_code: CompetencyRating;
  potential_rating: PotentialRating;
  bff_summary: string;
  performance_what_went_well: string;
  performance_what_could_go_better: string;
  performance_summary: string;
  career_aspirations_summary: string;
  dev_plan_summary: string;
  growth_rationale: string;
  created_at: string;
  updated_at: string;
}

export interface CoreCompetencyRow {
  id: string;
  employee_id: string;
  competency_name: CoreCompetencyName;
  rating_code: CompetencyRating;
  commentary: string;
}

export interface DevPlanRow {
  id: string;
  employee_id: string;
  objective: string;
  activities: string;
  support_resources: string;
  target_date: string | null;
  sort_order: number;
}

export interface InterpersonalRow {
  id: string;
  employee_id: string;
  skill_area: InterpersonalArea;
  assessment_text: string;
}

export interface ManagementNoteRow {
  id: string;
  employee_id: string;
  comment_text: string;
  comment_by: string;
  created_at: string;
}

export interface PdrDocumentRow {
  id: string;
  employee_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      employees: { Row: EmployeeRow; Insert: Partial<EmployeeRow>; Update: Partial<EmployeeRow> };
      employee_core_competencies: { Row: CoreCompetencyRow; Insert: Partial<CoreCompetencyRow>; Update: Partial<CoreCompetencyRow> };
      employee_dev_plan_rows: { Row: DevPlanRow; Insert: Partial<DevPlanRow>; Update: Partial<DevPlanRow> };
      employee_interpersonal: { Row: InterpersonalRow; Insert: Partial<InterpersonalRow>; Update: Partial<InterpersonalRow> };
      management_notes: { Row: ManagementNoteRow; Insert: Partial<ManagementNoteRow>; Update: Partial<ManagementNoteRow> };
      pdr_documents: { Row: PdrDocumentRow; Insert: Partial<PdrDocumentRow>; Update: Partial<PdrDocumentRow> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      employee_position: Position;
      employee_department: Department;
      employee_location: Location;
      competency_rating: CompetencyRating;
      potential_rating: PotentialRating;
      core_competency: CoreCompetencyName;
      interpersonal_area: InterpersonalArea;
    };
  };
}
