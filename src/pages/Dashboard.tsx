import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar, { type NavSection } from "@/components/portal/AppSidebar";
import DashboardHome from "@/components/portal/DashboardHome";
import EmployeeDirectory from "@/components/portal/EmployeeDirectory";
import TeamsView from "@/components/portal/TeamsView";
import OrgChartView from "@/components/portal/OrgChartView";
import ProfileHeader from "@/components/portal/ProfileHeader";
import EmployeeProfile from "@/components/portal/tabs/EmployeeProfile";
import Overview from "@/components/portal/tabs/Overview";
import InterpersonalSkills from "@/components/portal/tabs/InterpersonalSkills";
import GrowthPotential from "@/components/portal/tabs/GrowthPotential";
import GrowthImpact from "@/components/portal/tabs/GrowthImpact";
import ManagementNotes from "@/components/portal/tabs/ManagementNotes";
import PdrTab from "@/components/portal/pdr/PdrTab";
import { type Employee, type SecurityLevel } from "@/data/employees";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserScope, useEmployees } from "@/hooks/useEmployees";
import { useCanDo } from "@/hooks/useCanDo";
import SettingsView from "@/components/portal/SettingsView";
import ReportsView from "@/components/portal/ReportsView";


type TabKey =
  | "profile" | "overview" | "interpersonal"
  | "growth_potential" | "growth_impact" | "pdr" | "manager_notes";

const ALL_TABS: { key: TabKey; label: string; resource: string }[] = [
  { key: "profile",          label: "Employee Profile",             resource: "tab:profile" },
  { key: "overview",         label: "Overview",                     resource: "tab:overview" },
  { key: "interpersonal",    label: "Interpersonal Skills & Firm Fit", resource: "tab:interpersonal" },
  { key: "growth_potential", label: "Growth & Potential",           resource: "tab:growth_potential" },
  { key: "growth_impact",    label: "Growth & Impact",              resource: "tab:growth_impact" },
  { key: "pdr",              label: "PDR",                          resource: "tab:pdr" },
  { key: "manager_notes",    label: "Management Notes",             resource: "tab:manager_notes" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // Route users to /my-record only when they are TRUE self-service employees:
  //   - their linked employee's position has visibility_scope = 'self', OR
  //   - they have no linked employee AND their fallback security_level is 6.
  // Managers whose fallback happens to be 6 but whose position gives them
  // broader visibility (own_department / own_reports / all / etc.) stay on
  // the manager Dashboard.
  const { data: myScope, isLoading: scopeLoading } = useCurrentUserScope();
  useEffect(() => {
    if (!profile) return;
    if (scopeLoading) return;
    const isSelfOnly = myScope === "self";
    const noEmployeeAndL6 = myScope === null && profile.security_level === 6;
    if (isSelfOnly || noEmployeeAndL6) {
      navigate("/my-record", { replace: true });
    }
  }, [profile, myScope, scopeLoading, navigate]);
  const securityLevel: SecurityLevel = (profile?.security_level ?? 1) as SecurityLevel;


  const { data: employees = [], isLoading, error } = useEmployees();
  const matrix = useCanDo();

  const [section, setSection] = useState<NavSection>("dashboard");
  const [employeeView, setEmployeeView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<Employee | null>(null);

  /**
   * Hide a tab when matrix says the user can view it, but its scope is
   * 'linked_manager_only' AND the signed-in user is NOT a linked manager
   * of the currently-selected employee. The 3 locked tabs (Interpersonal,
   * Growth & Potential, Manager Notes) default to this scope.
   */
  const tabHiddenByLinkedScope = (resource: string, selectedId?: string): boolean => {
    if (matrix.isLoading || matrix.linksLoading) return false;
    if (matrix.isAdmin) return false;
    if (matrix.scope(resource) !== "linked_manager_only") return false;
    if (!selectedId) return true;
    return !matrix.isLinkedManagerOf(selectedId);
  };

  // Only tabs the signed-in user's position is allowed to view AND, for
  // linked_manager_only tabs, that the user is actually a linked manager of
  // the currently-selected employee.
  const visibleTabs = ALL_TABS.filter((t) => {
    if (!(matrix.isLoading || matrix.can(t.resource, "view"))) return false;
    if (tabHiddenByLinkedScope(t.resource, selected?.id)) return false;
    return true;
  });
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [pendingFilters, setPendingFilters] = useState<{ department?: string; potential?: string | string[] } | null>(null);

  const handleNavigateToSection = (
    target: "employees" | "teams",
    filters?: { department?: string; potential?: string | string[] } | null
  ) => {
    setSection(target as NavSection);
    if (target === "employees") setEmployeeView("list");
    setPendingFilters(filters ?? null);
  };

  useEffect(() => {
    if (!selected && employees.length > 0) setSelected(employees[0]);
  }, [employees, selected]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelected(emp);
    // Reset to the first visible tab for this user (profile is almost always visible)
    setActiveTab(visibleTabs[0]?.key ?? "profile");
    setEmployeeView("detail");
  };

  const handleBackToList = () => setEmployeeView("list");

  const handleNavigateToEmployee = (emp: Employee) => {
    setSelected(emp);
    setActiveTab(visibleTabs[0]?.key ?? "profile");
    setSection("employees");
    setEmployeeView("detail");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const renderTab = () => {
    if (!selected) return null;
    // Belt-and-braces: if the active tab has become hidden (e.g. admin just
    // revoked it), render nothing instead of a stale panel.
    if (!visibleTabs.some((t) => t.key === activeTab)) return null;
    switch (activeTab) {
      case "profile":          return <EmployeeProfile employee={selected} />;
      case "overview":         return <Overview employee={selected} />;
      case "interpersonal":    return <InterpersonalSkills employeeId={selected.id} />;
      case "growth_potential": return <GrowthPotential employeeId={selected.id} />;
      case "growth_impact":    return <GrowthImpact employeeId={selected.id} />;
      case "pdr":              return <PdrTab employee={selected} />;
      case "manager_notes":    return <ManagementNotes employeeId={selected.id} authorName={profile?.full_name ?? "Manager"} />;
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
                onNavigateToSection={handleNavigateToSection}
              />
            )}

            {section === "employees" && employeeView === "list" && (
              <EmployeeDirectory
                employees={employees}
                onSelectEmployee={handleSelectEmployee}
                initialFilters={pendingFilters}
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
                  {visibleTabs.map((tab) => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={tab.key === activeTab}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                        tab.key === activeTab
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

            {section === "org_chart" && (
              <OrgChartView
                employees={employees}
                onSelectEmployee={handleNavigateToEmployee}
              />
            )}

            {section === "reports" && <ReportsView />}

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
