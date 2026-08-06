import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { departmentBadgeClass, potentialColors, type Employee, type Department, type Location, type Position, type PotentialRating } from "@/data/employees";

interface EmployeeListPanelProps {
  employees: Employee[];
  selectedId: string;
  onSelect: (emp: Employee) => void;
}

const departments: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];
const locations: Location[] = ["Canada", "India"];
const positions: Position[] = ["Partner", "Manager", "Senior Associate", "Intermediate", "Associate", "Operations"];
const potentials: PotentialRating[] = ["Well Placed", "Ready Now", "Ready Soon", "Ready Later"];

const EmployeeListPanel = ({ employees, selectedId, onSelect }: EmployeeListPanelProps) => {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [locFilter, setLocFilter] = useState<string>("");
  const [posFilter, setPosFilter] = useState<string>("");
  const [potFilter, setPotFilter] = useState<string>("");
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [bffSearch, setBffSearch] = useState("");

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !deptFilter || e.department === deptFilter;
      const matchesLoc = !locFilter || e.location === locFilter;
      const matchesPos = !posFilter || e.position === posFilter;
      const matchesPot = !potFilter || e.potential === potFilter;
      const matchesRating = !ratingFilter || (
        ratingFilter === "4.0+" ? e.currentYearRating >= 4.0 :
        ratingFilter === "3.0–3.9" ? (e.currentYearRating >= 3.0 && e.currentYearRating < 4.0) :
        e.currentYearRating < 3.0
      );
      const matchesBff = !bffSearch || e.bffSummary.toLowerCase().includes(bffSearch.toLowerCase());
      return matchesSearch && matchesDept && matchesLoc && matchesPos && matchesPot && matchesRating && matchesBff;
    });
  }, [employees, search, deptFilter, locFilter, posFilter, potFilter, ratingFilter, bffSearch]);

  return (
    <div className="w-[280px] min-w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-sidebar-accent text-sidebar-foreground text-sm placeholder:text-sidebar-foreground/40 border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Filters Toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground/80 transition-colors"
        >
          {filtersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Filters
        </button>
        {filtersOpen && (
          <div className="mt-2 space-y-2">
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
                className="w-full py-1.5 px-2 rounded bg-sidebar-accent text-sidebar-foreground text-xs border border-sidebar-border focus:outline-none"
              >
                <option value="" className="text-foreground">{f.label}: All</option>
                {f.options.map((o) => (
                  <option key={o} value={o} className="text-foreground">{o}</option>
                ))}
              </select>
            ))}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full py-1.5 px-2 rounded bg-sidebar-accent text-sidebar-foreground text-xs border border-sidebar-border focus:outline-none"
            >
              <option value="" className="text-foreground">Performance Rating: All</option>
              <option value="4.0+" className="text-foreground">4.0+</option>
              <option value="3.0–3.9" className="text-foreground">3.0 – 3.9</option>
              <option value="Below 3.0" className="text-foreground">Below 3.0</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-sidebar-foreground/40" />
              <input
                type="text"
                placeholder="BFF Keywords..."
                value={bffSearch}
                onChange={(e) => setBffSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 rounded bg-sidebar-accent text-sidebar-foreground text-xs border border-sidebar-border placeholder:text-sidebar-foreground/40 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Employee List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {filtered.map((emp) => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            className={`w-full text-left px-3 py-3 rounded-md transition-all duration-200 ${
              emp.id === selectedId
                ? "bg-sidebar-accent border-l-[3px] border-l-sidebar-primary"
                : "hover:bg-sidebar-accent/50 border-l-[3px] border-l-transparent"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${potentialColors[emp.potential]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{emp.name}</p>
                <p className="text-xs text-sidebar-foreground/50">{emp.position}</p>
              </div>
            </div>
            <span className={`inline-block mt-1.5 ml-4 text-[10px] font-medium px-2 py-0.5 rounded-full ${departmentBadgeClass(emp.department)}`}>
              {emp.department}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-sidebar-foreground/40 text-center py-8">No employees found</p>
        )}
      </div>
    </div>
  );
};

export default EmployeeListPanel;
