import { LayoutDashboard, Users, Building2, Settings, LogOut } from "lucide-react";
import type { SecurityLevel } from "@/data/employees";

export type NavSection = "dashboard" | "employees" | "teams" | "settings";

const securityLabels: Record<SecurityLevel, string> = {
  1: "Level 1: Full Access",
  2: "Level 2: Manager and below",
  3: "Level 3: Senior Associate and below",
  4: "Level 4: Intermediate & Associate",
  5: "Level 5: Operations only",
};

interface AppSidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  securityLevel: SecurityLevel;
  onSignOut: () => void;
}

const navItems: { id: NavSection; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "teams", label: "Teams", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const AppSidebar = ({ activeSection, onNavigate, securityLevel, onSignOut }: AppSidebarProps) => {
  return (
    <aside className="w-[220px] min-w-[220px] bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-6">
        <h1 className="text-lg font-heading font-extrabold tracking-[0.15em] text-sidebar-foreground">
          CLEARHOUSE
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 mb-1">Logged in as</p>
        <p className="text-sm font-medium text-sidebar-foreground truncate">sarb@clearhouse.ca</p>
        <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">{securityLabels[securityLevel]}</p>
        <button
          onClick={onSignOut}
          className="mt-3 flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
