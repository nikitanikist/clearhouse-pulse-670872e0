import { useState } from "react";
import Sidebar from "@/components/portal/Sidebar";
import ProfileHeader from "@/components/portal/ProfileHeader";
import EmployeeProfile from "@/components/portal/tabs/EmployeeProfile";
import Overview from "@/components/portal/tabs/Overview";
import TechnicalCompetencies from "@/components/portal/tabs/TechnicalCompetencies";
import InterpersonalSkills from "@/components/portal/tabs/InterpersonalSkills";
import GrowthPotential from "@/components/portal/tabs/GrowthPotential";
import ManagementNotes from "@/components/portal/tabs/ManagementNotes";
import { employees, type Employee } from "@/data/employees";

const tabs = [
  "Employee Profile",
  "Overview",
  "Technical Competencies",
  "Interpersonal Skills & Firm Fit",
  "Growth & Potential",
  "Management Notes",
];

const Dashboard = () => {
  const [selected, setSelected] = useState<Employee>(employees[0]);
  const [activeTab, setActiveTab] = useState(0);

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <EmployeeProfile employee={selected} />;
      case 1: return <Overview />;
      case 2: return <TechnicalCompetencies />;
      case 3: return <InterpersonalSkills />;
      case 4: return <GrowthPotential />;
      case 5: return <ManagementNotes />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar selectedId={selected.id} onSelect={setSelected} />

      <div className="flex-1 flex flex-col min-w-0">
        <ProfileHeader employee={selected} />

        {/* Tabs */}
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

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderTab()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
