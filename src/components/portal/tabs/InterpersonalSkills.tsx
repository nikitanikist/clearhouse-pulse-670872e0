import { useState, useEffect, useRef } from "react";
import { Info, Loader2, Plus, Pencil, Trash2, CheckCircle2, X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployeeInterpersonal } from "@/hooks/useEmployees";
import { useActiveInterpersonalSkillAreas } from "@/hooks/useInterpersonalSkillAreas";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { InterpersonalRow } from "@/types/database";
import { formatDateLong } from "@/lib/tenure";

type SaveState = "idle" | "saving" | "saved" | "error";

const InterpersonalSkills = ({ employeeId }: { employeeId: string }) => {
  const { data: skills = [], isLoading } = useEmployeeInterpersonal(employeeId);
  const { data: skillAreas = [] } = useActiveInterpersonalSkillAreas();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const permissions = usePermissions();
  // Row currently being edited. For a brand-new entry this starts null;
  // once the first auto-save fires we swap it to the inserted row so later
  // saves become updates against that id.
  const [editing, setEditing] = useState<InterpersonalRow | null>(null);
  const [skillArea, setSkillArea] = useState<string>("");
  const [assessment, setAssessment] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Debounce + "did we already save this snapshot?" guard
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");
  const dialogOpenRef = useRef(dialogOpen);
  useEffect(() => { dialogOpenRef.current = dialogOpen; }, [dialogOpen]);

  // Default the picker to the first available skill area once the list loads.
  useEffect(() => {
    if (!skillArea && skillAreas.length > 0) {
      setSkillArea(skillAreas[0].name);
    }
  }, [skillAreas, skillArea]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "interpersonal"] });

  const openAdd = () => {
    setEditing(null);
    setSkillArea(skillAreas[0]?.name ?? "");
    setAssessment("");
    lastSaved.current = "";
    setSaveState("idle");
    setDialogOpen(true);
  };

  const openEdit = (row: InterpersonalRow) => {
    setEditing(row);
    setSkillArea(row.skill_area);
    setAssessment(row.assessment_text);
    lastSaved.current = JSON.stringify({ skillArea: row.skill_area, assessment: row.assessment_text });
    setSaveState("idle");
    setDialogOpen(true);
  };

  // Auto-save (debounced 1.2s). Insert on first save of a new row; update
  // subsequent saves against the row's id.
  useEffect(() => {
    if (!dialogOpen) return;
    if (!assessment.trim()) return;
    if (!skillArea) return;
    const snapshot = JSON.stringify({ skillArea, assessment });
    if (snapshot === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      const payload = {
        employee_id: employeeId,
        skill_area: skillArea,
        assessment_text: assessment.trim(),
      };
      if (editing) {
        const { error } = await supabase
          .from("employee_interpersonal")
          .update(payload as never)
          .eq("id", editing.id);
        if (error) {
          setSaveState("error");
          toast.error(`Could not save: ${error.message}`);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("employee_interpersonal")
          .insert([payload] as never)
          .select("*")
          .single();
        if (error) {
          setSaveState("error");
          toast.error(`Could not save: ${error.message}`);
          return;
        }
        setEditing(data as InterpersonalRow);
      }
      lastSaved.current = snapshot;
      setSaveState("saved");
      invalidate();
      setTimeout(() => {
        if (dialogOpenRef.current) setSaveState((s) => (s === "saved" ? "idle" : s));
      }, 1200);
    }, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dialogOpen, skillArea, assessment, editing, employeeId]);

  const remove = async (row: InterpersonalRow) => {
    if (!confirm(`Delete the "${row.skill_area}" assessment?`)) return;
    const { error } = await supabase.from("employee_interpersonal").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Assessment deleted");
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
        <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
        <p className="text-sm text-[#0072BC]/80">
          This section is entered manually by the manager based on their direct observations and feedback.
        </p>
      </div>

      {permissions.can_edit_interpersonal && (
        <div className="flex justify-end">
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add assessment
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading interpersonal assessments…
        </div>
      ) : skills.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No interpersonal assessments recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div key={s.id} className="bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-heading font-bold text-foreground">{s.skill_area}</h4>
                <div className={`items-center gap-1 shrink-0 ${permissions.can_edit_interpersonal ? "flex" : "hidden"}`}>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(s)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.assessment_text}</p>
              {s.updated_at && (
                <p className="text-xs text-muted-foreground mt-3">Last updated {formatDateLong(s.updated_at)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-foreground">
                {editing ? "Edit assessment" : "Add assessment"}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Skill Area</label>
                <select
                  value={skillArea}
                  onChange={(e) => setSkillArea(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {skillAreas.length === 0 && (
                    <option value="" disabled>— No skill areas configured —</option>
                  )}
                  {skillAreas.map((a) => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assessment</label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={5}
                  placeholder="Write the assessment… (saves as you type)"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-6">
              <SaveIndicator state={saveState} />
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SaveIndicator = ({ state }: { state: SaveState }) => {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3 w-3" /> Saved
      </span>
    );
  if (state === "error")
    return <span className="text-xs text-destructive">Save failed</span>;
  return <span className="text-xs text-muted-foreground opacity-60">Auto-saves as you type</span>;
};

export default InterpersonalSkills;
