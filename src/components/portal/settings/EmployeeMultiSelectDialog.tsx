import { useMemo, useState, useEffect } from "react";
import { Search, Loader2, Users, X, Check } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  /** When open=true, called with the final selection on Save or null on Cancel. */
  onClose: (next: string[] | null) => void;
  /** Initial selected employee ids. */
  initialIds: string[];
  /** Heading context, e.g. "Emily / Interpersonal Skills". */
  contextLabel?: string;
}

/**
 * Reusable modal: lists every employee, lets admin check as many as they want,
 * returns the final set of ids on Save. Used by both PermissionsMatrixCard
 * (position-level) and UserOverridesCard (user-level) when the chosen scope
 * is 'specific_employees'.
 */
const EmployeeMultiSelectDialog = ({ open, onClose, initialIds, contextLabel }: Props) => {
  const { data: employees = [], isLoading } = useEmployees();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));

  // Reset local state whenever the dialog opens with a new set of initial ids.
  useEffect(() => {
    if (open) {
      setSelected(new Set(initialIds));
      setQuery("");
    }
  }, [open, initialIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((e) =>
      e.name.toLowerCase().includes(q)
      || e.position.toLowerCase().includes(q)
      || e.department.toLowerCase().includes(q)
      || e.email.toLowerCase().includes(q),
    );
  }, [employees, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((e) => next.add(e.id));
      return next;
    });
  };
  const clearAll = () => setSelected(new Set());

  const totalCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pick specific employees</DialogTitle>
          <DialogDescription>
            {contextLabel
              ? `Choose which employees are included in the "${contextLabel}" scope.`
              : "Choose which employees are included in this scope."}
            {" "}The user will see this resource ONLY for the people you check here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role, department or email"
              className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
            <Check className="h-3.5 w-3.5 mr-1" /> Select visible
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>

        <div className="mt-3 border border-border rounded-md max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="py-10 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading employees…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground text-center">
              No employees match "{query}".
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => {
                const isChecked = selected.has(e.id);
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => toggle(e.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors ${
                        isChecked ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                        {e.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{e.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {e.position} · {e.department}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-4 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {totalCount} selected
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onClose(null)}>Cancel</Button>
            <Button type="button" onClick={() => onClose(Array.from(selected))}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeMultiSelectDialog;
