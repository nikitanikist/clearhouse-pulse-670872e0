import { useState } from "react";
import { Plus } from "lucide-react";

interface Note {
  date: string;
  text: string;
  author: string;
}

const initialNotes: Note[] = [
  { date: "Feb 20, 2026", author: "David Chen", text: "Priya handled the Meridian Group audit independently this quarter. Very impressed with her attention to detail on the revenue recognition sections. Recommending her for the Senior Associate excellence award." },
  { date: "Jan 8, 2026", author: "David Chen", text: "Discussed career development goals for 2026. Priya is interested in taking on an IFRS advisory engagement. Will look for an opportunity in Q2." },
  { date: "Nov 15, 2025", author: "Sarah Wong", text: "Priya completed her CPA PERT experience requirements. On track for final exam in September 2026." },
  { date: "Sep 3, 2025", author: "David Chen", text: "Observed strong client relationship management during the TechNova engagement. Client specifically praised her responsiveness." },
  { date: "Jun 12, 2025", author: "Sarah Wong", text: "Priya volunteered to lead the summer intern orientation program. Did an excellent job organizing sessions and mentoring 3 interns." },
];

const ManagementNotes = () => {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");

  const uniqueAuthors = Array.from(new Set(notes.map((n) => n.author)));
  const filteredNotes = authorFilter === "all" ? notes : notes.filter((n) => n.author === authorFilter);

  const addNote = () => {
    if (!newNote.trim()) return;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setNotes([{ date: dateStr, author: "Sarb Clearhouse", text: newNote.trim() }, ...notes]);
    setNewNote("");
  };

  return (
    <div className="space-y-6">
      {/* Add note */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-base font-heading font-bold text-foreground mb-3">Add Note</h3>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a management note..."
          className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        <button
          onClick={addNote}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      {/* Filter & Notes Table */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredNotes.map((note, i) => (
              <tr key={i} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground align-top whitespace-nowrap">{note.date}</td>
                <td className="px-4 py-3 text-sm text-foreground leading-relaxed">{note.text}</td>
                <td className="px-4 py-3 text-sm font-medium text-primary align-top whitespace-nowrap">{note.author}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredNotes.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No management notes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementNotes;
