import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import clearhouseLogo from "@/assets/clearhouse-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const demoCredentials = [
  { level: "L1", email: "sarb@clearhouse.ca", desc: "Partner — full access" },
  { level: "L2", email: "david.chen@clearhouse.ca", desc: "Manager and below" },
  { level: "L3", email: "priya.sharma@clearhouse.ca", desc: "Senior Associate and below" },
  { level: "L4", email: "emily.tremblay@clearhouse.ca", desc: "Intermediate & Associate" },
  { level: "L5", email: "anita.desai@clearhouse.ca", desc: "Operations only" },
];

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("sarb@clearhouse.ca");
  const [password, setPassword] = useState("clearhouse2026");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

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

          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Demo accounts (password: clearhouse2026)
            </p>
            <ul className="space-y-1">
              {demoCredentials.map((c) => (
                <li key={c.email} className="text-[11px] text-muted-foreground flex gap-2">
                  <span className="font-semibold text-foreground w-7">{c.level}</span>
                  <button
                    type="button"
                    onClick={() => setEmail(c.email)}
                    className="text-primary hover:underline truncate"
                  >
                    {c.email}
                  </button>
                  <span className="opacity-60 hidden sm:inline">— {c.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            © 2026 Clearhouse LLP. Internal Use Only.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
