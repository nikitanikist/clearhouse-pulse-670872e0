import { useState } from "react";
import { ChevronDown, ChevronRight, Upload, Download, Trash2, Eye, Loader2 } from "lucide-react";
import type { Employee } from "@/data/employees";
import {
  useEmployeeRow,
  useEmployeeCoreCompetencies,
  useEmployeeDevPlan,
  usePdrDocuments,
} from "@/hooks/useEmployees";
import type { CompetencyRating } from "@/types/database";

interface OverviewProps {
  employee: Employee;
}

const Section = ({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className={`bg-card rounded-lg border shadow-sm transition-all group ${isOpen ? "border-primary/40" : "border-border hover:border-primary/30"}`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-muted/50 transition-all border-l-4 border-l-transparent group-hover:border-l-primary rounded-l-lg"
    >
      <h3 className="text-base font-heading font-bold text-foreground">{title}</h3>
      <div className="flex items-center gap-3">
        {!isOpen && subtitle && (
          <span className="text-sm text-muted-foreground truncate max-w-[240px]">{subtitle}</span>
        )}
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        )}
      </div>
    </button>
    {isOpen && <div className="px-6 pb-6 border-t border-border pt-4">{children}</div>}
  </div>
);

const TextArea = ({ label, value }: { label: string; value: string }) => (
  <div className="py-3 border-b border-border last:border-0">
    <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{value || "—"}</p>
  </div>
);

const ratingConfig: Record<CompetencyRating, { label: string; color: string; bg: string }> = {
  E: { label: "Excellent", color: "text-white", bg: "bg-[#10B981]" },
  G: { label: "Good", color: "text-white", bg: "bg-[#0072BC]" },
  M: { label: "Meets", color: "text-white", bg: "bg-[#F59E0B]" },
  NI: { label: "Needs Improvement", color: "text-white", bg: "bg-[#EF4444]" },
};

const RatingBadge = ({ code }: { code: CompetencyRating }) => {
  const cfg = ratingConfig[code];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {code} — {cfg.label}
    </span>
  );
};

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const Overview = ({ employee }: OverviewProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const { data: row, isLoading: loadingRow } = useEmployeeRow(employee.id);
  const { data: competencies = [] } = useEmployeeCoreCompetencies(employee.id);
  const { data: devPlan = [] } = useEmployeeDevPlan(employee.id);
  const { data: pdrs = [] } = usePdrDocuments(employee.id);

  const toggle = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  if (loadingRow || !row) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Section
        title="Performance"
        subtitle={`${row.current_year_rating_code} — ${ratingConfig[row.current_year_rating_code].label}`}
        isOpen={openSection === "performance"}
        onToggle={() => toggle("performance")}
      >
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Year Performance Rating</p>
            <RatingBadge code={row.current_year_rating_code} />
          </div>

          <TextArea label="What Has Gone Well" value={row.performance_what_went_well} />
          <TextArea label="What Could Have Gone Better" value={row.performance_what_could_go_better} />
          <TextArea label="Summary of Overall Performance" value={row.performance_summary} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Core Competency Ratings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competencies.map((comp) => (
                <div key={comp.id} className="bg-muted/30 rounded-lg border border-border p-4">
                  <h4 className="text-sm font-heading font-bold text-foreground mb-2">{comp.competency_name}</h4>
                  <RatingBadge code={comp.rating_code} />
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{comp.commentary}</p>
                </div>
              ))}
              {competencies.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">No competency ratings recorded.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="My Bigger, Brighter Future"
        isOpen={openSection === "bff"}
        onToggle={() => toggle("bff")}
      >
        <TextArea label="BFF Summary" value={row.bff_summary} />
      </Section>

      <Section
        title="Career Aspirations & Development Plan"
        isOpen={openSection === "career"}
        onToggle={() => toggle("career")}
      >
        <div className="space-y-6">
          <TextArea label="Career Aspirations Summary" value={row.career_aspirations_summary} />
          <TextArea label="Professional Development Plan Summary" value={row.dev_plan_summary} />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Professional Development Plan</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-4 py-3 text-left text-xs font-semibold">Development Objectives</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Activities to Undertake</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Support & Resources Needed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold">Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {devPlan.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 bg-card">
                      <td className="px-4 py-3 font-medium text-foreground">{r.objective}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.activities}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.support_resources}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.target_date ?? "—"}</td>
                    </tr>
                  ))}
                  {devPlan.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No development plan rows recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="PDRs (Performance Development Reviews)"
        subtitle={`${pdrs.length} document${pdrs.length === 1 ? "" : "s"}`}
        isOpen={openSection === "pdrs"}
        onToggle={() => toggle("pdrs")}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag & drop PDR documents here, or{" "}
            <span className="text-primary cursor-pointer font-medium">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">(Upload wiring lands in the next phase.)</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground text-xs">File Name</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Date Uploaded</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Size</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pdrs.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium text-foreground">{doc.file_name}</td>
                  <td className="py-3 text-muted-foreground">{formatDate(doc.uploaded_at)}</td>
                  <td className="py-3 text-muted-foreground">{formatBytes(doc.file_size)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary/80 transition-colors" title="View"><Eye className="h-4 w-4" /></button>
                      <button className="text-primary hover:text-primary/80 transition-colors" title="Download"><Download className="h-4 w-4" /></button>
                      <button className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pdrs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No PDR documents uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default Overview;
