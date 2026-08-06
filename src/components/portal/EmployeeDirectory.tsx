import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Plus, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { departmentColors, potentialColors, type Employee, type Department, type Location, type Position, type PotentialRating } from "@/data/employees";
import type { CompetencyRating } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RATING_LABELS, RATING_TO_NUMBER } from "@/lib/ratings";
import SupervisorCombobox from "./SupervisorCombobox";

export interface DirectoryFilters {
  department?: string;
  potential?: string | string[];
}

interface EmployeeDirectoryProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  initialFilters?: DirectoryFilters | null;
}

const departments: Department[] = ["Assurance", "Tax", "Advisory", "Operations"];
const locations: Location[] = ["Canada", "India"];
const positions: Position[] = ["Partner", "Manager", "Senior Associate", "Intermediate", "Associate", "Operations"];
const potentials: PotentialRating[] = ["Well Placed", "Ready Now", "Ready Soon", "Ready Later"];

const deriveRating = (score: number | null): CompetencyRating | null => {
  if (score === null) return null;
  if (score >= 4.5) return "E";
  if (score >= 3.5) return "G";
  if (score >= 2.5) return "M";
  return "NI";
};

const ratingStyles: Record<CompetencyRating, string> = {
  E: "bg-success text-success-foreground",
  G: "bg-primary text-primary-foreground",
  M: "bg-warning text-warning-foreground",
  NI: "bg-destructive text-destructive-foreground",
};

const RatingBadge = ({ code }: { code: CompetencyRating | null }) => {
  if (code === null) {
    return (
      <span className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded text-xs font-medium text-muted-foreground bg-muted">
        —
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center justify-center min-w-7 h-6 px-2 rounded text-xs font-bold cursor-help ${ratingStyles[code]}`}>
          {code}
        </span>
      </TooltipTrigger>
      <TooltipContent>{code} — {RATING_LABELS[code]}</TooltipContent>
    </Tooltip>
  );
};

const EmployeeDirectory = ({ employees, onSelectEmployee, initialFilters }: EmployeeDirectoryProps) => {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [locFilter, setLocFilter] = useState<string>("");
  const [posFilter, setPosFilter] = useState<string>("");
  const [potFilter, setPotFilter] = useState<string>("");
  const [potMulti, setPotMulti] = useState<string[] | null>(null);
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("");

  useEffect(() => {
    if (!initialFilters) return;
    setDeptFilter(initialFilters.department ?? "");
    const pot = initialFilters.potential;
    if (Array.isArray(pot)) {
      setPotMulti(pot);
      setPotFilter("");
    } else {
      setPotMulti(null);
      setPotFilter(pot ?? "");
    }
    if (initialFilters.department || pot) setFiltersOpen(true);
  }, [initialFilters]);


  const supervisors = useMemo(
    () => Array.from(new Set(employees.map((e) => e.supervisor))).sort(),
    [employees]
  );

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
      const matchesRating = !ratingFilter || deriveRating(e.currentYearRating) === ratingFilter;
      const matchesSupervisor = !supervisorFilter || e.supervisor === supervisorFilter;
      return matchesSearch && matchesDept && matchesLoc && matchesPos && matchesPot && matchesRating && matchesSupervisor;
    });
  }, [employees, search, deptFilter, locFilter, posFilter, potFilter, ratingFilter, supervisorFilter]);

  const clearFilters = () => {
    setDeptFilter("");
    setLocFilter("");
    setPosFilter("");
    setPotFilter("");
    setRatingFilter("");
    setSupervisorFilter("");
  };

  const clearAll = () => {
    setSearch("");
    clearFilters();
  };

  const activeFilters = [deptFilter, locFilter, posFilter, potFilter, ratingFilter, supervisorFilter].filter(Boolean);
  const hasActiveFilters = activeFilters.length > 0;
  const hasAnyConstraint = hasActiveFilters || search.length > 0;

  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialForm = {
    name: "",
    position: "Associate" as Position,
    department: "Assurance" as Department,
    location: "Canada" as Location,
    email: "",
    phone: "",
    supervisor: "",
    joining_date: "",
    role_start_date: "",
    current_year_rating_code: "M" as CompetencyRating,
    potential_rating: "Well Placed" as PotentialRating,
  };
  const [form, setForm] = useState(initialForm);

  const resetForm = () => setForm(initialForm);

  const addEmployee = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      position: form.position,
      department: form.department,
      location: form.location,
      email: form.email.trim(),
      phone: form.phone.trim(),
      supervisor: form.supervisor.trim(),
      tenure_with_firm: "",
      tenure_in_role: "",
      joining_date: form.joining_date || null,
      role_start_date: form.role_start_date || null,
      current_year_rating: RATING_TO_NUMBER[form.current_year_rating_code],
      current_year_rating_code: form.current_year_rating_code,
      potential_rating: form.potential_rating,
      bff_summary: "",
      performance_what_went_well: "",
      performance_what_could_go_better: "",
      performance_summary: "",
      career_aspirations_summary: "",
      dev_plan_summary: "",
      growth_rationale: "",
    };
    const { error } = await supabase.from("employees").insert([payload] as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Employee added");
    setAddOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  return (
    <TooltipProvider>
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-foreground">Employees</h1>
            <Badge variant="secondary" className="text-xs font-medium">
              {filtered.length} {filtered.length === 1 ? "person" : "people"}
            </Badge>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Label htmlFor="employee-search" className="sr-only">Search employees</Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="employee-search"
              type="search"
              placeholder="Search by name, position, department, supervisor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Dropdowns */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-muted/50 rounded-lg border border-border">
            {[
              { label: "Department", value: deptFilter, setter: setDeptFilter, options: departments as readonly string[] },
              { label: "Location", value: locFilter, setter: setLocFilter, options: locations as readonly string[] },
              { label: "Position", value: posFilter, setter: setPosFilter, options: positions as readonly string[] },
              { label: "Potential", value: potFilter, setter: setPotFilter, options: potentials as readonly string[] },
              { label: "Supervisor", value: supervisorFilter, setter: setSupervisorFilter, options: supervisors },
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
              <option value="E">E — Excellent</option>
              <option value="G">G — Good</option>
              <option value="M">M — Meets</option>
              <option value="NI">NI — Needs Improvement</option>
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

        {/* Rating legend */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Rating key:</span>
          {(Object.keys(RATING_LABELS) as CompetencyRating[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded text-[10px] font-bold ${ratingStyles[c]}`}>{c}</span>
              {RATING_LABELS[c]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded text-[10px] font-medium text-muted-foreground bg-muted">—</span>
            Unrated
          </span>
        </div>

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
                    <RatingBadge code={deriveRating(emp.currentYearRating)} />
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
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No employees match your search.</p>
              {hasAnyConstraint && (
                <button
                  onClick={clearAll}
                  className="text-sm font-medium text-primary hover:text-primary/80 underline"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add Employee Dialog */}
        <Dialog open={addOpen} onOpenChange={(o) => { if (!saving) { setAddOpen(o); if (!o) resetForm(); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="emp-name" className="text-xs text-muted-foreground">Name *</Label>
                <Input id="emp-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="emp-position" className="text-xs text-muted-foreground">Position *</Label>
                <select id="emp-position" required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as Position })} className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="emp-department" className="text-xs text-muted-foreground">Department *</Label>
                <select id="emp-department" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })} className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="emp-location" className="text-xs text-muted-foreground">Location *</Label>
                <select id="emp-location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as Location })} className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="emp-supervisor" className="text-xs text-muted-foreground">Supervisor</Label>
                <SupervisorCombobox
                  id="emp-supervisor"
                  value={form.supervisor}
                  onChange={(v) => setForm({ ...form, supervisor: v })}
                  employees={employees}
                />
              </div>
              <div>
                <Label htmlFor="emp-email" className="text-xs text-muted-foreground">Email</Label>
                <Input id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="emp-phone" className="text-xs text-muted-foreground">Phone</Label>
                <Input id="emp-phone" type="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="emp-joining-date" className="text-xs text-muted-foreground">Joining Date</Label>
                <Input id="emp-joining-date" type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="emp-role-start" className="text-xs text-muted-foreground">Role Start Date</Label>
                <Input id="emp-role-start" type="date" value={form.role_start_date} onChange={(e) => setForm({ ...form, role_start_date: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="emp-rating-code" className="text-xs text-muted-foreground">Current Year Rating</Label>
                <select id="emp-rating-code" value={form.current_year_rating_code} onChange={(e) => setForm({ ...form, current_year_rating_code: e.target.value as CompetencyRating })} className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="E">E — Excellent</option>
                  <option value="G">G — Good</option>
                  <option value="M">M — Meets</option>
                  <option value="NI">NI — Needs Improvement</option>
                </select>
              </div>
              <div>
                <Label htmlFor="emp-potential" className="text-xs text-muted-foreground">Potential Rating</Label>
                <select id="emp-potential" value={form.potential_rating} onChange={(e) => setForm({ ...form, potential_rating: e.target.value as PotentialRating })} className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  {potentials.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <DialogFooter>
              <button
                onClick={() => { setAddOpen(false); resetForm(); }}
                disabled={saving}
                className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addEmployee}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Employee
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default EmployeeDirectory;
