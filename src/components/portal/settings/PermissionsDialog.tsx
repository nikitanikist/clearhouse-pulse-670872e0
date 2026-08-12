import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDefaultPermissions,
  mergePermissions,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permissions,
} from "@/lib/permissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  fullName: string;
  securityLevel: number;
  customPermissions: Partial<Permissions> | null;
  currentUserId: string | null;
}

const PermissionsDialog = ({
  open,
  onOpenChange,
  userId,
  fullName,
  securityLevel,
  customPermissions,
  currentUserId,
}: Props) => {
  const qc = useQueryClient();
  const defaults = getDefaultPermissions(securityLevel);
  const [values, setValues] = useState<Permissions>(() =>
    mergePermissions(securityLevel, customPermissions),
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (open) setValues(mergePermissions(securityLevel, customPermissions));
  }, [open, securityLevel, customPermissions]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["portal-users"] });
    qc.invalidateQueries({ queryKey: ["permissions", userId] });
    if (currentUserId === userId) {
      qc.invalidateQueries({ queryKey: ["permissions", currentUserId] });
    }
  };

  const persist = async (payload: Permissions | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ custom_permissions: payload } as never)
      .eq("user_id", userId);
    return error;
  };

  const save = async () => {
    setSaving(true);
    const error = await persist(values);
    setSaving(false);
    if (error) {
      toast.error("Failed to save permissions", { description: error.message });
      return;
    }
    toast.success("Permissions updated");
    invalidate();
    onOpenChange(false);
  };

  const reset = async () => {
    setResetting(true);
    const error = await persist(null);
    setResetting(false);
    if (error) {
      toast.error("Failed to reset permissions", { description: error.message });
      return;
    }
    toast.success("Reset to level defaults");
    invalidate();
    onOpenChange(false);
  };

  const busy = saving || resetting;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Permissions — {fullName || "User"} (Level {securityLevel})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.title}
              </h4>
              <div className="rounded-md border border-border divide-y divide-border">
                {group.keys.map((key) => (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5">
                    <Switch
                      id={`perm-${key}`}
                      checked={values[key]}
                      onCheckedChange={(checked) =>
                        setValues((v) => ({ ...v, [key]: checked }))
                      }
                    />
                    <label htmlFor={`perm-${key}`} className="text-sm text-foreground flex-1 cursor-pointer">
                      {PERMISSION_LABELS[key]}
                    </label>
                    <span className="text-xs text-muted-foreground shrink-0">
                      (default: {defaults[key] ? "on" : "off"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <button
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset to level defaults
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDialog;
