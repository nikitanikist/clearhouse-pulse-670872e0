// Date/tenure helpers used across the employee profile views.

export function formatTenure(startIso: string | null | undefined, fallback?: string | null): string {
  if (!startIso) return fallback ?? "";
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return fallback ?? "";
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return fallback ?? "";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return "Less than a month";

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  const yearPart = `${years} year${years === 1 ? "" : "s"}`;
  if (months === 0) return yearPart;
  return `${yearPart}, ${months} month${months === 1 ? "" : "s"}`;
}

export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
