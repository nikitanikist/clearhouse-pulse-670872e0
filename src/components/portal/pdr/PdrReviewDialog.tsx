import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ParsedPdr, ParsedCompetency, ParsedDevPlanRow } from "@/lib/pdr/types";
import type { CompetencyRating, CoreCompetencyName } from "@/types/database";
import { applyParsedPdr } from "@/lib/pdr/applyParsedPdr";

interface Props {
  employeeId: string;
  parsed: ParsedPdr | null;
  onClose: () => void;
}

const RATINGS: { code: CompetencyRating; label: string }[] = [
  { code: "E", label: "Excellent" },
  { code: "G", label: "Good" },
  { code: "M", label: "Meets" },
  { code: "NI", label: "Needs Improvement" },
];

const COMPETENCY_NAMES: CoreCompetencyName[] = ["Thought", "Results", "Expertise", "People", "Self"];

const PdrReviewDialog = ({ employeeId, parsed, onClose }: Props) => {
  const [draft, setDraft] = useState<ParsedPdr | null>(parsed);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { setDraft(parsed); }, [parsed]);

  if (!parsed || !draft) return null;

  const updateField = <K extends keyof ParsedPdr>(k: K, v: ParsedPdr[K]) =>
    setDraft({ ...draft, [k]: v });

  const updateCompetency = (idx: number, patch: Partial<ParsedCompetency>) => {
    const next = [...draft.competencies];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, competencies: next });
  };

  const updateDevRow = (idx: number, patch: Partial<ParsedDevPlanRow>) => {
    const next = [...draft.dev_plan];
    next[idx] = { ...next[idx], ...patch };
    setDraft({ ...draft, dev_plan: next });
  };

  const addDevRow = () =>
    setDraft({
      ...draft,
      dev_plan: [...draft.dev_plan, { objective: "", activities: "", support_resources: "", target_date: null }],
    });

  const removeDevRow = (idx: number) =>
    setDraft({ ...draft, dev_plan: draft.dev_plan.filter((_, i) => i !== idx) });

  async function handleApply() {
    if (!draft) return;
    setSaving(true);
    try {
      await applyParsedPdr(employeeId, draft);
      toast.success("Employee record updated from PDR");
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-lg border shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-heading font-bold">Review Parsed PDR</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Verify and edit the extracted values. Nothing is saved until you click Apply.
          </p>
          {draft.warnings.length > 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {draft.warnings.map((w, i) => <div key={i}>• {w}</div>)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <Field label="Overall Performance Rating">
            <div className="flex gap-2 flex-wrap">
              {RATINGS.map((r) => (
                <label key={r.code} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border ${draft.current_year_rating_code === r.code ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"}`}>
                  <input
                    type="radio"
                    name="overall"
                    className="hidden"
                    checked={draft.current_year_rating_code === r.code}
                    onChange={() => updateField("current_year_rating_code", r.code)}
                  />
                  {r.code} — {r.label}
                </label>
              ))}
            </div>
          </Field>

          <TextField label="What Has Gone Well" value={draft.performance_what_went_well} onChange={(v) => updateField("performance_what_went_well", v)} />
          <TextField label="What Could Have Gone Better" value={draft.performance_what_could_go_better} onChange={(v) => updateField("performance_what_could_go_better", v)} />
          <TextField label="Performance Summary" value={draft.performance_summary} onChange={(v) => updateField("performance_summary", v)} />
          <TextField label="My Bigger, Brighter Future" value={draft.bff_summary} onChange={(v) => updateField("bff_summary", v)} />
          <TextField label="Career Aspirations" value={draft.career_aspirations_summary} onChange={(v) => updateField("career_aspirations_summary", v)} />

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Core Competencies</p>
            <div className="space-y-3">
              {COMPETENCY_NAMES.map((name) => {
                const idx = draft.competencies.findIndex((c) => c.competency_name === name);
                const comp = idx >= 0 ? draft.competencies[idx] : null;
                if (!comp) return null;
                return (
                  <div key={name} className="border rounded p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                      <span className="text-sm font-semibold">{name}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {RATINGS.map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => updateCompetency(idx, { rating_code: r.code })}
                            className={`px-2.5 py-1 rounded text-xs font-semibold border ${comp.rating_code === r.code ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
                          >
                            {r.code}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full text-sm rounded border border-border bg-background p-2 min-h-[60px]"
                      value={comp.commentary}
                      onChange={(e) => updateCompetency(idx, { commentary: e.target.value })}
                      placeholder="Reviewer commentary"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Development Plan</p>
              <button type="button" onClick={addDevRow} className="text-xs text-primary flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {draft.dev_plan.map((row, i) => (
                <div key={i} className="border rounded p-3 bg-muted/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      className="flex-1 text-sm rounded border border-border bg-background p-2"
                      placeholder="Objective"
                      value={row.objective}
                      onChange={(e) => updateDevRow(i, { objective: e.target.value })}
                    />
                    <button type="button" onClick={() => removeDevRow(i)} className="text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea className="w-full text-sm rounded border border-border bg-background p-2" placeholder="Activities" value={row.activities} onChange={(e) => updateDevRow(i, { activities: e.target.value })} />
                  <textarea className="w-full text-sm rounded border border-border bg-background p-2" placeholder="Support & resources" value={row.support_resources} onChange={(e) => updateDevRow(i, { support_resources: e.target.value })} />
                  <input
                    type="date"
                    className="text-sm rounded border border-border bg-background p-2"
                    value={row.target_date ?? ""}
                    onChange={(e) => updateDevRow(i, { target_date: e.target.value || null })}
                  />
                </div>
              ))}
              {draft.dev_plan.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No rows. Click "Add row" to add one.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm rounded border border-border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply to Employee
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
    {children}
  </div>
);

const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <textarea
      className="w-full text-sm rounded border border-border bg-background p-2 min-h-[80px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </Field>
);

export default PdrReviewDialog;
