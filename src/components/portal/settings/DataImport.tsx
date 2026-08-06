import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { useDepartments, usePositions } from "@/hooks/useLookups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LOCATIONS = ["Canada", "India"];
const RATING_CODES = ["E", "G", "M", "NI"];
const POTENTIALS = ["Well Placed", "Ready Now", "Ready Soon", "Ready Later"];

const TEMPLATE_HEADERS = [
  "Name",
  "Department",
  "Position",
  "Location",
  "Supervisor",
  "Email",
  "Phone",
  "Joining Date",
  "Role Start Date",
  "Current Year Rating",
  "Current Year Rating Code",
  "Potential Rating",
  "Currency",
  "Annual Salary 2024",
  "Annual Salary 2025",
];

const TEMPLATE_ROWS = [
  ["Jane Doe", "Assurance", "Manager", "Canada", "Alex Smith", "jane@firm.com", "416-555-0101", "2019-04-01", "2023-01-15", "4.2", "G", "Ready Soon", "CAD", "95000", "102000"],
  ["Ravi Kumar", "Tax", "Associate", "India", "Jane Doe", "ravi@firm.com", "", "2022-07-11", "2022-07-11", "3.5", "M", "Well Placed", "INR", "800000", "880000"],
];

interface SalaryEntry {
  year: number;
  annual_salary: number;
  currency: string;
}

interface ParsedRow {
  index: number;
  errors: string[];
  raw: Record<string, string>;
  employee: Record<string, unknown>;
  salaries: SalaryEntry[];
}

const norm = (s: string) => s.trim().toLowerCase();

const excelSerialToDate = (n: number): string | null => {
  if (!isFinite(n) || n <= 0) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const parseDate = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  if (/^\d+(\.\d+)?$/.test(v) && Number(v) > 1000) return excelSerialToDate(Number(v));
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : v;
  }
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    const year = Number(m[3]);
    // MM/DD/YYYY unless the first part cannot be a month (then DD/MM/YYYY)
    let month = a;
    let day = b;
    if (a > 12 && b <= 12) {
      month = b;
      day = a;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
};

const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
};

const DataImport = () => {
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [commitErrors, setCommitErrors] = useState<string[]>([]);

  const deptNames = useMemo(() => departments.map((d) => d.name), [departments]);
  const posNames = useMemo(() => positions.map((p) => p.name), [positions]);

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const errorRows = rows?.filter((r) => r.errors.length > 0) ?? [];

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
      .map((r) => r.map((c) => csvEscape(String(c))).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildRows = (matrix: string[][]): ParsedRow[] => {
    const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());
    const lookup = new Map<string, number>();
    headers.forEach((h, i) => {
      if (h) lookup.set(norm(h), i);
    });
    const salaryCols: { year: number; idx: number }[] = [];
    headers.forEach((h, i) => {
      const m = norm(h).match(/^annual salary (\d{4})$/);
      if (m) salaryCols.push({ year: Number(m[1]), idx: i });
    });

    return matrix.slice(1).map((cells, i) => {
      const get = (...names: string[]) => {
        for (const n of names) {
          const idx = lookup.get(norm(n));
          if (idx !== undefined) {
            const v = cells[idx];
            if (v !== undefined && String(v).trim() !== "") return String(v).trim();
          }
        }
        return "";
      };

      const errors: string[] = [];
      const name = get("Name");
      const department = get("Department");
      const position = get("Position");
      const location = get("Location");

      if (!name) errors.push("Name is required");
      if (!department) errors.push("Department is required");
      else if (!deptNames.includes(department))
        errors.push(`Department '${department}' not found — add it in Settings first`);
      if (!position) errors.push("Position is required");
      else if (!posNames.includes(position))
        errors.push(`Position '${position}' not found — add it in Settings first`);
      if (!location) errors.push("Location is required");
      else if (!LOCATIONS.includes(location))
        errors.push(`Location '${location}' is invalid (Canada or India)`);

      const joiningRaw = get("Joining Date");
      const roleRaw = get("Role Start Date");
      const joining_date = joiningRaw ? parseDate(joiningRaw) : null;
      const role_start_date = roleRaw ? parseDate(roleRaw) : null;
      if (joiningRaw && !joining_date) errors.push(`Joining Date '${joiningRaw}' is not a valid date`);
      if (roleRaw && !role_start_date) errors.push(`Role Start Date '${roleRaw}' is not a valid date`);

      const ratingRaw = get("Current Year Rating");
      let current_year_rating: number | null = null;
      if (ratingRaw) {
        const n = Number(ratingRaw);
        if (isNaN(n) || n < 0 || n > 5) errors.push(`Current Year Rating '${ratingRaw}' must be a number 0-5`);
        else current_year_rating = n;
      }

      const codeRaw = get("Current Year Rating Code");
      if (codeRaw && !RATING_CODES.includes(codeRaw.toUpperCase()))
        errors.push(`Rating code '${codeRaw}' must be E, G, M or NI`);

      const potentialRaw = get("Potential Rating");
      const potential = POTENTIALS.find((p) => norm(p) === norm(potentialRaw));
      if (potentialRaw && !potential)
        errors.push(`Potential Rating '${potentialRaw}' is invalid`);

      const currency = get("Currency") || "CAD";
      const salaries: SalaryEntry[] = [];
      for (const sc of salaryCols) {
        const v = cells[sc.idx];
        const s = v === undefined ? "" : String(v).trim().replace(/[$,\s]/g, "");
        if (!s) continue;
        const n = Number(s);
        if (isNaN(n)) {
          errors.push(`Annual Salary ${sc.year} '${v}' is not a number`);
          continue;
        }
        salaries.push({ year: sc.year, annual_salary: n, currency });
      }

      return {
        index: i + 2,
        errors,
        raw: { name, department, position, location },
        employee: {
          name,
          department,
          position,
          location,
          supervisor: get("Supervisor", "Manager"),
          email: get("Email"),
          phone: get("Phone"),
          joining_date,
          role_start_date,
          current_year_rating,
          current_year_rating_code: codeRaw ? codeRaw.toUpperCase() : "M",
          potential_rating: potential ?? "Well Placed",
        },
        salaries,
      };
    });
  };

  const handleFile = async (file: File) => {
    setCommitErrors([]);
    setFileName(file.name);
    try {
      let matrix: string[][];
      if (/\.csv$/i.test(file.name)) {
        matrix = parseCsv(await file.text());
      } else {
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as unknown as string[][];
        matrix = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      }
      if (matrix.length < 2) {
        toast.error("No data rows found in that file.");
        setRows(null);
        return;
      }
      setRows(buildRows(matrix));
    } catch (e) {
      toast.error("Could not read that file", { description: (e as Error).message });
      setRows(null);
    }
  };

  const reset = () => {
    setRows(null);
    setFileName("");
    setCommitErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    const failures: string[] = [];
    let employeeCount = 0;
    let salaryCount = 0;

    for (const row of validRows) {
      const { data, error } = await supabase
        .from("employees")
        .insert(row.employee as never)
        .select("id")
        .single();
      if (error || !data) {
        failures.push(`Row ${row.index} (${row.raw.name}): ${error?.message ?? "insert failed"}`);
        continue;
      }
      employeeCount++;
      for (const s of row.salaries) {
        const { error: sErr } = await supabase
          .from("salary_history")
          .insert({ employee_id: (data as { id: string }).id, ...s } as never);
        if (sErr) failures.push(`Row ${row.index} (${row.raw.name}) salary ${s.year}: ${sErr.message}`);
        else salaryCount++;
      }
    }

    setImporting(false);
    setCommitErrors(failures);
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast.success(
      `Imported ${employeeCount} employees • ${salaryCount} salary entries • ${
        validRows.length - employeeCount
      } rows failed at commit.`
    );
    if (failures.length === 0) reset();
    else setRows(null);
  };

  const preview = (rows ?? []).slice(0, 200);

  return (
    <section className="bg-card rounded-lg border border-border p-6 mt-6">
      <h2 className="text-lg font-heading font-semibold text-foreground">Data Import</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Bulk import employees from a CSV or Excel file. Positions and Departments must exist in the
        system first — add them from the sections above.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Download template CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload className="h-4 w-4 mr-2" /> Upload file
        </Button>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {rows && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-success/15 text-success hover:bg-success/15">
              {validRows.length} valid
            </Badge>
            <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15">
              {errorRows.length} with errors
            </Badge>
            {rows.length > 200 && (
              <span className="text-xs text-muted-foreground">
                showing first 200 of {rows.length} — all will be imported/skipped as appropriate.
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-border max-h-[420px] overflow-y-auto">
            <TooltipProvider>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    {["Status", "Row", "Name", "Department", "Position", "Location", "Salary years"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.index} className="border-t border-border">
                      <td className="px-3 py-2">
                        {r.errors.length === 0 ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <X className="h-4 w-4 text-destructive" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <ul className="list-disc pl-4 space-y-1">
                                {r.errors.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.index}</td>
                      <td className="px-3 py-2 text-foreground">{r.raw.name || "—"}</td>
                      <td className="px-3 py-2">{r.raw.department || "—"}</td>
                      <td className="px-3 py-2">{r.raw.position || "—"}</td>
                      <td className="px-3 py-2">{r.raw.location || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.salaries.map((s) => s.year).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={runImport} disabled={validRows.length === 0 || importing}>
              {importing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                </span>
              ) : (
                `Import valid rows (${validRows.length})`
              )}
            </Button>
            <Button variant="outline" onClick={reset} disabled={importing}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {commitErrors.length > 0 && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <h3 className="text-sm font-semibold text-destructive mb-2">Rows that failed at commit</h3>
          <ul className="space-y-1 text-xs text-destructive">
            {commitErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default DataImport;
