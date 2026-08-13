import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import ProfileHeader from "@/components/portal/ProfileHeader";
import EmployeeProfile from "@/components/portal/tabs/EmployeeProfile";
import Overview from "@/components/portal/tabs/Overview";
import InterpersonalSkills from "@/components/portal/tabs/InterpersonalSkills";
import GrowthPotential from "@/components/portal/tabs/GrowthPotential";
import ManagementNotes from "@/components/portal/tabs/ManagementNotes";

const tabs = [
  "Profile",
  "Overview",
  "Interpersonal Skills & Firm Fit",
  "Growth & Potential",
  "Management Notes",
];

const MyRecord = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data: employees = [], isLoading, error } = useEmployees();
  const [activeTab, setActiveTab] = useState(0);

  const employee = employees[0] ?? null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const renderTab = () => {
    if (!employee) return null;
    switch (activeTab) {
      case 0:
        return <EmployeeProfile employee={employee} readOnly />;
      case 1:
        return <Overview employee={employee} readOnly />;
      case 2:
        return <InterpersonalSkills employeeId={employee.id} />;
      case 3:
        return <GrowthPotential employeeId={employee.id} />;
      case 4:
        return (
          <ManagementNotes
            employeeId={employee.id}
            authorName={profile?.full_name ?? "Manager"}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-sidebar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <UserCircle2 className="h-5 w-5 text-sidebar-foreground/80 shrink-0" />
          <h1 className="text-base font-heading font-bold text-sidebar-foreground truncate">
            My Record{employee ? ` — ${employee.name}` : ""}
          </h1>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </header>

      {isLoading && (
        <div className="p-6 space-y-4">
          <div className="h-20 bg-card border border-border rounded-lg animate-pulse" />
          <div className="h-72 bg-card border border-border rounded-lg animate-pulse" />
        </div>
      )}

      {!isLoading && error && (
        <div className="p-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load your record. Please try again later.
          </div>
        </div>
      )}

      {!isLoading && !error && !employee && (
        <div className="p-6">
          <div className="max-w-lg rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-heading font-semibold text-foreground">
              No employee record linked to your login
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your HR administrator.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && employee && (
        <div className="flex-1 flex flex-col min-h-0">
          <ProfileHeader employee={employee} />
          <div className="bg-card border-b border-border px-6 flex gap-0 overflow-x-auto" role="tablist">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                role="tab"
                aria-selected={i === activeTab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                  i === activeTab
                    ? "border-b-primary text-primary"
                    : "border-b-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">{renderTab()}</div>
        </div>
      )}
    </div>
  );
};

export default MyRecord;
