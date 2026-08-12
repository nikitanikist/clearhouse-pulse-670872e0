import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, SlidersHorizontal, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DepartmentsCard, PositionsCard } from "@/components/portal/settings/LookupManagers";
import DataImport from "@/components/portal/settings/DataImport";
import PermissionsDialog from "@/components/portal/settings/PermissionsDialog";
import { usePermissions } from "@/hooks/usePermissions";
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
  security_level: number;
  custom_permissions: Partial<Permissions> | null;
}


const LEVEL_LABELS: Record<number, string> = {
  1: "Level 1 (Full access)",
  2: "Level 2 (Manager & below)",
  3: "Level 3 (Senior Associate & below)",
  4: "Level 4 (Intermediate & below)",
  5: "Level 5 (Operations only)",
};

const LEGEND: { level: number; desc: string }[] = [
  { level: 1, desc: "Full access — all employees and admin settings." },
  { level: 2, desc: "Managers and everyone below (Senior Associate, Intermediate, Associate)." },
  { level: 3, desc: "Senior Associates and below (Intermediate, Associate)." },
  { level: 4, desc: "Intermediates and Associates only." },
  { level: 5, desc: "Operations staff only." },
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
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [applying, setApplying] = useState(false);
  const [permTarget, setPermTarget] = useState<ProfileRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLevel, setInviteLevel] = useState("5");
  const [inviting, setInviting] = useState(false);

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
    setInviteLevel("5");
    qc.invalidateQueries({ queryKey: ["portal-users"] });
  };

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["portal-users"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, security_level, custom_permissions")
        .order("security_level", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
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
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Control which portal users can see which employees.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Invite User
            </Button>
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[320px]">Security Level</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[160px]">Permissions</th>
                    </tr>

                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.user_id === currentUserId;
                      return (
                        <tr key={u.user_id} className="border-t border-border">
                          <td className="px-4 py-2 text-foreground">
                            {u.full_name || "—"}
                            {isSelf && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
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
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <SelectItem key={lvl} value={String(lvl)}>
                                    {LEVEL_LABELS[lvl]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => setPermTarget(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" /> Permissions
                            </button>
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
                <Label>Initial Security Level</Label>
                <Select value={inviteLevel} onValueChange={setInviteLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <SelectItem key={lvl} value={String(lvl)}>{LEVEL_LABELS[lvl]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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


      {isAdmin && permissions.can_manage_lookups && (
        <>
          <DepartmentsCard />
          <PositionsCard />
        </>
      )}
      {isAdmin && permissions.can_import_data && <DataImport />}

      {permTarget && (
        <PermissionsDialog
          open={!!permTarget}
          onOpenChange={(o) => !o && setPermTarget(null)}
          userId={permTarget.user_id}
          fullName={permTarget.full_name}
          securityLevel={permTarget.security_level}
          customPermissions={permTarget.custom_permissions}
          currentUserId={currentUserId}
        />
      )}


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
