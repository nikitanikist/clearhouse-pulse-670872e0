import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus, Lock, Unlock, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/data/employees";
import {
  usePdrCycles,
  useCreatePdrCycle,
  useSetPdrStatus,
} from "@/hooks/usePdrCycles";
import { useCanDo } from "@/hooks/useCanDo";
import { useMyEmployeeId } from "@/hooks/useEmployees";
import type { PdrCycleHalf, PdrCycleRow } from "@/types/pdr";
import { HALF_LABEL } from "@/types/pdr";
import PdrCycleForm from "./PdrCycleForm";

interface Props {
  employee: Employee;
  /** When true, hide reviewer-only sections (employee's own-record view). */
  revieweeView?: boolean;
}

const yearNow = () => new Date().getFullYear();

const PdrTab = ({ employee, revieweeView = false }: Props) => {
  const { data: cycles = [], isLoading } = usePdrCycles(employee.id);
  const matrix = useCanDo();
  const { data: myId } = useMyEmployeeId();
  const createCycle = useCreatePdrCycle();
  const setStatus = useSetPdrStatus();

  const canLock    = matrix.isAdmin || matrix.can("action:pdr_lock",    "view");
  const canArchive = matrix.isAdmin || matrix.can("action:pdr_archive", "view");
  const canCreate  = matrix.isAdmin || matrix.can("action:pdr_lock",    "view");

  const isSelf = !!myId && myId === employee.id;

  // Group archived cycles by year descending; keep the "current" (open/shutdown)
  // cycle(s) separate at the top.
  const current = cycles.filter((c) => c.status !== "archived");
  const archivedByYear = useMemo(() => {
    const by: Record<number, PdrCycleRow[]> = {};
    for (const c of cycles.filter((c) => c.status === "archived")) {
      (by[c.year] ||= []).push(c);
    }
    return Object.entries(by)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([year, rows]) => ({
        year: Number(year),
        rows: rows.sort((a, b) =>
          a.half === "yearend" && b.half === "midyear" ? -1 :
          a.half === "midyear" && b.half === "yearend" ?  1 : 0),
      }));
  }, [cycles]);

  const [selected, setSelected] = useState<PdrCycleRow | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set([yearNow()]));
  const toggleYear = (y: number) =>
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y); else next.add(y);
      return next;
    });

  // When nothing selected, prefer the open cycle; else the newest archived
  const displayCycle = selected ?? current[0] ?? cycles[0] ?? null;

  const createNew = async (half: PdrCycleHalf) => {
    try {
      const row = await createCycle({
        employee_id: employee.id,
        year: yearNow(),
        half,
        reviewer_name_snapshot: employee.supervisor || null,
      });
      toast.success(`${HALF_LABEL[half]} ${yearNow()} PDR created`);
      setSelected(row);
    } catch (e) {
      toast.error(`Could not create cycle: ${(e as Error).message}`);
    }
  };

  const changeStatus = async (row: PdrCycleRow, nextStatus: "open" | "shutdown" | "archived") => {
    const confirmMsg = nextStatus === "archived"
      ? "Archive this cycle? Once archived it becomes read-only."
      : nextStatus === "shutdown"
      ? "Start shutdown? The employee will not be able to view this PDR until shutdown ends."
      : "End shutdown and reopen for the employee?";
    if (!confirm(confirmMsg)) return;
    try {
      await setStatus({ id: row.id, employee_id: row.employee_id, status: nextStatus });
      toast.success(`Status: ${nextStatus}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // During shutdown, employees viewing their own PDR get a block message
  if (revieweeView && isSelf && displayCycle?.status === "shutdown") {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-6">
        <h3 className="font-heading font-bold text-foreground mb-1">PDR temporarily unavailable</h3>
        <p className="text-sm text-muted-foreground">
          Your {HALF_LABEL[displayCycle.half]} {displayCycle.year} PDR is currently with your manager.
          It will become available again after your 1:1 meeting.
        </p>
      </div>
    );
  }

  const existingHalvesThisYear = new Set(
    cycles.filter((c) => c.year === yearNow()).map((c) => c.half),
  );
  const availableNewHalves: PdrCycleHalf[] =
    (["midyear", "yearend"] as const).filter((h) => !existingHalvesThisYear.has(h));

  return (
    <div className="space-y-5">
      {/* Create / status strip */}
      {canCreate && availableNewHalves.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">Start a new cycle for {yearNow()}:</span>
          {availableNewHalves.map((h) => (
            <button
              key={h}
              onClick={() => createNew(h)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <FilePlus className="h-4 w-4" /> {HALF_LABEL[h]} {yearNow()}
            </button>
          ))}
        </div>
      )}

      {/* Cycle picker + status buttons */}
      {displayCycle && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
          <select
            value={displayCycle.id}
            onChange={(e) => setSelected(cycles.find((c) => c.id === e.target.value) ?? null)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {HALF_LABEL[c.half]} {c.year} — {c.status}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {displayCycle.status === "open" && canLock && (
              <button
                onClick={() => changeStatus(displayCycle, "shutdown")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-warning/30 bg-warning/10 text-xs font-semibold hover:bg-warning/20"
              >
                <Lock className="h-3.5 w-3.5" /> Start shutdown
              </button>
            )}
            {displayCycle.status === "shutdown" && canLock && (
              <button
                onClick={() => changeStatus(displayCycle, "open")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-muted/50"
              >
                <Unlock className="h-3.5 w-3.5" /> End shutdown
              </button>
            )}
            {displayCycle.status !== "archived" && canArchive && (
              <button
                onClick={() => changeStatus(displayCycle, "archived")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-semibold hover:bg-muted/50"
              >
                <Archive className="h-3.5 w-3.5" /> Archive cycle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      {isLoading ? (
        <div className="py-12 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading PDRs…
        </div>
      ) : !displayCycle ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No PDR cycles yet.</p>
        </div>
      ) : (
        <PdrCycleForm
          employee={employee}
          cycle={displayCycle}
          readOnly={displayCycle.status === "archived"}
          revieweeView={revieweeView}
        />
      )}

      {/* Archive tree */}
      {archivedByYear.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-heading font-bold text-foreground mb-3">Archive</h3>
          <div className="space-y-1">
            {archivedByYear.map(({ year, rows }) => {
              const open = expandedYears.has(year);
              return (
                <div key={year}>
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-muted/40 text-sm"
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="font-medium">{year}</span>
                    <span className="text-xs text-muted-foreground">({rows.length})</span>
                  </button>
                  {open && (
                    <div className="ml-6 border-l border-dashed border-border pl-3 space-y-1 py-1">
                      {rows.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-muted/40 ${
                            selected?.id === r.id ? "bg-muted/40 text-primary" : ""
                          }`}
                        >
                          {HALF_LABEL[r.half]} {r.year}
                          {r.archived_at && (
                            <span className="text-[11px] text-muted-foreground ml-2">
                              archived {new Date(r.archived_at).toLocaleDateString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdrTab;
