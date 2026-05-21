import type { CompetencyRating, CoreCompetencyName } from "@/types/database";

export interface ParsedCompetency {
  competency_name: CoreCompetencyName;
  rating_code: CompetencyRating | null;
  commentary: string;
}

export interface ParsedDevPlanRow {
  objective: string;
  activities: string;
  support_resources: string;
  target_date: string | null;
}

export interface ParsedPdr {
  bff_summary: string;
  performance_what_went_well: string;
  performance_what_could_go_better: string;
  performance_summary: string;
  career_aspirations_summary: string;
  current_year_rating_code: CompetencyRating | null;
  competencies: ParsedCompetency[];
  dev_plan: ParsedDevPlanRow[];
  warnings: string[];
}
