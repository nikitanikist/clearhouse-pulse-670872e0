import { useState, useMemo } from "react";
import { Search, Filter, ChevronDown, Star } from "lucide-react";
import { departmentColors, potentialColors, type Employee, type Department, type Location, type Position, type PotentialRating } from "@/data/employees";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface EmployeeDirectoryProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

const departments: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];
const locations: Location[] = ["Canada", "India"];
const positions: Position[] = ["Partner", "Manager", "Senior Associate", "Intermediate", "Associate", "Operations"];
const potentials: PotentialRating[] = ["High", "Medium", "Developing"];

const EmployeeDirectory = ({ employees, onSelectEmployee }: EmployeeDirectoryProps) => {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [locFilter, setLocFilter] = useState<string>("");
  const [posFilter, setPosFilter] = useState<string>("");
  const [potFilter, setPotFilter] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchesSearch = e.name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.supervisor.toLowerCase().includes(q) ||
        e.bffSummary.toLowerCase().includes(q);
      const matchesDept = !deptFilter || e.department === deptFilter;
      const matchesLoc = !locFilter || e.location === locFilter;
      const matchesPos = !posFilter || e.position === posFilter;
      const matchesPot = !potFilter || e.potential === potFilter;
      const matchesRating = !ratingFilter || (
        ratingFilter === "4.0+" ? e.currentYearRating >= 4.0 :
        ratingFilter === "3.0–3.9" ? (e.currentYearRating >= 3.0 && e.currentYearRating < 4.0) :
        e.currentYearRating < 3.0
      );
      return matchesSearch && matchesDept && matchesLoc && matchesPos && matchesPot && matchesRating;
    });
  }, [employees, search, deptFilter, locFilter, posFilter, potFilter, ratingFilter]);

  const clearFilters = () => {
    setDeptFilter("");
    setLocFilter("");
    setPosFilter("");
    setPotFilter("");
    setRatingFilter("");
  };

  const hasActiveFilters = deptFilter || locFilter || posFilter || potFilter || ratingFilter;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-foreground">Employees</h1>
          <Badge variant="secondary" className="text-xs font-medium">
            {filtered.length} {filtered.length === 1 ? "person" : "people"}
          </Badge>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, position, department, supervisor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
            filtersOpen || hasActiveFilters
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {[deptFilter, locFilter, posFilter, potFilter, ratingFilter].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Dropdowns */}
      {filtersOpen && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          {[
            { label: "Department", value: deptFilter, setter: setDeptFilter, options: departments },
            { label: "Location", value: locFilter, setter: setLocFilter, options: locations },
            { label: "Position", value: posFilter, setter: setPosFilter, options: positions },
            { label: "Potential", value: potFilter, setter: setPotFilter, options: potentials },
          ].map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => f.setter(e.target.value)}
              className="py-2 px-3 rounded-md bg-background text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ))}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="py-2 px-3 rounded-md bg-background text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Current Rating: All</option>
            <option value="4.0+">4.0+</option>
            <option value="3.0–3.9">3.0 – 3.9</option>
            <option value="Below 3.0">Below 3.0</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Potential</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                className="hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {emp.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{emp.position}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${departmentColors[emp.department]}`}>
                    {emp.department}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{emp.location}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                    <span className="text-sm font-medium text-foreground">{emp.currentYearRating.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${potentialColors[emp.potential]}`} />
                    <span className="text-sm text-foreground">{emp.potential}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No employees match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
