import { useState } from "react";
import { Info, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployeeInterpersonal } from "@/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { InterpersonalArea, InterpersonalRow } from "@/types/database";
import { formatDateLong } from "@/lib/tenure";

const SKILL_AREAS: InterpersonalArea[] = [
  "Client Communication",
  "Team Collaboration",
  "Adaptability",
  "Problem-Solving",
  "Initiative",
  "Commitment to Firm Values",
  "Dependability During Peak Seasons",
  "Support for Team Members",
  "Contributions to Firm Culture",
];

const InterpersonalSkills = ({ employeeId }: { employeeId: string }) => {
  const { data: skills = [], isLoading } = useEmployeeInterpersonal(employeeId);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InterpersonalRow | null>(null);
  const [skillArea, setSkillArea] = useState<InterpersonalArea>(SKILL_AREAS[0]);
  const [assessment, setAssessment] = useState("");
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setSkillArea(SKILL_AREAS[0]);
    setAssessment("");
    setDialogOpen(true);
  };

  const openEdit = (row: InterpersonalRow) => {
    setEditing(row);
    setSkillArea(row.skill_area);
    setAssessment(row.assessment_text);
    setDialogOpen(true);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "interpersonal"] });

  const save = async () => {
    if (!assessment.trim()) return;
    setSaving(true);
    const payload = {
      employee_id: employeeId,
      skill_area: skillArea,
      assessment_text: assessment.trim(),
    };
    const { error } = editing
      ? await supabase.from("employee_interpersonal").update(payload as never).eq("id", editing.id)
      : await supabase.from("employee_interpersonal").insert([payload] as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Assessment updated" : "Assessment added");
    setDialogOpen(false);
    invalidate();
  };

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

      <div className="flex justify-end">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add assessment
        </button>
      </div>

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
                <div className="flex items-center gap-1 shrink-0">
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
          onClick={() => !saving && setDialogOpen(false)}
        >
          <div
            className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold text-foreground mb-4">
              {editing ? "Edit assessment" : "Add assessment"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Skill Area</label>
                <select
                  value={skillArea}
                  onChange={(e) => setSkillArea(e.target.value as InterpersonalArea)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SKILL_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assessment</label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={5}
                  placeholder="Write the assessment..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !assessment.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add assessment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterpersonalSkills;
