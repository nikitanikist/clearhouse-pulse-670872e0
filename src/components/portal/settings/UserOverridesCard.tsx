import { useMemo, useState } from "react";
import { UserCog, Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useAllUsersForOverrides,
  useEffectiveMatrixForUser,
  useSetUserOverride,
  useClearUserOverride,
  type EffectiveMatrixCell,
} from "@/hooks/useUserOverrides";
import type { PermissionScope } from "@/hooks/usePermissionMatrix";

const SCOPE_LABELS: Record<PermissionScope, string> = {
  all: "All employees",
  own_department: "Own department",
  own_team: "Own team",
  linked_manager_only: "Only when I'm a linked manager",
  self: "Only self",
};

const CATEGORY_HEADINGS: Record<EffectiveMatrixCell["category"], string> = {
  nav: "Navigation",
  tab: "Employee record tabs",
  action: "Admin actions",
};

const UserOverridesCard = () => {
  const { data: users = [], isLoading: uLoading } = useAllUsersForOverrides();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: matrix = [], isLoading: mLoading } = useEffectiveMatrixForUser(selectedUserId);
  const setOverride = useSetUserOverride();
  const clearOverride = useClearUserOverride();
  const [query, setQuery] = useState("");

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.full_name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.position ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const grouped = useMemo(() => {
    const by: Record<string, EffectiveMatrixCell[]> = {};
    for (const row of matrix) (by[row.category] ||= []).push(row);
    return by;
  }, [matrix]);

  const save = async (
    row: EffectiveMatrixCell,
    patch: Partial<Pick<EffectiveMatrixCell, "can_view" | "can_edit" | "scope">>,
  ) => {
    if (!selectedUserId) return;
    try {
      await setOverride({
        user_id: selectedUserId,
        resource_key: row.resource_key,
        can_view: patch.can_view ?? row.can_view,
        can_edit: patch.can_edit ?? row.can_edit,
        scope: (patch.scope ?? row.scope) as PermissionScope,
      });
    } catch (e) {
      toast.error(`Could not save override: ${(e as Error).message}`);
    }
  };

  const clear = async (row: EffectiveMatrixCell) => {
    if (!selectedUserId) return;
    try {
      await clearOverride({ user_id: selectedUserId, resource_key: row.resource_key });
    } catch (e) {
      toast.error(`Could not clear override: ${(e as Error).message}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <h2 className="text-base font-heading font-bold text-foreground">User Overrides</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            Override permissions for ONE specific person without changing their
            whole position. Example: if Karan is a Partner but you want him to
            see nothing, pick him here and toggle his cells off — the
            override wins over the position default.
          </p>
        </div>
      </div>

      {/* User picker */}
      <div className="mb-4 flex items-start gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search user by name, email, or position"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-3 py-2 w-full rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={selectedUserId ?? ""}
          onChange={(e) => setSelectedUserId(e.target.value || null)}
          className="px-3 py-2 rounded-md border border-input bg-background text-sm min-w-[280px] focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Pick a user —</option>
          {filteredUsers.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.full_name} {u.position ? `· ${u.position}` : ""}
            </option>
          ))}
        </select>
      </div>

      {uLoading && (
        <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      )}

      {!uLoading && !selectedUserId && (
        <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          Pick a user above to see and change their permissions.
        </div>
      )}

      {selectedUser && mLoading && (
        <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {selectedUser.full_name}'s matrix…
        </div>
      )}

      {selectedUser && !mLoading && matrix.length > 0 && (
        <>
          <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <span className="font-semibold text-foreground">{selectedUser.full_name}</span>
            {selectedUser.email && <span className="text-muted-foreground"> · {selectedUser.email}</span>}
            {selectedUser.position && <span className="text-muted-foreground"> · Position: {selectedUser.position}</span>}
            {selectedUser.security_level === 1 && (
              <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                Administrator (bypasses all)
              </span>
            )}
            <p className="text-muted-foreground mt-1.5">
              Cells with a <span className="inline-block h-2 w-2 rounded-full bg-primary align-middle mx-0.5" /> dot are overridden for this user.
              Clear an override to restore the position default.
            </p>
          </div>

          {(Object.keys(CATEGORY_HEADINGS) as EffectiveMatrixCell["category"][]).map((cat) => {
            const rows = grouped[cat] ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={cat} className="mt-5 first:mt-0">
                <h3 className="text-sm font-heading font-bold text-foreground mb-2 border-b border-border pb-1">
                  {CATEGORY_HEADINGS[cat]}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="text-left py-2 pr-3">Resource</th>
                      <th className="text-center py-2 pr-3 w-[80px]">View</th>
                      <th className="text-center py-2 pr-3 w-[80px]">Edit</th>
                      <th className="text-center py-2 pr-3 w-[220px]">Scope</th>
                      <th className="text-right py-2 w-[110px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.resource_key} className="hover:bg-muted/20">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            {row.is_overridden && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" title="Overridden for this user" />
                            )}
                            <span className="font-medium">{row.resource_label}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <ToggleSw checked={row.can_view} onChange={(v) => save(row, { can_view: v })} />
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <ToggleSw checked={row.can_edit} onChange={(v) => save(row, { can_edit: v })} disabled={!row.can_view} />
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <select
                            value={row.scope}
                            disabled={!row.can_view}
                            onChange={(e) => save(row, { scope: e.target.value as PermissionScope })}
                            className="w-full px-2 py-1 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          >
                            {(Object.keys(SCOPE_LABELS) as PermissionScope[]).map((s) => (
                              <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 text-right">
                          {row.is_overridden && (
                            <button
                              onClick={() => clear(row)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-xs hover:bg-muted/50 transition-colors"
                              title="Remove this override and fall back to position default"
                            >
                              <RotateCcw className="h-3 w-3" /> Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};

const ToggleSw = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border transition-colors ${
      checked ? "bg-primary border-primary" : "bg-muted border-input"
    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-background shadow transform transition-transform mt-[1px] ${
        checked ? "translate-x-[18px]" : "translate-x-[2px]"
      }`}
    />
  </button>
);

export default UserOverridesCard;
