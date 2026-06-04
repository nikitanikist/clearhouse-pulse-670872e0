import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar, { type NavSection } from "@/components/portal/AppSidebar";
import DashboardHome from "@/components/portal/DashboardHome";
import EmployeeDirectory from "@/components/portal/EmployeeDirectory";
import TeamsView from "@/components/portal/TeamsView";
import ProfileHeader from "@/components/portal/ProfileHeader";
import EmployeeProfile from "@/components/portal/tabs/EmployeeProfile";
import Overview from "@/components/portal/tabs/Overview";
import InterpersonalSkills from "@/components/portal/tabs/InterpersonalSkills";
import GrowthPotential from "@/components/portal/tabs/GrowthPotential";
import ManagementNotes from "@/components/portal/tabs/ManagementNotes";
import { type Employee, type SecurityLevel } from "@/data/employees";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import SettingsView from "@/components/portal/SettingsView";
import ReportsView from "@/components/portal/ReportsView";


const tabs = [
  { label: "Employee Profile" },
  { label: "Overview" },
  { label: "Interpersonal Skills & Firm Fit" },
  { label: "Growth & Potential" },
  { label: "Management Notes" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const securityLevel: SecurityLevel = (profile?.security_level ?? 1) as SecurityLevel;


  const { data: employees = [], isLoading, error } = useEmployees();

  const [section, setSection] = useState<NavSection>("dashboard");
  const [employeeView, setEmployeeView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0]);
  }, [employees, selected]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelected(emp);
    setActiveTab(0);
    setEmployeeView("detail");
  };

  const handleBackToList = () => setEmployeeView("list");

  const handleNavigateToEmployee = (emp: Employee) => {
    setSelected(emp);
    setActiveTab(0);
    setSection("employees");
    setEmployeeView("detail");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const renderTab = () => {
    if (!selected) return null;
    switch (activeTab) {
      case 0: return <EmployeeProfile employee={selected} />;
      case 1: return <Overview employee={selected} />;
      case 2: return <InterpersonalSkills employeeId={selected.id} />;
      case 3: return <GrowthPotential employeeId={selected.id} />;
      case 4: return <ManagementNotes employeeId={selected.id} authorName={profile?.full_name ?? "Manager"} />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeSection={section}
        onNavigate={(s) => {
          setSection(s);
          if (s === "employees") setEmployeeView("list");
        }}
        securityLevel={securityLevel}
        userEmail={profile?.full_name ?? "—"}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {isLoading && (
          <div className="flex-1 p-6 space-y-4">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="h-48 bg-card border border-border rounded-lg animate-pulse" />
            <div className="h-72 bg-card border border-border rounded-lg animate-pulse" />
          </div>
        )}
        {error && (
          <div className="p-6">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load employees. Make sure Supabase is connected and the schema migration has run.
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {section === "dashboard" && (
              <DashboardHome
                employees={employees}
                onNavigateToEmployee={handleNavigateToEmployee}
              />
            )}

            {section === "employees" && employeeView === "list" && (
              <EmployeeDirectory
                employees={employees}
                onSelectEmployee={handleSelectEmployee}
              />
            )}

            {section === "employees" && employeeView === "detail" && selected && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-card border-b border-border px-6 py-3">
                  <button
                    onClick={handleBackToList}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Employees
                  </button>
                </div>
                <ProfileHeader employee={selected} />
                <div className="bg-card border-b border-border px-6 flex gap-0 overflow-x-auto" role="tablist">
                  {tabs.map((tab, i) => (
                    <button
                      key={tab.label}
                      role="tab"
                      aria-selected={i === activeTab}
                      onClick={() => setActiveTab(i)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                        i === activeTab
                          ? "border-b-primary text-primary"
                          : "border-b-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-6 overflow-y-auto">{renderTab()}</div>
              </div>
            )}

            {section === "teams" && (
              <TeamsView
                employees={employees}
                onSelectEmployee={handleNavigateToEmployee}
              />
            )}

            {section === "settings" && (
              <SettingsView securityLevel={securityLevel} currentUserId={user?.id ?? null} />
            )}

          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
