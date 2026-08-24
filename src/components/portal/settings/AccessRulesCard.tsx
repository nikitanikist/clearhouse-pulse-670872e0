import { useState } from "react";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useAccessRules,
  useUpsertAccessRule,
  type AccessRule,
  type AccessScope,
} from "@/hooks/useAccessRules";
import { usePositions } from "@/hooks/useLookups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SCOPE_OPTIONS: { value: AccessScope; label: string }[] = [
  { value: "all", label: "Everyone in the company" },
  { value: "own_department", label: "Everyone in their own department" },
  { value: "own_location", label: "Everyone in their own location (Canada / India)" },
  { value: "own_reports", label: "Only their direct reports" },
  { value: "own_reports_tree", label: "Their direct + indirect reports" },
  { value: "self", label: "Only their own record" },
  { value: "custom", label: "Only specific position titles" },
];

const TITLE_FILTER_SCOPES: AccessScope[] = ["own_department", "own_location", "custom"];

const ADMIN_FLAGS: { key: keyof AccessRule; label: string; helper: string }[] = [
  { key: "can_manage_access_rules", label: "Manage access rules", helper: "Can edit these access rules" },
  { key: "can_manage_lookups", label: "Manage lookups", helper: "Can manage Departments and Positions" },
  { key: "can_manage_users", label: "Manage users", helper: "Can invite users and change their access" },
  { key: "can_import_data", label: "Import data", helper: "Can bulk-import employees from Excel" },
];

const EDIT_FLAGS: { key: keyof AccessRule; label: string; helper: string }[] = [
  { key: "can_add_employee", label: "Add employees", helper: "Can add new employees" },
  { key: "can_edit_employee_profile", label: "Edit profiles", helper: "Can edit employee profile fields" },
  { key: "can_edit_performance", label: "Edit performance", helper: "Can edit Performance section" },
  { key: "can_edit_interpersonal", label: "Edit interpersonal", helper: "Can edit Interpersonal Skills entries" },
  { key: "can_edit_growth", label: "Edit growth", helper: "Can edit Growth & Potential" },
  { key: "can_edit_notes", label: "Edit notes", helper: "Can add/edit/delete Management Notes" },
];

const LOCKOUT_WARNING_POSITIONS = ["Partner", "Human Resources"];

const summarizeScope = (scope: AccessScope, titles: string[]): string => {
  const base = SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
  if (TITLE_FILTER_SCOPES.includes(scope) && titles.length > 0) {
    return `${base} — ${titles.join(", ")}`;
  }
  return base;
};

const defaultRule = (position: string): AccessRule => ({
  position,
  visibility_scope: "self",
  visible_position_titles: [],
  notes_scope: "self",
  notes_visible_position_titles: [],
  can_manage_access_rules: false,
  can_manage_lookups: false,
  can_manage_users: false,
  can_import_data: false,
  can_add_employee: false,
  can_edit_employee_profile: false,
  can_edit_performance: false,
  can_edit_interpersonal: false,
  can_edit_growth: false,
  can_edit_notes: false,
});

const AccessRulesCard = () => {
  const { data: rules = [], isLoading, error } = useAccessRules();
  const { data: positions = [] } = usePositions();
  const upsert = useUpsertAccessRule();
  const [draft, setDraft] = useState<AccessRule | null>(null);

  const ruleByPosition = new Map(rules.map((r) => [r.position, r]));
  const allPositions = [
    ...new Set([...positions.map((p) => p.name), ...rules.map((r) => r.position)]),
  ].sort((a, b) => a.localeCompare(b));

  const openEditor = (position: string) => {
    const existing = ruleByPosition.get(position);
    setDraft(existing ? { ...existing } : defaultRule(position));
  };

  const toggleTitle = (field: "visible_position_titles" | "notes_visible_position_titles", title: string) => {
    setDraft((d) => {
      if (!d) return d;
      const list = d[field];
      return {
        ...d,
        [field]: list.includes(title) ? list.filter((t) => t !== title) : [...list, title],
      };
    });
  };

  const save = () => {
    if (!draft) return;
    upsert.mutate(draft, {
      onSuccess: () => {
        toast.success(`Access rule updated for ${draft.position}`);
        setDraft(null);
      },
      onError: (e) => {
        toast.error("Failed to save access rule", { description: (e as Error).message });
      },
    });
  };

  const renderScopePicker = (
    scopeField: "visibility_scope" | "notes_scope",
    titlesField: "visible_position_titles" | "notes_visible_position_titles",
  ) => {
    if (!draft) return null;
    const positionNames = positions.map((p) => p.name);
    return (
      <>
        <RadioGroup
          value={draft[scopeField]}
          onValueChange={(v) => setDraft({ ...draft, [scopeField]: v as AccessScope })}
          className="space-y-2"
        >
          {SCOPE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2.5">
              <RadioGroupItem value={opt.value} id={`${scopeField}-${opt.value}`} />
              <Label htmlFor={`${scopeField}-${opt.value}`} className="font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {TITLE_FILTER_SCOPES.includes(draft[scopeField]) && (
          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Limit to specific position titles (leave empty for no title filter):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {positionNames.map((name) => {
                const selected = draft[titlesField].includes(name);
                return (
                  <Badge
                    key={name}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTitle(titlesField, name)}
                  >
                    {name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderFlagSwitches = (flags: typeof ADMIN_FLAGS) => (
    <div className="space-y-3">
      {flags.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.helper}</p>
          </div>
          <Switch
            checked={Boolean(draft?.[f.key])}
            onCheckedChange={(checked) =>
              setDraft((d) => (d ? { ...d, [f.key]: checked } : d))
            }
          />
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-card rounded-lg border border-border p-6 mt-6">
      <h2 className="text-lg font-heading font-semibold text-foreground">Access Rules</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Configure what each position can see and do. This is the primary access-control system — a user's access follows their POSITION (matched by email to an employee record).
      </p>

      {isLoading && (
        <div className="space-y-2 py-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load access rules.
        </div>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee visibility</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes visibility</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allPositions.map((position) => {
                const rule = ruleByPosition.get(position);
                return (
                  <tr key={position} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-foreground">{position}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {rule ? (
                        summarizeScope(rule.visibility_scope, rule.visible_position_titles)
                      ) : (
                        <span className="italic">(unconfigured — sees own record only)</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {rule ? summarizeScope(rule.notes_scope, rule.notes_visible_position_titles) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => openEditor(position)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {allPositions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    No positions configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-md border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Visibility legend</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li><span className="font-medium text-foreground">Everyone in the company:</span> sees all employee records.</li>
          <li><span className="font-medium text-foreground">Own department / location:</span> sees employees in their own department or location, optionally limited to selected titles.</li>
          <li><span className="font-medium text-foreground">Direct / direct + indirect reports:</span> sees employees whose supervisor is them (optionally down the whole reporting chain).</li>
          <li><span className="font-medium text-foreground">Own record:</span> sees only their own record.</li>
          <li><span className="font-medium text-foreground">Specific titles:</span> sees only employees holding the selected position titles, across the company.</li>
          <li><span className="font-medium text-foreground">Notes visibility:</span> works the same way but applies only to Management Notes — it can be wider than the main visibility.</li>
        </ul>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && !upsert.isPending && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Rule — {draft?.position}</DialogTitle>
            <DialogDescription>
              Control what employees in this position can see and which actions they can take.
            </DialogDescription>
          </DialogHeader>

          {draft && LOCKOUT_WARNING_POSITIONS.includes(draft.position) && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700">
                Removing &apos;sees everyone&apos; from {draft.position} may lock out administrators. Change with care.
              </p>
            </div>
          )}

          <div className="space-y-6 py-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Employee visibility</h3>
              {renderScopePicker("visibility_scope", "visible_position_titles")}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes visibility</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Notes can be wider than the main visibility — e.g. a Manager can add notes across all departments even if they only see profiles in their own department.
              </p>
              {renderScopePicker("notes_scope", "notes_visible_position_titles")}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Admin capabilities</h3>
              {renderFlagSwitches(ADMIN_FLAGS)}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Edit capabilities</h3>
              {renderFlagSwitches(EDIT_FLAGS)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={upsert.isPending} onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AccessRulesCard;
