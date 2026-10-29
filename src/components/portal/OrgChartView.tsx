import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Users2, Minus, Plus } from "lucide-react";
import type { Employee } from "@/data/employees";
import { departmentBadgeClass } from "@/data/employees";
import { useAuth } from "@/contexts/AuthContext";
import { useCanDo } from "@/hooks/useCanDo";

interface OrgChartViewProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

interface Node {
  emp: Employee;
  reports: Node[];
}

/**
 * Build the hierarchy from the flat employee list. The supervisor field is
 * free-text (an employee name), so we index by lower-cased name. People with
 * no supervisor OR whose supervisor is not resolvable become roots.
 *
 * co_supervisor is NOT used to duplicate nodes; we keep the tree acyclic by
 * placing each employee under their PRIMARY supervisor and surfacing the
 * second manager on the node card as "(also reports to X)".
 */
const buildTree = (employees: Employee[]): Node[] => {
  const byName = new Map<string, Employee>();
  for (const e of employees) {
    const key = e.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, e);
  }
  const childrenOf = new Map<string, Employee[]>();
  const roots: Employee[] = [];
  for (const e of employees) {
    const supKey = (e.supervisor ?? "").trim().toLowerCase();
    if (!supKey || !byName.has(supKey) || supKey === e.name.trim().toLowerCase()) {
      roots.push(e);
      continue;
    }
    const arr = childrenOf.get(supKey) ?? [];
    arr.push(e);
    childrenOf.set(supKey, arr);
  }
  // Sort each level alphabetically for a stable layout
  const toNode = (e: Employee, seen: Set<string>): Node => {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) return { emp: e, reports: [] }; // cycle guard
    seen.add(key);
    const kids = (childrenOf.get(key) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    return { emp: e, reports: kids.map((k) => toNode(k, seen)) };
  };
  const seen = new Set<string>();
  return roots
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => toNode(r, seen));
};

/** Count every employee reachable under a node (direct + indirect). */
const totalBelow = (n: Node): number =>
  n.reports.reduce((acc, c) => acc + 1 + totalBelow(c), 0);

const OrgChartView = ({ employees, onSelectEmployee }: OrgChartViewProps) => {
  const { user } = useAuth();
  const matrix = useCanDo();
  const scope = matrix.scope("nav:org_chart");

  const myEmail = user?.email?.toLowerCase() ?? null;
  const me = useMemo(
    () => (myEmail ? employees.find((e) => e.email.toLowerCase() === myEmail) : null) ?? null,
    [employees, myEmail],
  );

  // Scope filter -- same semantics as the Employee Directory. An L1 admin or
  // scope=all sees the entire firm; scope=own_team sees only the subtree
  // rooted at the signed-in user; scope=own_department filters by department;
  // scope=self degenerates to a one-node chart.
  const visibleEmployees = useMemo(() => {
    if (matrix.isAdmin || scope === "all") return employees;
    if (!me) return [];
    if (scope === "self") return [me];
    if (scope === "own_department") {
      return employees.filter((e) =>
        e.department && me.department && e.department === me.department,
      );
    }
    if (scope === "own_team") {
      // Everyone where I am an ancestor (incl. me)
      const descendants = new Set<string>();
      descendants.add(me.name);
      let changed = true;
      while (changed) {
        changed = false;
        for (const e of employees) {
          if (descendants.has(e.name)) continue;
          if (
            descendants.has(e.supervisor) ||
            (e.coSupervisor && descendants.has(e.coSupervisor))
          ) {
            descendants.add(e.name);
            changed = true;
          }
        }
      }
      return employees.filter((e) => descendants.has(e.name));
    }
    return [];
  }, [employees, matrix.isAdmin, scope, me]);

  const roots = useMemo(() => buildTree(visibleEmployees), [visibleEmployees]);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    // Collapse every non-leaf node
    const all = new Set<string>();
    const walk = (n: Node) => {
      if (n.reports.length > 0) all.add(n.emp.name);
      n.reports.forEach(walk);
    };
    roots.forEach(walk);
    setCollapsed(all);
  };

  // Highlight matches by name/position/department
  const q = query.trim().toLowerCase();
  const matchesQuery = (e: Employee): boolean =>
    !q ||
    e.name.toLowerCase().includes(q) ||
    e.position.toLowerCase().includes(q) ||
    e.department.toLowerCase().includes(q);

  return (
    <div className="p-6 w-full space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Org Chart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual firm hierarchy based on the Manager / Second Manager fields.
            Click a card to open that person's record.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, role or department"
              className="pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm w-[240px] focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted/50 transition-colors"
            title="Expand all branches"
          >
            <Plus className="h-3.5 w-3.5" /> Expand all
          </button>
          <button
            onClick={collapseAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted/50 transition-colors"
            title="Collapse all branches"
          >
            <Minus className="h-3.5 w-3.5" /> Collapse all
          </button>
        </div>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nothing to show yet. Add employees in the Employees tab and set
            their Manager field.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm p-6 overflow-x-auto">
          <div className="flex flex-col gap-6">
            {roots.map((root) => (
              <OrgNode
                key={root.emp.id}
                node={root}
                depth={0}
                collapsed={collapsed}
                onToggle={toggle}
                matchesQuery={matchesQuery}
                onSelect={onSelectEmployee}
                query={q}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface OrgNodeProps {
  node: Node;
  depth: number;
  collapsed: Set<string>;
  onToggle: (name: string) => void;
  matchesQuery: (e: Employee) => boolean;
  onSelect: (e: Employee) => void;
  query: string;
}

const OrgNode = ({ node, depth, collapsed, onToggle, matchesQuery, onSelect, query }: OrgNodeProps) => {
  const isCollapsed = collapsed.has(node.emp.name);
  const kids = node.reports;
  const hasKids = kids.length > 0;
  const teamSize = hasKids ? totalBelow(node) : 0;
  const highlight = query.length > 0 && matchesQuery(node.emp);

  return (
    <div className="relative" style={{ marginLeft: depth > 0 ? "1.75rem" : 0 }}>
      <div className="flex items-start gap-2">
        {hasKids ? (
          <button
            onClick={() => onToggle(node.emp.name)}
            className="mt-3 p-0.5 rounded hover:bg-muted/50 text-muted-foreground"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <button
          onClick={() => onSelect(node.emp)}
          className={`flex-1 text-left rounded-lg border p-3 transition-colors ${
            highlight ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
              {node.emp.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-foreground truncate">{node.emp.name}</p>
                {hasKids && (
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {kids.length} direct · {teamSize} total
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{node.emp.position}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${departmentBadgeClass(node.emp.department)}`}>
                  {node.emp.department}
                </span>
                {node.emp.coSupervisor && (
                  <span
                    className="text-[10px] text-muted-foreground"
                    title={`Also reports to ${node.emp.coSupervisor}`}
                  >
                    + also reports to {node.emp.coSupervisor}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>
      {hasKids && !isCollapsed && (
        <div className="mt-2 border-l border-dashed border-border pl-4 ml-[18px] space-y-2">
          {kids.map((k) => (
            <OrgNode
              key={k.emp.id}
              node={k}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              matchesQuery={matchesQuery}
              onSelect={onSelect}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgChartView;
