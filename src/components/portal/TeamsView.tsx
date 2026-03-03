import { useState } from "react";
import { departmentColors, potentialColors, type Employee, type Department } from "@/data/employees";
import { Star, Users, Shield, Calculator, Lightbulb, Settings, ChevronDown } from "lucide-react";

interface TeamsViewProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

const deptOrder: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];

const deptIcons: Record<Department, React.ReactNode> = {
  Assurance: <Shield className="h-5 w-5" />,
  Tax: <Calculator className="h-5 w-5" />,
  Advisory: <Lightbulb className="h-5 w-5" />,
  Operations: <Settings className="h-5 w-5" />,
};

const TeamsView = ({ employees, onSelectEmployee }: TeamsViewProps) => {
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const grouped = deptOrder.map((dept) => {
    const members = employees.filter((e) => e.department === dept);
    const avgRating = members.length
      ? (members.reduce((sum, m) => sum + m.currentYearRating, 0) / members.length).toFixed(1)
      : "0";
    return { dept, members, avgRating };
  });

  const activeDept = grouped.find((g) => g.dept === selectedDept);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">Click a department to view its members</p>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {grouped.map(({ dept, members, avgRating }) => {
          const isActive = selectedDept === dept;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(isActive ? null : dept)}
              className={`relative rounded-lg border p-5 text-left transition-all duration-200 hover:shadow-md ${
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${departmentColors[dept]}`}>
                  {deptIcons[dept]}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isActive ? "rotate-180" : ""
                  }`}
                />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{dept}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {members.length}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {avgRating}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Member Table */}
      {activeDept && activeDept.members.length > 0 && (
        <div className="bg-card rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${departmentColors[activeDept.dept]}`}>
              {activeDept.dept}
            </span>
            <span className="text-sm text-muted-foreground">
              {activeDept.members.length} member{activeDept.members.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Position</th>
                  <th className="text-left px-6 py-3 font-medium">Location</th>
                  <th className="text-left px-6 py-3 font-medium">Rating</th>
                  <th className="text-left px-6 py-3 font-medium">Potential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeDept.members.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                          {emp.initials}
                        </div>
                        <span className="text-sm font-medium text-foreground">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.position}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{emp.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="text-sm font-medium text-foreground">{emp.currentYearRating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${potentialColors[emp.potential]}`} />
                        <span className="text-sm text-muted-foreground">{emp.potential}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsView;
