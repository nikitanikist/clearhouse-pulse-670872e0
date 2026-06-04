import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, TrendingUp, Sparkles, Building2, Award, Clock } from "lucide-react";

type Row = {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  location: string | null;
  current_year_rating: number | string | null;
  current_year_rating_code: string | null;
  potential_rating: string | null;
  joining_date: string | null;
  tenure_with_firm: string | null;
  employee_core_competencies: { competency_name: string; rating_code: string | null }[] | null;
};

const RATING_CODES = ["E", "G", "M", "NI"] as const;
const RATING_COLORS: Record<string, string> = {
  E: "hsl(var(--success))",
  G: "hsl(var(--primary))",
  M: "hsl(var(--warning))",
  NI: "hsl(var(--destructive))",
};
const RATING_NUM: Record<string, number> = { E: 4, G: 3, M: 2, NI: 1 };

const POTENTIAL_ORDER = ["Well Placed", "Ready Now", "Ready Soon", "Ready Later"];
const DEPARTMENTS = ["Assurance", "Tax", "Advisory", "Operations"];
const COMPETENCIES = ["Thought", "Results", "Expertise", "People", "Self"];

const parseTenureYears = (s: string | null): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*year/i);
  return m ? parseFloat(m[1]) : null;
};

const yearsSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
};

const employeeYears = (r: Row): number | null =>
  yearsSince(r.joining_date) ?? parseTenureYears(r.tenure_with_firm);

const KpiTile = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-semibold leading-tight">{value}</p>
      </div>
    </div>
  </Card>
);

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="p-4">
    <h3 className="text-sm font-semibold mb-3">{title}</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  </Card>
);

const axisProps = {
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
  axisLine: { stroke: "hsl(var(--border))" },
  tickLine: { stroke: "hsl(var(--border))" },
};

const ReportsView = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id, name, department, position, location, current_year_rating, current_year_rating_code, potential_rating, joining_date, tenure_with_firm, employee_core_competencies(competency_name, rating_code)",
        );
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load report data.
        </div>
      </div>
    );
  }

  const rows = data ?? [];

  // KPIs
  const total = rows.length;
  const ratings = rows
    .map((r) => (r.current_year_rating == null ? null : Number(r.current_year_rating)))
    .filter((n): n is number => typeof n === "number" && !isNaN(n));
  const avgPerf = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  const highPotential = rows.filter((r) => r.potential_rating === "Ready Now" || r.potential_rating === "Ready Soon").length;
  const departments = new Set(rows.map((r) => r.department).filter(Boolean)).size;

  const codeCounts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.current_year_rating_code) codeCounts[r.current_year_rating_code] = (codeCounts[r.current_year_rating_code] ?? 0) + 1;
  });
  const topRating = Object.entries(codeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const tenureYearsList = rows.map(employeeYears).filter((n): n is number => typeof n === "number");
  const avgTenure = tenureYearsList.length
    ? `${(tenureYearsList.reduce((a, b) => a + b, 0) / tenureYearsList.length).toFixed(1)} yr`
    : "—";

  // Chart A: Performance Rating Distribution
  const perfDist = RATING_CODES.map((code) => ({
    name: code,
    value: rows.filter((r) => r.current_year_rating_code === code).length,
    fill: RATING_COLORS[code],
  }));

  // Chart B: Potential Rating Distribution
  const potentialDist = POTENTIAL_ORDER.map((p) => ({
    name: p,
    value: rows.filter((r) => r.potential_rating === p).length,
  }));

  // Chart C: Avg performance by department
  const deptAvg = DEPARTMENTS.map((dept) => {
    const rs = rows
      .filter((r) => r.department === dept)
      .map((r) => (r.current_year_rating == null ? null : Number(r.current_year_rating)))
      .filter((n): n is number => typeof n === "number" && !isNaN(n));
    return {
      name: dept,
      value: rs.length ? Number((rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1)) : 0,
    };
  });

  // Chart D: Competency averages
  const compAvg = COMPETENCIES.map((c) => {
    const nums: number[] = [];
    rows.forEach((r) => {
      (r.employee_core_competencies ?? []).forEach((cc) => {
        if (cc.competency_name === c && cc.rating_code && RATING_NUM[cc.rating_code] !== undefined) {
          nums.push(RATING_NUM[cc.rating_code]);
        }
      });
    });
    return {
      name: c,
      value: nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)) : 0,
    };
  });

  // Chart E: Tenure buckets
  const buckets = [
    { name: "<1 yr", test: (y: number) => y < 1 },
    { name: "1–3 yr", test: (y: number) => y >= 1 && y < 3 },
    { name: "3–5 yr", test: (y: number) => y >= 3 && y < 5 },
    { name: "5+ yr", test: (y: number) => y >= 5 },
  ];
  const tenureDist = buckets.map((b) => ({
    name: b.name,
    value: tenureYearsList.filter(b.test).length,
  }));

  const labelStyle = { fill: "hsl(var(--foreground))", fontSize: 11 };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-heading font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Team performance summaries and department-level insights.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile icon={Users} label="Total Employees" value={total} />
        <KpiTile icon={TrendingUp} label="Average Performance" value={avgPerf} />
        <KpiTile icon={Sparkles} label="High Potential" value={highPotential} />
        <KpiTile icon={Building2} label="Departments" value={departments} />
        <KpiTile icon={Award} label="Top Rating" value={topRating} />
        <KpiTile icon={Clock} label="Avg Tenure" value={avgTenure} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Performance Rating Distribution">
          <BarChart data={perfDist} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {perfDist.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
              <LabelList dataKey="value" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Potential Rating Distribution">
          <BarChart data={potentialDist} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Average Performance by Department">
          <BarChart data={deptAvg} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis domain={[0, 5]} {...axisProps} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" style={labelStyle} formatter={(v: number) => (v ? v.toFixed(1) : "—")} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Competency Averages">
          <BarChart data={compAvg} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis domain={[0, 4]} {...axisProps} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" style={labelStyle} formatter={(v: number) => (v ? v.toFixed(1) : "—")} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Tenure Distribution">
          <BarChart data={tenureDist} margin={{ top: 16, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" style={labelStyle} />
            </Bar>
          </BarChart>
        </ChartCard>
      </section>
    </div>
  );
};

export default ReportsView;
