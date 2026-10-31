import { useMemo, useState } from "react";
import { Sparkles, Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useInterpersonalSkillAreas,
  useAddSkillArea,
  useUpdateSkillArea,
  useDeleteSkillArea,
  type SkillAreaRow,
} from "@/hooks/useInterpersonalSkillAreas";

const InterpersonalSkillsCard = () => {
  const { data: rows = [], isLoading } = useInterpersonalSkillAreas();
  const addArea = useAddSkillArea();
  const updateArea = useUpdateSkillArea();
  const deleteArea = useDeleteSkillArea();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [rows],
  );

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addArea({ name: newName.trim() });
      setNewName("");
      toast.success("Skill area added");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const beginEdit = (row: SkillAreaRow) => {
    setEditingName(row.name);
    setEditValue(row.name);
  };
  const cancelEdit = () => {
    setEditingName(null);
    setEditValue("");
  };
  const saveEdit = async () => {
    if (!editingName || !editValue.trim()) return;
    if (editValue.trim() === editingName) {
      cancelEdit();
      return;
    }
    setSavingEdit(true);
    try {
      await updateArea({ original_name: editingName, patch: { name: editValue.trim() } });
      toast.success("Renamed");
      cancelEdit();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (row: SkillAreaRow) => {
    try {
      await updateArea({ original_name: row.name, patch: { is_active: !row.is_active } });
      toast.success(row.is_active ? "Hidden from forms" : "Shown in forms");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = async (row: SkillAreaRow) => {
    if (!confirm(`Delete "${row.name}"?\n\nExisting Interpersonal Skills records that use this label will keep showing it. New records will not be able to pick it.`)) {
      return;
    }
    try {
      await deleteArea({ name: row.name });
      toast.success("Deleted");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-base font-heading font-bold text-foreground">
              Interpersonal Skill Areas
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            Categories available in the Interpersonal Skills &amp; Firm Fit tab
            dropdown. Add, rename or hide any entry; existing records keep
            their original label.
          </p>
        </div>
      </div>

      <form onSubmit={onAdd} className="flex items-center gap-2 mb-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New skill area (e.g. Risk Management)"
          className="max-w-sm"
        />
        <Button type="submit" disabled={adding || !newName.trim()}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Add
        </Button>
      </form>

      {isLoading ? (
        <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          No skill areas yet. Add one above.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-2 pr-3">Name</th>
              <th className="text-left py-2 pr-3 w-[120px]">Status</th>
              <th className="text-right py-2 w-[160px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => (
              <tr key={row.name} className="hover:bg-muted/20">
                <td className="py-2 pr-3">
                  {editingName === row.name ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    <span className={row.is_active ? "" : "text-muted-foreground line-through"}>
                      {row.name}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <button
                    onClick={() => toggleActive(row)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      row.is_active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title="Click to toggle"
                  >
                    {row.is_active ? "Active" : "Hidden"}
                  </button>
                </td>
                <td className="py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    {editingName === row.name ? (
                      <>
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit || !editValue.trim()}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => beginEdit(row)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted"
                          aria-label="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(row)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InterpersonalSkillsCard;
