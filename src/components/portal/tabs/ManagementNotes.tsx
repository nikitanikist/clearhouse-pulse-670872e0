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

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-primary/20" />

        <div className="space-y-4">
          {notes.map((note, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div className="absolute -left-6 top-5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background" />
              <div className="bg-card rounded-lg border border-border shadow-sm p-5 ml-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{note.date}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-medium text-primary">{note.author}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{note.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagementNotes;
