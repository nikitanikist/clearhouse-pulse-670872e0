import { useState } from "react";
import { Info } from "lucide-react";

const potentialOptions = [
  { key: "well-placed", label: "Well Placed", desc: "Right role for now" },
  { key: "ready-now", label: "Ready Now", desc: "Ready immediately" },
  { key: "ready-soon", label: "Ready Soon", desc: "12-24 months" },
  { key: "ready-later", label: "Ready Later", desc: "2+ years" },
] as const;

const GrowthPotential = () => {
  const [selected, setSelected] = useState("ready-soon");

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
        <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
        <p className="text-sm text-[#0072BC]/80">
          This section is entered manually by the manager based on their assessment of the employee's potential and readiness.
        </p>
      </div>

      {/* Potential Rating */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Potential Rating</h3>
        <div className="flex flex-wrap gap-3">
          {potentialOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                p.key === selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {p.label}
              <span className="font-normal ml-1 opacity-70">({p.desc})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rationale */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Rationale for Potential Rating</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Priya demonstrates strong technical ability and growing leadership qualities. She is on track for CPA designation in Q3 2026, which is a key milestone before a promotion to Manager. She still needs 12-18 months of additional experience managing complex engagements independently and leading small teams before she is ready for a formal managerial role. Recommend revisiting readiness in Q1 2027.
        </p>
      </div>
    </div>
  );
};

export default GrowthPotential;
