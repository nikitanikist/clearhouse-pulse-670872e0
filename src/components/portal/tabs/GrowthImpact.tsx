import { useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useGrowthImpactEntries, useMyEmployeeId } from "@/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { GrowthImpactCategory, GrowthImpactEntryRow } from "@/types/database";
import { formatDateLong } from "@/lib/tenure";

const CATEGORIES: { value: GrowthImpactCategory; blurb: string }[] = [
  { value: "My Impact", blurb: "What I accomplished and the difference it made." },
  { value: "My Growth", blurb: "What I learned, skills I developed, challenges I overcame." },
  { value: "Feedback and Recognition", blurb: "Feedback, recognition, and meaningful moments worth remembering." },
  { value: "What's Next", blurb: "Future goals, development opportunities and areas to explore." },
];

const categoryBadgeClass = (c: GrowthImpactCategory): string => {
  switch (c) {
    case "My Impact": return "bg-primary/15 text-primary";
    case "My Growth": return "bg-success/15 text-success";
    case "Feedback and Recognition": return "bg-warning/15 text-warning";
    case "What's Next": return "bg-secondary/15 text-secondary";
  }
};

const todayIso = () => new Date().toISOString().slice(0, 10);

interface Props {
  employeeId: string;
  /** When true, hide add/edit controls even if the viewer is the owner. */
  forceReadOnly?: boolean;
}

const GrowthImpact = ({ employeeId, forceReadOnly = false }: Props) => {
  const { data: entries = [], isLoading } = useGrowthImpactEntries(employeeId);
  const { data: myId } = useMyEmployeeId();
  const queryClient = useQueryClient();

  const isOwner = !!myId && myId === employeeId;
  const canEdit = isOwner && !forceReadOnly;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GrowthImpactEntryRow | null>(null);
  const [entryDate, setEntryDate] = useState<string>(todayIso());
  const [category, setCategory] = useState<GrowthImpactCategory>(CATEGORIES[0].value);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "growth-impact"] });

  const openAdd = () => {
    setEditing(null);
    setEntryDate(todayIso());
    setCategory(CATEGORIES[0].value);
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (row: GrowthImpactEntryRow) => {
    setEditing(row);
    setEntryDate(row.entry_date);
    setCategory(row.category);
    setNotes(row.notes);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!notes.trim()) {
      toast.error("Add some notes before saving.");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("growth_impact_entries")
        .update({ entry_date: entryDate, category, notes: notes.trim() } as never)
        .eq("id", editing.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Entry updated");
    } else {
      const { error } = await supabase
        .from("growth_impact_entries")
        .insert([{ employee_id: employeeId, entry_date: entryDate, category, notes: notes.trim() }] as never);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Entry added");
    }
    setDialogOpen(false);
    invalidate();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    const { error } = await supabase.from("growth_impact_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Entry deleted");
    invalidate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-heading font-bold text-foreground">Growth &amp; Impact</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Your contributions. Your growth. Your next steps. Use this space throughout the year to
              capture your accomplishments, reflect on your experiences, recognize your progress, and
              document your goals for the future.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" /> Add entry
            </button>
          )}
        </div>
        {!canEdit && !isOwner && (
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Read-only — this journal is maintained by the employee.</span>
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[220px]">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee Notes</th>
              {canEdit && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground align-top whitespace-nowrap">
                  {formatDateLong(row.entry_date)}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${categoryBadgeClass(row.category)}`}>
                    {row.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{row.notes}</td>
                {canEdit && (
                  <td className="px-4 py-3 align-top whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        aria-label="Edit entry"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(row.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading entries…
          </div>
        ) : (
          entries.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {canEdit ? "No journal entries yet. Click “Add entry” to start logging." : "No journal entries yet."}
              </p>
            </div>
          )
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit journal entry" : "Add journal entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gi-date" className="text-xs text-muted-foreground">Date</Label>
                <Input
                  id="gi-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="gi-category" className="text-xs text-muted-foreground">Category</Label>
                <select
                  id="gi-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GrowthImpactCategory)}
                  className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.value}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              {CATEGORIES.find((c) => c.value === category)?.blurb}
            </p>
            <div>
              <Label htmlFor="gi-notes" className="text-xs text-muted-foreground">Employee notes</Label>
              <textarea
                id="gi-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Write your reflection…"
                className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !notes.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add entry"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GrowthImpact;
