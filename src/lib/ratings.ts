import type { CompetencyRating } from "@/types/database";

export const RATING_LABELS: Record<CompetencyRating, string> = {
  E: "Excellent",
  G: "Good",
  M: "Meets",
  NI: "Needs Improvement",
};

export const RATING_TO_NUMBER: Record<CompetencyRating, number> = {
  E: 5,
  G: 4,
  M: 3,
  NI: 1,
};

export const numberToCode = (n: number | null | undefined): CompetencyRating | null => {
  if (n === null || n === undefined) return null;
  if (n >= 4.5) return "E";
  if (n >= 3.5) return "G";
  if (n >= 2.5) return "M";
  return "NI";
};

/** Average of defined numeric ratings only (nulls excluded). Returns null when none rated. */
export const averageRating = (values: Array<number | null | undefined>): number | null => {
  const rated = values.filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (rated.length === 0) return null;
  return rated.reduce((s, v) => s + v, 0) / rated.length;
};

export const formatAverage = (avg: number | null): string => (avg === null ? "—" : avg.toFixed(1));
