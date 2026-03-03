import { departmentColors, potentialColors, type Employee, type Department } from "@/data/employees";
import { Star } from "lucide-react";

interface TeamsViewProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

const deptOrder: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];

const TeamsView = ({ employees, onSelectEmployee }: TeamsViewProps) => {
  const grouped = deptOrder
    .map((dept) => ({
      dept,
      members: employees.filter((e) => e.department === dept),
    }))
    .filter((g) => g.members.length > 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Teams</h1>
        <p className="text-sm text-muted-foreground mt-1">Employees grouped by department</p>
      </div>

      {grouped.map(({ dept, members }) => (
        <div key={dept} className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${departmentColors[dept]}`}>
              {dept}
            </span>
            <span className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="divide-y divide-border">
            {members.map((emp) => (
              <button
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                    {emp.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.position} · {emp.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${potentialColors[emp.potential]}`} title={`${emp.potential} Potential`} />
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="text-sm font-medium text-foreground">{emp.currentYearRating}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamsView;
