import { Info, Loader2 } from "lucide-react";
import { useEmployeeRow } from "@/hooks/useEmployees";
import type { PotentialRating } from "@/types/database";

const potentialOptions: { value: PotentialRating; desc: string }[] = [
  { value: "Well Placed", desc: "Right role for now" },
  { value: "Ready Now", desc: "Ready immediately" },
  { value: "Ready Soon", desc: "12-24 months" },
  { value: "Ready Later", desc: "2+ years" },
];

const GrowthPotential = ({ employeeId }: { employeeId: string }) => {
  const { data: employee, isLoading } = useEmployeeRow(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading growth & potential…
      </div>
    );
  }

  const selected = employee?.potential_rating;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
        <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
        <p className="text-sm text-[#0072BC]/80">
          This section is entered manually by the manager based on their assessment of the employee's potential and readiness.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Potential Rating</h3>
        <div className="flex flex-wrap gap-3">
          {potentialOptions.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-default ${
                p.value === selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent border border-border text-muted-foreground"
              }`}
            >
              {p.value}
              <span className="font-normal ml-1 opacity-70">({p.desc})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Rationale for Potential Rating</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {employee?.growth_rationale || "No rationale recorded yet."}
        </p>
      </div>
    </div>
  );
};

export default GrowthPotential;
