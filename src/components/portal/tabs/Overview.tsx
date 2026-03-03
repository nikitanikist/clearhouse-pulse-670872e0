import { useState } from "react";
import { ChevronDown, ChevronRight, Upload, Download, Trash2, Star } from "lucide-react";
import type { Employee } from "@/data/employees";

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
}) => {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-base font-heading font-bold text-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          {!isOpen && subtitle && (
            <span className="text-sm text-muted-foreground truncate max-w-[240px]">{subtitle}</span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>
      {isOpen && <div className="px-6 pb-6 border-t border-border pt-4">{children}</div>}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="py-3 border-b border-border last:border-0">
    <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

const RatingBadge = ({ score, max = 5 }: { score: number; max?: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.floor(score) ? "fill-warning text-warning" : "text-border"}`}
        />
      ))}
    </div>
    <span className="text-sm font-semibold text-foreground">{score} / {max}</span>
  </div>
);

const Overview = ({ employee }: OverviewProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (key: string) => setOpenSection(prev => prev === key ? null : key);

  const bffPreview = employee.bffSummary.length > 80
    ? employee.bffSummary.slice(0, 80) + "…"
    : employee.bffSummary;

  return (
    <div className="space-y-4">
      <Section
        title="Performance"
        subtitle={`★ ${employee.currentYearRating} / 5`}
        isOpen={openSection === "performance"}
        onToggle={() => toggle("performance")}
      >
        <div className="space-y-0">
          <div className="py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Current Year Performance Rating</p>
            <RatingBadge score={employee.currentYearRating} />
          </div>
          <div className="py-3 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Previous Year Performance Rating</p>
            <RatingBadge score={employee.previousYearRating} />
          </div>
          <InfoRow label="Quality of Work" value="Consistently delivers accurate, well-documented work papers. Minimal review notes required." />
          <InfoRow label="Client Service Strengths" value="Excellent responsiveness to client inquiries. Builds strong rapport with mid-market clients." />
          <InfoRow label="Efficiency / Turnaround Times" value="Meets deadlines consistently. Year-end files completed ahead of schedule in 2025." />
          <InfoRow label="Reliability / Independence" value="Can manage engagement sections independently. Requires minimal supervision on recurring files." />
          <InfoRow label="Notable Contributions" value="Led the transition of 3 key clients to cloud-based bookkeeping. Mentored 2 junior associates." />
          <InfoRow label="Unique Strengths" value="Bilingual (English/Hindi). Strong Excel modeling skills. Very detail-oriented." />
        </div>
      </Section>

      <Section
        title="Bigger Brighter Future (BFF)"
        subtitle={bffPreview}
        isOpen={openSection === "bff"}
        onToggle={() => toggle("bff")}
      >
        <InfoRow label="BFF Summary" value={employee.bffSummary} />
      </Section>

      <Section
        title="Career Aspirations"
        subtitle="CPA by Q3 2026"
        isOpen={openSection === "career"}
        onToggle={() => toggle("career")}
      >
        <InfoRow label="Short Term" value="Obtain CPA designation (expected completion: Q3 2026). Take on 2 additional complex audit engagements." />
        <InfoRow label="Long Term" value="Become a Manager within 2-3 years. Eventually transition into an advisory-focused Partner track." />
        <InfoRow label="Development Needs & Plans" value="Needs deeper exposure to IFRS 16 and revenue recognition standards. Scheduled for firm-sponsored training in June 2026." />
        <InfoRow label="Technical Gaps" value="Limited experience with US GAAP and cross-border compliance engagements." />
        <InfoRow label="Interpersonal Skill Development" value="Working on presenting findings more confidently to senior management during engagement reviews." />
        <InfoRow label="Training Recommendations" value="IFRS Advanced Certificate (CPA Ontario), Public speaking workshop, Leadership fundamentals program." />
      </Section>

      <Section
        title="PDRs (Performance Development Reviews)"
        subtitle="3 documents"
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
          <p className="text-sm text-muted-foreground">Drag & drop PDR documents here, or <span className="text-primary cursor-pointer font-medium">click to browse</span></p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 font-medium text-muted-foreground text-xs">File Name</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Date Uploaded</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Uploaded By</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Size</th>
                <th className="pb-2 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Priya_Sharma_PDR_2025.pdf", date: "Jan 15, 2026", by: "David Chen", size: "245 KB" },
                { name: "Priya_Sharma_PDR_2024.pdf", date: "Feb 3, 2025", by: "David Chen", size: "198 KB" },
                { name: "Priya_Sharma_PDR_2023.pdf", date: "Jan 22, 2024", by: "Sarah Wong", size: "210 KB" },
              ].map((doc) => (
                <tr key={doc.name} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium text-foreground">{doc.name}</td>
                  <td className="py-3 text-muted-foreground">{doc.date}</td>
                  <td className="py-3 text-muted-foreground">{doc.by}</td>
                  <td className="py-3 text-muted-foreground">{doc.size}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary/80 transition-colors"><Download className="h-4 w-4" /></button>
                      <button className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default Overview;
