import { Users, Building2, TrendingUp, Star, ArrowUpRight } from "lucide-react";
import type { Employee } from "@/data/employees";
import { departmentBadgeClass } from "@/data/employees";
import { useDepartments } from "@/hooks/useLookups";
import { averageRating, formatAverage } from "@/lib/ratings";

export interface SectionFilters {
  department?: string;
  potential?: string | string[];
}

interface DashboardHomeProps {
  employees: Employee[];
  onNavigateToEmployee: (emp: Employee) => void;
  onNavigateToSection?: (section: "employees" | "teams", filters?: SectionFilters | null) => void;
}

const DashboardHome = ({ employees, onNavigateToEmployee, onNavigateToSection }: DashboardHomeProps) => {
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const deptCounts = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});

  const ratedCount = employees.filter((e) => e.currentYearRating !== null).length;
  const avg = averageRating(employees.map((e) => e.currentYearRating));

  const topPerformers = [...employees]
    .filter((e) => e.currentYearRating !== null)
    .sort((a, b) => (b.currentYearRating ?? 0) - (a.currentYearRating ?? 0))
    .slice(0, 5);
  const highPotential = employees.filter((e) => ["Well Placed", "Ready Now"].includes(e.potential));

  return (
    <div className="p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Employee portal overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={String(employees.length)}
          onClick={() => onNavigateToSection?.("employees", null)}
        />
        <StatCard
          icon={Building2}
          label="Departments"
          value={String(Object.keys(deptCounts).length)}
          onClick={() => onNavigateToSection?.("teams")}
        />
        <StatCard
          icon={Star}
          label="Avg. Rating"
          value={formatAverage(avg)}
          sublabel={`${ratedCount} of ${employees.length} rated`}
        />
        <StatCard
          icon={TrendingUp}
          label="High Potential"
          value={String(highPotential.length)}
          onClick={() => onNavigateToSection?.("employees", { potential: ["Ready Now", "Ready Soon"] })}
        />
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-heading font-bold text-foreground mb-4">Department Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(deptCounts).map(([dept, count]) => (
            <button
              key={dept}
              onClick={() => onNavigateToSection?.("employees", { department: dept })}
              className="rounded-lg border border-border p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${departmentBadgeClass(dept)}`}>
                {dept}
              </span>
              <p className="text-2xl font-heading font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">employees</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-heading font-bold text-foreground mb-4">Top Performers</h2>
        <div className="space-y-2">
          {topPerformers.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-3">No rated employees yet.</p>
          )}
          {topPerformers.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onNavigateToEmployee(emp)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                  {emp.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.position} · {emp.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="text-sm font-semibold text-foreground">{emp.currentYearRating}</span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-heading font-bold text-foreground mb-4">High Potential Employees</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {highPotential.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onNavigateToEmployee(emp)}
              className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {emp.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.position}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{emp.bffSummary || "—"}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    className={`bg-card rounded-lg border border-border p-5 ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </div>
  </div>
);

export default DashboardHome;
