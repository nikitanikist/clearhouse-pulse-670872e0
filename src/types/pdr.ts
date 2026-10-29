// Phase 9A: PDR cycle content shape -- mirrors Bryon's Word template.
// Stored as a single jsonb blob in pdr_cycles.content.

import type { CompetencyRating } from "@/types/database";

export type PdrCycleHalf = "midyear" | "yearend";
export type PdrCycleStatus = "open" | "shutdown" | "archived";

export interface CompetencyBlock {
  reviewee_rating: CompetencyRating | "";
  reviewer_rating: CompetencyRating | "";
  reviewee_commentary: string;
  reviewer_commentary: string;
}

export interface DevPlanItem {
  objective: string;
  activities: string;
  support: string;
  target_date: string; // ISO date
}

export interface PdrContent {
  // "My Bigger, Brighter Future" -- Reviewee ONLY
  bbf: {
    future: string;
    goals: string;
    firm_support: string;
  };
  // Section One: Looking Back
  looking_back: {
    what_went_well: string;   // Reviewee only
    what_could_be_better: string; // Reviewee only
  };
  // Core Competencies -- 5 blocks, each dual-authored
  competencies: {
    thought: CompetencyBlock;
    results: CompetencyBlock;
    expertise: CompetencyBlock;
    people: CompetencyBlock;
    self: CompetencyBlock;
  };
  // Overall assessments
  self_assessment: CompetencyRating | "";       // Reviewee only
  reviewer_assessment: CompetencyRating | "";    // Reviewer only
  // Summary of Overall Performance
  summary: {
    reviewee_commentary: string;
    reviewer_commentary: string;
  };
  other_considerations: string;
  // Section Two: Looking Forward
  looking_forward: {
    career_aspirations: string; // Reviewee only
    dev_progress: string;        // Reviewee only
  };
  // Professional Development Plan (table)
  dev_plan: DevPlanItem[];
}

export const emptyCompetency = (): CompetencyBlock => ({
  reviewee_rating: "",
  reviewer_rating: "",
  reviewee_commentary: "",
  reviewer_commentary: "",
});

export const emptyPdrContent = (): PdrContent => ({
  bbf: { future: "", goals: "", firm_support: "" },
  looking_back: { what_went_well: "", what_could_be_better: "" },
  competencies: {
    thought:   emptyCompetency(),
    results:   emptyCompetency(),
    expertise: emptyCompetency(),
    people:    emptyCompetency(),
    self:      emptyCompetency(),
  },
  self_assessment: "",
  reviewer_assessment: "",
  summary: { reviewee_commentary: "", reviewer_commentary: "" },
  other_considerations: "",
  looking_forward: { career_aspirations: "", dev_progress: "" },
  dev_plan: [],
});

export interface PdrCycleRow {
  id: string;
  employee_id: string;
  year: number;
  half: PdrCycleHalf;
  status: PdrCycleStatus;
  content: PdrContent;
  reviewer_name_snapshot: string | null;
  opened_at: string;
  archived_at: string | null;
  updated_at: string;
}

export interface PdrScheduleRow {
  year: number;
  half: PdrCycleHalf;
  shutdown_start: string | null;
  shutdown_end: string | null;
}

export const HALF_LABEL: Record<PdrCycleHalf, string> = {
  midyear: "Mid-Year",
  yearend: "Year-End",
};
