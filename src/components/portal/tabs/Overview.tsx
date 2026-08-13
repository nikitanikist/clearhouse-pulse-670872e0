import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download, Trash2, Eye, Loader2, Pencil } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Employee } from "@/data/employees";
import {
  useEmployeeRow,
  useEmployeeCoreCompetencies,
  useEmployeeDevPlan,
  usePdrDocuments,
} from "@/hooks/useEmployees";
import type { CompetencyRating, CoreCompetencyRow } from "@/types/database";
import { supabase } from "@/lib/supabase";
import PdrUploader from "@/components/portal/pdr/PdrUploader";
import PdrReviewDialog from "@/components/portal/pdr/PdrReviewDialog";
import type { ParsedPdr } from "@/lib/pdr/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDateLong } from "@/lib/tenure";

interface OverviewProps {
  employee: Employee;
  readOnly?: boolean;
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
    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line max-w-[70ch]">{value || "—"}</p>
  </div>
);

const ratingConfig: Record<CompetencyRating, { label: string; color: string; bg: string }> = {
  E: { label: "Excellent", color: "text-white", bg: "bg-[#10B981]" },
  G: { label: "Good", color: "text-white", bg: "bg-[#0072BC]" },
  M: { label: "Meets", color: "text-white", bg: "bg-[#F59E0B]" },
  NI: { label: "Needs Improvement", color: "text-white", bg: "bg-[#EF4444]" },
};

const RATING_CODES: CompetencyRating[] = ["E", "G", "M", "NI"];

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

// ---------- Edit Performance dialog ----------
const EditPerformanceDialog = ({
  open,
  onOpenChange,
  employeeId,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeId: string;
  initial: {
    current_year_rating_code: CompetencyRating;
    current_year_rating: number | null;
    performance_what_went_well: string;
    performance_what_could_go_better: string;
    performance_summary: string;
  };
}) => {
  const qc = useQueryClient();
  const [code, setCode] = useState<CompetencyRating>(initial.current_year_rating_code);
  const [rating, setRating] = useState<string>(
    initial.current_year_rating === null ? "" : String(initial.current_year_rating),
  );
  const [went, setWent] = useState(initial.performance_what_went_well);
  const [better, setBetter] = useState(initial.performance_what_could_go_better);
  const [summary, setSummary] = useState(initial.performance_summary);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(initial.current_year_rating_code);
      setRating(initial.current_year_rating === null ? "" : String(initial.current_year_rating));
      setWent(initial.performance_what_went_well);
      setBetter(initial.performance_what_could_go_better);
      setSummary(initial.performance_summary);
    }
  }, [open, initial]);

  const save = async () => {
    setSaving(true);
    const num = rating.trim() === "" ? null : Number(rating);
    if (num !== null && (Number.isNaN(num) || num < 0 || num > 5)) {
      setSaving(false);
      toast.error("Rating must be between 0 and 5");
      return;
    }
    const { error } = await supabase
      .from("employees")
      .update({
        current_year_rating_code: code,
        current_year_rating: num,
        performance_what_went_well: went,
        performance_what_could_go_better: better,
        performance_summary: summary,
        performance_updated_at: new Date().toISOString(),
      } as never)
      .eq("id", employeeId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Performance updated");
    qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit performance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perf-code" className="text-xs font-medium text-muted-foreground">Rating code</Label>
              <select
                id="perf-code"
                value={code}
                onChange={(e) => setCode(e.target.value as CompetencyRating)}
                className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {RATING_CODES.map((c) => (
                  <option key={c} value={c}>{c} — {ratingConfig[c].label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="perf-rating" className="text-xs font-medium text-muted-foreground">Rating (0-5)</Label>
              <input
                id="perf-rating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="perf-went" className="text-xs font-medium text-muted-foreground">What has gone well</Label>
            <textarea
              id="perf-went"
              value={went}
              onChange={(e) => setWent(e.target.value)}
              rows={3}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>
          <div>
            <Label htmlFor="perf-better" className="text-xs font-medium text-muted-foreground">What could have gone better</Label>
            <textarea
              id="perf-better"
              value={better}
              onChange={(e) => setBetter(e.target.value)}
              rows={3}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>
          <div>
            <Label htmlFor="perf-summary" className="text-xs font-medium text-muted-foreground">Summary of overall performance</Label>
            <textarea
              id="perf-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Edit Competency dialog ----------
const EditCompetencyDialog = ({
  open,
  onOpenChange,
  employeeId,
  competency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeId: string;
  competency: CoreCompetencyRow | null;
}) => {
  const qc = useQueryClient();
  const [code, setCode] = useState<CompetencyRating>("G");
  const [commentary, setCommentary] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && competency) {
      setCode(competency.rating_code);
      setCommentary(competency.commentary);
    }
  }, [open, competency]);

  const save = async () => {
    if (!competency) return;
    setSaving(true);
    const { error } = await supabase
      .from("employee_core_competencies")
      .update({ rating_code: code, commentary } as never)
      .eq("id", competency.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Competency updated");
    qc.invalidateQueries({ queryKey: ["employee", employeeId, "competencies"] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {competency?.competency_name ?? "competency"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="comp-code" className="text-xs font-medium text-muted-foreground">Rating</Label>
            <select
              id="comp-code"
              value={code}
              onChange={(e) => setCode(e.target.value as CompetencyRating)}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RATING_CODES.map((c) => (
                <option key={c} value={c}>{c} — {ratingConfig[c].label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="comp-commentary" className="text-xs font-medium text-muted-foreground">Commentary</Label>
            <textarea
              id="comp-commentary"
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              rows={5}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Overview = ({ employee, readOnly = false }: OverviewProps) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedPdr | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [perfEditOpen, setPerfEditOpen] = useState(false);
  const permissions = usePermissions();
  const [editingComp, setEditingComp] = useState<CoreCompetencyRow | null>(null);
  const queryClient = useQueryClient();

  const { data: row, isLoading: loadingRow } = useEmployeeRow(employee.id);
  const { data: competencies = [] } = useEmployeeCoreCompetencies(employee.id);
  const { data: devPlan = [] } = useEmployeeDevPlan(employee.id);
  const { data: pdrs = [] } = usePdrDocuments(employee.id);

  const toggle = (key: string) => setOpenSection((prev) => (prev === key ? null : key));

  const handleDeletePdr = async (docId: string, filePath: string) => {
    if (!confirm("Delete this PDR document? This cannot be undone.")) return;
    setDeletingId(docId);
    const { error: storageErr } = await supabase.storage.from("pdr-documents").remove([filePath]);
    if (storageErr) {
      setDeletingId(null);
      toast.error(`Storage delete failed: ${storageErr.message}`);
      return;
    }
    const { error: rowErr } = await supabase.from("pdr_documents").delete().eq("id", docId);
    setDeletingId(null);
    if (rowErr) {
      toast.error(`Database delete failed: ${rowErr.message}`);
      return;
    }
    toast.success("PDR deleted");
    queryClient.invalidateQueries({ queryKey: ["employee", employee.id, "pdrs"] });
  };

  if (loadingRow || !row) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading overview…
      </div>
    );
  }

  const perfUpdated = (row as typeof row & { performance_updated_at: string | null }).performance_updated_at;

  return (
    <div className="space-y-4">
      <Section
        title="Performance"
        subtitle={`${row.current_year_rating_code} — ${ratingConfig[row.current_year_rating_code].label}`}
        isOpen={openSection === "performance"}
        onToggle={() => toggle("performance")}
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              {perfUpdated && (
                <p className="text-xs text-muted-foreground">Last updated {formatDateLong(perfUpdated)}</p>
              )}
            </div>
            {!readOnly && permissions.can_edit_performance && (
              <button
                onClick={() => setPerfEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit performance
              </button>
            )}
          </div>

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
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-heading font-bold text-foreground">{comp.competency_name}</h4>
                    {!readOnly && permissions.can_edit_performance && (
                      <button
                        onClick={() => setEditingComp(comp)}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                        aria-label={`Edit ${comp.competency_name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <RatingBadge code={comp.rating_code} />
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{comp.commentary}</p>
                  {comp.updated_at && (
                    <p className="text-xs text-muted-foreground mt-3">Last updated {formatDateLong(comp.updated_at)}</p>
                  )}
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
        {!readOnly && <PdrUploader employeeId={employee.id} onParsed={setParsed} />}

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
                      {!readOnly && <button
                        onClick={() => handleDeletePdr(doc.id, doc.file_path)}
                        disabled={deletingId === doc.id}
                        className="text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>}
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

      <PdrReviewDialog employeeId={employee.id} parsed={parsed} onClose={() => setParsed(null)} />

      <EditPerformanceDialog
        open={perfEditOpen}
        onOpenChange={setPerfEditOpen}
        employeeId={employee.id}
        initial={{
          current_year_rating_code: row.current_year_rating_code,
          current_year_rating: row.current_year_rating,
          performance_what_went_well: row.performance_what_went_well ?? "",
          performance_what_could_go_better: row.performance_what_could_go_better ?? "",
          performance_summary: row.performance_summary ?? "",
        }}
      />

      <EditCompetencyDialog
        open={!!editingComp}
        onOpenChange={(o) => !o && setEditingComp(null)}
        employeeId={employee.id}
        competency={editingComp}
      />
    </div>
  );
};

export default Overview;
