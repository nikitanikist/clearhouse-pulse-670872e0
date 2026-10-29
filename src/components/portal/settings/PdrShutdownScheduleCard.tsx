import { useMemo, useState } from "react";
import { CalendarRange, Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  usePdrSchedule,
  useUpsertPdrSchedule,
  useDeletePdrSchedule,
} from "@/hooks/usePdrCycles";
import { HALF_LABEL, type PdrCycleHalf, type PdrScheduleRow } from "@/types/pdr";

const todayIso = () => new Date().toISOString().slice(0, 10);

const PdrShutdownScheduleCard = () => {
  const { data: rows = [], isLoading } = usePdrSchedule();
  const upsert = useUpsertPdrSchedule();
  const del = useDeletePdrSchedule();

  const [addOpen, setAddOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [half, setHalf] = useState<PdrCycleHalf>("midyear");
  const [start, setStart] = useState<string>(todayIso());
  const [end, setEnd] = useState<string>(todayIso());
  const [saving, setSaving] = useState(false);

  // Local edit state so admins can tweak inline then click Save
  const [edits, setEdits] = useState<Record<string, { start: string; end: string }>>({});
  const keyOf = (r: PdrScheduleRow) => `${r.year}-${r.half}`;
  const effective = (r: PdrScheduleRow) => edits[keyOf(r)] ?? {
    start: r.shutdown_start ?? "",
    end:   r.shutdown_end   ?? "",
  };

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) =>
      a.year === b.year
        ? (a.half === "yearend" && b.half === "midyear" ? 1 : -1)
        : b.year - a.year,
    ),
    [rows],
  );

  const openAdd = () => {
    setYear(new Date().getFullYear());
    setHalf("midyear");
    setStart(todayIso());
    setEnd(todayIso());
    setAddOpen(true);
  };

  const addWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) {
      toast.error("Pick both a start and end date.");
      return;
    }
    if (start > end) {
      toast.error("End date must be after the start date.");
      return;
    }
    setSaving(true);
    try {
      await upsert({ year, half, shutdown_start: start, shutdown_end: end });
      toast.success(`${HALF_LABEL[half]} ${year} shutdown window saved`);
      setAddOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveRow = async (r: PdrScheduleRow) => {
    const e = effective(r);
    if (!e.start || !e.end) {
      toast.error("Pick both a start and end date.");
      return;
    }
    if (e.start > e.end) {
      toast.error("End date must be after the start date.");
      return;
    }
    try {
      await upsert({ year: r.year, half: r.half, shutdown_start: e.start, shutdown_end: e.end });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[keyOf(r)];
        return next;
      });
      toast.success("Shutdown window updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const removeRow = async (r: PdrScheduleRow) => {
    if (!confirm(`Delete the ${HALF_LABEL[r.half]} ${r.year} shutdown window?`)) return;
    try {
      await del({ year: r.year, half: r.half });
      toast.success("Removed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const now = todayIso();
  const windowStatus = (r: PdrScheduleRow): { label: string; cls: string } => {
    if (!r.shutdown_start || !r.shutdown_end) return { label: "Not set", cls: "text-muted-foreground" };
    if (now < r.shutdown_start) return { label: "Upcoming", cls: "text-primary" };
    if (now > r.shutdown_end)   return { label: "Past",     cls: "text-muted-foreground" };
    return { label: "Active now", cls: "text-warning" };
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h2 className="text-base font-heading font-bold text-foreground">PDR Shutdown Windows</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            During these windows the PDR form is hidden from the employee so
            their manager can enter review comments quietly. Managers continue
            to see the form; the employee gets a "temporarily unavailable"
            message with the end date. Dates can be changed any time.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Add window
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          No shutdown windows configured. Add one for the current Mid-Year /
          Year-End cycle so employees are auto-blocked during manager review time.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-2 pr-3 w-[80px]">Year</th>
              <th className="text-left py-2 pr-3 w-[110px]">Cycle</th>
              <th className="text-left py-2 pr-3">Start</th>
              <th className="text-left py-2 pr-3">End</th>
              <th className="text-left py-2 pr-3 w-[110px]">Status</th>
              <th className="text-right py-2 w-[140px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedRows.map((r) => {
              const e = effective(r);
              const dirty = !!edits[keyOf(r)];
              const status = windowStatus(r);
              return (
                <tr key={keyOf(r)}>
                  <td className="py-2 pr-3 font-medium">{r.year}</td>
                  <td className="py-2 pr-3">{HALF_LABEL[r.half]}</td>
                  <td className="py-2 pr-3">
                    <Input
                      type="date"
                      value={e.start}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [keyOf(r)]: { ...effective(r), start: ev.target.value } }))}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      type="date"
                      value={e.end}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [keyOf(r)]: { ...effective(r), end: ev.target.value } }))}
                    />
                  </td>
                  <td className={`py-2 pr-3 text-xs font-medium ${status.cls}`}>{status.label}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      {dirty && (
                        <Button size="sm" onClick={() => saveRow(r)}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                      )}
                      <button
                        onClick={() => removeRow(r)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        aria-label="Delete window"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => !saving && setAddOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={addWindow}>
            <DialogHeader>
              <DialogTitle>Add shutdown window</DialogTitle>
              <DialogDescription>
                Pick the cycle and the dates during which the employee is hidden from the form.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sw-year" className="text-xs">Year</Label>
                  <Input id="sw-year" type="number" min={2024} max={2100}
                         value={year} onChange={(e) => setYear(Number(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="sw-half" className="text-xs">Cycle</Label>
                  <select id="sw-half" value={half}
                          onChange={(e) => setHalf(e.target.value as PdrCycleHalf)}
                          className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="midyear">Mid-Year</option>
                    <option value="yearend">Year-End</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sw-start" className="text-xs">Shutdown start</Label>
                  <Input id="sw-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sw-end" className="text-xs">Shutdown end</Label>
                  <Input id="sw-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PdrShutdownScheduleCard;
