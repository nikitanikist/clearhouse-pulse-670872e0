import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppSidebar, { type NavSection } from "@/components/portal/AppSidebar";
import DashboardHome from "@/components/portal/DashboardHome";
import EmployeeListPanel from "@/components/portal/EmployeeListPanel";
import TeamsView from "@/components/portal/TeamsView";
import ProfileHeader from "@/components/portal/ProfileHeader";
import EmployeeProfile from "@/components/portal/tabs/EmployeeProfile";
import Overview from "@/components/portal/tabs/Overview";
import TechnicalCompetencies from "@/components/portal/tabs/TechnicalCompetencies";
import InterpersonalSkills from "@/components/portal/tabs/InterpersonalSkills";
import GrowthPotential from "@/components/portal/tabs/GrowthPotential";
import ManagementNotes from "@/components/portal/tabs/ManagementNotes";
import { employees, filterBySecurityLevel, type Employee, type SecurityLevel } from "@/data/employees";
import { Settings } from "lucide-react";

const tabs = [
  "Employee Profile",
  "Overview",
  "Technical Competencies",
  "Interpersonal Skills & Firm Fit",
  "Growth & Potential",
  "Management Notes",
];

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const levelParam = Number(searchParams.get("level") || "1") as SecurityLevel;
  const securityLevel: SecurityLevel = [1, 2, 3, 4, 5].includes(levelParam) ? levelParam : 1;

  const filteredEmployees = useMemo(
    () => filterBySecurityLevel(employees, securityLevel),
    [securityLevel]
  );

  const [section, setSection] = useState<NavSection>("dashboard");
  const [selected, setSelected] = useState<Employee>(filteredEmployees[0]);
  const [activeTab, setActiveTab] = useState(0);

  const handleNavigateToEmployee = (emp: Employee) => {
    setSelected(emp);
    setActiveTab(0);
    setSection("employees");
  };

  const handleSignOut = () => navigate("/");

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <EmployeeProfile employee={selected} />;
      case 1: return <Overview employee={selected} />;
      case 2: return <TechnicalCompetencies />;
      case 3: return <InterpersonalSkills />;
      case 4: return <GrowthPotential />;
      case 5: return <ManagementNotes />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeSection={section}
        onNavigate={setSection}
        securityLevel={securityLevel}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex min-w-0">
        {section === "dashboard" && (
          <DashboardHome
            employees={filteredEmployees}
            onNavigateToEmployee={handleNavigateToEmployee}
          />
        )}

        {section === "employees" && (
          <>
            <EmployeeListPanel
              employees={filteredEmployees}
              selectedId={selected.id}
              onSelect={setSelected}
            />
            <div className="flex-1 flex flex-col min-w-0">
              <ProfileHeader employee={selected} />
              <div className="bg-card border-b border-border px-6 flex gap-0 overflow-x-auto">
                {tabs.map((tab, i) => (
                  <button
                    key={tab}
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
              <div className="flex-1 p-6 overflow-y-auto">
                {renderTab()}
              </div>
            </div>
          </>
        )}

        {section === "teams" && (
          <TeamsView
            employees={filteredEmployees}
            onSelectEmployee={handleNavigateToEmployee}
          />
        )}

        {section === "settings" && (
          <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Firm configuration</p>
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Settings className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Settings will be available in a future update.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
