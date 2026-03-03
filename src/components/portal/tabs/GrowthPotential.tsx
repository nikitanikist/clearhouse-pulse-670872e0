import { Circle } from "lucide-react";

const potentialOptions = ["High", "Medium", "Developing"] as const;
const selectedPotential = "High";

const DotRating = ({ filled, total = 5 }: { filled: number; total?: number }) => (
  <div className="flex gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <Circle
        key={i}
        className={`h-4 w-4 ${i < filled ? "fill-primary text-primary" : "text-border"}`}
      />
    ))}
  </div>
);

const indicators = [
  {
    label: "Readiness for More Complex Work",
    rating: 4,
    text: "Ready for complex multi-entity audit engagements. Would benefit from exposure to public company audits.",
  },
  {
    label: "Leadership Readiness",
    rating: 3,
    text: "Shows natural mentoring ability. Needs formal leadership training before taking on direct reports.",
  },
  {
    label: "Ability to Manage Client Files Independently",
    rating: 4,
    text: "Manages recurring client files with minimal oversight. Needs support on new or complex engagements.",
  },
];

const GrowthPotential = () => (
  <div className="space-y-6">
    {/* Potential Rating */}
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <h3 className="text-base font-heading font-bold text-foreground mb-4">Potential Rating</h3>
      <div className="flex gap-3">
        {potentialOptions.map((p) => (
          <span
            key={p}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              p === selectedPotential
                ? "bg-success text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {p.toUpperCase()}
          </span>
        ))}
      </div>
    </div>

    {/* Indicators */}
    {indicators.map((ind) => (
      <div key={ind.label} className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">{ind.label}</h3>
        <DotRating filled={ind.rating} />
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{ind.text}</p>
      </div>
    ))}
  </div>
);

export default GrowthPotential;
