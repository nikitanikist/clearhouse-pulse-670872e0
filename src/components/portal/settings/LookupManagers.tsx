import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useDepartments, usePositions, type DepartmentRow, type PositionRow } from "@/hooks/useLookups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TIER_HELP =
  "Tier 1 = only Level 1 admins can see this position. Tier 2 = Level 1-2. Tier 3 = Level 1-3. Tier 4 = Level 1-4. Tier 5 = Level 5 (Operations silo). Level 1 always sees everyone regardless of tier.";

const countEmployeesUsing = async (column: "department" | "position", value: string) => {
  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq(column, value as never);
  if (error) throw error;
  return count ?? 0;
};

const inactiveBadge = (
  <span className="ml-2 inline-block align-middle text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
    Inactive
  </span>
);

/* ------------------------------- Departments ------------------------------ */

const DepartmentsCard = () => {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useDepartments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<{ row: DepartmentRow; inUse: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preparingDeleteId, setPreparingDeleteId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["departments"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const openAdd = () => { setEditing(null); setName(""); setDialogOpen(true); };
  const openEdit = (d: DepartmentRow) => { setEditing(d); setName(d.name); setDialogOpen(true); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Name is required"); return; }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("departments" as never).update({ name: trimmed } as never).eq("id", editing.id)
      : await supabase.from("departments" as never).insert({ name: trimmed } as never);
    setSaving(false);
    if (error) { toast.error("Could not save department", { description: error.message }); return; }
    toast.success(editing ? "Department renamed" : "Department added");
    setDialogOpen(false);
    refresh();
  };

  const toggleActive = async (d: DepartmentRow) => {
    const next = d.is_active === false;
    const { error } = await supabase
      .from("departments" as never)
      .update({ is_active: next } as never)
      .eq("id", d.id);
    if (error) { toast.error("Could not update department", { description: error.message }); return; }
    toast.success(next ? `${d.name} reactivated` : `${d.name} marked inactive`);
    refresh();
  };

  const requestDelete = async (d: DepartmentRow) => {
    setPreparingDeleteId(d.id);
    try {
      const inUse = await countEmployeesUsing("department", d.name);
      setToDelete({ row: d, inUse });
    } catch (e) {
      toast.error("Could not check department usage", { description: (e as Error).message });
    } finally {
      setPreparingDeleteId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.inUse > 0) {
        const { error: empErr } = await supabase
          .from("employees")
          .delete()
          .eq("department", toDelete.row.name as never);
        if (empErr) throw empErr;
      }
      const { error } = await supabase.from("departments" as never).delete().eq("id", toDelete.row.id);
      if (error) throw error;
      toast.success(
        toDelete.inUse > 0
          ? `Department and ${toDelete.inUse} employee${toDelete.inUse === 1 ? "" : "s"} permanently deleted`
          : "Department deleted"
      );
      setToDelete(null);
      refresh();
    } catch (e) {
      toast.error("Could not delete department", { description: (e as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="bg-card rounded-lg border border-border p-6 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Manage Departments</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Departments available across employee records and filters. Inactive departments are hidden from dropdowns.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add department
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading departments…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Active</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className={`border-t border-border ${d.is_active === false ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2 text-foreground">
                    {d.name}
                    {d.is_active === false && inactiveBadge}
                  </td>
                  <td className="px-4 py-2">
                    <Switch
                      checked={d.is_active !== false}
                      onCheckedChange={() => toggleActive(d)}
                      aria-label={`Toggle ${d.name} active`}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => requestDelete(d)}
                      disabled={preparingDeleteId === d.id}
                      aria-label={`Delete ${d.name}`}
                    >
                      {preparingDeleteId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No departments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Rename department" : "Add department"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="dept-name" className="text-xs text-muted-foreground">Name *</Label>
            <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.row.name} permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? toDelete.inUse === 0
                  ? `"${toDelete.row.name}" will be removed. This cannot be undone.`
                  : `${toDelete.inUse} employees are currently in ${toDelete.row.name}. Deleting this will PERMANENTLY DELETE those ${toDelete.inUse} employees AND all their data (notes, PDRs, ratings, interpersonal, growth). This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

/* -------------------------------- Positions ------------------------------- */

const PositionsCard = () => {
  const qc = useQueryClient();
  const { data: positions = [], isLoading } = usePositions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRow | null>(null);
  const [name, setName] = useState("");
  const [tier, setTier] = useState("4");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<{ row: PositionRow; inUse: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [preparingDeleteId, setPreparingDeleteId] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["positions"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const openAdd = () => { setEditing(null); setName(""); setTier("4"); setDialogOpen(true); };
  const openEdit = (p: PositionRow) => { setEditing(p); setName(p.name); setTier(String(p.visibility_tier)); setDialogOpen(true); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = { name: trimmed, visibility_tier: Number(tier) };
    const { error } = editing
      ? await supabase.from("positions" as never).update(payload as never).eq("id", editing.id)
      : await supabase.from("positions" as never).insert(payload as never);
    setSaving(false);
    if (error) { toast.error("Could not save position", { description: error.message }); return; }
    toast.success(editing ? "Position updated" : "Position added");
    setDialogOpen(false);
    refresh();
  };

  const toggleActive = async (p: PositionRow) => {
    const next = p.is_active === false;
    const { error } = await supabase
      .from("positions" as never)
      .update({ is_active: next } as never)
      .eq("id", p.id);
    if (error) { toast.error("Could not update position", { description: error.message }); return; }
    toast.success(next ? `${p.name} reactivated` : `${p.name} marked inactive`);
    refresh();
  };

  const requestDelete = async (p: PositionRow) => {
    setPreparingDeleteId(p.id);
    try {
      const inUse = await countEmployeesUsing("position", p.name);
      setToDelete({ row: p, inUse });
    } catch (e) {
      toast.error("Could not check position usage", { description: (e as Error).message });
    } finally {
      setPreparingDeleteId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.inUse > 0) {
        const { error: empErr } = await supabase
          .from("employees")
          .delete()
          .eq("position", toDelete.row.name as never);
        if (empErr) throw empErr;
      }
      const { error } = await supabase.from("positions" as never).delete().eq("id", toDelete.row.id);
      if (error) throw error;
      toast.success(
        toDelete.inUse > 0
          ? `Position and ${toDelete.inUse} employee${toDelete.inUse === 1 ? "" : "s"} permanently deleted`
          : "Position deleted"
      );
      setToDelete(null);
      refresh();
    } catch (e) {
      toast.error("Could not delete position", { description: (e as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="bg-card rounded-lg border border-border p-6 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-semibold text-foreground">Manage Positions</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Position titles and the visibility tier that controls who can see them. Inactive positions are hidden from dropdowns.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add position
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading positions…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Visibility</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Active</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className={`border-t border-border ${p.is_active === false ? "opacity-60" : ""}`}>
                  <td className="px-4 py-2 text-foreground">
                    {p.name}
                    {p.is_active === false && inactiveBadge}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                      Tier {p.visibility_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Switch
                      checked={p.is_active !== false}
                      onCheckedChange={() => toggleActive(p)}
                      aria-label={`Toggle ${p.name} active`}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => requestDelete(p)}
                      disabled={preparingDeleteId === p.id}
                      aria-label={`Delete ${p.name}`}
                    >
                      {preparingDeleteId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No positions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit position" : "Add position"}</DialogTitle>
            <DialogDescription>Position titles appear in employee records, filters and reports.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pos-name" className="text-xs text-muted-foreground">Name *</Label>
              <Input id="pos-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Visibility tier *</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="mt-1.5 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((t) => (
                    <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{TIER_HELP}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.row.name} permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? toDelete.inUse === 0
                  ? `"${toDelete.row.name}" will be removed. This cannot be undone.`
                  : `${toDelete.inUse} employees currently hold the position ${toDelete.row.name}. Deleting this will PERMANENTLY DELETE those ${toDelete.inUse} employees AND all their data (notes, PDRs, ratings, interpersonal, growth). This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export { DepartmentsCard, PositionsCard };
