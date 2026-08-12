import { useState } from "react";
import { Pencil, Trash2, Plus, Loader2, DollarSign } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSalaryHistory, formatSalary, CURRENCIES } from "@/hooks/useSalaryHistory";
import { formatDateLong } from "@/lib/tenure";
import type { SalaryHistoryRow } from "@/types/database";

type FormState = { id?: string; year: string; annual_salary: string; currency: string; notes: string };

const emptyForm = (): FormState => ({
  year: String(new Date().getFullYear()),
  annual_salary: "",
  currency: "CAD",
  notes: "",
});

const SalaryCard = ({ employeeId, employeeName }: { employeeId: string; employeeName: string }) => {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useSalaryHistory(employeeId);
  const [showAll, setShowAll] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const current = entries[0];
  const visible = showAll ? entries : entries.slice(0, 3);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["salary-history", employeeId] });

  const save = async () => {
    if (!form) return;
    const year = Number(form.year);
    const amount = Number(form.annual_salary);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      toast.error("Enter a valid year between 1900 and 2100");
      return;
    }
    if (!form.annual_salary.trim() || !Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid annual salary");
      return;
    }
    setSaving(true);
    const payload = {
      employee_id: employeeId,
      year,
      annual_salary: amount,
      currency: form.currency,
      notes: form.notes.trim() || null,
    };
    const { error } = form.id
      ? await supabase.from("salary_history").update(payload as never).eq("id", form.id)
      : await supabase.from("salary_history").insert(payload as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Salary entry updated" : "Salary entry added");
    setForm(null);
    refresh();
  };

  const remove = async (row: SalaryHistoryRow) => {
    if (!confirm(`Delete the ${row.year} salary entry?`)) return;
    const { error } = await supabase.from("salary_history").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Salary entry deleted");
    refresh();
  };

  const labelCls = "text-xs font-medium text-muted-foreground";
  const selectCls =
    "mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 mt-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Salary
        </h3>
        {permissions.can_edit_salary && (
          <button
            onClick={() => setManageOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Manage Salary
          </button>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground">Current Salary</p>
        <p className="text-lg font-semibold text-foreground">
          {isLoading ? "…" : current ? `${formatSalary(Number(current.annual_salary), current.currency)} (${current.year})` : "—"}
        </p>
      </div>

      {entries.length > 0 && (
        <div className="border-t border-border pt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Year</th>
                <th className="py-1.5 font-medium">Annual Salary</th>
                <th className="py-1.5 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 font-medium text-foreground">{row.year}</td>
                  <td className="py-2 text-foreground">{formatSalary(Number(row.annual_salary), row.currency)}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {row.updated_at ? `Last updated ${formatDateLong(row.updated_at)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              {showAll ? "Show less" : `Show all history (${entries.length})`}
            </button>
          )}
        </div>
      )}

      <Dialog
        open={manageOpen}
        onOpenChange={(o) => {
          setManageOpen(o);
          if (!o) setForm(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary History — {employeeName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground">No salary entries yet.</p>
            )}
            {entries.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {row.year} · {formatSalary(Number(row.annual_salary), row.currency)}
                  </p>
                  {row.notes && <p className="text-xs text-muted-foreground mt-0.5">{row.notes}</p>}
                  {row.updated_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">Last updated {formatDateLong(row.updated_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label={`Edit ${row.year} salary`}
                    onClick={() =>
                      setForm({
                        id: row.id,
                        year: String(row.year),
                        annual_salary: String(row.annual_salary),
                        currency: row.currency,
                        notes: row.notes ?? "",
                      })
                    }
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={`Delete ${row.year} salary`}
                    onClick={() => remove(row)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {form ? (
            <div className="border-t border-border pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="sal-year" className={labelCls}>Year *</Label>
                  <Input
                    id="sal-year"
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sal-amount" className={labelCls}>Annual Salary *</Label>
                  <Input
                    id="sal-amount"
                    type="number"
                    step={100}
                    min={0}
                    value={form.annual_salary}
                    onChange={(e) => setForm({ ...form, annual_salary: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sal-currency" className={labelCls}>Currency</Label>
                  <select
                    id="sal-currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className={selectCls}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="sal-notes" className={labelCls}>Notes</Label>
                <Input
                  id="sal-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional"
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setForm(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.id ? "Save entry" : "Add entry"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setForm(emptyForm())}
              className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add salary entry
            </button>
          )}

          <DialogFooter>
            <button
              onClick={() => setManageOpen(false)}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryCard;
