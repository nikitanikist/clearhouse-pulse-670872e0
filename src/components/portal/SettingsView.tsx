import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DepartmentsCard, PositionsCard } from "@/components/portal/settings/LookupManagers";
import DataImport from "@/components/portal/settings/DataImport";
import AccessRulesCard from "@/components/portal/settings/AccessRulesCard";
import { usePermissions } from "@/hooks/usePermissions";
import { useCanManageAccessRules } from "@/hooks/useAccessRules";
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

const LEVEL_LABELS: Record<number, string> = {
  1: "Level 1 (Full access)",
  2: "Level 2 (Manager & below)",
  3: "Level 3 (Senior Associate & below)",
  4: "Level 4 (Intermediate & below)",
  5: "Level 5 (Operations only)",
  6: "Level 6 (Employee — own record only)",
};

const LEGEND: { level: number; desc: string }[] = [
  { level: 1, desc: "Full access — all employees and admin settings." },
  { level: 2, desc: "Managers and everyone below (Senior Associate, Intermediate, Associate)." },
  { level: 3, desc: "Senior Associates and below (Intermediate, Associate)." },
  { level: 4, desc: "Intermediates and Associates only." },
  { level: 5, desc: "Operations staff only." },
  { level: 6, desc: "Employee self-service — can view only their own record, read-only." },
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

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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
      <p className="text-sm text-muted-foreground mt-1 mb-6">User & access management</p>

      <section className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">User & Access Management</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-2">
              For users linked to an employee record, access is automatically determined by their POSITION (see Access Rules). This dropdown is only used as a fallback for admin accounts that have no linked employee record — for example, Nikist-owned or partner accounts. Leave as Level 6 (default) for regular employees.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Access is now controlled per-position in the Access Rules card below. Per-user overrides have been retired.
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={openBulkInvite}>
                <Users className="h-4 w-4 mr-1.5" /> Invite all employees (email-matched)
              </Button>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" /> Invite User
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[280px]">Admin Fallback</th>
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
                              value={String(u.security_level)}
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
                                {[1, 2, 3, 4, 5, 6].map((lvl) => (
                                  <SelectItem key={lvl} value={String(lvl)}>
                                    {LEVEL_LABELS[lvl]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Access level legend</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {LEGEND.map((l) => (
                  <li key={l.level}>
                    <span className="font-medium text-foreground">Level {l.level}:</span> {l.desc}
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
              This will send signup emails to every employee whose email is not yet in the system. Once they sign up, their access will follow their position's access rule automatically (no admin action needed). {bulkCandidates.length} employees will be emailed. Continue?
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
                <Label>Admin Fallback Level (rarely needed)</Label>
                <Select value={inviteLevel} onValueChange={setInviteLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>{LEVEL_LABELS[lvl]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  For most invites, leave this at Level 6 — the user's access will automatically follow the access rule for their position once they log in with an email that matches an employee record. Only raise this if the invite is for an admin account that has no matching employee record.
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


      {(isAdmin || canManageRules) && <AccessRulesCard />}

      {isAdmin && permissions.can_manage_lookups && (
        <>
          <DepartmentsCard />
          <PositionsCard />
        </>
      )}
      {isAdmin && permissions.can_import_data && <DataImport />}


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
