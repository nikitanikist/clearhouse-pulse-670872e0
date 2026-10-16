import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import clearhouseLogo from "@/assets/clearhouse-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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


const Login = () => {
  const navigate = useNavigate();
  const { user, loading, profile, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const sendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setSendingReset(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Reset email sent to ${forgotEmail.trim()}. Check your inbox.`);
    setForgotOpen(false);
    setForgotEmail("");
  };

  useEffect(() => {
    if (!loading && user) {
      navigate(profile?.security_level === 6 ? "/my-record" : "/dashboard", { replace: true });
    }
  }, [user, loading, profile, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[hsl(213,52%,18%)] to-[hsl(205,80%,20%)] py-8">
      <div className="w-full max-w-md mx-4">
        <form
          onSubmit={handleSignIn}
          className="bg-card rounded-lg shadow-2xl p-8 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <img src={clearhouseLogo} alt="Clearhouse LLP" className="h-10 w-auto" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">Employee Portal</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
              className="text-xs text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © 2026 Clearhouse LLP. Internal Use Only.
          </p>
        </form>
      </div>

      <Dialog open={forgotOpen} onOpenChange={(o) => !sendingReset && setForgotOpen(o)}>
        <DialogContent>
          <form onSubmit={sendResetEmail}>
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                Enter your Clearhouse email. We'll send you a link to set a new password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@clearhouse.ca"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={sendingReset} onClick={() => setForgotOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendingReset}>
                {sendingReset ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send reset email"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
