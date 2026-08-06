import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useDepartments, usePositions, type DepartmentRow, type PositionRow } from "@/hooks/useLookups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/* ------------------------------- Departments ------------------------------ */

const DepartmentsCard = () => {
  const qc = useQueryClient();
  const { data: departments = [], isLoading } = useDepartments();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<DepartmentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const inUse = await countEmployeesUsing("department", toDelete.name);
      if (inUse > 0) {
        toast.error(`Cannot delete: ${inUse} employees still use this department.`);
        setDeleting(false);
        setToDelete(null);
        return;
      }
      const { error } = await supabase.from("departments" as never).delete().eq("id", toDelete.id);
      if (error) throw error;
      toast.success("Department deleted");
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
            Departments available across employee records and filters.
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{d.name}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(d)} aria-label={`Delete ${d.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">No departments yet.</td></tr>
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
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.name}" will be removed from the list. Departments still in use by employees cannot be deleted.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
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
  const [toDelete, setToDelete] = useState<PositionRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const inUse = await countEmployeesUsing("position", toDelete.name);
      if (inUse > 0) {
        toast.error(`Cannot delete: ${inUse} employees still use this position.`);
        setDeleting(false);
        setToDelete(null);
        return;
      }
      const { error } = await supabase.from("positions" as never).delete().eq("id", toDelete.id);
      if (error) throw error;
      toast.success("Position deleted");
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
            Position titles and the visibility tier that controls who can see them.
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
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{p.name}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                      Tier {p.visibility_tier}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)} aria-label={`Delete ${p.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No positions yet.</td></tr>
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
            <AlertDialogTitle>Delete position?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.name}" will be removed from the list. Positions still in use by employees cannot be deleted.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export { DepartmentsCard, PositionsCard };
