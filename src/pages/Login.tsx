import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import clearhouseLogo from "@/assets/clearhouse-logo.png";

const securityLevels = [
  "Level 1: Full Access (all employees)",
  "Level 2: Manager and below",
  "Level 3: Senior Associate and below",
  "Level 4: Intermediate and Associate",
  "Level 5: Operations only",
];

const Login = () => {
  const navigate = useNavigate();
  const [email] = useState("sarb@clearhouse.ca");
  const [securityLevel, setSecurityLevel] = useState(securityLevels[0]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const levelNum = securityLevel.charAt(6);
    navigate(`/dashboard?level=${levelNum}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[hsl(213,52%,18%)] to-[hsl(205,80%,20%)]">
      <div className="w-full max-w-md mx-4">
        <form
          onSubmit={handleSignIn}
          className="bg-card rounded-lg shadow-2xl p-8 space-y-6"
        >
          {/* Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <img src={clearhouseLogo} alt="Clearhouse LLP" className="h-10 w-auto" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Employee Portal
            </p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                defaultValue={email}
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                defaultValue="clearhouse2026"
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Security Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Security Level</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={securityLevel}
                onChange={(e) => setSecurityLevel(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                {securityLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors duration-200"
          >
            Sign In
          </button>

          <p className="text-center text-xs text-muted-foreground">
            © 2026 Clearhouse LLP. Internal Use Only.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
