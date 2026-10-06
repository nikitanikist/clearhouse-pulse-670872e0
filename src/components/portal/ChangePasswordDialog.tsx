import { useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // omit I, O
  const lower = "abcdefghijkmnopqrstuvwxyz"; // omit l
  const digits = "23456789"; // omit 0, 1
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  const pick = (set: string, idx: number) => set[bytes[idx] % set.length];
  const required = [pick(upper, 0), pick(lower, 1), pick(digits, 2), pick(symbols, 3)];
  const rest = Array.from({ length: 12 }, (_, i) => pick(all, i + 4));
  const combined = [...required, ...rest];
  const shuffle = new Uint32Array(combined.length);
  crypto.getRandomValues(shuffle);
  for (let i = combined.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
};

const ChangePasswordDialog = ({ open, onOpenChange }: ChangePasswordDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Password copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleGenerate = () => {
    const pw = generatePassword();
    setNewPassword(pw);
    setConfirmPassword(pw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    setSubmitting(true);

    // Re-verify the current password by attempting a sign-in with it.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (!email) {
      setSubmitting(false);
      toast.error("Could not identify your account — please sign in again");
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInErr) {
      setSubmitting(false);
      toast.error("Current password is incorrect");
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSubmitting(false);

    if (updateErr) {
      toast.error(updateErr.message || "Failed to update password");
      return;
    }

    toast.success("Password changed successfully");
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) {
          if (!o) resetForm();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one. You'll stay signed in after the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cp-current">Current password</Label>
              <Input
                id="cp-current"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-new">New password</Label>
              <div className="flex gap-2">
                <Input
                  id="cp-new"
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerate}
                  aria-label="Generate strong password"
                  title="Generate strong password"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => newPassword && copyToClipboard(newPassword)}
                  disabled={!newPassword}
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
              <Label htmlFor="cp-confirm">Confirm new password</Label>
              <Input
                id="cp-confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Updating…
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
