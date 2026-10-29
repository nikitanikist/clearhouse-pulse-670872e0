import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, CheckCircle2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/data/employees";
import type { CompetencyRating } from "@/types/database";
import {
  type PdrContent,
  type PdrCycleRow,
  HALF_LABEL,
  emptyCompetency,
  type DevPlanItem,
} from "@/types/pdr";
import { mergeContent, useSavePdrContent } from "@/hooks/usePdrCycles";

interface Props {
  employee: Employee;
  cycle: PdrCycleRow;
  readOnly?: boolean;
  /** When true, reviewee-only sections are hidden (manager viewing reviewer flow). */
  reviewerView?: boolean;
  /** When true, reviewer-only commentary / rating fields are hidden (employee view). */
  revieweeView?: boolean;
}

const RATING_OPTIONS: { value: CompetencyRating | ""; label: string }[] = [
  { value: "",   label: "—" },
  { value: "E",  label: "E — Excellent" },
  { value: "G",  label: "G — Good" },
  { value: "M",  label: "M — Meets" },
  { value: "NI", label: "NI — Needs Improvement" },
];

const COMPETENCIES: { key: keyof PdrContent["competencies"]; label: string }[] = [
  { key: "thought",   label: "Thought" },
  { key: "results",   label: "Results" },
  { key: "expertise", label: "Expertise" },
  { key: "people",    label: "People" },
  { key: "self",      label: "Self" },
];

const SECTION_HEADER = "text-sm font-heading font-bold text-foreground mb-2";
const SECTION_WRAP   = "bg-card rounded-lg border border-border p-5";
const SUBLABEL       = "text-xs font-medium text-muted-foreground";
const INPUT_CLS      = "mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/50 disabled:text-muted-foreground resize-none";
const SELECT_CLS     = "mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted/50";

const PdrCycleForm = ({ employee, cycle, readOnly, reviewerView, revieweeView }: Props) => {
  const save = useSavePdrContent();
  const [content, setContent] = useState<PdrContent>(() => mergeContent(cycle.content));
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>(JSON.stringify(cycle.content));

  // Reset when a different cycle is passed in
  useEffect(() => {
    setContent(mergeContent(cycle.content));
    lastSerialized.current = JSON.stringify(cycle.content);
    setSavingState("idle");
  }, [cycle.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave (1.2s after last keystroke)
  useEffect(() => {
    if (readOnly) return;
    const serialized = JSON.stringify(content);
    if (serialized === lastSerialized.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSavingState("saving");
    timer.current = setTimeout(async () => {
      try {
        await save({ id: cycle.id, employee_id: cycle.employee_id, content });
        lastSerialized.current = serialized;
        setSavingState("saved");
        setTimeout(() => setSavingState((s) => (s === "saved" ? "idle" : s)), 1200);
      } catch (e) {
        setSavingState("error");
        toast.error(`Could not save: ${(e as Error).message}`);
      }
    }, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [content, readOnly, cycle.id, cycle.employee_id, save]);

  const update = <K extends keyof PdrContent>(key: K, value: PdrContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  const addDevRow = () =>
    update("dev_plan", [...content.dev_plan, { objective: "", activities: "", support: "", target_date: "" }]);
  const removeDevRow = (i: number) =>
    update("dev_plan", content.dev_plan.filter((_, idx) => idx !== i));
  const updateDevRow = (i: number, patch: Partial<DevPlanItem>) =>
    update("dev_plan", content.dev_plan.map((row, idx) => idx === i ? { ...row, ...patch } : row));

  // Toggle visibility of reviewee-only / reviewer-only fields.
  const showRevieweeOnly = !reviewerView; // employee's own sections hidden to reviewer mode? Spec says reviewer sees everything -- always show
  const showReviewerCommentary = !revieweeView;

  const headerBand = useMemo(() => {
    switch (cycle.status) {
      case "shutdown":
        return "bg-warning/10 border-warning/30 text-warning-foreground";
      case "archived":
        return "bg-muted border-border text-muted-foreground";
      default:
        return "bg-primary/5 border-primary/20 text-primary";
    }
  }, [cycle.status]);

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-md border p-3 flex items-center justify-between flex-wrap gap-2 ${headerBand}`}>
        <div className="text-sm">
          <span className="font-semibold">{HALF_LABEL[cycle.half]} {cycle.year}</span>
          <span className="mx-2 opacity-50">·</span>
          <span className="uppercase tracking-wide text-xs font-bold">{cycle.status}</span>
          {cycle.reviewer_name_snapshot && (
            <>
              <span className="mx-2 opacity-50">·</span>
              <span className="text-xs">Reviewer: {cycle.reviewer_name_snapshot}</span>
            </>
          )}
        </div>
        <div className="text-xs flex items-center gap-2">
          {savingState === "saving" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>)}
          {savingState === "saved" && (<><CheckCircle2 className="h-3.5 w-3.5" /> Saved</>)}
          {savingState === "idle" && !readOnly && <span className="opacity-60">Auto-saves as you type</span>}
          {readOnly && <span className="opacity-60">Read-only</span>}
        </div>
      </div>

      {/* Employee profile snapshot */}
      <div className={SECTION_WRAP}>
        <h3 className={SECTION_HEADER}>Employee Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <KV k="Reviewee"   v={employee.name} />
          <KV k="Job Title"  v={employee.position} />
          <KV k="Reviewer"   v={cycle.reviewer_name_snapshot ?? employee.supervisor ?? "—"} />
          <KV k="Department" v={employee.department} />
          <KV k="Period"     v={`${HALF_LABEL[cycle.half]} ${cycle.year}`} />
          <KV k="Opened"     v={new Date(cycle.opened_at).toLocaleDateString()} />
        </div>
      </div>

      {/* My Bigger, Brighter Future -- Reviewee only */}
      {showRevieweeOnly && (
        <div className={SECTION_WRAP}>
          <h3 className={SECTION_HEADER}>My Bigger, Brighter Future <span className="font-normal text-xs text-muted-foreground">· Reviewee only</span></h3>
          <TA label="Describe the future you want to create for yourself in 2-5 years."
              value={content.bbf.future}
              onChange={(v) => update("bbf", { ...content.bbf, future: v })}
              disabled={readOnly || reviewerView} />
          <TA label="What bold goals and dreams do you want to work towards?"
              value={content.bbf.goals}
              onChange={(v) => update("bbf", { ...content.bbf, goals: v })}
              disabled={readOnly || reviewerView} />
          <TA label="How can the firm support you?"
              value={content.bbf.firm_support}
              onChange={(v) => update("bbf", { ...content.bbf, firm_support: v })}
              disabled={readOnly || reviewerView} />
        </div>
      )}

      {/* Section One: Looking Back */}
      <div className={SECTION_WRAP}>
        <h3 className={SECTION_HEADER}>Section One: Looking Back</h3>
        <TA label="What has gone well? (Reviewee only)"
            value={content.looking_back.what_went_well}
            onChange={(v) => update("looking_back", { ...content.looking_back, what_went_well: v })}
            disabled={readOnly || reviewerView} />
        <TA label="What could have gone better? (Reviewee only)"
            value={content.looking_back.what_could_be_better}
            onChange={(v) => update("looking_back", { ...content.looking_back, what_could_be_better: v })}
            disabled={readOnly || reviewerView} />
      </div>

      {/* Core Competencies */}
      <div className={SECTION_WRAP}>
        <h3 className={SECTION_HEADER}>Core Competency Framework Success Factors</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Rate each competency and leave 3-5 bullet points of commentary. Reviewer and reviewee each have their own column.
        </p>
        <div className="space-y-4">
          {COMPETENCIES.map(({ key, label }) => {
            const c = content.competencies[key];
            const setC = (patch: Partial<typeof c>) =>
              update("competencies", { ...content.competencies, [key]: { ...c, ...patch } });
            return (
              <div key={key} className="rounded-md border border-border p-3">
                <div className="font-medium text-sm text-foreground mb-2">{label}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={SUBLABEL}>Reviewee rating</label>
                    <select
                      value={c.reviewee_rating}
                      disabled={readOnly || reviewerView}
                      onChange={(e) => setC({ reviewee_rating: e.target.value as CompetencyRating | "" })}
                      className={SELECT_CLS}
                    >
                      {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <label className={`${SUBLABEL} mt-2 block`}>Reviewee commentary</label>
                    <textarea
                      rows={3}
                      value={c.reviewee_commentary}
                      disabled={readOnly || reviewerView}
                      onChange={(e) => setC({ reviewee_commentary: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    {showReviewerCommentary ? (
                      <>
                        <label className={SUBLABEL}>Reviewer rating</label>
                        <select
                          value={c.reviewer_rating}
                          disabled={readOnly || revieweeView}
                          onChange={(e) => setC({ reviewer_rating: e.target.value as CompetencyRating | "" })}
                          className={SELECT_CLS}
                        >
                          {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <label className={`${SUBLABEL} mt-2 block`}>Reviewer commentary</label>
                        <textarea
                          rows={3}
                          value={c.reviewer_commentary}
                          disabled={readOnly || revieweeView}
                          onChange={(e) => setC({ reviewer_commentary: e.target.value })}
                          className={INPUT_CLS}
                        />
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground italic mt-6">
                        Reviewer sections visible to your manager only.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall assessments */}
      <div className={SECTION_WRAP}>
        <h3 className={SECTION_HEADER}>Overall assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={SUBLABEL}>Reviewee self-assessment</label>
            <select
              value={content.self_assessment}
              disabled={readOnly || reviewerView}
              onChange={(e) => update("self_assessment", e.target.value as CompetencyRating | "")}
              className={SELECT_CLS}
            >
              {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            {showReviewerCommentary ? (
              <>
                <label className={SUBLABEL}>Reviewer assessment</label>
                <select
                  value={content.reviewer_assessment}
                  disabled={readOnly || revieweeView}
                  onChange={(e) => update("reviewer_assessment", e.target.value as CompetencyRating | "")}
                  className={SELECT_CLS}
                >
                  {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </>
            ) : (
              <div className="text-xs text-muted-foreground italic mt-6">
                Reviewer's overall rating visible to your manager only.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary of Overall Performance */}
      <div className={SECTION_WRAP}>
        <h3 className={SECTION_HEADER}>Summary of Overall Performance</h3>
        <TA label="Reviewee commentary"
            value={content.summary.reviewee_commentary}
            onChange={(v) => update("summary", { ...content.summary, reviewee_commentary: v })}
            disabled={readOnly || reviewerView} />
        {showReviewerCommentary && (
          <TA label="Reviewer commentary"
              value={content.summary.reviewer_commentary}
              onChange={(v) => update("summary", { ...content.summary, reviewer_commentary: v })}
              disabled={readOnly || revieweeView} />
        )}
        <TA label="Other considerations and ideas for improvement"
            value={content.other_considerations}
            onChange={(v) => update("other_considerations", v)}
            disabled={readOnly} />
      </div>

      {/* Section Two: Looking Forward -- Reviewee only */}
      {showRevieweeOnly && (
        <div className={SECTION_WRAP}>
          <h3 className={SECTION_HEADER}>Section Two: Looking Forward <span className="font-normal text-xs text-muted-foreground">· Reviewee only</span></h3>
          <TA label="Career Aspirations"
              value={content.looking_forward.career_aspirations}
              onChange={(v) => update("looking_forward", { ...content.looking_forward, career_aspirations: v })}
              disabled={readOnly || reviewerView} />
          <TA label="Progress to development areas since the last review"
              value={content.looking_forward.dev_progress}
              onChange={(v) => update("looking_forward", { ...content.looking_forward, dev_progress: v })}
              disabled={readOnly || reviewerView} />
        </div>
      )}

      {/* Professional Development Plan */}
      <div className={SECTION_WRAP}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={SECTION_HEADER + " mb-0"}>Professional Development Plan</h3>
          {!readOnly && (
            <button
              onClick={addDevRow}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-xs hover:bg-muted/50"
            >
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
          )}
        </div>
        {content.dev_plan.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No development objectives yet.</p>
        ) : (
          <div className="space-y-3">
            {content.dev_plan.map((row, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TA label="Objective (skills, knowledge, experience to add)"
                      value={row.objective} onChange={(v) => updateDevRow(i, { objective: v })}
                      disabled={readOnly} rows={2} />
                  <TA label="Activities to achieve it"
                      value={row.activities} onChange={(v) => updateDevRow(i, { activities: v })}
                      disabled={readOnly} rows={2} />
                  <TA label="Support / resources needed"
                      value={row.support} onChange={(v) => updateDevRow(i, { support: v })}
                      disabled={readOnly} rows={2} />
                  <div>
                    <label className={SUBLABEL}>Target date</label>
                    <input
                      type="date"
                      value={row.target_date}
                      onChange={(e) => updateDevRow(i, { target_date: e.target.value })}
                      disabled={readOnly}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => removeDevRow(i)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KV = ({ k, v }: { k: string; v: string }) => (
  <div>
    <div className="text-[11px] text-muted-foreground">{k}</div>
    <div className="font-medium text-foreground">{v}</div>
  </div>
);

const TA = ({
  label,
  value,
  onChange,
  disabled,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
}) => (
  <div className="mb-3 last:mb-0">
    <label className={SUBLABEL}>{label}</label>
    <textarea
      rows={rows}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLS}
    />
  </div>
);

export default PdrCycleForm;
