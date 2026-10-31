import { useEffect, useRef, useState } from "react";
import { Info, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployeeRow } from "@/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { PotentialRating } from "@/types/database";
import { formatDateLong } from "@/lib/tenure";
import { usePermissions } from "@/hooks/usePermissions";

const potentialOptions: { value: PotentialRating; desc: string }[] = [
  { value: "Well Placed", desc: "Right role for now" },
  { value: "Ready Now", desc: "Ready immediately" },
  { value: "Ready Soon", desc: "12-24 months" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

const GrowthPotential = ({ employeeId }: { employeeId: string }) => {
  const { data: employee, isLoading } = useEmployeeRow(employeeId);
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const [savingRating, setSavingRating] = useState<PotentialRating | null>(null);
  const [rationale, setRationale] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    const text = employee?.growth_rationale ?? "";
    setRationale(text);
    lastSaved.current = text;
    setSaveState("idle");
  }, [employee?.growth_rationale]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  const updateRating = async (value: PotentialRating) => {
    if (!employee || value === employee.potential_rating) return;
    setSavingRating(value);
    const { error } = await supabase
      .from("employees")
      .update({ potential_rating: value } as never)
      .eq("id", employeeId);
    setSavingRating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Potential rating updated");
    invalidate();
  };

  // Debounced auto-save (1.2s after last keystroke)
  useEffect(() => {
    if (!employee) return;
    if (!permissions.can_edit_growth) return;
    if (rationale === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("employees")
        .update({ growth_rationale: rationale } as never)
        .eq("id", employeeId);
      if (error) {
        setSaveState("error");
        toast.error(`Could not save: ${error.message}`);
        return;
      }
      lastSaved.current = rationale;
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
      invalidate();
    }, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [rationale, employee, employeeId, permissions.can_edit_growth]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading growth & potential…
      </div>
    );
  }

  const selected = employee?.potential_rating;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
        <Info className="h-4 w-4 text-[#0072BC] mt-0.5 shrink-0" />
        <p className="text-sm text-[#0072BC]/80">
          This section is entered manually by the manager based on their assessment of the employee's potential and readiness.
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-4">Potential Rating</h3>
        <div className="flex flex-wrap gap-3">
          {potentialOptions.map((p) => {
            const isSelected = p.value === selected;
            const isSaving = savingRating === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => updateRating(p.value)}
                disabled={!!savingRating || !permissions.can_edit_growth}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-60 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent border border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {p.value}
                <span className="font-normal opacity-70">({p.desc})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-heading font-bold text-foreground">Rationale for Potential Rating</h3>
            {employee?.updated_at && (
              <p className="text-xs text-muted-foreground mt-1">Last updated {formatDateLong(employee.updated_at)}</p>
            )}
          </div>
          <SaveIndicator state={saveState} readOnly={!permissions.can_edit_growth} />
        </div>
        {permissions.can_edit_growth ? (
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            placeholder="Explain the rationale for this potential rating… (saves as you type)"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {employee?.growth_rationale || "No rationale recorded yet."}
          </p>
        )}
      </div>
    </div>
  );
};

const SaveIndicator = ({ state, readOnly }: { state: SaveState; readOnly: boolean }) => {
  if (readOnly) return <span className="text-xs text-muted-foreground">Read-only</span>;
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

export default GrowthPotential;
