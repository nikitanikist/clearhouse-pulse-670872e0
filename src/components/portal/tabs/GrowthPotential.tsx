import { useEffect, useState } from "react";
import { Info, Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEmployeeRow } from "@/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { PotentialRating } from "@/types/database";

const potentialOptions: { value: PotentialRating; desc: string }[] = [
  { value: "Well Placed", desc: "Right role for now" },
  { value: "Ready Now", desc: "Ready immediately" },
  { value: "Ready Soon", desc: "12-24 months" },
  { value: "Ready Later", desc: "2+ years" },
];

const GrowthPotential = ({ employeeId }: { employeeId: string }) => {
  const { data: employee, isLoading } = useEmployeeRow(employeeId);
  const queryClient = useQueryClient();

  const [savingRating, setSavingRating] = useState<PotentialRating | null>(null);
  const [editingRationale, setEditingRationale] = useState(false);
  const [rationaleDraft, setRationaleDraft] = useState("");
  const [savingRationale, setSavingRationale] = useState(false);

  useEffect(() => {
    setRationaleDraft(employee?.growth_rationale ?? "");
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

  const saveRationale = async () => {
    setSavingRationale(true);
    const { error } = await supabase
      .from("employees")
      .update({ growth_rationale: rationaleDraft } as never)
      .eq("id", employeeId);
    setSavingRationale(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rationale updated");
    setEditingRationale(false);
    invalidate();
  };

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
                disabled={!!savingRating}
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
          <h3 className="text-base font-heading font-bold text-foreground">Rationale for Potential Rating</h3>
          {!editingRationale && (
            <button
              onClick={() => setEditingRationale(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
        {editingRationale ? (
          <div className="space-y-3">
            <textarea
              value={rationaleDraft}
              onChange={(e) => setRationaleDraft(e.target.value)}
              rows={5}
              placeholder="Explain the rationale for this potential rating..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRationaleDraft(employee?.growth_rationale ?? "");
                  setEditingRationale(false);
                }}
                disabled={savingRationale}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRationale}
                disabled={savingRationale}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {savingRationale && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {employee?.growth_rationale || "No rationale recorded yet."}
          </p>
        )}
      </div>
    </div>
  );
};

export default GrowthPotential;
