import { useMemo, useState } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { ChevronDown, ChevronRight, Search, Users2, Minus, Plus as PlusIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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

/** Build the hierarchy. Each employee ends up under their PRIMARY supervisor;
 *  co-supervisor is surfaced on the card as a chip. */
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
  const toNode = (e: Employee, seen: Set<string>): Node => {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) return { emp: e, reports: [] };
    seen.add(key);
    const kids = (childrenOf.get(key) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    return { emp: e, reports: kids.map((k) => toNode(k, seen)) };
  };
  const seen = new Set<string>();
  return roots
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((r) => toNode(r, seen));
};

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
      const descendants = new Set<string>();
      descendants.add(me.name);
      let changed = true;
      while (changed) {
        changed = false;
        for (const e of employees) {
          if (descendants.has(e.name)) continue;
          if (descendants.has(e.supervisor)
              || (e.coSupervisor && descendants.has(e.coSupervisor))) {
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
  const [zoom, setZoom] = useState(1);
  const toggle = (name: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const all = new Set<string>();
    const walk = (n: Node) => {
      if (n.reports.length > 0) all.add(n.emp.name);
      n.reports.forEach(walk);
    };
    roots.forEach(walk);
    setCollapsed(all);
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (e: Employee): boolean =>
    !q ||
    e.name.toLowerCase().includes(q) ||
    e.position.toLowerCase().includes(q) ||
    e.department.toLowerCase().includes(q);

  // Decide the root to show. If exactly one root, use it directly; otherwise
  // wrap all roots under a synthetic "Clearhouse LLP" banner so the chart
  // stays a single centered tree.
  const topLabel = (
    <div className="inline-flex flex-col items-center">
      <div className="rounded-md bg-primary/10 text-primary px-4 py-2 border border-primary/20">
        <div className="text-xs uppercase tracking-wider font-bold">Clearhouse LLP</div>
        <div className="text-[11px] opacity-70">{visibleEmployees.length} people</div>
      </div>
    </div>
  );

  const renderNode = (n: Node): React.ReactElement => {
    const isCollapsed = collapsed.has(n.emp.name);
    const hasKids = n.reports.length > 0;
    const teamSize = hasKids ? totalBelow(n) : 0;
    const highlight = q.length > 0 && matchesQuery(n.emp);

    const card = (
      <PersonCard
        emp={n.emp}
        hasKids={hasKids}
        direct={n.reports.length}
        total={teamSize}
        collapsed={isCollapsed}
        highlighted={highlight}
        onToggle={hasKids ? () => toggle(n.emp.name) : undefined}
        onSelect={() => onSelectEmployee(n.emp)}
      />
    );

    if (!hasKids || isCollapsed) {
      return <TreeNode label={card} />;
    }
    return (
      <TreeNode label={card}>
        {n.reports.map((child) => (
          <RenderBranch key={child.emp.id} node={child} render={renderNode} />
        ))}
      </TreeNode>
    );
  };

  return (
    <div className="p-6 w-full space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Org Chart</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Firm hierarchy based on the Manager / Second Manager fields.
            Click a card to open that person's record. Click the chevron to
            collapse a branch.
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
          <ToolbarBtn onClick={expandAll} title="Expand all"><PlusIcon className="h-3.5 w-3.5" /> Expand</ToolbarBtn>
          <ToolbarBtn onClick={collapseAll} title="Collapse all"><Minus className="h-3.5 w-3.5" /> Collapse</ToolbarBtn>
          <div className="inline-flex rounded-md border border-border bg-card overflow-hidden">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              className="px-2 py-1.5 text-sm hover:bg-muted/50"
              title="Zoom out"
            ><ZoomOut className="h-3.5 w-3.5" /></button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1.5 text-xs hover:bg-muted/50 border-x border-border"
              title="Reset zoom"
            ><RotateCcw className="h-3 w-3" /></button>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
              className="px-2 py-1.5 text-sm hover:bg-muted/50"
              title="Zoom in"
            ><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nothing to show yet. Add employees and set their Manager field.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-auto">
          <div
            className="inline-block min-w-full p-8"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            {roots.length === 1 ? (
              <Tree
                label={<PersonCard emp={roots[0].emp} hasKids={roots[0].reports.length > 0}
                                   direct={roots[0].reports.length}
                                   total={totalBelow(roots[0])}
                                   collapsed={collapsed.has(roots[0].emp.name)}
                                   highlighted={q.length > 0 && matchesQuery(roots[0].emp)}
                                   onToggle={roots[0].reports.length > 0 ? () => toggle(roots[0].emp.name) : undefined}
                                   onSelect={() => onSelectEmployee(roots[0].emp)} />}
                lineWidth="2px"
                lineColor="hsl(var(--border))"
                lineBorderRadius="4px"
              >
                {!collapsed.has(roots[0].emp.name) && roots[0].reports.map((child) => (
                  <RenderBranch key={child.emp.id} node={child} render={renderNode} />
                ))}
              </Tree>
            ) : (
              <Tree
                label={topLabel}
                lineWidth="2px"
                lineColor="hsl(var(--border))"
                lineBorderRadius="4px"
              >
                {roots.map((r) => renderNode(r))}
              </Tree>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Memoised branch render (prevents react-organizational-chart from exploding
// when a subtree re-renders unnecessarily).
const RenderBranch = ({ node, render }: { node: Node; render: (n: Node) => React.ReactElement }) =>
  render(node);

const ToolbarBtn = ({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    title={title}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-muted/50 transition-colors"
  >
    {children}
  </button>
);

interface PersonCardProps {
  emp: Employee;
  hasKids: boolean;
  direct: number;
  total: number;
  collapsed: boolean;
  highlighted: boolean;
  onToggle?: () => void;
  onSelect: () => void;
}

const PersonCard = ({ emp, hasKids, direct, total, collapsed, highlighted, onToggle, onSelect }: PersonCardProps) => {
  return (
    <div
      className={`relative inline-flex flex-col items-center rounded-xl border bg-card shadow-sm transition-colors w-[200px] ${
        highlighted ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
      }`}
    >
      {/* Collapse chevron (top-right) */}
      {hasKids && onToggle && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-muted/60 text-muted-foreground"
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? `Expand (${total} people)` : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      <button
        onClick={onSelect}
        className="w-full flex flex-col items-center text-center px-4 pt-5 pb-3 rounded-xl hover:bg-muted/30"
      >
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-base shadow-sm">
          {emp.initials}
        </div>
        {/* Name */}
        <div className="mt-2 font-semibold text-sm text-foreground truncate max-w-full">
          {emp.name}
        </div>
        {/* Position */}
        <div className="text-xs text-muted-foreground truncate max-w-full">
          {emp.position}
        </div>
        {/* Department pill */}
        <div className="mt-1.5">
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${departmentBadgeClass(emp.department)}`}>
            {emp.department}
          </span>
        </div>
        {/* Reports count */}
        {hasKids && (
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            {direct} direct · {total} total
          </div>
        )}
        {/* Co-supervisor marker */}
        {emp.coSupervisor && (
          <div className="mt-1 text-[9px] text-muted-foreground italic" title={`Also reports to ${emp.coSupervisor}`}>
            + also under {emp.coSupervisor}
          </div>
        )}
      </button>
    </div>
  );
};

export default OrgChartView;
