import { useMemo, useState } from "react";
import { Loader2, ShieldCheck, Info, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  usePermissionMatrix,
  usePermissionResources,
  useUpdatePermissionCell,
  type PermissionScope,
  type PositionPermissionRow,
  type PermissionResource,
} from "@/hooks/usePermissionMatrix";
import { usePositionNames } from "@/hooks/useLookups";

const SCOPE_LABELS: Record<PermissionScope, string> = {
  all: "All employees",
  own_department: "Own department",
  own_team: "Own team",
  self: "Only self",
};

const CATEGORY_HEADINGS: Record<PermissionResource["category"], string> = {
  nav: "Navigation",
  tab: "Employee record tabs",
  action: "Admin actions",
};

const CATEGORY_HELPERS: Record<PermissionResource["category"], string> = {
  nav: "Which sidebar links each position sees.",
  tab: "Which tabs show up on an employee's record, and whether that position can edit them.",
  action: "Discrete admin actions. 'View' here means 'allowed to perform'.",
};

const PermissionsMatrixCard = () => {
  const { data: resources = [], isLoading: rLoading } = usePermissionResources();
  const { data: rows = [], isLoading: pLoading } = usePermissionMatrix();
  const { names: positions, loading: posLoading } = usePositionNames();
  const update = useUpdatePermissionCell();

  // Map keyed by `${position}|${resource}` for O(1) lookup
  const byCell = useMemo(() => {
    const m = new Map<string, PositionPermissionRow>();
    for (const r of rows) m.set(`${r.position_name}|${r.resource_key}`, r);
    return m;
  }, [rows]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleCategory = (c: string) =>
    setCollapsed((prev) => ({ ...prev, [c]: !prev[c] }));

  const isLoading = rLoading || pLoading || posLoading;

  const resourcesByCategory = useMemo(() => {
    const groups: Record<string, PermissionResource[]> = {};
    for (const r of resources) (groups[r.category] ||= []).push(r);
    return groups;
  }, [resources]);

  const cellFor = (pos: string, key: string): PositionPermissionRow => {
    return byCell.get(`${pos}|${key}`) ?? {
      position_name: pos,
      resource_key: key,
      can_view: false,
      can_edit: false,
      scope: "self",
      updated_at: new Date().toISOString(),
    };
  };

  const saveCell = async (
    pos: string,
    res: PermissionResource,
    patch: Partial<Pick<PositionPermissionRow, "can_view" | "can_edit" | "scope">>,
  ) => {
    const existing = cellFor(pos, res.key);
    try {
      await update({
        position_name: pos,
        resource_key: res.key,
        can_view: patch.can_view ?? existing.can_view,
        can_edit: patch.can_edit ?? existing.can_edit,
        scope: (patch.scope ?? existing.scope) as PermissionScope,
      });
    } catch (e) {
      toast.error(`Could not save: ${(e as Error).message}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-heading font-bold text-foreground">Permissions</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            Control what each position can see and do, across the whole portal.
            Toggle a column on to grant access; pick the scope dropdown to
            narrow it down. Changes save instantly.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="py-12 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions…
        </div>
      )}

      {!isLoading && positions.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
          No positions found. Add positions in the Positions card above before
          configuring permissions.
        </div>
      )}

      {!isLoading && positions.length > 0 && (Object.keys(CATEGORY_HEADINGS) as Array<keyof typeof CATEGORY_HEADINGS>).map((category) => {
        const resList = resourcesByCategory[category] ?? [];
        if (resList.length === 0) return null;
        const isCollapsed = !!collapsed[category];
        return (
          <section key={category} className="mt-6 first:mt-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between py-2 border-b border-border mb-2 group"
            >
              <div className="flex items-center gap-2 text-left">
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                <h3 className="text-sm font-heading font-bold text-foreground">{CATEGORY_HEADINGS[category]}</h3>
              </div>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Info className="h-3 w-3" /> {CATEGORY_HELPERS[category]}
              </span>
            </button>

            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-card z-10 text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border w-[220px]">
                        Resource
                      </th>
                      {positions.map((pos) => (
                        <th
                          key={pos}
                          className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border min-w-[140px]"
                          title={pos}
                        >
                          {pos}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resList.map((res) => (
                      <tr key={res.key} className="hover:bg-muted/20">
                        <td className="sticky left-0 bg-card z-10 px-3 py-3 text-sm text-foreground border-b border-border align-top">
                          <div className="font-medium">{res.label}</div>
                          {res.description && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {res.description}
                            </div>
                          )}
                        </td>
                        {positions.map((pos) => {
                          const cell = cellFor(pos, res.key);
                          return (
                            <td
                              key={pos}
                              className="px-3 py-3 border-b border-border align-top"
                            >
                              <div className="flex flex-col items-center gap-1.5">
                                <ToggleRow
                                  label={category === "action" ? "Allow" : "View"}
                                  checked={cell.can_view}
                                  onChange={(v) => saveCell(pos, res, { can_view: v })}
                                />
                                {res.supports_edit && (
                                  <ToggleRow
                                    label="Edit"
                                    checked={cell.can_edit}
                                    onChange={(v) => saveCell(pos, res, { can_edit: v })}
                                    disabled={!cell.can_view}
                                  />
                                )}
                                {res.supports_scope && (
                                  <select
                                    value={cell.scope}
                                    disabled={!cell.can_view}
                                    onChange={(e) =>
                                      saveCell(pos, res, { scope: e.target.value as PermissionScope })
                                    }
                                    className="mt-1 w-full px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    aria-label={`Scope for ${pos} / ${res.label}`}
                                  >
                                    {(Object.keys(SCOPE_LABELS) as PermissionScope[]).map((s) => (
                                      <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const ToggleRow = ({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) => (
  <label className={`inline-flex items-center gap-2 text-xs ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
        checked ? "bg-primary border-primary" : "bg-muted border-input"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-background shadow transform transition-transform mt-[1px] ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
    <span className="text-muted-foreground">{label}</span>
  </label>
);

export default PermissionsMatrixCard;
