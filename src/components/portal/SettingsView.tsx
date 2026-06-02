import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
  const isAdmin = securityLevel === 1;
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [applying, setApplying] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["portal-users"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, security_level")
        .order("security_level", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
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
        <h2 className="text-lg font-heading font-semibold text-foreground">User & Access Management</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Control which portal users can see which employees.
        </p>

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
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
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
