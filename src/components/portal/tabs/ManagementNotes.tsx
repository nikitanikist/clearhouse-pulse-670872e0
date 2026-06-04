import { useState } from "react";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useManagementNotes } from "@/hooks/useEmployees";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ManagementNotesProps {
  employeeId: string;
  authorName: string;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatEdited = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
};

const ManagementNotes = ({ employeeId, authorName }: ManagementNotesProps) => {
  const { data: notes = [], isLoading } = useManagementNotes(employeeId);
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "notes"] });

  const saveEdit = async () => {
    if (!editNote || !editNote.text.trim()) return;
    setEditSaving(true);
    const { error } = await supabase
      .from("management_notes")
      .update({ comment_text: editNote.text.trim() } as never)
      .eq("id", editNote.id);
    setEditSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note updated");
    setEditNote(null);
    invalidate();
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    const { error } = await supabase.from("management_notes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note deleted");
    invalidate();
  };

  const uniqueAuthors = Array.from(new Set(notes.map((n) => n.comment_by)));
  const filteredNotes =
    authorFilter === "all" ? notes : notes.filter((n) => n.comment_by === authorFilter);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("management_notes").insert([{
      employee_id: employeeId,
      comment_text: newNote.trim(),
      comment_by: authorName,
    }] as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewNote("");
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "notes"] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Add Note</h3>
        <Label htmlFor="new-note" className="sr-only">New management note</Label>
        <textarea
          id="new-note"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a management note..."
          className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        <button
          onClick={addNote}
          disabled={saving || !newNote.trim()}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Note
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Filter by author:</label>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Authors</option>
              {uniqueAuthors.map((author) => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {filteredNotes.length} of {notes.length} notes
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comments</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Comments Provided By</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredNotes.map((note) => (
              <tr key={note.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground align-top whitespace-nowrap">{formatDate(note.created_at)}</td>
                <td className="px-4 py-3 text-sm text-foreground leading-relaxed">{note.comment_text}</td>
                <td className="px-4 py-3 text-sm font-medium text-primary align-top whitespace-nowrap">{note.comment_by}</td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setEditNote({ id: note.id, text: note.comment_text })}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      aria-label="Edit note"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading notes…
          </div>
        ) : (
          filteredNotes.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No management notes yet.</p>
            </div>
          )
        )}
      </div>

      <Dialog open={!!editNote} onOpenChange={(o) => !o && setEditNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <textarea
            value={editNote?.text ?? ""}
            onChange={(e) => setEditNote((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
            rows={5}
            className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <DialogFooter>
            <button
              onClick={() => setEditNote(null)}
              className="px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={editSaving || !editNote?.text.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementNotes;
