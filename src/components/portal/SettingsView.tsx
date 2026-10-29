import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, Pencil, Plus, ShieldAlert, Trash2, UserCircle2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DepartmentsCard, PositionsCard } from "@/components/portal/settings/LookupManagers";
import DataImport from "@/components/portal/settings/DataImport";
import AccessRulesCard from "@/components/portal/settings/AccessRulesCard";
import PermissionsMatrixCard from "@/components/portal/settings/PermissionsMatrixCard";
import ChangePasswordDialog from "@/components/portal/ChangePasswordDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useCanManageAccessRules } from "@/hooks/useAccessRules";
import { useCanDo } from "@/hooks/useCanDo";
import type { Permissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SettingsViewProps {
  securityLevel: number;
  currentUserId: string | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
  security_level: number;
  custom_permissions: Partial<Permissions> | null;
}

interface EmployeeLink {
  name: string;
  position: string;
}

// Role shown in the UI. Internally still a 1..6 number for backwards compat,
// but admins only ever see two meaningful options:
//   Level 1 → Administrator (sees everyone, can manage settings)
//   Level 2..6 → Employee (sees only who the supervisor chain says they can)
const LEVEL_LABELS: Record<number, string> = {
  1: "Administrator",
  2: "Employee",
  3: "Employee",
  4: "Employee",
  5: "Employee",
  6: "Employee",
};

// Only two options shown in dropdowns.
const ROLE_CHOICES = [
  { value: 1, label: "Administrator — sees every employee and can manage settings" },
  { value: 6, label: "Employee — sees themselves + anyone in their supervisor chain" },
];

const LEGEND: { level: number; desc: string }[] = [
  { level: 1, desc: "Administrator — full access to every employee and admin settings. Grant sparingly." },
  { level: 6, desc: "Employee — access follows the org chart (supervisor field)." },
];

interface PendingChange {
  userId: string;
  fullName: string;
  fromLevel: number;
  toLevel: number;
}

const SettingsView = ({ securityLevel, currentUserId }: SettingsViewProps) => {
  const qc = useQueryClient();
  const permissions = usePermissions();
  const isAdmin = securityLevel === 1;
  const { data: canManageRules = false } = useCanManageAccessRules();
  const matrix = useCanDo();
  // L1 admins always see every card (bypass). Everyone else sees cards only
  // when their position's matrix row grants the relevant action.
  const canManageLookups     = isAdmin || matrix.can("action:manage_lookups",     "view");
  const canManageUsersMatrix = isAdmin || matrix.can("action:manage_users",       "view");
  const canManagePermissions = isAdmin || matrix.can("action:manage_permissions", "view");
  const canImportData        = isAdmin || matrix.can("action:import_data",        "view");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [applying, setApplying] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLevel, setInviteLevel] = useState("6");
  const [inviting, setInviting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCandidates, setBulkCandidates] = useState<{ email: string; name: string }[]>([]);

  // Add / Edit / Delete user dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLevel, setAddLevel] = useState("6");
  const [adding, setAdding] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProfileRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLevel, setEditLevel] = useState("6");
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit I, O for readability
    const lower = "abcdefghijkmnopqrstuvwxyz"; // omit l
    const digits = "23456789"; // omit 0, 1
    const symbols = "!@#$%&*?";
    const all = upper + lower + digits + symbols;
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    // guarantee at least one of each category
    const pick = (set: string, idx: number) => set[bytes[idx] % set.length];
    const required = [pick(upper, 0), pick(lower, 1), pick(digits, 2), pick(symbols, 3)];
    const rest = Array.from({ length: 12 }, (_, i) => pick(all, i + 4));
    const combined = [...required, ...rest];
    // Fisher-Yates shuffle using fresh randomness
    const shuffle = new Uint32Array(combined.length);
    crypto.getRandomValues(shuffle);
    for (let i = combined.length - 1; i > 0; i--) {
      const j = shuffle[i] % (i + 1);
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined.join("");
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const openAdd = () => {
    setAddName("");
    setAddEmail("");
    setAddPassword("");
    setAddLevel("6");
    setAddOpen(true);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) return toast.error("Full name is required");
    if (!isValidEmail(addEmail.trim())) return toast.error("A valid email is required");
    if (addPassword.length < 8) return toast.error("Password must be at least 8 characters");
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: {
        action: "create",
        email: addEmail.trim(),
        password: addPassword,
        full_name: addName.trim(),
        security_level: Number(addLevel),
      },
    });
    setAdding(false);
    const fnError = (data as { error?: string } | null)?.error;
    if (error || fnError) {
      toast.error(fnError || error?.message || "Failed to create user");
      return;
    }
    toast.success(`${addName.trim()} created. Share their password securely.`);
    setAddOpen(false);
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const openEdit = (u: ProfileRow) => {
    setEditTarget(u);
    setEditName(u.full_name ?? "");
    setEditEmail(u.email ?? "");
    setEditLevel(String(u.security_level ?? 6));
    setEditOpen(true);
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editName.trim()) return toast.error("Full name is required");
    if (!isValidEmail(editEmail.trim())) return toast.error("A valid email is required");
    setEditing(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: {
        action: "update",
        user_id: editTarget.user_id,
        email: editEmail.trim(),
        full_name: editName.trim(),
        security_level: Number(editLevel),
      },
    });
    setEditing(false);
    const fnError = (data as { error?: string } | null)?.error;
    if (error || fnError) {
      toast.error(fnError || error?.message || "Failed to update user");
      return;
    }
    toast.success(`${editName.trim()} updated`);
    setEditOpen(false);
    setEditTarget(null);
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "delete", user_id: deleteTarget.user_id },
    });
    setDeleting(false);
    const fnError = (data as { error?: string } | null)?.error;
    if (error || fnError) {
      toast.error(fnError || error?.message || "Failed to delete user");
      return;
    }
    toast.success(`${deleteTarget.full_name || "User"} deleted`);
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const openBulkInvite = async () => {
    const { data, error } = await supabase.from("employees").select("name, email");
    if (error) {
      toast.error("Could not load employees", { description: error.message });
      return;
    }
    const seen = new Set<string>();
    const candidates: { email: string; name: string }[] = [];
    for (const row of (data ?? []) as { name: string; email: string }[]) {
      const email = (row.email ?? "").trim().toLowerCase();
      if (!isValidEmail(email) || seen.has(email)) continue;
      seen.add(email);
      candidates.push({ email, name: row.name });
    }
    setBulkCandidates(candidates);
    setBulkOpen(true);
  };

  const runBulkInvite = async () => {
    setBulkRunning(true);
    let sent = 0;
    let skipped = 0;
    const total = bulkCandidates.length;
    const toastId = toast.loading(`Sent 0 of ${total} invites…`);

    for (const c of bulkCandidates) {
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        const { data, error } = await supabase.functions.invoke("invite-user", {
          body: { email: c.email, full_name: c.name, security_level: 6 },
        });
        const fnError = (data as { error?: string } | null)?.error;
        if (!error && !fnError) {
          ok = true;
          break;
        }
        const message = (fnError || error?.message || "").toLowerCase();
        if (message.includes("already") || message.includes("registered")) break;
        if (message.includes("rate") || message.includes("429")) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        break;
      }
      if (ok) sent++;
      else skipped++;
      toast.loading(`Sent ${sent} of ${total} invites…`, { id: toastId });
    }

    setBulkRunning(false);
    setBulkOpen(false);
    toast.success(
      `Invited ${sent} new employees. They'll appear in the users list after they sign up. Skipped ${skipped} with missing/invalid email or already-invited.`,
      { id: toastId },
    );
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        security_level: Number(inviteLevel),
      },
    });
    setInviting(false);
    const fnError = (data as { error?: string } | null)?.error;
    if (error || fnError) {
      toast.error(fnError || error?.message || "Failed to send invitation");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail.trim()} — they'll appear in the list after they sign up`);
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteLevel("6");
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["portal-users"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, security_level, custom_permissions")
        .order("security_level", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });

  const { data: employeesByEmail = {} as Record<string, EmployeeLink> } = useQuery({
    queryKey: ["settings-employees-link"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("name, position, email");
      if (error) throw error;
      const map: Record<string, EmployeeLink> = {};
      for (const row of (data ?? []) as { name: string; position: string; email: string }[]) {
        const key = (row.email ?? "").trim().toLowerCase();
        if (key && !map[key]) map[key] = { name: row.name, position: row.position };
      }
      return map;
    },
  });

  const applyChange = async () => {
    if (!pending) return;
    setApplying(true);
    const { error } = await supabase
      .from("profiles")
      .update({ security_level: pending.toLevel } as never)
      .eq("user_id", pending.userId);
    setApplying(false);
    if (error) {
      toast.error("Failed to update access level", { description: error.message });
      return;
    }
    toast.success(`${pending.fullName || "User"} is now ${LEVEL_LABELS[pending.toLevel]}`);
    setPending(null);
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Manage your account, users, departments, positions, and bulk employee imports.</p>

      <section className="bg-card rounded-lg border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <UserCircle2 className="h-6 w-6 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">Account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your own login — change your password at any time.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="h-4 w-4 mr-1.5" /> Change Password
          </Button>
        </div>
      </section>

      <section className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Users</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Every person who can log into the portal. Access follows the org chart (supervisor field) — set <strong>Administrator</strong> only for people who need firm-wide visibility (HR, admin).
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={openBulkInvite}
                title="Send signup emails to every employee who doesn't yet have a login"
              >
                <Users className="h-4 w-4 mr-1.5" /> Email all employees
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteOpen(true)}
                title="Send one signup email — the user picks their own password"
              >
                <UserPlus className="h-4 w-4 mr-1.5" /> Email one invite
              </Button>
              <Button
                size="sm"
                onClick={openAdd}
                title="Create a login with a password you set now and share with the user"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create user
              </Button>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="rounded-md border border-border bg-muted/40 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              User management is available to Level 1 administrators only.
            </div>
          </div>
        )}

        {isAdmin && (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Failed to load users.
              </div>
            )}
            {!isLoading && !error && (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[260px]">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.user_id === currentUserId;
                      const link = employeesByEmail[(u.email ?? "").trim().toLowerCase()];
                      return (
                        <tr key={u.user_id} className="border-t border-border">
                          <td className="px-4 py-2 text-foreground">
                            {u.full_name || "—"}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {link ? `${link.name} — ${link.position}` : <span className="italic">(no employee record)</span>}
                          </td>
                          <td className="px-4 py-2">
                            <Select
                              value={u.security_level === 1 ? "1" : "6"}
                              disabled={isSelf}
                              onValueChange={(v) => {
                                const toLevel = Number(v);
                                if (toLevel === u.security_level) return;
                                setPending({
                                  userId: u.user_id,
                                  fullName: u.full_name,
                                  fromLevel: u.security_level,
                                  toLevel,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-full text-xs text-muted-foreground">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_CHOICES.map((c) => (
                                  <SelectItem key={c.value} value={String(c.value)}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(u)}
                                  aria-label={`Edit ${u.full_name || "user"}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(u)}
                                  aria-label={`Delete ${u.full_name || "user"}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Role guide</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {LEGEND.map((l) => (
                  <li key={l.level}>
                    <span className="font-medium text-foreground">
                      {l.level === 1 ? "Administrator" : "Employee"}:
                    </span>{" "}
                    {l.desc.replace(/^(Administrator|Employee)\s*—\s*/, "")}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      <AlertDialog open={bulkOpen} onOpenChange={(o) => !bulkRunning && setBulkOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invite all employees (email-matched)?</AlertDialogTitle>
            <AlertDialogDescription>
              Sends a signup email to every employee who doesn't yet have a login. They set their own password; access automatically follows the org chart. {bulkCandidates.length} employees will be emailed. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkRunning || bulkCandidates.length === 0} onClick={(e) => { e.preventDefault(); runBulkInvite(); }}>
              {bulkRunning ? "Sending…" : "Send invites"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={(o) => !adding && setAddOpen(o)}>
        <DialogContent>
          <form onSubmit={createUser}>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Creates a login account immediately. Share the password with the user through a secure channel — they can change it after their first login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Full name</Label>
                <Input id="add-name" required value={addName} onChange={(e) => setAddName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input id="add-email" type="email" required value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="add-password"
                    type="text"
                    required
                    minLength={8}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setAddPassword(generatePassword())}
                    aria-label="Generate strong password"
                    title="Generate strong password"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addPassword && copyToClipboard(addPassword, "Password")}
                    disabled={!addPassword}
                    aria-label="Copy password"
                    title="Copy password"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters. Click the key icon to generate a strong 16-character password.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addLevel} onValueChange={setAddLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_CHOICES.map((c) => (
                      <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as <strong>Employee</strong> for regular staff — their visibility follows the org chart automatically. Pick <strong>Administrator</strong> only for people who need firm-wide access (HR, Nikist admins).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={adding} onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={adding}>
                {adding ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating…</> : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => !editing && setEditOpen(o)}>
        <DialogContent>
          <form onSubmit={updateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update the user's name, email, or admin fallback level. Changing the email will unlink them from their employee record if the new email no longer matches.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input id="edit-name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editLevel} onValueChange={setEditLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_CHOICES.map((c) => (
                      <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={editing} onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={editing}>
                {editing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete <span className="font-semibold text-foreground">{deleteTarget.full_name || deleteTarget.email || "this user"}</span>'s login account. If they have an employee record, that record will remain. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); deleteUser(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Deleting…</> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={inviteOpen} onOpenChange={(o) => !inviting && setInviteOpen(o)}>
        <DialogContent>
          <form onSubmit={sendInvite}>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                The user will receive an email with a signup link. Their profile appears here after they complete signup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full name</Label>
                <Input id="invite-name" required value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteLevel} onValueChange={setInviteLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_CHOICES.map((c) => (
                      <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as <strong>Employee</strong> for the vast majority of invites — the user's visibility follows the org chart automatically. Pick <strong>Administrator</strong> only when the person needs firm-wide access (HR, Nikist admins).
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={inviting} onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…</> : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* AccessRulesCard retired — supervisor-chain rule (Phase 7L) is now the only access logic.
          Card hidden from UI but code and data preserved in the DB. */}
      {false && (isAdmin || canManageRules) && <AccessRulesCard />}

      {canManageLookups && permissions.can_manage_lookups && (
        <>
          <DepartmentsCard />
          <PositionsCard />
        </>
      )}

      {canManagePermissions && <PermissionsMatrixCard />}

      {canImportData && permissions.can_import_data && <DataImport />}


      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !applying && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change access level?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  Change <span className="font-semibold text-foreground">{pending.fullName || "this user"}</span> from{" "}
                  <span className="font-semibold text-foreground">{LEVEL_LABELS[pending.fromLevel]}</span> to{" "}
                  <span className="font-semibold text-foreground">{LEVEL_LABELS[pending.toLevel]}</span>?
                  This takes effect immediately and will change what employees they can see.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyChange} disabled={applying}>
              {applying ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </span>
              ) : "Confirm change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsView;
