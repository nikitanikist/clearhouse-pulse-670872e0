import { useState } from "react";
import { ChevronDown, ChevronRight, Upload, Download, Trash2, Eye, Info } from "lucide-react";
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
};

const TextArea = ({ label, value }: { label: string; value: string }) => (
  <div className="py-3 border-b border-border last:border-0">
    <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{value}</p>
  </div>
);

type RatingCode = "E" | "G" | "M" | "NI";

const ratingConfig: Record<RatingCode, { label: string; color: string; bg: string }> = {
  E: { label: "Excellent", color: "text-white", bg: "bg-[#10B981]" },
  G: { label: "Good", color: "text-white", bg: "bg-[#0072BC]" },
  M: { label: "Meets", color: "text-white", bg: "bg-[#F59E0B]" },
  NI: { label: "Needs Improvement", color: "text-white", bg: "bg-[#EF4444]" },
};

const RatingBadge = ({ code }: { code: RatingCode }) => {
  const cfg = ratingConfig[code];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {code} — {cfg.label}
    </span>
  );
};

interface CoreCompetency {
  name: string;
  rating: RatingCode;
  commentary: string;
}

const coreCompetencies: CoreCompetency[] = [
  {
    name: "Thought",
    rating: "G",
    commentary: "Demonstrates strong analytical thinking on audit files. Proactively identifies risk areas. Could push further in developing innovative approaches to recurring engagement challenges.",
  },
  {
    name: "Results",
    rating: "E",
    commentary: "Consistently meets and exceeds deadlines. Year-end files completed ahead of schedule. Led 3 successful client transitions with zero disruption to service delivery.",
  },
  {
    name: "Expertise",
    rating: "G",
    commentary: "Solid technical accounting knowledge. CPA designation on track for Q3 2026. Needs deeper exposure to IFRS 16 and cross-border compliance to reach the next level.",
  },
  {
    name: "People",
    rating: "G",
    commentary: "Effective communicator with clients and peers. Actively mentors junior associates. Working on building confidence when presenting to senior leadership during engagement reviews.",
  },
  {
    name: "Self",
    rating: "M",
    commentary: "Maintains good work-life balance during off-peak periods. Acknowledged need to better manage stress and workload prioritization during busy season. Self-aware and open to feedback.",
  },
];

const devPlan = [
  {
    objective: "Obtain CPA designation",
    activities: "Complete PERT requirements, prepare for CFE",
    support: "Firm-sponsored study leave (2 weeks), CPA prep course reimbursement",
    target: "Q3 2026",
  },
  {
    objective: "Deepen IFRS 16 & revenue recognition knowledge",
    activities: "Attend IFRS Advanced Certificate program (CPA Ontario)",
    support: "Course registration fee, 3 days off for in-person sessions",
    target: "June 2026",
  },
  {
    objective: "Develop leadership & presentation skills",
    activities: "Enroll in Leadership Fundamentals program, present at 2 internal team sessions",
    support: "Access to firm's leadership training budget, mentorship from a Senior Manager",
    target: "Q4 2026",
  },
  {
    objective: "Gain cross-border compliance exposure",
    activities: "Shadow a US tax engagement, attend cross-border tax workshop",
    support: "Assignment to a cross-border file by Manager, workshop registration",
    target: "Q1 2027",
  },
];

const Overview = ({ employee }: OverviewProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (key: string) => setOpenSection(prev => prev === key ? null : key);

  return (
    <div className="space-y-4">
      {/* Performance */}
      <Section
        title="Performance"
        subtitle="G — Good"
        isOpen={openSection === "performance"}
        onToggle={() => toggle("performance")}
      >
        <div className="space-y-6">
          {/* Current Year Performance Rating */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Year Performance Rating</p>
            <RatingBadge code="G" />
          </div>

          <TextArea
            label="What Has Gone Well"
            value="Priya consistently delivered high-quality work papers across 12 audit engagements this year. She took full ownership of the Meridian Group file and received positive client feedback. She also mentored two junior associates and led the transition of three clients to cloud-based bookkeeping. Her attention to detail and ability to manage timelines independently were standout strengths this review period."
          />

          <TextArea
            label="What Could Have Gone Better"
            value="Priya acknowledged that she could have been more proactive in raising concerns on the TechNova engagement earlier in the process. She also identified that her time management during peak season could improve — specifically around balancing multiple concurrent files without letting quality slip on lower-priority engagements."
          />

          <TextArea
            label="Summary of Overall Performance"
            value="Overall, Priya met and frequently exceeded the expectations of her role. She is a reliable, detail-oriented team member who consistently produces work that requires minimal review. Her growth over the past 12 months has been notable, particularly in her ability to manage client relationships and work independently."
          />

          {/* Core Competency Ratings */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Core Competency Ratings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coreCompetencies.map((comp) => (
                <div key={comp.name} className="bg-muted/30 rounded-lg border border-border p-4">
                  <h4 className="text-sm font-heading font-bold text-foreground mb-2">{comp.name}</h4>
                  <RatingBadge code={comp.rating} />
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{comp.commentary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* My Bigger, Brighter Future */}
      <Section
        title="My Bigger, Brighter Future"
        isOpen={openSection === "bff"}
        onToggle={() => toggle("bff")}
      >
        <TextArea label="BFF Summary" value={employee.bffSummary} />
      </Section>

      {/* Career Aspirations & Development Plan */}
      <Section
        title="Career Aspirations & Development Plan"
        subtitle="CPA by Q3 2026"
        isOpen={openSection === "career"}
        onToggle={() => toggle("career")}
      >
        <div className="space-y-6">
          <TextArea
            label="Career Aspirations Summary"
            value="Priya's career vision is to grow into a managerial role within the Assurance practice within 2-3 years, eventually leading a team of 5-8 associates. She is interested in gaining sideways exposure to IFRS advisory work before moving upward. Long-term, she is considering a Partner track focused on mid-market audit and advisory clients."
          />

          <TextArea
            label="Professional Development Plan Summary"
            value="Priya has made solid progress against her development goals from the last review cycle. She completed two of three planned training modules (Advanced Excel Modeling and Client Relationship Management). The IFRS Advanced Certificate is scheduled for June 2026. Her focus for the next 12 months is on deepening technical expertise and building leadership skills."
          />

          {/* Development Plan Table */}
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
                  {devPlan.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0 bg-card">
                      <td className="px-4 py-3 font-medium text-foreground">{row.objective}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.activities}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.support}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Section>

      {/* PDRs */}
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
                      <button onClick={() => window.open('#', '_blank')} className="text-primary hover:text-primary/80 transition-colors" title="View"><Eye className="h-4 w-4" /></button>
                      <button className="text-primary hover:text-primary/80 transition-colors" title="Download"><Download className="h-4 w-4" /></button>
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
